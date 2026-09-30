import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await authorizeStaffPermission("payments.review", "TGU");
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para revisar pagos en Honduras." }, { status: auth.status });
  const [rows] = await getDatabase().query<RowDataPacket[]>(`
    SELECT pr.public_id publicId, pr.reference, pr.amount, pr.status, pr.created_at createdAt,
           u.full_name customerName, u.email_normalized customerEmail, po.code orderCode, pm.name paymentMethod,
           GROUP_CONCAT(DISTINCT p.code ORDER BY p.code SEPARATOR ',') packageCodes
    FROM payment_reports pr JOIN payment_orders po ON po.id=pr.order_id
    JOIN users u ON u.id=pr.reported_by JOIN payment_methods pm ON pm.id=pr.method_id
    JOIN payment_order_items poi ON poi.order_id=po.id JOIN packages p ON p.id=poi.package_id
    WHERE pr.status='SUBMITTED' GROUP BY pr.id ORDER BY pr.created_at,pr.id`);
  return NextResponse.json({ reports: rows });
}
