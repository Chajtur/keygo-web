import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ publicId: string }> };
async function findTicket(publicId: string, customerId: number, lock = false) {
  const [rows] = await getDatabase().execute<(RowDataPacket & { id: number; status: string })[]>(`SELECT id,status FROM tickets WHERE public_id=? AND customer_id=? ${lock ? "FOR UPDATE" : ""}`, [publicId, customerId]);
  return rows[0] ?? null;
}

export async function GET(_request: Request, context: Context) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para consultar el ticket." }, { status: 401 });
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  const ticket = await findTicket(publicId, customer.customerId);
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  const [messages] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT tm.body,tm.created_at createdAt,u.full_name authorName,(tm.author_id=? ) isMine
    FROM ticket_messages tm JOIN users u ON u.id=tm.author_id
    WHERE tm.ticket_id=? AND tm.internal_only=FALSE ORDER BY tm.created_at,tm.id`, [customer.userId, ticket.id]);
  return NextResponse.json({ ticket: { publicId, status: ticket.status }, messages });
}

export async function POST(request: Request, context: Context) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para responder el ticket." }, { status: 401 });
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  let body: { message?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const message = String(body.message ?? "").trim();
  if (message.length < 2 || message.length > 8000) return NextResponse.json({ error: "El mensaje debe tener entre 2 y 8000 caracteres." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id,status FROM tickets WHERE public_id=? AND customer_id=? FOR UPDATE", [publicId, customer.customerId]);
    if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 }); }
    if (rows[0].status === "CLOSED") { await connection.rollback(); return NextResponse.json({ error: "Este ticket está cerrado. Crea uno nuevo si necesitas más ayuda." }, { status: 409 }); }
    await connection.execute("INSERT INTO ticket_messages (ticket_id,author_id,body,internal_only) VALUES (?,?,?,FALSE)", [rows[0].id, customer.userId, message]);
    await connection.execute("UPDATE tickets SET status=IF(status IN ('RESOLVED','WAITING_CUSTOMER'),'OPEN',status),updated_at=NOW(3) WHERE id=?", [rows[0].id]);
    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback(); console.error("Customer ticket reply error:", error);
    return NextResponse.json({ error: "No se pudo enviar tu respuesta." }, { status: 500 });
  } finally { connection.release(); }
}

export async function PATCH(request: Request, context: Context) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para editar el ticket." }, { status: 401 });
  const { publicId } = await context.params;
  let body: { subject?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const subject = String(body.subject ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  if (subject.length < 4 || subject.length > 255) return NextResponse.json({ error: "El asunto debe tener entre 4 y 255 caracteres." }, { status: 400 });
  const [result] = await getDatabase().execute(`UPDATE tickets SET subject=?,updated_at=NOW(3) WHERE public_id=? AND customer_id=? AND status='OPEN'`, [subject, publicId, customer.customerId]);
  if (!(result as { affectedRows: number }).affectedRows) return NextResponse.json({ error: "Solo puedes editar el asunto de un ticket abierto." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para cerrar el ticket." }, { status: 401 });
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id,status FROM tickets WHERE public_id=? AND customer_id=? FOR UPDATE", [publicId, customer.customerId]);
    if (!rows.length || rows[0].status === "CLOSED") { await connection.rollback(); return NextResponse.json({ error: "No se encontró un ticket abierto para cerrar." }, { status: 404 }); }
    await connection.execute("UPDATE tickets SET status='CLOSED',updated_at=NOW(3) WHERE id=?", [rows[0].id]);
    await connection.execute("INSERT INTO audit_logs (actor_id,action,entity_reference,safe_diff) VALUES (?,?,?,JSON_OBJECT('fromStatus',?,'toStatus','CLOSED'))", [customer.userId, "CUSTOMER_TICKET_CLOSED", publicId, rows[0].status]);
    await connection.commit();
    return NextResponse.json({ ok: true, status: "CLOSED" });
  } catch (error) {
    await connection.rollback(); console.error("Customer ticket close error:", error);
    return NextResponse.json({ error: "No se pudo cerrar el ticket." }, { status: 500 });
  } finally { connection.release(); }
}
