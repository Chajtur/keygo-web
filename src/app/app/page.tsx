import Link from "next/link";
import { ArrowRight, Box, ChevronRight, CircleDollarSign, ClipboardPlus, MapPin, PackageCheck, Plane, Ship, WalletCards } from "lucide-react";

const timeline = [
  { label: "Recibido en Miami", date: "18 SEP", complete: true },
  { label: "En transito", date: "23 SEP", current: true },
  { label: "Disponible en Honduras", date: "PROX.", complete: false },
];

export default function CustomerHome() {
  return (
    <>
      <section className="customer-welcome">
        <p>Buenos dias, <strong>Andrea</strong></p>
        <h1>Todo bajo control.</h1>
      </section>

      <section className="locker-card">
        <div className="locker-icon"><MapPin size={22} /></div>
        <div><span>Tu casillero en Miami</span><strong>KG-032875</strong></div>
        <Link href="/app/casillero" aria-label="Ver mi casillero"><ChevronRight size={22} /></Link>
      </section>

      <section className="quick-actions" aria-label="Acciones principales">
        <Link href="/app/preregistros/nuevo"><span className="quick-icon orange"><ClipboardPlus size={23} /></span><span>Preregistrar<br />paquete</span></Link>
        <Link href="/app/paquetes"><span className="quick-icon blue"><Box size={23} /></span><span>Ver mis<br />paquetes</span></Link>
        <Link href="/app/pagos/nuevo"><span className="quick-icon green"><WalletCards size={23} /></span><span>Pagar<br />seleccion</span></Link>
      </section>

      <section className="shipment-summary">
        <div className="section-label"><span>Resumen de carga</span><Link href="/app/paquetes">Ver todo</Link></div>
        <div className="summary-grid">
          <div><b>02</b><span>En Miami</span></div><div><b>01</b><span>En transito</span></div><div><b>03</b><span>En Honduras</span></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-label"><span>En camino a Honduras</span><Link href="/app/envios">Ver envios</Link></div>
        <article className="shipment-card">
          <div className="shipment-card-top"><span className="method-badge"><Plane size={15} /> Aereo</span><span className="status-chip">En transito</span></div>
          <div className="shipment-title"><div className="package-icon"><PackageCheck size={23} /></div><div><h2>KG-S-000120</h2><p>2 paquetes en este envio</p></div></div>
          <div className="timeline">{timeline.map((item) => <div className={item.current ? "current" : item.complete ? "complete" : ""} key={item.label}><i></i><span>{item.label}</span><small>{item.date}</small></div>)}</div>
          <Link href="/app/envios/KG-S-000120" className="card-link">Ver seguimiento <ArrowRight size={17} /></Link>
        </article>
      </section>

      <section className="section-block">
        <div className="section-label"><span>Acciones pendientes</span></div>
        <Link href="/app/pagos/nuevo" className="pending-action"><span className="pending-icon"><CircleDollarSign size={23} /></span><span><b>1 paquete listo para pagar</b><small>Elige las piezas que deseas pagar.</small></span><ChevronRight size={20} /></Link>
        <Link href="/app/retiros/nuevo" className="pending-action"><span className="pending-icon blue"><Ship size={23} /></span><span><b>2 paquetes listos para retirar</b><small>Selecciona los que quieres recibir.</small></span><ChevronRight size={20} /></Link>
      </section>
    </>
  );
}