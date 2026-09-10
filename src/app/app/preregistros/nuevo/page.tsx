"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, Info, PackagePlus } from "lucide-react";
import { FormEvent, useState } from "react";

export default function NewPrealertPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitted(true); }

  if (submitted) return <section className="success-view"><CheckCircle2 size={55} /><p className="eyebrow">Preregistro enviado</p><h1>Ya estamos al tanto.</h1><p>Tu paquete sera identificado al llegar a nuestra bodega en Miami. Conserva tu tracking para darle seguimiento.</p><div><Link className="form-button" href="/app">Volver al inicio</Link><button onClick={() => setSubmitted(false)} className="secondary-button">Registrar otro</button></div></section>;

  return <section className="flow-page"><Link href="/app" className="back-link"><ArrowLeft size={18} /> Inicio</Link><p className="eyebrow">Paso 1 de 1</p><h1>Preregistra tu paquete</h1><p className="flow-intro">Avísanos antes de que llegue a Miami para identificarlo más rápido.</p>
    <form className="keygo-form" onSubmit={handleSubmit}>
      <fieldset><legend>Datos de la compra</legend><label>Numero de tracking <input required placeholder="Ej. 1Z999AA10123456784" /></label><small>Ingresa el codigo que te dio la tienda o transportista.</small><label>Transportista <select defaultValue=""><option value="" disabled>Selecciona un transportista</option><option>UPS</option><option>USPS</option><option>FedEx</option><option>Amazon Logistics</option><option>Otro</option></select></label><label>Tienda <input placeholder="Ej. Amazon, Shein, Temu" /></label></fieldset>
      <fieldset><legend>Contenido y valor</legend><label>Descripcion del contenido <input required placeholder="Ej. Ropa y accesorios" /></label><div className="field-row"><label>Valor declarado <input required type="number" min="0" placeholder="0.00" /></label><label>Moneda <select defaultValue="USD"><option>USD</option><option>HNL</option></select></label></div></fieldset>
      <div className="upload-placeholder"><FileUp size={23} /><div><b>Factura de compra</b><span>Opcional · PNG, JPG o PDF</span></div><button type="button">Adjuntar</button></div>
      <div className="info-box"><Info size={19} /><span>No necesitas ingresar peso o dimensiones. Nuestro equipo los confirmara al recibir tu paquete.</span></div>
      <button className="form-button" type="submit">Enviar preregistro <ArrowRight size={18} /></button>
    </form>
  </section>;
}