"use client";

import { CheckCircle2, ChevronRight, Info, Ruler, ScanLine } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ReceiptPage() {
  const [step, setStep] = useState(1);
  const [tracking, setTracking] = useState("");
  const [measurements, setMeasurements] = useState({ weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });
  const [result, setResult] = useState<{ packageCode: string; emailSent: boolean } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function identify(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setStep(2); }
  function measure(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setStep(3); }
  async function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/packages/receive-by-tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracking, ...measurements }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo recibir el paquete.");
      setResult(payload);
    } catch (receiveError) { setError(receiveError instanceof Error ? receiveError.message : "No se pudo recibir el paquete."); }
    finally { setSubmitting(false); }
  }

  if (result) return <section className="success-view"><CheckCircle2 size={55} /><p className="eyebrow">Recepción completada</p><h1>{result.packageCode}</h1><p>Paquete recibido en Miami. {result.emailSent ? "El cliente fue notificado por correo." : "El paquete quedó registrado, pero Gmail no pudo enviar el aviso."}</p><button className="form-button" onClick={() => { setResult(null); setTracking(""); setStep(1); }}>Recibir otro paquete</button></section>;

  return <section className="receipt-page"><p className="eyebrow">Recepción Miami</p><h1>Ingresar paquete</h1><p className="flow-intro">Escanea el tracking preregistrado, confirma sus medidas y ubícalo.</p><ol className="receipt-steps"><li className={step >= 1 ? "active" : ""}>Escanear</li><li className={step >= 2 ? "active" : ""}>Medir</li><li className={step >= 3 ? "active" : ""}>Ubicar</li></ol>
    {step === 1 && <form className="keygo-form" onSubmit={identify}><label>Tracking recibido <span className="input-with-icon"><ScanLine size={20} /><input required autoFocus placeholder="Escanea o escribe el tracking" value={tracking} onChange={(event) => setTracking(event.target.value)} /></span></label><aside className="info-box"><Info size={19} /><span>El servidor validará que exista un preregistro pendiente.</span></aside><button className="form-button">Continuar <ChevronRight size={18} /></button></form>}
    {step === 2 && <form className="keygo-form" onSubmit={measure}><label>Peso (kg)<input required type="number" min="0.001" step="0.001" value={measurements.weightKg} onChange={(e) => setMeasurements({ ...measurements, weightKg: e.target.value })} /></label><div className="field-row"><label>Largo (cm)<input required type="number" min="0.01" step="0.01" value={measurements.lengthCm} onChange={(e) => setMeasurements({ ...measurements, lengthCm: e.target.value })} /></label><label>Ancho (cm)<input required type="number" min="0.01" step="0.01" value={measurements.widthCm} onChange={(e) => setMeasurements({ ...measurements, widthCm: e.target.value })} /></label></div><label>Alto (cm)<input required type="number" min="0.01" step="0.01" value={measurements.heightCm} onChange={(e) => setMeasurements({ ...measurements, heightCm: e.target.value })} /></label><button className="form-button">Guardar medidas <Ruler size={18} /></button></form>}
    {step === 3 && <form className="keygo-form" onSubmit={receive}><label>Ubicación en bodega<select defaultValue="MIA-RECEPCION"><option>MIA-RECEPCION</option></select></label><aside className="info-box"><Info size={19} /><span>Se creará el código interno, el evento de tracking y el aviso al cliente.</span></aside>{error && <p style={{ color: "#b42318", fontWeight: 700 }}>{error}</p>}<button className="form-button" disabled={submitting}>{submitting ? "Confirmando..." : "Confirmar recepción"}</button></form>}
  </section>;
}
