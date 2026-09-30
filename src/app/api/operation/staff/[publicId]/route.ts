import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ publicId: string }> };
type StaffUpdate = { fullName?: unknown; password?: unknown; status?: unknown; roleCodes?: unknown; warehouseCodes?: unknown };

function readCodes(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 20 || value.some((item) => typeof item !== "string" || !item.trim())) return null;
  return [...new Set(value.map((item) => String(item).trim().toUpperCase()))];
}

async function keepAdminAvailable(connection: Awaited<ReturnType<ReturnType<typeof getDatabase>["getConnection"]>>, targetUserId: number) {
  const [admins] = await connection.execute<(RowDataPacket & { userId: number })[]>(`
    SELECT u.id userId FROM users u
    JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles r ON r.id=ur.role_id
    WHERE u.status='ACTIVE' AND r.code='ADMINISTRADOR_EMPRESA'
    FOR UPDATE`);
  return admins.length > 1 || Number(admins[0]?.userId) !== targetUserId;
}

async function replaceAssignments(connection: Awaited<ReturnType<ReturnType<typeof getDatabase>["getConnection"]>>, userId: number, roleCodes: string[] | undefined, warehouseCodes: string[] | undefined) {
  if (roleCodes) {
    const [roles] = await connection.query<(RowDataPacket & { id: number; code: string })[]>(`SELECT id, code FROM roles WHERE active=TRUE AND code IN (${roleCodes.map(() => "?").join(",")})`, roleCodes);
    if (roles.length !== roleCodes.length) return "Uno o más roles ya no están disponibles.";
    if (!roleCodes.includes("ADMINISTRADOR_EMPRESA")) {
      const [current] = await connection.execute<RowDataPacket[]>(`
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
        WHERE ur.user_id=? AND r.code='ADMINISTRADOR_EMPRESA' LIMIT 1`, [userId]);
      if (current.length && !(await keepAdminAvailable(connection, userId))) return "No se puede quitar el único administrador activo.";
    }
    await connection.execute("DELETE FROM user_roles WHERE user_id=?", [userId]);
    for (const role of roles) await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, role.id]);
  }
  if (warehouseCodes) {
    const [warehouses] = await connection.query<(RowDataPacket & { id: number })[]>(`SELECT id FROM warehouses WHERE active=TRUE AND code IN (${warehouseCodes.map(() => "?").join(",")})`, warehouseCodes);
    if (warehouses.length !== warehouseCodes.length) return "Una o más bodegas ya no están disponibles.";
    await connection.execute("DELETE FROM user_warehouse_access WHERE user_id=?", [userId]);
    for (const warehouse of warehouses) await connection.execute("INSERT INTO user_warehouse_access (user_id, warehouse_id) VALUES (?, ?)", [userId, warehouse.id]);
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeStaffPermission("staff.manage");
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 401 ? "Inicia sesión con una cuenta administradora." : "No tienes permiso para administrar personal." }, { status: authorization.status });
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "El identificador del empleado no es válido." }, { status: 400 });

  let body: StaffUpdate;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 }); }
  const fullName = body.fullName === undefined ? undefined : String(body.fullName).trim();
  const password = body.password === undefined ? undefined : String(body.password);
  const status = body.status === undefined ? undefined : String(body.status).toUpperCase();
  const roleCodes = body.roleCodes === undefined ? undefined : readCodes(body.roleCodes);
  const warehouseCodes = body.warehouseCodes === undefined ? undefined : readCodes(body.warehouseCodes);
  if (fullName !== undefined && (fullName.length < 2 || fullName.length > 160)) return NextResponse.json({ error: "El nombre debe tener entre 2 y 160 caracteres." }, { status: 400 });
  if (password !== undefined && (password.length < 12 || password.length > 128)) return NextResponse.json({ error: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  if (status !== undefined && !["ACTIVE", "INACTIVE"].includes(status)) return NextResponse.json({ error: "El estado indicado no es válido." }, { status: 400 });
  if (body.roleCodes !== undefined && !roleCodes) return NextResponse.json({ error: "Selecciona al menos un rol válido." }, { status: 400 });
  if (body.warehouseCodes !== undefined && !warehouseCodes) return NextResponse.json({ error: "Selecciona al menos una bodega válida." }, { status: 400 });
  if ([fullName, password, status, roleCodes, warehouseCodes].every((item) => item === undefined)) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id, status FROM users WHERE public_id=? AND status <> 'SYSTEM' FOR UPDATE", [publicId]);
    if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró el empleado." }, { status: 404 }); }
    const userId = Number(rows[0].id);
    if (status === "INACTIVE" && userId === authorization.userId) { await connection.rollback(); return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 409 }); }

    if (status === "INACTIVE") {
      const [currentAdmin] = await connection.execute<RowDataPacket[]>(`SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='ADMINISTRADOR_EMPRESA' LIMIT 1`, [userId]);
      if (currentAdmin.length && !(await keepAdminAvailable(connection, userId))) { await connection.rollback(); return NextResponse.json({ error: "No se puede desactivar el único administrador activo." }, { status: 409 }); }
    }
    const assignmentError = await replaceAssignments(connection, userId, roleCodes ?? undefined, warehouseCodes ?? undefined);
    if (assignmentError) { await connection.rollback(); return NextResponse.json({ error: assignmentError }, { status: 400 }); }

    await connection.execute(
      `UPDATE users SET full_name=COALESCE(?, full_name), password_hash=COALESCE(?, password_hash),
         status=COALESCE(?, status), updated_at=NOW(3) WHERE id=?`,
      [fullName ?? null, password ? await hash(password, 12) : null, status ?? null, userId],
    );
    if (status === "INACTIVE") await connection.execute("UPDATE sessions SET revoked_at=NOW(3) WHERE user_id=? AND revoked_at IS NULL", [userId]);
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, status: status ?? rows[0].status });
  } catch (error) {
    await connection.rollback();
    console.error("Staff update error:", error);
    return NextResponse.json({ error: "No se pudieron guardar los cambios del empleado." }, { status: 500 });
  } finally { connection.release(); }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authorization = await authorizeStaffPermission("staff.manage");
  if (!authorization.ok) return NextResponse.json({ error: authorization.status === 401 ? "Inicia sesión con una cuenta administradora." : "No tienes permiso para administrar personal." }, { status: authorization.status });
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "El identificador del empleado no es válido." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM users WHERE public_id=? AND status <> 'SYSTEM' FOR UPDATE", [publicId]);
    if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró el empleado." }, { status: 404 }); }
    const userId = Number(rows[0].id);
    if (userId === authorization.userId) { await connection.rollback(); return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 409 }); }
    const [currentAdmin] = await connection.execute<RowDataPacket[]>(`SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='ADMINISTRADOR_EMPRESA' LIMIT 1`, [userId]);
    if (currentAdmin.length && !(await keepAdminAvailable(connection, userId))) { await connection.rollback(); return NextResponse.json({ error: "No se puede desactivar el único administrador activo." }, { status: 409 }); }
    await connection.execute("UPDATE users SET status='INACTIVE', updated_at=NOW(3) WHERE id=?", [userId]);
    await connection.execute("UPDATE sessions SET revoked_at=NOW(3) WHERE user_id=? AND revoked_at IS NULL", [userId]);
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, status: "INACTIVE" });
  } catch (error) {
    await connection.rollback();
    console.error("Staff deactivation error:", error);
    return NextResponse.json({ error: "No se pudo desactivar el empleado." }, { status: 500 });
  } finally { connection.release(); }
}
