"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, Package } from "lucide-react";
import { useState } from "react";

const packages = [
  { id: "KG-P-000145", name: "Ropa y accesorios", tracking: "1Z8A75E...", finalAmount: null, status: "En Miami" },
  { id: "KG-P-000146", name: "Articulos para hogar", tracking: "940011...", finalAmount: null, status: "En tránsito" },
  { id: "KG-P-000142", name: "Electronicos", tracking: "TBA308...", finalAmount: 43.2, status: "En Honduras" },
];

export default function PaymentSelectionPage() {
  const [selected, setSelected] = useState<string[]>(["KG-P-000142"]);
  const payablePackages = packages.filter((item) => item.status === "En Honduras" && item.finalAmount !== null);
  const total = payablePackages.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + (item.finalAmount ?? 0), 0);
  function toggle(id: string) {
    if (!payablePackages.some((item) => item.id === id)) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  return <section className="flow-page"><Link href="/app" className="back-link"><ArrowLeft size={18} /> Inicio</Link><p className="eyebrow">Pagos por paquete</p><h1>Elige qué pagar</h1><p className="flow-intro">El pago se habilita cuando el paquete llega a Honduras y se confirma su monto final. Los demás seguirán pendientes.</p>
    <div className="package-list">{packages.map((item) => { const available = item.status === "En Honduras" && item.finalAmount !== null; const isSelected = available && selected.includes(item.id); return <button type="button" disabled={!available} onClick={() => toggle(item.id)} className={`selectable-package ${isSelected ? "selected" : ""}`} key={item.id}><span className="package-select">{isSelected && <Check size={15} />}</span><span className="package-list-icon"><Package size={21} /></span><span className="package-list-info"><b>{item.id}</b><small>{item.name} · {item.tracking}</small><em className={available ? "ready" : "blocked"}>{available ? "Monto final confirmado · Listo para pagar" : `${item.status} · Monto final pendiente hasta llegar a Honduras`}</em></span>{available && <span className="package-amount">${item.finalAmount.toFixed(2)}</span>}</button>; })}</div>
    <aside className="selection-total"><div><span>Total de la seleccion</span><b>USD ${total.toFixed(2)}</b><small>{selected.length} paquete{selected.length === 1 ? "" : "s"} seleccionado{selected.length === 1 ? "" : "s"}</small></div><CircleDollarSign size={30} /></aside>
    <button disabled={!selected.length} className="form-button">Continuar con el pago <ArrowRight size={18} /></button>
  </section>;
}
