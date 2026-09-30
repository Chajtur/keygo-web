import Link from "next/link";
import { ArrowRight, Box, PackageCheck, Search } from "lucide-react";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Item = RowDataPacket & { code: string; tracking: string | null; name: string | null; status: string; createdAt: Date; isPrealert: number };
const labels: Record<string, string> = { SUBMITTED: "Preregistrado", RECEIVED_USA: "Recibido en Miami", CONSOLIDATING: "En consolidación", CONSOLIDATED: "Consolidado", READY_TO_DISPATCH: "Listo para despacho", DISPATCHED: "Despachado", IN_TRANSIT: "En tránsito", CUSTOMS_HN: "En aduanas Honduras", ARRIVED_HN: "Arribó a Honduras", RECEIVED_HN: "Recibido en Honduras", PAYMENT_PENDING: "Pendiente de pago", READY_FOR_PICKUP: "Listo para retirar", OUT_FOR_DELIVERY: "En ruta de entrega", DELIVERED: "Entregado" };

export default async function PackagesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return <section className="flow-page"><p className="eyebrow">Tu carga</p><h1>Inicia sesión para ver tus paquetes</h1><Link href="/ingresar" className="form-button">Iniciar sesión</Link></section>;
  const [items] = await getDatabase().execute<Item[]>(`SELECT * FROM (
    SELECT p.code,p.tracking_raw tracking,pa.description name,p.logistic_status status,p.created_at createdAt,0 isPrealert
    FROM packages p LEFT JOIN prealerts pa ON pa.id=p.prealert_id WHERE p.customer_id=?
    UNION ALL
    SELECT a.code,a.tracking_raw tracking,a.description name,a.status,a.created_at createdAt,1 isPrealert
    FROM prealerts a WHERE a.customer_id=? AND a.status <> 'CANCELLED'
      AND NOT EXISTS (SELECT 1 FROM packages p WHERE p.prealert_id=a.id)
  ) customer_items ORDER BY createdAt DESC`, [customer.customerId, customer.customerId]);

  return <section className="flow-page"><p className="eyebrow">Tu carga</p><h1>Mis paquetes</h1><p className="flow-intro">Consulta preregistros pendientes y paquetes desde su recepción hasta la entrega.</p><label className="search-field"><Search size={18} /><input placeholder="Buscar código o tracking" aria-label="Buscar código o tracking" /></label>
    {items.length ? <div className="package-list">{items.map((item) => {
      const href = item.status === "PAYMENT_PENDING" ? "/app/pagos/nuevo" : item.status === "READY_FOR_PICKUP" ? "/app/retiros/nuevo" : "/app/envios";
      const financial = item.status === "PAYMENT_PENDING" ? "El pago final está pendiente" : ["RECEIVED_USA", "CONSOLIDATING", "CONSOLIDATED", "READY_TO_DISPATCH", "DISPATCHED", "IN_TRANSIT", "CUSTOMS_HN", "ARRIVED_HN"].includes(item.status) ? "El monto se calculará al llegar a Honduras" : item.status === "READY_FOR_PICKUP" ? "Paquete pagado y disponible para retiro" : item.isPrealert ? "Esperando recepción e identificación en Miami" : "Estado actualizado por KeyGo";
      return <article className="package-card" key={`${item.isPrealert ? "pre" : "pkg"}-${item.code}`}><span>{labels[item.status] || item.status}</span><div><i className="package-list-icon"><Box size={20} /></i><p><b>{item.code}</b><small>{item.name || (item.isPrealert ? "Preregistro" : "Paquete")} · {item.tracking || "Sin tracking"}</small><em>{financial}</em></p></div><Link href={href}>{item.status === "PAYMENT_PENDING" ? "Ir a pagos" : item.status === "READY_FOR_PICKUP" ? "Solicitar retiro" : "Seguimiento"} <ArrowRight size={17} /></Link></article>;
    })}</div> : <div className="empty-notices"><Box size={25} /><span>Aún no tienes paquetes. Cuando preregistres o recibamos una pieza en Miami, aparecerá aquí.</span></div>}
    <Link href="/app/preregistros/nuevo" className="inline-action"><PackageCheck size={21} /><span><b>¿Esperas otro paquete?</b><small>Registra su tracking antes de que llegue a Miami.</small></span><ArrowRight size={18} /></Link>
  </section>;
}
