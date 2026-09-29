import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { ensureOperationalCatalog } from "@/server/catalog";
import { getDatabase } from "@/server/db/mysql";
import { sendPackageReceivedEmail } from "@/server/email";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && request.headers.get("x-operation-key") !== process.env.OPERATION_API_KEY) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const body = await request.json();
  const tracking = String(body?.tracking || "").trim();
  if (!tracking) return NextResponse.json({ error: "El tracking es requerido." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  let notification: { to: string; fullName: string; packageCode: string; tracking: string } | null = null;
  try {
    await connection.beginTransaction();
    await ensureOperationalCatalog(connection);
    const [existing] = await connection.execute<(RowDataPacket & { code: string })[]>("SELECT code FROM packages WHERE tracking_normalized=? LIMIT 1", [tracking.toUpperCase()]);
    if (existing.length) { await connection.rollback(); return NextResponse.json({ error: `El paquete ya fue recibido como ${existing[0].code}.` }, { status: 409 }); }
    const [prealerts] = await connection.execute<(RowDataPacket & { id: number; customer_id: number; carrier_id: number | null; email: string; fullName: string })[]>(`
      SELECT pa.id, pa.customer_id, pa.carrier_id, u.email_normalized email, u.full_name fullName
      FROM prealerts pa JOIN customers c ON c.id=pa.customer_id JOIN users u ON u.id=c.user_id
      WHERE pa.tracking_normalized=? AND pa.status='SUBMITTED' LIMIT 1 FOR UPDATE`, [tracking.toUpperCase()]);
    if (!prealerts.length) { await connection.rollback(); return NextResponse.json({ error: "No existe un preregistro pendiente para este tracking." }, { status: 404 }); }
    const prealert = prealerts[0];
    const [warehouses] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM warehouses WHERE code='MIA' LIMIT 1");
    const [locations] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM warehouse_locations WHERE code='MIA-RECEPCION' LIMIT 1");
    const [actors] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM users WHERE email_normalized='system@keygo.local' LIMIT 1");
    const warehouse = warehouses[0], location = locations[0], actor = actors[0];
    const packageCode = `KG-P-${Date.now().toString().slice(-8)}`;
    const [packageResult] = await connection.execute(
      `INSERT INTO packages (public_id, code, customer_id, prealert_id, carrier_id, tracking_raw, tracking_normalized, warehouse_id, location_id, logistic_status, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED_USA', NOW(3))`,
      [randomUUID(), packageCode, prealert.customer_id, prealert.id, prealert.carrier_id, tracking, tracking.toUpperCase(), warehouse.id, location.id],
    );
    const packageId = Number((packageResult as { insertId: number }).insertId);
    const weight = Number(body?.weightKg || 0), length = Number(body?.lengthCm || 0), width = Number(body?.widthCm || 0), height = Number(body?.heightCm || 0);
    if ([weight, length, width, height].every((value) => value > 0)) {
      await connection.execute(
        "INSERT INTO package_measurements (package_id, weight_kg, length_cm, width_cm, height_cm, input_unit, actor_id) VALUES (?, ?, ?, ?, ?, 'METRIC', ?)",
        [packageId, weight, length, width, height, actor.id],
      );
    }
    await connection.execute("INSERT INTO package_events (package_id, event_code, to_status, actor_id, customer_visible, observation) VALUES (?, 'RECEIVED_USA', 'RECEIVED_USA', ?, TRUE, 'Paquete recibido e identificado en Miami')", [packageId, actor.id]);
    await connection.execute("UPDATE prealerts SET status='RECEIVED', updated_at=NOW(3) WHERE id=?", [prealert.id]);
    await connection.commit();
    notification = { to: prealert.email, fullName: prealert.fullName, packageCode, tracking };
    let emailSent = true;
    try { await sendPackageReceivedEmail(notification); } catch (error) { emailSent = false; console.error("Package receipt email error:", error); }
    return NextResponse.json({ ok: true, packageCode, status: "RECEIVED_USA", emailSent }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Receipt error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo recibir el paquete." }, { status: 500 });
  } finally { connection.release(); }
}
