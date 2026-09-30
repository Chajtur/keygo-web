import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.ADMIN_BOOTSTRAP_TOKEN || process.env.ADMIN_BOOTSTRAP_TOKEN.length < 32) {
    return NextResponse.json({ enabled: false });
  }
  try {
    const [rows] = await getDatabase().execute<RowDataPacket[]>(`
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
      WHERE r.code='ADMINISTRADOR_EMPRESA' LIMIT 1`);
    return NextResponse.json({ enabled: rows.length === 0 });
  } catch (error) {
    console.error("Admin bootstrap availability check error:", error);
    return NextResponse.json({ error: "No se pudo verificar la configuración inicial." }, { status: 500 });
  }
}

function tokensMatch(provided: string, expected: string) {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export async function POST(request: Request) {
  const configuredToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!configuredToken || configuredToken.length < 32) {
    return NextResponse.json({ error: "La configuración inicial de administrador no está habilitada." }, { status: 404 });
  }

  let body: { token?: unknown; fullName?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const token = String(body.token ?? "");
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!token || token.length > 512 || !tokensMatch(token, configuredToken)) {
    return NextResponse.json({ error: "El código de configuración no es válido." }, { status: 403 });
  }
  if (fullName.length < 2 || fullName.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return NextResponse.json({ error: "Ingresa un nombre y correo válidos." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  }

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [roles] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM roles WHERE code='ADMINISTRADOR_EMPRESA' AND active=TRUE FOR UPDATE");
    if (!roles.length) {
      await connection.rollback();
      return NextResponse.json({ error: "No está instalado el catálogo de roles. Aplica la migración de roles antes de continuar." }, { status: 409 });
    }
    const roleId = Number(roles[0].id);
    const [existingAdmins] = await connection.execute<RowDataPacket[]>("SELECT 1 FROM user_roles WHERE role_id=? LIMIT 1 FOR UPDATE", [roleId]);
    if (existingAdmins.length) {
      await connection.rollback();
      return NextResponse.json({ error: "La cuenta maestra ya fue configurada. El alta inicial está cerrada." }, { status: 409 });
    }
    const [existingUsers] = await connection.execute<RowDataPacket[]>("SELECT 1 FROM users WHERE email_normalized=? LIMIT 1 FOR UPDATE", [email]);
    if (existingUsers.length) {
      await connection.rollback();
      return NextResponse.json({ error: "Ese correo ya tiene una cuenta. Usa un correo nuevo para configurar el administrador maestro." }, { status: 409 });
    }
    const [warehouses] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM warehouses WHERE active=TRUE ORDER BY code FOR UPDATE");
    if (!warehouses.length) {
      await connection.rollback();
      return NextResponse.json({ error: "No hay bodegas activas. Configura primero el catálogo operativo." }, { status: 409 });
    }

    const publicId = randomUUID();
    const [userResult] = await connection.execute(
      `INSERT INTO users (public_id,email_normalized,password_hash,full_name,status,email_verified_at,created_at,updated_at)
       VALUES (?,?,?,?, 'ACTIVE',NOW(3),NOW(3),NOW(3))`,
      [publicId, email, await hash(password, 12), fullName],
    );
    const userId = Number((userResult as { insertId: number }).insertId);
    await connection.execute("INSERT INTO user_roles (user_id,role_id) VALUES (?,?)", [userId, roleId]);
    for (const warehouse of warehouses) {
      await connection.execute("INSERT INTO user_warehouse_access (user_id,warehouse_id) VALUES (?,?)", [userId, warehouse.id]);
    }
    await connection.execute("INSERT INTO audit_logs (actor_id,action,entity_reference,safe_diff) VALUES (?,?,?,JSON_OBJECT('role','ADMINISTRADOR_EMPRESA','bootstrap',TRUE))", [userId, "STAFF_ADMIN_BOOTSTRAP", publicId]);
    await connection.commit();
    return NextResponse.json({ ok: true, email, message: "Cuenta maestra creada. Ya puedes iniciar sesión en el portal de empleados." }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Admin bootstrap error:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta maestra." }, { status: 500 });
  } finally { connection.release(); }
}
