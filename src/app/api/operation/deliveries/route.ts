import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let body: { packageCodes?: unknown; recipient?: unknown; method?: unknown; evidenceFilePublicIds?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const codes = Array.isArray(body.packageCodes) ? [...new Set(body.packageCodes.map((code) => String(code).trim().toUpperCase()))] : [];
  const recipient = body.recipient && typeof body.recipient === "object" ? body.recipient as Record<string, unknown> : {};
  const recipientName = String(recipient.name ?? "").trim().slice(0, 160), recipientId = String(recipient.idNumber ?? "").trim().slice(0, 60), recipientContact = String(recipient.contact ?? "").trim().slice(0, 100);
  const method = String(body.method ?? "PICKUP").toUpperCase();
  const fileIds = Array.isArray(body.evidenceFilePublicIds) ? [...new Set(body.evidenceFilePublicIds.map((id) => String(id)))] : [];
  if (!codes.length || codes.length > 100 || codes.some((code) => !code || code.length > 32) || recipientName.length < 2 || recipientId.length < 3 || !["PICKUP", "DELIVERY"].includes(method) || fileIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ error: "Indica paquetes, persona receptora identificada y método válidos." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const auth = await authorizeStaffPermission("deliveries.confirm", "TGU");
    if (!auth.ok) { await connection.rollback(); return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para registrar entregas en Honduras." }, { status: auth.status }); }
    if (fileIds.length) {
      const evidenceAuth = await authorizeStaffPermission("deliveries.record_evidence", "TGU");
      if (!evidenceAuth.ok) { await connection.rollback(); return NextResponse.json({ error: "Tu rol no permite adjuntar evidencia de entrega." }, { status: evidenceAuth.status }); }
    }
    const [packages] = await connection.query<(RowDataPacket & { id: number; code: string; customerId: number; warehouseId: number; shipmentId: number; status: string; customerName: string })[]>(`
      SELECT p.id,p.code,p.customer_id customerId,p.warehouse_id warehouseId,p.logistic_status status,
             s.id shipmentId,u.full_name customerName,w.code warehouseCode
      FROM packages p JOIN users u ON u.id=(SELECT c.user_id FROM customers c WHERE c.id=p.customer_id)
      JOIN warehouses w ON w.id=p.warehouse_id
      JOIN shipment_packages sp ON sp.package_id=p.id JOIN shipments s ON s.id=sp.shipment_id
      WHERE p.code IN (${codes.map(() => "?").join(",")}) ORDER BY p.id FOR UPDATE`, codes);
    if (packages.length !== codes.length || packages.some((pkg) => pkg.warehouseCode !== "TGU" || pkg.status !== "READY_FOR_PICKUP")) { await connection.rollback(); return NextResponse.json({ error: "Todos los paquetes deben estar en Honduras, pagados y listos para retiro." }, { status: 409 }); }
    if (packages.some((pkg) => Number(pkg.customerId) !== Number(packages[0].customerId))) { await connection.rollback(); return NextResponse.json({ error: "Una entrega solo puede incluir paquetes de un mismo cliente." }, { status: 409 }); }
    for (const pkg of packages) {
      const [blocking] = await connection.execute<RowDataPacket[]>("SELECT 1 FROM incidents WHERE package_id=? AND blocks_processing=TRUE AND status='OPEN' LIMIT 1", [pkg.id]);
      const [balance] = await connection.execute<(RowDataPacket & { due: string })[]>(`
        SELECT COALESCE((SELECT SUM(ila.allocated_amount) FROM invoice_line_allocations ila JOIN invoices i ON i.id=ila.invoice_id WHERE ila.package_id=? AND i.status='ISSUED'),0)
         + COALESCE((SELECT SUM(CASE ia.debit_or_credit WHEN 'DEBIT' THEN iaa.allocated_amount ELSE -iaa.allocated_amount END) FROM invoice_adjustment_allocations iaa JOIN invoice_adjustments ia ON ia.id=iaa.adjustment_id WHERE iaa.package_id=?),0)
         - COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id WHERE pa.package_id=?),0)
         + COALESCE((SELECT SUM(pra.amount) FROM payment_reversal_allocations pra JOIN payment_allocations pa ON pa.id=pra.payment_allocation_id WHERE pa.package_id=?),0) due`, [pkg.id,pkg.id,pkg.id,pkg.id]);
      if (blocking.length || Number(balance[0]?.due ?? 0) > 0) { await connection.rollback(); return NextResponse.json({ error: `El paquete ${pkg.code} tiene saldo pendiente o un incidente abierto.` }, { status: 409 }); }
    }
    if (fileIds.length) {
      const [files] = await connection.query<(RowDataPacket & { id: number })[]>(`SELECT id FROM files WHERE public_id IN (${fileIds.map(() => "?").join(",")}) AND uploaded_by=? AND status='READY'`, [...fileIds, auth.userId]);
      if (files.length !== fileIds.length) { await connection.rollback(); return NextResponse.json({ error: "Algún archivo de evidencia no está disponible para esta cuenta." }, { status: 400 }); }
    }
    const [warehouse] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM warehouses WHERE code='TGU' AND active=TRUE LIMIT 1");
    const deliveryPublicId = randomUUID();
    const [deliveryResult] = await connection.execute("INSERT INTO deliveries (public_id,customer_id,warehouse_id,recipient_snapshot,delivered_by,delivered_at,method) VALUES (?,?,?,?,?,NOW(3),?)", [deliveryPublicId, packages[0].customerId, warehouse[0].id, JSON.stringify({ name: recipientName, idNumber: recipientId, contact: recipientContact || null }), auth.userId, method]);
    const deliveryId = Number((deliveryResult as { insertId: number }).insertId);
    for (const pkg of packages) {
      await connection.execute("INSERT INTO delivery_items (delivery_id,package_id,shipment_id) VALUES (?,?,?)", [deliveryId, pkg.id, pkg.shipmentId]);
      await connection.execute("UPDATE packages SET logistic_status='DELIVERED' WHERE id=?", [pkg.id]);
      await connection.execute("INSERT INTO package_events (package_id,event_code,from_status,to_status,actor_id,customer_visible,observation) VALUES (?,'DELIVERED',?,'DELIVERED',?,TRUE,?)", [pkg.id,pkg.status,auth.userId,`Entregado a ${recipientName}`]);
    }
    for (const fileId of fileIds) {
      const [file] = await connection.execute<(RowDataPacket & { id: number })[]>(`SELECT id FROM files WHERE public_id=? AND uploaded_by=? AND status='READY'`, [fileId, auth.userId]);
      await connection.execute("INSERT INTO delivery_files (delivery_id,file_id) VALUES (?,?)", [deliveryId, file[0].id]);
    }
    await connection.commit();
    return NextResponse.json({ ok: true, deliveryPublicId, method, packageCodes: codes, deliveredAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    await connection.rollback(); console.error("Delivery creation error:", error);
    return NextResponse.json({ error: error instanceof Error && error.message.includes("mismo cliente") ? error.message : "No se pudo completar la entrega." }, { status: 500 });
  } finally { connection.release(); }
}
