import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { ensureOperationalCatalog } from "@/server/catalog";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
const carrierCode = (value: string) => ({ "Amazon Logistics": "AMZL", FedEx: "FEDEX", UPS: "UPS", USPS: "USPS" }[value] || "OTHER");

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const [rows] = await getDatabase().execute(
    `SELECT p.code, p.tracking_raw tracking, c.name carrier, p.store, p.description, p.declared_value declaredValue,
            p.currency, p.status, p.created_at createdAt
     FROM prealerts p LEFT JOIN carriers c ON c.id=p.carrier_id
     WHERE p.customer_id=? ORDER BY p.created_at DESC`, [customer.customerId]);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const body = await request.json();
  const tracking = String(body?.trackingRaw || "").trim();
  const description = String(body?.description || "").trim();
  if (!tracking || !description) return NextResponse.json({ error: "Tracking y descripción son requeridos." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    await ensureOperationalCatalog(connection);
    const [duplicate] = await connection.execute<(RowDataPacket & { code: string })[]>(
      "SELECT code FROM prealerts WHERE customer_id=? AND tracking_normalized=? AND status <> 'CANCELLED' LIMIT 1",
      [customer.customerId, tracking.toUpperCase()],
    );
    if (duplicate.length) { await connection.rollback(); return NextResponse.json({ error: `Este tracking ya está registrado como ${duplicate[0].code}.` }, { status: 409 }); }
    const [carriers] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM carriers WHERE code=? LIMIT 1", [carrierCode(String(body?.carrier || ""))]);
    const code = `KG-PA-${Date.now().toString().slice(-8)}`;
    await connection.execute(
      `INSERT INTO prealerts (public_id, code, customer_id, carrier_id, tracking_raw, tracking_normalized, store, description, declared_value, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [randomUUID(), code, customer.customerId, carriers[0]?.id || null, tracking, tracking.toUpperCase(), String(body?.store || "").trim() || null, description, Number(body?.declaredValue || 0), String(body?.currency || "USD").toUpperCase()],
    );
    await connection.commit();
    return NextResponse.json({ ok: true, code, status: "SUBMITTED" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Prealert error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el preregistro." }, { status: 500 });
  } finally { connection.release(); }
}
