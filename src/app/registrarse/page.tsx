"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ lockerCode?: string; emailSent?: boolean; verificationUrl?: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo crear la cuenta.");
      }

      setResult(payload);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link href="/" aria-label="Volver al inicio"><Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority /></Link>
        <div><p className="eyebrow">Tu dirección personal en Miami</p><h1>Tu próximo envío<br /><em>comienza aquí.</em></h1><p>Al crear tu cuenta recibes un casillero personal para comprar en Estados Unidos.</p></div>
        <span>Miami · Honduras</span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <Link className="back-home" href="/">← Inicio</Link>
          {submitted ? <div className="register-success"><Check size={32} /><h2>Casillero {result?.lockerCode} creado</h2><p>{result?.emailSent ? "Enviamos un enlace de verificación a tu correo." : "El correo de prueba no pudo enviarse. Puedes continuar con el enlace local mientras se corrige Gmail."}</p>{!result?.emailSent && result?.verificationUrl ? <a href={result.verificationUrl} className="secondary-button">Verificar en modo local</a> : null}<Link href="/ingresar" className="form-button">Ir a ingresar <ArrowRight size={18} /></Link></div> : <>
            <h2>Crea tu casillero</h2><p>Completa tus datos para iniciar.</p>
            <form onSubmit={handleSubmit}>
              <label>Nombre completo<div className="input-wrap"><UserRound size={18} /><input required placeholder="Tu nombre y apellido" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div></label>
              <label>Correo electronico<div className="input-wrap"><Mail size={18} /><input required type="email" placeholder="nombre@correo.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
              <label>Telefono<div className="input-wrap"><Phone size={18} /><input required type="tel" placeholder="+504 0000-0000" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div></label>
              <label>Crea una contrasena<div className="input-wrap"><LockKeyhole size={18} /><input required minLength={8} type="password" placeholder="Minimo 8 caracteres" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>
              <label className="check-label terms"><input required type="checkbox" /> Acepto los terminos y la politica de privacidad.</label>
              {error ? <p className="auth-error" style={{ color: "#b42318", marginTop: -8, fontSize: 13, fontWeight: 700 }}>{error}</p> : null}
              <button className="form-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando casillero..." : "Crear mi casillero"} <ArrowRight size={18} /></button>
            </form>
            <p className="auth-register">Ya tienes cuenta? <Link href="/ingresar">Ingresa aquí</Link></p>
          </>}
        </div>
      </section>
    </main>
  );
}
