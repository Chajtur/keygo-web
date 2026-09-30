import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

type LockerRow = RowDataPacket & {
  fullName: string;
  lockerCode: string;
  warehouseName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  countryCode: string;
};

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para consultar tu casillero." }, { status: 401 });

  try {
    const [rows] = await getDatabase().execute<LockerRow[]>(`
      SELECT u.full_name fullName, l.code lockerCode, w.name warehouseName,
             w.address_line1 addressLine1, w.address_line2 addressLine2, w.city, w.country_code countryCode
      FROM users u
      JOIN customers c ON c.user_id=u.id
      JOIN lockers l ON l.customer_id=c.id AND l.status='ACTIVE'
      JOIN warehouses w ON w.code='MIA' AND w.active=TRUE
      WHERE u.id=?
      LIMIT 1`, [customer.userId]);
    if (!rows.length) {
      return NextResponse.json({ error: "No encontramos una dirección activa para tu casillero." }, { status: 404 });
    }
    return NextResponse.json({ locker: rows[0] });
  } catch (error) {
    console.error("Customer locker details error:", error);
    return NextResponse.json({ error: "No se pudo cargar la información del casillero." }, { status: 500 });
  }
}
