import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const [rows] = await getDatabase().execute(
    `SELECT p.code, p.tracking_raw tracking, p.logistic_status status, p.received_at receivedAt,
            pa.description, pa.store, wl.code location
     FROM packages p LEFT JOIN prealerts pa ON pa.id=p.prealert_id LEFT JOIN warehouse_locations wl ON wl.id=p.location_id
     WHERE p.customer_id=? ORDER BY p.created_at DESC`, [customer.customerId]);
  return NextResponse.json(rows);
}
