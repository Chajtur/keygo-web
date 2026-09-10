"use client";

import { Check, ClipboardCheck, Info, ScanLine } from "lucide-react";
import { useState } from "react";

export default function NewDeliveryPage() {
  const [checked, setChecked] = useState(false);
  return <section className="receipt-page"><p className="eyebrow">Entrega selectiva</p><h1>Confirmar retiro</h1><p className="flow-intro">La validación final se realizará con el backend antes de registrar una entrega.</p><article className="delivery-check"><span><ClipboardCheck size={21} /></span><div><b>KG-P-000131</b><small>Zapatos deportivos · Pagado</small></div><button onClick={() => setChecked(!checked)} aria-label="Confirmar paquete escaneado">{checked && <Check size={17} />}</button></article><label className="keygo-form">Código de paquete <span className="input-with-icon"><ScanLine size={20} /><input placeholder="Escanea el paquete" /></span></label><aside className="info-box"><Info size={19} /><span>Un paquete no incluido, bloqueado o con saldo pendiente será rechazado por el servidor.</span></aside><button className="form-button" disabled>Validar y confirmar entrega</button></section>;
}