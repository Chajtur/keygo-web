import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type PackageRow = RowDataPacket & { id: number; code: string; tracking: string | null; status: string; weightKg: string | null; lengthCm: string | null; widthCm: string | null; heightCm: string | null; measurementId: number | null };
type RateRule = RowDataPacket & { method: "AIR" | "SEA"; planCode: string; version: number; currency: string; concept: string; basis: string; divisor: string | null; minimumAmount: string | null; roundingRule: string | null; amount: string };

async function currentCustomer() {
  const customer = await getCurrentCustomer();
  return customer ? customer : null;
}

async function findAvailablePackages(customerId: number) {
  const [packages] = await getDatabase().execute<PackageRow[]>(`
    SELECT p.id,p.code,p.tracking_raw tracking,p.logistic_status status,
           m.id measurementId,m.weight_kg weightKg,m.length_cm lengthCm,m.width_cm widthCm,m.height_cm heightCm
    FROM packages p
    JOIN warehouses w ON w.id=p.warehouse_id AND w.code='MIA'
    LEFT JOIN package_measurements m ON m.id=(SELECT pm.id FROM package_measurements pm WHERE pm.package_id=p.id ORDER BY pm.measured_at DESC,pm.id DESC LIMIT 1)
    WHERE p.customer_id=? AND p.logistic_status='RECEIVED_USA'
      AND NOT EXISTS (SELECT 1 FROM cargo_reservations cr WHERE cr.package_id=p.id)
    ORDER BY p.received_at,p.id`, [customerId]);
  return packages;
}

async function getRates() {
  const [rules] = await getDatabase().execute<RateRule[]>(`
    SELECT rp.method,rp.code planCode,rp.version,rp.currency,rr.concept,rr.basis,rr.divisor,
           rr.minimum_amount minimumAmount,rr.rounding_rule roundingRule,rr.amount
    FROM rate_plans rp
    JOIN warehouses o ON o.id=rp.origin_warehouse_id AND o.code='MIA'
    JOIN warehouses d ON d.id=rp.destination_warehouse_id AND d.code='TGU'
    JOIN rate_rules rr ON rr.rate_plan_id=rp.id
    WHERE rp.active=TRUE AND rp.effective_from<=NOW(3) AND (rp.effective_to IS NULL OR rp.effective_to>NOW(3))
      AND rp.id=(SELECT current_plan.id FROM rate_plans current_plan
        WHERE current_plan.method=rp.method AND current_plan.active=TRUE
          AND current_plan.origin_warehouse_id=rp.origin_warehouse_id
          AND current_plan.destination_warehouse_id=rp.destination_warehouse_id
          AND current_plan.effective_from<=NOW(3)
          AND (current_plan.effective_to IS NULL OR current_plan.effective_to>NOW(3))
        ORDER BY current_plan.effective_from DESC,current_plan.version DESC LIMIT 1)
    ORDER BY rp.method,rp.effective_from DESC,rp.version DESC,rr.id`);
  const byMethod = new Map<string, RateRule[]>();
  for (const rule of rules) {
    if (!byMethod.has(rule.method)) byMethod.set(rule.method, []);
    byMethod.get(rule.method)!.push(rule);
  }
  return byMethod;
}

function estimate(packages: PackageRow[], rules: RateRule[]) {
  if (!packages.length || !rules.length || packages.some((item) => !item.weightKg || !item.lengthCm || !item.widthCm || !item.heightCm)) return null;
  const weight = packages.reduce((sum, item) => sum + Number(item.weightKg), 0);
  const volume = packages.reduce((sum, item) => sum + Number(item.lengthCm) * Number(item.widthCm) * Number(item.heightCm), 0);
  let total = 0;
  const breakdown = rules.map((rule) => {
    const basis = rule.basis.toUpperCase();
    const divisor = Number(rule.divisor || 0);
    let quantity: number;
    if (["KG", "WEIGHT_KG", "ACTUAL_KG"].includes(basis)) quantity = weight;
    else if (["VOLUMETRIC_KG", "VOLUME_KG", "VOLUMETRIC_WEIGHT"].includes(basis)) quantity = divisor > 0 ? volume / divisor : 0;
    else if (["CHARGEABLE_KG", "BILLABLE_KG"].includes(basis)) quantity = Math.max(weight, divisor > 0 ? volume / divisor : 0);
    else if (["PACKAGE", "PER_PACKAGE", "UNIT"].includes(basis)) quantity = packages.length;
    else quantity = 0;
    if (quantity <= 0) return { concept: rule.concept, basis: rule.basis, quantity: 0, amount: 0 };
    const rounding = (rule.roundingRule || "").toUpperCase();
    if (["CEIL", "UP", "ROUND_UP", "NEXT_INTEGER"].includes(rounding)) quantity = Math.ceil(quantity);
    else if (["ROUND", "NEAREST"].includes(rounding)) quantity = Math.round(quantity);
    let amount = Math.round(quantity * Number(rule.amount) * 100) / 100;
    amount = Math.max(amount, Number(rule.minimumAmount || 0));
    total += amount;
    return { concept: rule.concept, basis: rule.basis, quantity: Math.round(quantity * 1000) / 1000, amount: Math.round(amount * 100) / 100 };
  });
  if (breakdown.every((line) => line.amount === 0)) return null;
  return { plan: `${rules[0].planCode} v${rules[0].version}`, currency: rules[0].currency, total: Math.round(total * 100) / 100, weightKg: Math.round(weight * 1000) / 1000, breakdown };
}

export async function GET(request: Request) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para solicitar un envío." }, { status: 401 });
  const [packages, rates] = await Promise.all([findAvailablePackages(customer.customerId), getRates()]);
  const requestedCodes = new URL(request.url).searchParams.getAll("code").map((code) => code.toUpperCase());
  const selected = requestedCodes.length ? packages.filter((item) => requestedCodes.includes(item.code)) : [];
  return NextResponse.json({ packages, estimates: { AIR: estimate(selected, rates.get("AIR") || []), SEA: estimate(selected, rates.get("SEA") || []) } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Inicia sesión para solicitar un envío." }, { status: 401 });
  let body: { packageCodes?: unknown; method?: unknown; consolidate?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const codes = Array.isArray(body.packageCodes) ? [...new Set(body.packageCodes.map((code) => String(code).trim().toUpperCase()))] : [];
  const method = String(body.method || "").toUpperCase();
  const consolidate = body.consolidate === true;
  if (!codes.length || codes.length > 50 || codes.some((code) => !code || code.length > 32) || !["AIR", "SEA"].includes(method)) return NextResponse.json({ error: "Selecciona paquetes y un medio de transporte válido." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [packages] = await connection.query<PackageRow[]>(`
      SELECT p.id,p.code,p.tracking_raw tracking,p.logistic_status status,
             m.id measurementId,m.weight_kg weightKg,m.length_cm lengthCm,m.width_cm widthCm,m.height_cm heightCm
      FROM packages p
      JOIN warehouses w ON w.id=p.warehouse_id AND w.code='MIA'
      LEFT JOIN package_measurements m ON m.id=(SELECT pm.id FROM package_measurements pm WHERE pm.package_id=p.id ORDER BY pm.measured_at DESC,pm.id DESC LIMIT 1)
      WHERE p.customer_id=? AND p.code IN (${codes.map(() => "?").join(",")})
        AND p.logistic_status='RECEIVED_USA'
        AND NOT EXISTS (SELECT 1 FROM cargo_reservations cr WHERE cr.package_id=p.id)
      ORDER BY p.id FOR UPDATE`, [customer.customerId, ...codes]);
    if (packages.length !== codes.length) { await connection.rollback(); return NextResponse.json({ error: "Algún paquete ya no está disponible para solicitar despacho. Actualiza la lista." }, { status: 409 }); }

    const [warehouses] = await connection.execute<(RowDataPacket & { id: number; code: string })[]>("SELECT id,code FROM warehouses WHERE code IN ('MIA','TGU') AND active=TRUE");
    const origin = warehouses.find((warehouse) => warehouse.code === "MIA"), destination = warehouses.find((warehouse) => warehouse.code === "TGU");
    if (!origin || !destination) { await connection.rollback(); return NextResponse.json({ error: "No están configuradas las bodegas de origen y destino." }, { status: 409 }); }

    let consolidationId: number | null = null;
    let consolidationCode: string | null = null;
    if (consolidate) {
      const [result] = await connection.execute("INSERT INTO consolidations (public_id,code,customer_id,origin_warehouse_id,status,requested_by) VALUES (?,?,?,?,'REQUESTED',?)", [randomUUID(), `KG-C-${Date.now().toString().slice(-8)}`, customer.customerId, origin.id, customer.userId]);
      consolidationId = Number((result as { insertId: number }).insertId);
      const [created] = await connection.execute<(RowDataPacket & { code: string })[]>("SELECT code FROM consolidations WHERE id=?", [consolidationId]);
      consolidationCode = created[0].code;
      for (const item of packages) await connection.execute("INSERT INTO consolidation_items (consolidation_id,package_id,actor_id) VALUES (?,?,?)", [consolidationId, item.id, customer.userId]);
    }

    const shipmentPublicId = randomUUID();
    const shipmentCode = `KG-S-${Date.now().toString().slice(-8)}`;
    await connection.execute("INSERT INTO shipments (public_id,code,customer_id,consolidation_id,method,origin_warehouse_id,destination_warehouse_id,status,destination_snapshot) VALUES (?,?,?,?,?,?,?,'REQUESTED',JSON_OBJECT('warehouse','TGU'))", [shipmentPublicId, shipmentCode, customer.customerId, consolidationId, method, origin.id, destination.id]);
    const [createdShipment] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM shipments WHERE public_id=?", [shipmentPublicId]);
    const shipmentId = Number(createdShipment[0].id);
    await connection.execute("INSERT INTO shipment_events (shipment_id,to_status,actor_id,observation) VALUES (?,'REQUESTED',?,'Solicitud de despacho realizada por el cliente')", [shipmentId, customer.userId]);
    for (const item of packages) {
      await connection.execute("INSERT INTO shipment_packages (shipment_id,package_id,confirmed_measurement_id) VALUES (?,?,?)", [shipmentId, item.id, item.measurementId]);
      await connection.execute("INSERT INTO cargo_reservations (package_id,consolidation_id,shipment_id) VALUES (?,?,?)", [item.id, consolidationId, shipmentId]);
      await connection.execute("INSERT INTO package_events (package_id,event_code,from_status,to_status,actor_id,customer_visible,observation) VALUES (?,'SHIPMENT_REQUESTED',? ,?, ?,TRUE,?)", [item.id, item.status, item.status, customer.userId, `Solicitud ${shipmentCode} · ${method === "AIR" ? "Aéreo" : "Marítimo"}`]);
    }
    await connection.commit();
    return NextResponse.json({ ok: true, shipmentCode, shipmentPublicId, method, consolidate, consolidationCode, packageCount: packages.length }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Shipment request error:", error);
    return NextResponse.json({ error: "No se pudo registrar la solicitud de despacho." }, { status: 500 });
  } finally { connection.release(); }
}
