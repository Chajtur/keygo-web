"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { FormEvent, useState } from "react";

export default function NewPrealertPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/prealerts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo crear el preregistro.");
      setCode(payload.code);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo crear el preregistro."); }
    finally { setSubmitting(false); }
  }

  if (code) return <section className="success-view"><CheckCircle2 size={55} /><p className="eyebrow">Preregistro enviado</p><h1>{code}</h1><p>El tracking quedó asociado a tu casillero. En Miami podrán identificarlo al escanearlo.</p><div><Link className="form-button" href="/app/paquetes">Ver mis paquetes</Link><button onClick={() => setCode("")} className="secondary-button">Registrar otro</button></div></section>;

  return <section className="flow-page"><Link href="/app" className="back-link"><ArrowLeft size={18} /> Inicio</Link><p className="eyebrow">Compra en camino</p><h1>Preregistra tu paquete</h1><p className="flow-intro">Avísanos antes de que llegue a Miami para identificarlo al escanear su tracking.</p>
    <form className="keygo-form" onSubmit={handleSubmit}>
      <fieldset><legend>Datos de la compra</legend><label>Número de tracking <input name="trackingRaw" required placeholder="Ej. 1Z999AA10123456784" /></label><label>Transportista <select name="carrier" defaultValue=""><option value="" disabled>Selecciona</option><option>UPS</option><option>USPS</option><option>FedEx</option><option>Amazon Logistics</option><option>Otro</option></select></label><label>Tienda <input name="store" placeholder="Ej. Amazon, Shein, Temu" /></label></fieldset>
      <fieldset><legend>Contenido y valor</legend><label>Descripción <input name="description" required placeholder="Ej. Ropa y accesorios" /></label><div className="field-row"><label>Valor declarado <input name="declaredValue" required type="number" min="0" step="0.01" placeholder="0.00" /></label><label>Moneda <select name="currency" defaultValue="USD"><option>USD</option><option>HNL</option></select></label></div></fieldset>
      <div className="info-box"><Info size={19} /><span>El peso y las dimensiones se confirmarán al recibir el paquete en Miami.</span></div>
      {error && <p style={{ color: "#b42318", fontWeight: 700 }}>{error}</p>}
      <button className="form-button" type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Enviar preregistro"} <ArrowRight size={18} /></button>
    </form>
  </section>;
}
