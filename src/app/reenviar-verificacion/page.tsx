"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo procesar la solicitud.");
      setSubmitted(true);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo procesar la solicitud."); }
    finally { setSending(false); }
  }

  return <main className="auth-page">
    <section className="auth-aside"><Link href="/" aria-label="Volver al inicio"><Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority /></Link><div><p className="eyebrow">Activación de cuenta</p><h1>Tu casillero<br /><em>está casi listo.</em></h1><p>Solicita un nuevo enlace para confirmar el correo de tu cuenta.</p></div><span>Miami · Honduras</span></section>
    <section className="auth-form-wrap"><div className="auth-form"><Link className="back-home" href="/ingresar">← Ingresar</Link>
      {submitted ? <div className="register-success"><CheckCircle2 size={34} /><h2>Revisa tu correo</h2><p>Si la cuenta existe y aún no está verificada, recibirás un nuevo enlace en {email}.</p><Link href="/ingresar" className="form-button">Volver a ingresar <ArrowRight size={18} /></Link></div> : <>
        <h2>Reenviar verificación</h2><p>Escribe el correo con el que creaste tu casillero.</p><form onSubmit={handleSubmit}><label>Correo electrónico<div className="input-wrap"><Mail size={18} /><input required type="email" autoComplete="email" placeholder="nombre@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>{error && <p className="auth-error" style={{ color: "#b42318", fontWeight: 700 }}>{error}</p>}<button className="form-button" type="submit" disabled={sending}>{sending ? "Solicitando..." : "Enviar enlace"} <ArrowRight size={18} /></button></form>
      </>}
    </div></section>
  </main>;
}
