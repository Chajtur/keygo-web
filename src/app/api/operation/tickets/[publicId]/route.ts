import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ publicId: string }> };
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
async function accessDenied() {
  const auth = await authorizeStaffPermission("tickets.manage");
  return auth.ok ? auth : { ...auth, response: NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para atender tickets." }, { status: auth.status }) };
}

export async function GET(_request: Request, context: Context) {
  const auth = await accessDenied();
  if ("response" in auth) return auth.response;
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  const [tickets] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT t.id,t.public_id publicId,t.subject,t.status,t.created_at createdAt,t.updated_at updatedAt,
      c.public_id customerPublicId,u.full_name customerName,u.email_normalized customerEmail,
      assignee.public_id assignedPublicId,assignee.full_name assignedName,p.code packageCode,i.code invoiceCode
    FROM tickets t JOIN customers c ON c.id=t.customer_id JOIN users u ON u.id=c.user_id
    LEFT JOIN users assignee ON assignee.id=t.assigned_to LEFT JOIN packages p ON p.id=t.package_id LEFT JOIN invoices i ON i.id=t.invoice_id
    WHERE t.public_id=? LIMIT 1`, [publicId]);
  if (!tickets.length) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  const [messages] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT tm.id,tm.body,tm.internal_only internalOnly,tm.created_at createdAt,u.full_name authorName,
      (tm.author_id=?) isMine
    FROM ticket_messages tm JOIN users u ON u.id=tm.author_id WHERE tm.ticket_id=? ORDER BY tm.created_at,tm.id`, [auth.userId, tickets[0].id]);
  const [staff] = await getDatabase().query<RowDataPacket[]>(`SELECT DISTINCT u.public_id publicId,u.full_name fullName FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.active=TRUE WHERE u.status='ACTIVE' ORDER BY u.full_name`);
  return NextResponse.json({ ticket: tickets[0], messages, staff, statuses });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await accessDenied();
  if ("response" in auth) return auth.response;
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  let body: { status?: unknown; assignedToPublicId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const nextStatus = body.status === undefined ? undefined : String(body.status).toUpperCase();
  const assigneeValue = body.assignedToPublicId;
  if (nextStatus !== undefined && !statuses.includes(nextStatus)) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  if (assigneeValue !== undefined && assigneeValue !== null && !/^[0-9a-f-]{36}$/i.test(String(assigneeValue))) return NextResponse.json({ error: "Empleado asignado inválido." }, { status: 400 });
  if (nextStatus === undefined && assigneeValue === undefined) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; status: string; assignedTo: number | null })[]>("SELECT id,status,assigned_to assignedTo FROM tickets WHERE public_id=? FOR UPDATE", [publicId]);
    if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 }); }
    let assigneeId = rows[0].assignedTo;
    if (assigneeValue !== undefined) {
      if (assigneeValue === null || assigneeValue === "") assigneeId = null;
      else {
        const [employees] = await connection.execute<(RowDataPacket & { id: number })[]>(`
          SELECT u.id FROM users u WHERE u.public_id=? AND u.status='ACTIVE'
            AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.active=TRUE WHERE ur.user_id=u.id) LIMIT 1`, [String(assigneeValue)]);
        if (!employees.length) { await connection.rollback(); return NextResponse.json({ error: "El empleado no está activo o no tiene un rol asignado." }, { status: 400 }); }
        assigneeId = Number(employees[0].id);
      }
    }
    const status = nextStatus ?? rows[0].status;
    await connection.execute("UPDATE tickets SET status=?,assigned_to=?,updated_at=NOW(3) WHERE id=?", [status, assigneeId, rows[0].id]);
    await connection.execute("INSERT INTO audit_logs (actor_id,action,entity_reference,safe_diff) VALUES (?,?,?,JSON_OBJECT('fromStatus',?,'toStatus',?,'assignedToPublicId',?))", [auth.userId, "SUPPORT_TICKET_UPDATED", publicId, rows[0].status, status, assigneeValue == null || assigneeValue === "" ? null : String(assigneeValue)]);
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, status });
  } catch (error) {
    await connection.rollback(); console.error("Support ticket update error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el ticket." }, { status: 500 });
  } finally { connection.release(); }
}

export async function POST(request: Request, context: Context) {
  const auth = await accessDenied();
  if ("response" in auth) return auth.response;
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  let body: { message?: unknown; internalOnly?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const message = String(body.message ?? "").trim(), internalOnly = body.internalOnly === true;
  if (message.length < 2 || message.length > 8000) return NextResponse.json({ error: "El mensaje debe tener entre 2 y 8000 caracteres." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [tickets] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id,status FROM tickets WHERE public_id=? FOR UPDATE", [publicId]);
    if (!tickets.length) { await connection.rollback(); return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 }); }
    if (tickets[0].status === "CLOSED") { await connection.rollback(); return NextResponse.json({ error: "El ticket está cerrado." }, { status: 409 }); }
    await connection.execute("INSERT INTO ticket_messages (ticket_id,author_id,body,internal_only) VALUES (?,?,?,?)", [tickets[0].id, auth.userId, message, internalOnly]);
    if (!internalOnly) await connection.execute("UPDATE tickets SET status='WAITING_CUSTOMER',updated_at=NOW(3) WHERE id=?", [tickets[0].id]);
    else await connection.execute("UPDATE tickets SET updated_at=NOW(3) WHERE id=?", [tickets[0].id]);
    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback(); console.error("Support ticket reply error:", error);
    return NextResponse.json({ error: "No se pudo enviar la respuesta." }, { status: 500 });
  } finally { connection.release(); }
}
