"use client";

import { Check, Copy, MapPin } from "lucide-react";
import { useState } from "react";

export default function LockerPage() {
  const [copied, setCopied] = useState(false);
  const address = "Andrea Martinez, KG-032875\n7420 NW 52nd Street\nMiami, FL 33166\nUnited States";
  async function copyAddress() { await navigator.clipboard.writeText(address); setCopied(true); }
  return <section className="flow-page"><p className="eyebrow">Compras en USA</p><h1>Mi casillero</h1><p className="flow-intro">Usa esta dirección exactamente como aparece en tus compras.</p><article className="locker-address"><div><i className="locker-icon"><MapPin size={21} /></i><p><small>Tu codigo personal</small><b>KG-032875</b></p></div><pre>{address}</pre><button className="form-button" onClick={copyAddress}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Direccion copiada" : "Copiar direccion"}</button></article><aside className="info-box"><MapPin size={19} /><span>Incluye tu nombre y código de casillero en la dirección de entrega para identificar tu compra al llegar.</span></aside></section>;
}