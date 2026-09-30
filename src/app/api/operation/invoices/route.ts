import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Charge = { packageCode?: unknown; amount?: unknown };
export async function POST(request: Request) {
  let body: { shipmentPublicId?: unknown; currency?: unknown; packages?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const shipmentPublicId = String(body.shipmentPublicId ?? "");
  const currency = String(body.currency ?? "USD").toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(shipmentPublicId) || !["USD", "HNL"].includes(currency) || !Array.isArray(body.packages) || !body.packages.length) return NextResponse.json({ error: "Indica un envío, moneda y los cargos finales por paquete." }, { status: 400 });
  const charges = body.packages as Charge[];
  const normalized = charges.map((charge) => ({ code: String(charge.packageCode ?? "").trim().toUpperCase(), amount: Number(charge.amount) }));
  if (normalized.some((charge) => !charge.code || !Number.isFinite(charge.amount) || charge.amount <= 0 || Math.round(charge.amount * 100) !== charge.amount * 100) || new Set(normalized.map((charge) => charge.code)).size !== normalized.length) return NextResponse.json({ error: "Cada paquete requiere un monto final positivo, con máximo dos decimales, y código único." }, { status: 400 });
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [shipments] = await connection.execute<(RowDataPacket & { id: number; customerId: number; code: string; status: string })[]>("SELECT id,customer_id customerId,code,status FROM shipments WHERE public_id=? FOR UPDATE", [shipmentPublicId]);
    if (!shipments.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró el envío." }, { status: 404 }); }
    const auth = await authorizeStaffPermission("invoices.finalize", "TGU");
    if (!auth.ok) { await connection.rollback(); return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para emitir cargos finales." }, { status: auth.status }); }
    const shipment = shipments[0];
    if (shipment.status !== "RECEIVED_HN") { await connection.rollback(); return NextResponse.json({ error: "La factura final solo se puede emitir tras la recepción de la carga en Honduras." }, { status: 409 }); }
    const [packages] = await connection.execute<(RowDataPacket & { id: number; code: string; status: string })[]>(`SELECT p.id,p.code,p.logistic_status status FROM shipment_packages sp JOIN packages p ON p.id=sp.package_id WHERE sp.shipment_id=? FOR UPDATE`, [shipment.id]);
    if (packages.length !== normalized.length || packages.some((pkg) => !normalized.some((charge) => charge.code === pkg.code) || !["RECEIVED_HN", "PAYMENT_PENDING"].includes(pkg.status))) { await connection.rollback(); return NextResponse.json({ error: "Incluye exactamente los paquetes elegibles de este envío." }, { status: 409 }); }
    const invoicePublicId = randomUUID();
    const invoiceCode = `KG-F-${Date.now().toString().slice(-10)}`;
    const [invoiceResult] = await connection.execute("INSERT INTO invoices (public_id,shipment_id,customer_id,code,status,currency,issued_at) VALUES (?,?,?,?,'ISSUED',?,NOW(3))", [invoicePublicId, shipment.id, shipment.customerId, invoiceCode, currency]);
    const invoiceId = Number((invoiceResult as { insertId: number }).insertId);
    let total = 0;
    for (const pkg of packages) {
      const amount = normalized.find((charge) => charge.code === pkg.code)!.amount;
      total = Math.round((total + amount) * 100) / 100;
      await connection.execute("INSERT INTO invoice_packages (invoice_id,package_id,financial_version) VALUES (?,?,1)", [invoiceId, pkg.id]);
      const [lineResult] = await connection.execute("INSERT INTO invoice_lines (invoice_id,concept,quantity,unit_amount,line_total,rule_snapshot) VALUES (?,?,1,?,?,JSON_OBJECT('packageCode',?,'source','manual_final_package_charge'))", [invoiceId, `Cargo final · ${pkg.code}`, amount, amount, pkg.code]);
      await connection.execute("INSERT INTO invoice_line_allocations (invoice_line_id,invoice_id,package_id,allocated_amount,allocation_rule_snapshot) VALUES (?,?,?, ?,JSON_OBJECT('method','package_final_amount'))", [(lineResult as { insertId: number }).insertId, invoiceId, pkg.id, amount]);
      await connection.execute("UPDATE packages SET logistic_status='PAYMENT_PENDING' WHERE id=?", [pkg.id]);
      await connection.execute("INSERT INTO package_events (package_id,event_code,from_status,to_status,actor_id,customer_visible,observation) VALUES (?,'INVOICE_ISSUED',?,'PAYMENT_PENDING',?,TRUE,'Cargo final emitido en Honduras')", [pkg.id, pkg.status, auth.userId]);
    }
    await connection.commit();
    return NextResponse.json({ ok: true, invoicePublicId, invoiceCode, shipmentCode: shipment.code, currency, total, packages: normalized }, { status: 201 });
  } catch (error) {
    await connection.rollback(); console.error("Invoice issuance error:", error);
    return NextResponse.json({ error: "No se pudo emitir la factura final." }, { status: 500 });
  } finally { connection.release(); }
}
