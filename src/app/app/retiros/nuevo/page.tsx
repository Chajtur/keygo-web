"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheckBig, MapPin, PackageCheck } from "lucide-react";
import { useState } from "react";

const packages = [
  { id: "KG-P-000131", name: "Zapatos deportivos", paid: true, status: "Listo para retirar" },
  { id: "KG-P-000132", name: "Accesorios personales", paid: true, status: "Listo para retirar" },
  { id: "KG-P-000145", name: "Ropa y accesorios", paid: false, status: "Pendiente de pago" },
];

export default function PickupSelectionPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [requested, setRequested] = useState(false);
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  if (requested) return <section className="success-view"><CircleCheckBig size={55} /><p className="eyebrow">Solicitud creada</p><h1>Prepararemos tu seleccion.</h1><p>Te avisaremos cuando tus paquetes estén listos para retirar en la sucursal elegida.</p><Link className="form-button" href="/app">Volver al inicio</Link></section>;
  return <section className="flow-page"><Link href="/app" className="back-link"><ArrowLeft size={18} /> Inicio</Link><p className="eyebrow">Retiro por seleccion</p><h1>Elige qué retirar</h1><p className="flow-intro">Puedes dejar paquetes pagados en bodega para una próxima visita.</p>
    <div className="branch-display"><MapPin size={21} /><span><small>Sucursal de retiro</small><b>Tegucigalpa · Colonia Palmira</b></span></div>
    <div className="package-list">{packages.map((item) => { const isSelected = selected.includes(item.id); return <button disabled={!item.paid} onClick={() => toggle(item.id)} className={`selectable-package ${isSelected ? "selected" : ""}`} key={item.id}><span className="package-select">{isSelected && <Check size={15} />}</span><span className="package-list-icon"><PackageCheck size={21} /></span><span className="package-list-info"><b>{item.id}</b><small>{item.name}</small><em className={item.paid ? "ready" : "blocked"}>{item.status}</em></span></button>; })}</div>
    <button disabled={!selected.length} onClick={() => setRequested(true)} className="form-button">Solicitar retiro ({selected.length}) <ArrowRight size={18} /></button>
  </section>;
}