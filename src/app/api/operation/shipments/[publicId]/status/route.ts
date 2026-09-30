import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ publicId: string }> };
const transitions: Record<string, { permission: string; warehouse: string; next: string[] }> = {
  REQUESTED: { permission: "consolidations.prepare", warehouse: "MIA", next: ["READY_TO_DISPATCH"] },
  READY_TO_DISPATCH: { permission: "shipments.dispatch", warehouse: "MIA", next: ["DISPATCHED"] },
  DISPATCHED: { permission: "shipments.update_tracking", warehouse: "TGU", next: ["IN_TRANSIT"] },
  IN_TRANSIT: { permission: "shipments.update_tracking", warehouse: "TGU", next: ["CUSTOMS_HN", "ARRIVED_HN"] },
  CUSTOMS_HN: { permission: "shipments.receive_honduras", warehouse: "TGU", next: ["ARRIVED_HN"] },
  ARRIVED_HN: { permission: "shipments.receive_honduras", warehouse: "TGU", next: ["RECEIVED_HN"] },
};

export async function PATCH(request: Request, context: Context) {
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Identificador de envío inválido." }, { status: 400 });
  let body: { status?: unknown; observation?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const requestedStatus = String(body.status ?? "").toUpperCase();
  const observation = String(body.observation ?? "").trim().slice(0, 1000);
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id, status FROM shipments WHERE public_id=? FOR UPDATE", [publicId]);
    if (!rows.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró el envío." }, { status: 404 }); }
    const current = rows[0].status, transition = transitions[current];
    if (!transition || !transition.next.includes(requestedStatus)) { await connection.rollback(); return NextResponse.json({ error: `No se permite cambiar el envío de ${current} a ${requestedStatus}.` }, { status: 409 }); }
    const auth = await authorizeStaffPermission(transition.permission, transition.warehouse);
    if (!auth.ok) { await connection.rollback(); return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "Tu rol o bodega no permite este cambio." }, { status: auth.status }); }
    const shipmentId = Number(rows[0].id);
    await connection.execute("UPDATE shipments SET status=?, version=version+1 WHERE id=?", [requestedStatus, shipmentId]);
    await connection.execute("INSERT INTO shipment_events (shipment_id, from_status, to_status, actor_id, observation) VALUES (?, ?, ?, ?, ?)", [shipmentId, current, requestedStatus, auth.userId, observation || null]);
    const [packages] = await connection.execute<(RowDataPacket & { id: number; code: string; logistic_status: string; warehouse_id: number | null; location_id: number | null })[]>(`
      SELECT p.id,p.code,p.logistic_status,p.warehouse_id,p.location_id FROM shipment_packages sp JOIN packages p ON p.id=sp.package_id WHERE sp.shipment_id=? FOR UPDATE`, [shipmentId]);
    let destination: { warehouseId: number; locationId: number } | null = null;
    if (requestedStatus === "RECEIVED_HN") {
      const [target] = await connection.execute<(RowDataPacket & { warehouseId: number; locationId: number })[]>(`
        SELECT w.id warehouseId, l.id locationId FROM warehouses w JOIN warehouse_locations l ON l.warehouse_id=w.id
        WHERE w.code='TGU' AND l.code='TGU-RECEPCION' AND w.active=TRUE AND l.active=TRUE LIMIT 1`);
      if (!target.length) { await connection.rollback(); return NextResponse.json({ error: "Configura la bodega de Honduras y su ubicación de recepción antes de recibir envíos." }, { status: 409 }); }
      destination = { warehouseId: Number(target[0].warehouseId), locationId: Number(target[0].locationId) };
    }
    for (const pkg of packages) {
      const nextPackageStatus = requestedStatus === "RECEIVED_HN" ? "RECEIVED_HN" : requestedStatus;
      if (destination) {
        await connection.execute("INSERT INTO package_movements (package_id, from_location_id, to_location_id, actor_id, reason) VALUES (?, ?, ?, ?, ?)", [pkg.id, pkg.location_id, destination.locationId, auth.userId, "Recepción de envío en Honduras"]);
        await connection.execute("UPDATE packages SET logistic_status=?, warehouse_id=?, location_id=? WHERE id=?", [nextPackageStatus, destination.warehouseId, destination.locationId, pkg.id]);
      } else await connection.execute("UPDATE packages SET logistic_status=? WHERE id=?", [nextPackageStatus, pkg.id]);
      await connection.execute("INSERT INTO package_events (package_id,event_code,from_status,to_status,actor_id,customer_visible,observation) VALUES (?,?,?,?,?,TRUE,?)", [pkg.id, nextPackageStatus, pkg.logistic_status, nextPackageStatus, auth.userId, observation || `El envío cambió a ${requestedStatus}`]);
    }
    await connection.commit();
    return NextResponse.json({ ok: true, publicId, fromStatus: current, status: requestedStatus, packagesUpdated: packages.length });
  } catch (error) {
    await connection.rollback(); console.error("Shipment status update error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el estado del envío." }, { status: 500 });
  } finally { connection.release(); }
}
