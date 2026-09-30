import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para consultar tus tickets." }, { status: 401 });
  const [tickets] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT t.public_id publicId,t.subject,t.status,t.created_at createdAt,t.updated_at updatedAt,
      (SELECT tm.body FROM ticket_messages tm WHERE tm.ticket_id=t.id AND tm.internal_only=FALSE ORDER BY tm.created_at DESC,tm.id DESC LIMIT 1) lastMessage,
      (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id=t.id AND tm.internal_only=FALSE) messageCount
    FROM tickets t WHERE t.customer_id=? ORDER BY t.updated_at DESC,t.id DESC`, [customer.customerId]);
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para crear un ticket." }, { status: 401 });
  let body: { subject?: unknown; message?: unknown; packageCode?: unknown; invoiceCode?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const packageCode = String(body.packageCode ?? "").trim().toUpperCase();
  const invoiceCode = String(body.invoiceCode ?? "").trim().toUpperCase();
  if (subject.length < 4 || subject.length > 255 || message.length < 10 || message.length > 8000) return NextResponse.json({ error: "El asunto debe tener 4–255 caracteres y el mensaje 10–8000." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    let packageId: number | null = null, invoiceId: number | null = null;
    if (packageCode) {
      const [rows] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM packages WHERE code=? AND customer_id=? LIMIT 1", [packageCode, customer.customerId]);
      if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró ese paquete en tu cuenta." }, { status: 404 }); }
      packageId = Number(rows[0].id);
    }
    if (invoiceCode) {
      const [rows] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM invoices WHERE code=? AND customer_id=? LIMIT 1", [invoiceCode, customer.customerId]);
      if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró esa factura en tu cuenta." }, { status: 404 }); }
      invoiceId = Number(rows[0].id);
    }
    const publicId = randomUUID();
    const [result] = await connection.execute("INSERT INTO tickets (public_id,customer_id,package_id,invoice_id,status,subject) VALUES (?,?,?,?,'OPEN',?)", [publicId, customer.customerId, packageId, invoiceId, subject]);
    const ticketId = Number((result as { insertId: number }).insertId);
    await connection.execute("INSERT INTO ticket_messages (ticket_id,author_id,body,internal_only) VALUES (?,?,?,FALSE)", [ticketId, customer.userId, message]);
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, status: "OPEN" }, { status: 201 });
  } catch (error) {
    await connection.rollback(); console.error("Customer ticket creation error:", error);
    return NextResponse.json({ error: "No se pudo crear el ticket." }, { status: 500 });
  } finally { connection.release(); }
}
