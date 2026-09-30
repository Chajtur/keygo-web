import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];

export async function GET(request: Request) {
  const auth = await authorizeStaffPermission("tickets.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para atender tickets." }, { status: auth.status });
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.toUpperCase();
  const mine = url.searchParams.get("mine") === "true";
  if (status && status !== "ALL" && !statuses.includes(status)) return NextResponse.json({ error: "Filtro de estado inválido." }, { status: 400 });
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (status && status !== "ALL") { conditions.push("t.status=?"); values.push(status); }
  if (mine) { conditions.push("t.assigned_to=?"); values.push(auth.userId); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [tickets] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT t.public_id publicId,t.subject,t.status,t.created_at createdAt,t.updated_at updatedAt,
      u.full_name customerName,u.email_normalized customerEmail,
      assigned.full_name assignedName,p.code packageCode,i.code invoiceCode,
      (SELECT tm.body FROM ticket_messages tm WHERE tm.ticket_id=t.id AND tm.internal_only=FALSE ORDER BY tm.created_at DESC,tm.id DESC LIMIT 1) lastMessage,
      (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id=t.id) messageCount
    FROM tickets t JOIN customers c ON c.id=t.customer_id JOIN users u ON u.id=c.user_id
    LEFT JOIN users assigned ON assigned.id=t.assigned_to
    LEFT JOIN packages p ON p.id=t.package_id LEFT JOIN invoices i ON i.id=t.invoice_id
    ${where} ORDER BY FIELD(t.status,'OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'),t.updated_at DESC LIMIT 200`, values);
  return NextResponse.json({ tickets, statuses });
}
