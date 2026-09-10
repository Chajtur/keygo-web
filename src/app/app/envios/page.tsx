import Link from "next/link";
import { ArrowRight, PackageCheck, Plane, Ship } from "lucide-react";

const shipments = [{ code: "KG-S-000120", method: "Aereo", status: "En transito", pieces: "2 paquetes", icon: Plane }, { code: "KG-S-000115", method: "Maritimo", status: "En preparacion", pieces: "1 paquete", icon: Ship }];

export default function ShipmentsPage() {
  return <section className="flow-page"><p className="eyebrow">Seguimiento</p><h1>Mis envios</h1><p className="flow-intro">Revisa dónde está tu carga y qué piezas incluye.</p><div className="shipment-list">{shipments.map(({ icon: Icon, ...shipment }) => <article className="shipment-card" key={shipment.code}><div className="shipment-card-top"><span className="method-badge"><Icon size={15} /> {shipment.method}</span><span className="status-chip">{shipment.status}</span></div><div className="shipment-title"><i className="package-icon"><PackageCheck size={22} /></i><div><h2>{shipment.code}</h2><p>{shipment.pieces}</p></div></div><Link href={`/app/envios/${shipment.code}`} className="card-link">Ver seguimiento <ArrowRight size={17} /></Link></article>)}</div></section>;
}