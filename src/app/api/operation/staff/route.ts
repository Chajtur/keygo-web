import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

type StaffInput = { fullName?: unknown; email?: unknown; password?: unknown; roleCodes?: unknown; warehouseCodes?: unknown };

function stringList(value: unknown, maxLength: number) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) return null;
  const list = [...new Set(value.map((item) => String(item).trim().toUpperCase()))];
  return list.length && list.length <= maxLength ? list : null;
}

export async function GET() {
  const authorization = await authorizeStaffPermission("staff.manage");
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 401 ? "Inicia sesión con una cuenta administradora." : "No tienes permiso para administrar personal." }, { status: authorization.status });

  const database = getDatabase();
  const [staff] = await database.query<RowDataPacket[]>(`
    SELECT u.public_id publicId, u.full_name fullName, u.email_normalized email, u.status,
           u.created_at createdAt,
           COALESCE(GROUP_CONCAT(DISTINCT r.code ORDER BY r.code SEPARATOR ','), '') roleCodes,
           COALESCE(GROUP_CONCAT(DISTINCT w.code ORDER BY w.code SEPARATOR ','), '') warehouseCodes
    FROM users u
    JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles r ON r.id=ur.role_id
    LEFT JOIN user_warehouse_access uwa ON uwa.user_id=u.id
    LEFT JOIN warehouses w ON w.id=uwa.warehouse_id
    WHERE u.status <> 'SYSTEM'
    GROUP BY u.id
    ORDER BY u.full_name, u.id`);
  const [roles] = await database.query<RowDataPacket[]>("SELECT code, description FROM roles WHERE active=TRUE ORDER BY code");
  const [warehouses] = await database.query<RowDataPacket[]>("SELECT code, name, city FROM warehouses WHERE active=TRUE ORDER BY name");
  return NextResponse.json({ staff, roles, warehouses });
}

export async function POST(request: Request) {
  const authorization = await authorizeStaffPermission("staff.manage");
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 401 ? "Inicia sesión con una cuenta administradora." : "No tienes permiso para administrar personal." }, { status: authorization.status });

  let body: StaffInput;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 }); }
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const roleCodes = stringList(body.roleCodes, 20);
  const warehouseCodes = stringList(body.warehouseCodes, 20);
  if (fullName.length < 2 || fullName.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return NextResponse.json({ error: "Ingresa un nombre y correo válidos." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) return NextResponse.json({ error: "La contraseña inicial debe tener entre 12 y 128 caracteres." }, { status: 400 });
  if (!roleCodes || !warehouseCodes) return NextResponse.json({ error: "Selecciona al menos un rol y una bodega válida." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM users WHERE email_normalized=? LIMIT 1 FOR UPDATE", [email]);
    if (existing.length) { await connection.rollback(); return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 }); }

    const [roles] = await connection.query<RowDataPacket[]>(`SELECT id, code FROM roles WHERE active=TRUE AND code IN (${roleCodes.map(() => "?").join(",")})`, roleCodes);
    const [warehouses] = await connection.query<RowDataPacket[]>(`SELECT id, code FROM warehouses WHERE active=TRUE AND code IN (${warehouseCodes.map(() => "?").join(",")})`, warehouseCodes);
    if (roles.length !== roleCodes.length || warehouses.length !== warehouseCodes.length) {
      await connection.rollback();
      return NextResponse.json({ error: "Uno o más roles o bodegas ya no están disponibles." }, { status: 400 });
    }

    const publicId = randomUUID();
    const [insert] = await connection.execute(
      `INSERT INTO users (public_id, email_normalized, password_hash, full_name, status, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', NOW(3), NOW(3), NOW(3))`,
      [publicId, email, await hash(password, 12), fullName],
    );
    const userId = Number((insert as { insertId: number }).insertId);
    for (const role of roles as (RowDataPacket & { id: number })[]) await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, role.id]);
    for (const warehouse of warehouses as (RowDataPacket & { id: number })[]) await connection.execute("INSERT INTO user_warehouse_access (user_id, warehouse_id) VALUES (?, ?)", [userId, warehouse.id]);
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, email, fullName, status: "ACTIVE", roleCodes, warehouseCodes }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Staff creation error:", error);
    return NextResponse.json({ error: "No se pudo crear el usuario de personal." }, { status: 500 });
  } finally { connection.release(); }
}
