import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type RequestRow = RowDataPacket & { publicId: string; code: string; method: "AIR" | "SEA"; requestedAt: string; customerName: string; consolidationCode: string | null; packageCount: number; packageCodes: string; totalWeightKg: string | null; totalVolumeM3: string | null };

export async function GET() {
  const auth = await authorizeStaffPermission("shipments.dispatch", "MIA");
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "Tu rol no permite planificar despachos en Miami." }, { status: auth.status });
  const [requests] = await getDatabase().execute<RequestRow[]>(`
    SELECT s.public_id publicId,s.code,s.method,DATE_FORMAT(s.requested_at,'%Y-%m-%d %H:%i:%s') requestedAt,
           u.full_name customerName,co.code consolidationCode,COUNT(p.id) packageCount,
           GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') packageCodes,
           SUM(m.weight_kg) totalWeightKg,SUM(m.length_cm*m.width_cm*m.height_cm)/1000000 totalVolumeM3
    FROM shipments s
    JOIN customers c ON c.id=s.customer_id JOIN users u ON u.id=c.user_id
    LEFT JOIN consolidations co ON co.id=s.consolidation_id
    JOIN shipment_packages sp ON sp.shipment_id=s.id
    JOIN packages p ON p.id=sp.package_id
    LEFT JOIN package_measurements m ON m.id=sp.confirmed_measurement_id
    LEFT JOIN batch_shipments bs ON bs.shipment_id=s.id
    WHERE s.status='REQUESTED' AND bs.shipment_id IS NULL
    GROUP BY s.id ORDER BY s.method,s.requested_at,s.id`);
  const [batches] = await getDatabase().execute<(RowDataPacket & { code: string; method: "AIR" | "SEA"; status: string; shipmentCount: number; packageCount: number; totalWeightKg: string | null; totalVolumeM3: string | null })[]>(`
    SELECT b.code,b.method,b.status,COUNT(DISTINCT s.id) shipmentCount,COUNT(sp.package_id) packageCount,SUM(m.weight_kg) totalWeightKg,SUM(m.length_cm*m.width_cm*m.height_cm)/1000000 totalVolumeM3
    FROM dispatch_batches b
    JOIN batch_shipments bs ON bs.batch_id=b.id
    JOIN shipments s ON s.id=bs.shipment_id
    LEFT JOIN shipment_packages sp ON sp.shipment_id=s.id
    LEFT JOIN package_measurements m ON m.id=sp.confirmed_measurement_id
    WHERE b.status='OPEN'
    GROUP BY b.id ORDER BY b.id DESC`);
  return NextResponse.json({ requests, batches }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: { shipmentPublicIds?: unknown; method?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const publicIds = Array.isArray(body.shipmentPublicIds) ? [...new Set(body.shipmentPublicIds.map(String))] : [];
  const method = String(body.method || "").toUpperCase();
  if (!publicIds.length || publicIds.length > 100 || publicIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || !["AIR", "SEA"].includes(method)) return NextResponse.json({ error: "Selecciona solicitudes válidas de un solo medio de transporte." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const auth = await authorizeStaffPermission("shipments.dispatch", "MIA");
    if (!auth.ok) { await connection.rollback(); return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "Tu rol no permite planificar despachos en Miami." }, { status: auth.status }); }
    const [shipments] = await connection.query<(RowDataPacket & { id: number; code: string; method: string; status: string })[]>(`
      SELECT s.id,s.code,s.method,s.status FROM shipments s
      LEFT JOIN batch_shipments bs ON bs.shipment_id=s.id
      WHERE s.public_id IN (${publicIds.map(() => "?").join(",")}) AND bs.shipment_id IS NULL FOR UPDATE`, publicIds);
    if (shipments.length !== publicIds.length || shipments.some((shipment) => shipment.status !== "REQUESTED" || shipment.method !== method)) {
      await connection.rollback();
      return NextResponse.json({ error: "Alguna solicitud ya fue planificada o corresponde a otro transporte. Actualiza la lista." }, { status: 409 });
    }
    const [warehouses] = await connection.execute<(RowDataPacket & { id: number; code: string })[]>("SELECT id,code FROM warehouses WHERE code IN ('MIA','TGU') AND active=TRUE");
    const origin = warehouses.find((item) => item.code === "MIA"), destination = warehouses.find((item) => item.code === "TGU");
    if (!origin || !destination) { await connection.rollback(); return NextResponse.json({ error: "Faltan bodegas activas de origen o destino." }, { status: 409 }); }
    const batchCode = `KG-L-${Date.now().toString().slice(-8)}`;
    const [result] = await connection.execute("INSERT INTO dispatch_batches (public_id,code,method,origin_warehouse_id,destination_warehouse_id,status) VALUES (?,?,?,?,?,'OPEN')", [randomUUID(), batchCode, method, origin.id, destination.id]);
    const batchId = Number((result as { insertId: number }).insertId);
    for (const shipment of shipments) {
      await connection.execute("INSERT INTO batch_shipments (shipment_id,batch_id,assigned_by) VALUES (?,?,?)", [shipment.id, batchId, auth.userId]);
      await connection.execute("UPDATE shipments SET status='ASSIGNED',version=version+1 WHERE id=?", [shipment.id]);
      await connection.execute("INSERT INTO shipment_events (shipment_id,from_status,to_status,actor_id,observation) VALUES (?,'REQUESTED','ASSIGNED',?,?)", [shipment.id, auth.userId, `Asignado al lote ${batchCode}`]);
    }
    await connection.commit();
    return NextResponse.json({ ok: true, batchCode, method, requestCount: shipments.length }, { status: 201 });
  } catch (error) {
    await connection.rollback(); console.error("Dispatch batch creation error:", error);
    return NextResponse.json({ error: "No se pudo crear el lote de despacho." }, { status: 500 });
  } finally { connection.release(); }
}
