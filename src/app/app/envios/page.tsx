import Link from "next/link";
import { ArrowRight, PackageCheck, Plane, Ship } from "lucide-react";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";
import ShipmentRequestForm from "./ShipmentRequestForm";

export const dynamic = "force-dynamic";
type Shipment = RowDataPacket & { code: string; method: "AIR" | "SEA"; status: string; packageCount: number; requestedAt: Date };
const statuses: Record<string, string> = { REQUESTED: "Solicitud recibida", ASSIGNED: "Preparando despacho", DISPATCHED: "Despachado", IN_TRANSIT: "En tránsito", CUSTOMS_HN: "En aduanas Honduras", ARRIVED_HN: "Arribó a Honduras", RECEIVED_HN: "Recibido en Honduras" };

export default async function ShipmentsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return <section className="flow-page"><p className="eyebrow">Seguimiento</p><h1>Inicia sesión para consultar tus envíos</h1><Link href="/ingresar" className="form-button">Iniciar sesión</Link></section>;
  const [shipments] = await getDatabase().execute<Shipment[]>(`SELECT s.code,s.method,s.status,s.requested_at requestedAt,COUNT(sp.package_id) packageCount
    FROM shipments s LEFT JOIN shipment_packages sp ON sp.shipment_id=s.id
    WHERE s.customer_id=? GROUP BY s.id ORDER BY s.requested_at DESC`, [customer.customerId]);
  return <section className="flow-page"><p className="eyebrow">Seguimiento y solicitudes</p><h1>Mis envíos</h1><p className="flow-intro">Solicita el despacho de tus paquetes en Miami y consulta el avance de tu carga.</p><ShipmentRequestForm />
    {shipments.length ? <div className="shipment-list">{shipments.map((shipment) => { const Icon = shipment.method === "AIR" ? Plane : Ship; return <article className="shipment-card" key={shipment.code}><div className="shipment-card-top"><span className="method-badge"><Icon size={15} /> {shipment.method === "AIR" ? "Aéreo" : "Marítimo"}</span><span className="status-chip">{statuses[shipment.status] || shipment.status}</span></div><div className="shipment-title"><i className="package-icon"><PackageCheck size={22} /></i><div><h2>{shipment.code}</h2><p>{shipment.packageCount} paquete{shipment.packageCount === 1 ? "" : "s"} · Solicitado {new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(shipment.requestedAt))}</p></div></div></article>; })}</div> : <div className="empty-notices"><PackageCheck size={25} /><span>Tus preregistros y paquetes aparecerán aquí cuando KeyGo los incluya en un envío hacia Honduras.</span></div>}
    <Link href="/app/paquetes" className="inline-action"><PackageCheck size={21} /><span><b>Consultar mis paquetes</b><small>Revisa preregistros y estados individuales.</small></span><ArrowRight size={18} /></Link>
  </section>;
}
