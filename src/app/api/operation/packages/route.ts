import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeStaffPermission("packages.receive_mia", "MIA");
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.status === 401 ? "Inicia sesión con una cuenta de empleado." : "Tu rol no permite consultar el inventario de Miami." },
      { status: authorization.status },
    );
  }

  try {
    const [rows] = await getDatabase().execute<(RowDataPacket & {
      code: string;
      tracking: string;
      customerName: string;
      lockerCode: string;
      location: string | null;
      status: string;
      receivedAt: string | null;
    })[]>(`
      SELECT p.code, p.tracking_raw tracking, u.full_name customerName,
             l.code lockerCode, wl.code location, p.logistic_status status,
             DATE_FORMAT(p.received_at, '%Y-%m-%d %H:%i:%s') receivedAt
      FROM packages p
      JOIN warehouses w ON w.id=p.warehouse_id
      JOIN customers c ON c.id=p.customer_id
      JOIN users u ON u.id=c.user_id
      JOIN lockers l ON l.customer_id=c.id
      LEFT JOIN warehouse_locations wl ON wl.id=p.location_id
      WHERE w.code='MIA'
      ORDER BY p.received_at DESC, p.id DESC
      LIMIT 250`);

    return NextResponse.json({ packages: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Operation inventory query error:", error);
    return NextResponse.json({ error: "No se pudo cargar el inventario de Miami." }, { status: 500 });
  }
}
