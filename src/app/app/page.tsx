import Link from "next/link";
import { ArrowRight, Box, ChevronRight, ClipboardPlus, MapPin, PackageCheck } from "lucide-react";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

type Counts = RowDataPacket & { miami: number; transit: number; honduras: number; paymentPending: number; readyPickup: number };
type RecentItem = RowDataPacket & { code: string; tracking: string | null; description: string | null; status: string; createdAt: Date; isPrealert: number };

const statusLabels: Record<string, string> = {
  RECEIVED_USA: "Recibido en Miami", CONSOLIDATING: "En consolidación", CONSOLIDATED: "Consolidado",
  READY_TO_DISPATCH: "Listo para despacho", DISPATCHED: "Despachado", IN_TRANSIT: "En tránsito",
  CUSTOMS_HN: "En aduanas Honduras", ARRIVED_HN: "Arribó a Honduras", RECEIVED_HN: "Recibido en Honduras",
  PAYMENT_PENDING: "Pendiente de pago", READY_FOR_PICKUP: "Listo para retirar", OUT_FOR_DELIVERY: "En ruta de entrega",
  DELIVERED: "Entregado", SUBMITTED: "Preregistrado",
};

export default async function CustomerHome() {
  const customer = await getCurrentCustomer();
  if (!customer) return <section className="flow-page"><p className="eyebrow">Portal de clientes</p><h1>Inicia sesión para ver tu carga</h1><p className="flow-intro">Tu casillero, preregistros y paquetes aparecen aquí al entrar a tu cuenta.</p><Link className="form-button" href="/ingresar">Iniciar sesión <ArrowRight size={18} /></Link></section>;

  const db = getDatabase();
  const [[countRows], [recent]] = await Promise.all([
    db.execute<Counts[]>(`SELECT
      SUM(p.logistic_status IN ('RECEIVED_USA','CONSOLIDATING','CONSOLIDATED','READY_TO_DISPATCH')) miami,
      SUM(p.logistic_status IN ('DISPATCHED','IN_TRANSIT','CUSTOMS_HN')) transit,
      SUM(p.logistic_status IN ('ARRIVED_HN','RECEIVED_HN','PAYMENT_PENDING','READY_FOR_PICKUP','OUT_FOR_DELIVERY')) honduras,
      SUM(p.logistic_status='PAYMENT_PENDING') paymentPending,
      SUM(p.logistic_status='READY_FOR_PICKUP') readyPickup
      FROM packages p WHERE p.customer_id=?`, [customer.customerId]),
    db.execute<RecentItem[]>(`SELECT * FROM (
      SELECT p.code, p.tracking_raw tracking, pa.description, p.logistic_status status, p.created_at createdAt, 0 isPrealert
      FROM packages p LEFT JOIN prealerts pa ON pa.id=p.prealert_id WHERE p.customer_id=?
      UNION ALL
      SELECT a.code, a.tracking_raw tracking, a.description, a.status, a.created_at createdAt, 1 isPrealert
      FROM prealerts a WHERE a.customer_id=? AND a.status <> 'CANCELLED'
        AND NOT EXISTS (SELECT 1 FROM packages p WHERE p.prealert_id=a.id)
    ) recent_items ORDER BY createdAt DESC LIMIT 5`, [customer.customerId, customer.customerId]),
  ]);
  const counts = countRows[0] ?? { miami: 0, transit: 0, honduras: 0, paymentPending: 0, readyPickup: 0 };
  const count = (value: number | null) => Number(value ?? 0).toString().padStart(2, "0");
  const date = (value: Date) => new Intl.DateTimeFormat("es-HN", { day: "2-digit", month: "short" }).format(new Date(value));

  return <>
    <section className="customer-welcome"><p>Buenos días, <strong>{customer.fullName.split(" ")[0]}</strong></p><h1>Todo bajo control.</h1></section>
    <section className="locker-card"><div className="locker-icon"><MapPin size={22} /></div><div><span>Tu casillero en Miami</span><strong>{customer.lockerCode}</strong></div><Link href="/app/casillero" aria-label="Ver mi casillero"><ChevronRight size={22} /></Link></section>
    <section className="quick-actions" aria-label="Acciones principales">
      <Link href="/app/preregistros/nuevo"><span className="quick-icon orange"><ClipboardPlus size={23} /></span><span>Preregistrar<br />paquete</span></Link>
      <Link href="/app/paquetes"><span className="quick-icon blue"><Box size={23} /></span><span>Ver mis<br />paquetes</span></Link>
      {Number(counts.paymentPending) > 0 && <Link href="/app/pagos/nuevo"><span className="quick-icon green"><PackageCheck size={23} /></span><span>Pagar<br />paquetes</span></Link>}
    </section>
    <section className="shipment-summary"><div className="section-label"><span>Resumen de carga</span><Link href="/app/paquetes">Ver todo</Link></div><div className="summary-grid"><div><b>{count(counts.miami)}</b><span>En Miami</span></div><div><b>{count(counts.transit)}</b><span>En tránsito</span></div><div><b>{count(counts.honduras)}</b><span>En Honduras</span></div></div></section>
    <section className="section-block"><div className="section-label"><span>Actividad reciente</span><Link href="/app/paquetes">Ver todos</Link></div>
      {recent.length ? <div className="package-list">{recent.map((item) => <article className="package-card" key={`${item.isPrealert ? "pre" : "pkg"}-${item.code}`}><span>{statusLabels[item.status] || item.status}</span><div><i className="package-list-icon"><Box size={20} /></i><p><b>{item.code}</b><small>{item.description || (item.isPrealert ? "Preregistro pendiente de recepción" : "Paquete recibido")} · {item.tracking || "Sin tracking"}</small><em>{date(item.createdAt)}{item.isPrealert ? " · Esperando recepción en Miami" : ""}</em></p></div><Link href="/app/paquetes">Ver detalle <ArrowRight size={17} /></Link></article>)}</div> : <div className="empty-notices"><PackageCheck size={25} /><span>Aún no hay paquetes ni preregistros en tu cuenta. Cuando registres uno, aparecerá aquí.</span></div>}
    </section>
    {Number(counts.paymentPending) > 0 && <Link href="/app/pagos/nuevo" className="pending-action"><span className="pending-icon"><PackageCheck size={23} /></span><span><b>{count(counts.paymentPending)} paquete(s) con pago pendiente</b><small>El cargo final se habilita después de su llegada a Honduras.</small></span><ChevronRight size={20} /></Link>}
    {Number(counts.readyPickup) > 0 && <Link href="/app/retiros/nuevo" className="pending-action"><span className="pending-icon blue"><PackageCheck size={23} /></span><span><b>{count(counts.readyPickup)} paquete(s) listo(s) para retirar</b><small>Elige qué paquetes recoger.</small></span><ChevronRight size={20} /></Link>}
  </>;
}
