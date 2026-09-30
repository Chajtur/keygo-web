import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ publicId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "Identificador de comprobante inválido." }, { status: 400 });
  let body: { action?: unknown; reason?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const action = String(body.action ?? "").toUpperCase();
  const reason = String(body.reason ?? "").trim().slice(0, 1000);
  if (!["APPROVE", "REJECT"].includes(action) || action === "REJECT" && reason.length < 3) return NextResponse.json({ error: "Indica aprobar o rechazar y agrega el motivo requerido para rechazar." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [reports] = await connection.execute<(RowDataPacket & { id: number; orderId: number; amount: string; status: string; customerId: number; methodId: number; reference: string; currency: string })[]>(`
      SELECT pr.id,pr.order_id orderId,pr.amount,pr.status,po.customer_id customerId,pr.method_id methodId,pr.reference,po.currency
      FROM payment_reports pr JOIN payment_orders po ON po.id=pr.order_id WHERE pr.public_id=? FOR UPDATE`, [publicId]);
    if (!reports.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró el comprobante." }, { status: 404 }); }
    const report = reports[0];
    const auth = await authorizeStaffPermission("payments.review", "TGU");
    if (!auth.ok) { await connection.rollback(); return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para revisar pagos en Honduras." }, { status: auth.status }); }
    if (report.status !== "SUBMITTED") { await connection.rollback(); return NextResponse.json({ error: "Este comprobante ya fue revisado." }, { status: 409 }); }
    if (action === "REJECT") {
      await connection.execute("UPDATE payment_reports SET status='REJECTED', reviewed_by=?, review_reason=? WHERE id=?", [auth.userId, reason, report.id]);
      await connection.commit(); return NextResponse.json({ ok: true, publicId, status: "REJECTED" });
    }
    const [orders] = await connection.execute<(RowDataPacket & { status: string; total: string })[]>("SELECT status,total_snapshot total FROM payment_orders WHERE id=? FOR UPDATE", [report.orderId]);
    if (!orders.length || orders[0].status !== "SUBMITTED" || Number(orders[0].total) !== Number(report.amount)) { await connection.rollback(); return NextResponse.json({ error: "El total reportado no coincide con la orden o esta ya no está pendiente." }, { status: 409 }); }
    const [items] = await connection.execute<(RowDataPacket & { invoiceId: number; packageId: number; amount: string; version: number; currentVersion: number; packageStatus: string; warehouseCode: string })[]>(`
      SELECT poi.invoice_id invoiceId,poi.package_id packageId,poi.amount_snapshot amount,poi.financial_version_snapshot version,
       ip.financial_version currentVersion,p.logistic_status packageStatus,w.code warehouseCode
      FROM payment_order_items poi JOIN invoice_packages ip ON ip.invoice_id=poi.invoice_id AND ip.package_id=poi.package_id
      JOIN packages p ON p.id=poi.package_id LEFT JOIN warehouses w ON w.id=p.warehouse_id
      WHERE poi.order_id=? FOR UPDATE`, [report.orderId]);
    if (!items.length || items.some((item) => Number(item.version) !== Number(item.currentVersion) || item.warehouseCode !== "TGU" || !["RECEIVED_HN", "PAYMENT_PENDING"].includes(item.packageStatus))) {
      await connection.rollback(); return NextResponse.json({ error: "Uno o más paquetes cambiaron de factura, ubicación o estado. Solicita una orden de pago actualizada." }, { status: 409 });
    }
    const [payment] = await connection.execute("INSERT INTO payments (public_id,customer_id,order_id,report_id,method_id,amount,currency,reference,confirmed_by,confirmed_at) VALUES (UUID(),?,?,?,?,?,?,?,?,NOW(3))", [report.customerId, report.orderId, report.id, report.methodId, report.amount, report.currency, report.reference, auth.userId]);
    const paymentId = Number((payment as { insertId: number }).insertId);
    for (const item of items) {
      await connection.execute("INSERT INTO payment_allocations (payment_id,invoice_id,package_id,amount) VALUES (?,?,?,?)", [paymentId, item.invoiceId, item.packageId, item.amount]);
      const [due] = await connection.execute<(RowDataPacket & { total: string })[]>(`
        SELECT COALESCE((SELECT SUM(ila.allocated_amount) FROM invoice_line_allocations ila JOIN invoices i ON i.id=ila.invoice_id WHERE ila.package_id=? AND i.status='ISSUED'),0)
          + COALESCE((SELECT SUM(CASE ia.debit_or_credit WHEN 'DEBIT' THEN iaa.allocated_amount ELSE -iaa.allocated_amount END) FROM invoice_adjustment_allocations iaa JOIN invoice_adjustments ia ON ia.id=iaa.adjustment_id WHERE iaa.package_id=?),0)
          - COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id WHERE pa.package_id=?),0)
          + COALESCE((SELECT SUM(pra.amount) FROM payment_reversal_allocations pra JOIN payment_allocations pa ON pa.id=pra.payment_allocation_id WHERE pa.package_id=?),0) total`, [item.packageId, item.packageId, item.packageId, item.packageId]);
      if (Number(due[0]?.total) <= 0 && item.packageStatus !== "READY_FOR_PICKUP") {
        await connection.execute("UPDATE packages SET logistic_status='READY_FOR_PICKUP' WHERE id=?", [item.packageId]);
        await connection.execute("INSERT INTO package_events (package_id,event_code,from_status,to_status,actor_id,customer_visible,observation) VALUES (?,'PAYMENT_CONFIRMED',?, 'READY_FOR_PICKUP',?,TRUE,'Pago validado; paquete liberado para entrega')", [item.packageId, item.packageStatus, auth.userId]);
      }
    }
    await connection.execute("UPDATE payment_reports SET status='APPROVED', reviewed_by=?, review_reason=NULL WHERE id=?", [auth.userId, report.id]);
    await connection.execute("UPDATE payment_orders SET status='PAID' WHERE id=?", [report.orderId]);
    await connection.commit(); return NextResponse.json({ ok: true, publicId, status: "APPROVED", packagesReviewed: items.length });
  } catch (error) {
    await connection.rollback(); console.error("Payment review error:", error);
    return NextResponse.json({ error: "No se pudo resolver el comprobante." }, { status: 500 });
  } finally { connection.release(); }
}
