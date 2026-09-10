import Link from "next/link";
import { ArrowRight, ClipboardCheck, PackageCheck } from "lucide-react";

const pickups = [{ code: "RT-000092", customer: "Andrea Martinez", pieces: "2 piezas seleccionadas", status: "Lista para preparar" }, { code: "RT-000093", customer: "Jose Flores", pieces: "1 pieza seleccionada", status: "Esperando pago" }];

export default function DeliveriesPage() {
  return <section><header className="operations-header"><p className="eyebrow">Sucursal Honduras</p><h1>Entregas</h1></header><div className="operations-list">{pickups.map((pickup) => <article key={pickup.code}><i><PackageCheck size={21} /></i><div><b>{pickup.code} · {pickup.customer}</b><span>{pickup.pieces}</span><small>{pickup.status}</small></div><Link href="/operacion/entregas/nueva"><ArrowRight size={18} /></Link></article>)}</div><Link href="/operacion/entregas/nueva" className="operations-action"><ClipboardCheck size={24} /><div><h2>Confirmar entrega</h2><p>Escanea solo las piezas que forman parte de una solicitud.</p></div><ArrowRight size={18} /></Link></section>;
}