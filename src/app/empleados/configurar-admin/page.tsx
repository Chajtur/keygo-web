"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Availability = { enabled: boolean };

async function getAvailability(): Promise<Availability> {
  const response = await fetch("/api/operation/auth/bootstrap-admin", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || "No se pudo revisar la configuración.");
  return payload as Availability;
}

export default function ConfigureAdminPage() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    getAvailability().then((result) => { if (active) setAvailability(result); })
      .catch(() => { if (active) { setAvailability({ enabled: false }); setAvailabilityError(true); } });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirm) { setError("Las contraseñas no coinciden."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/operation/auth/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, token, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo crear la cuenta.");
      setSuccess(true);
      setAvailability({ enabled: false });
      setToken(""); setPassword(""); setPasswordConfirm("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la cuenta maestra.");
    } finally { setSubmitting(false); }
  }

  return <main className="auth-page employee-auth-page">
    <section className="auth-aside employee-auth-aside">
      <Link href="/" aria-label="Volver al sitio de KeyGo"><Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority /></Link>
      <div><p className="eyebrow">Configuración inicial</p><h1>El primer paso<br /><em>de tu equipo.</em></h1><p>Crea la cuenta maestra que administrará los accesos y roles del personal KeyGo.</p></div>
      <span>Configuración de un solo uso</span>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-form employee-auth-form bootstrap-admin-form">
        <Link className="back-home" href="/empleados/ingresar">← Acceso de empleados</Link>
        <div className="employee-login-mark"><ShieldCheck size={19} /><span>ADMINISTRADOR MAESTRO</span></div>
        {success ? <div className="bootstrap-state"><h2>Cuenta creada</h2><p>La cuenta maestra ya está configurada y el formulario de alta inicial quedó cerrado.</p><Link className="form-button bootstrap-link" href="/empleados/ingresar">Ir al inicio de sesión <ArrowRight size={18} /></Link></div>
          : availability === null ? <div className="bootstrap-state"><h2>Verificando configuración</h2><p>Estamos comprobando si la cuenta maestra todavía puede crearse.</p></div>
          : availabilityError ? <div className="bootstrap-state"><h2>No se pudo verificar</h2><p>El servidor no pudo comprobar si la configuración inicial está disponible. Revisa la conexión a la base de datos e inténtalo de nuevo.</p></div>
          : !availability.enabled ? <div className="bootstrap-state"><h2>Configuración cerrada</h2><p>La creación inicial no está habilitada o ya existe una cuenta maestra. Inicia sesión con la cuenta administradora o solicita al administrador la recuperación de acceso.</p><Link className="form-button bootstrap-link" href="/empleados/ingresar">Ir al inicio de sesión <ArrowRight size={18} /></Link></div>
          : <>
            <h2>Crear cuenta maestra</h2>
            <p>Este formulario solo funciona una vez. La cuenta tendrá permisos de administración y acceso a las bodegas activas.</p>
            <form onSubmit={handleSubmit}>
              <label>Código temporal de configuración<div className="input-wrap"><KeyRound size={18} aria-hidden="true" /><input required type="password" autoComplete="off" minLength={32} maxLength={512} value={token} onChange={(event) => setToken(event.target.value)} /></div><small>Debe coincidir con `ADMIN_BOOTSTRAP_TOKEN` configurado en el servidor.</small></label>
              <label>Nombre completo<div className="input-wrap"><UserRound size={18} aria-hidden="true" /><input required minLength={2} maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div></label>
              <label>Correo del administrador<div className="input-wrap"><Mail size={18} aria-hidden="true" /><input required type="email" autoCapitalize="none" autoComplete="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
              <label>Contraseña<div className="input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></div><small>Mínimo 12 caracteres. Utiliza una contraseña única.</small></label>
              <label>Confirmar contraseña<div className="input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></div></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="form-button" type="submit" disabled={submitting}>{submitting ? "Creando cuenta..." : "Crear administrador"}<ArrowRight size={18} /></button>
            </form>
            <p className="employee-auth-help">Antes de abrir esta página, configura un secreto aleatorio de al menos 32 caracteres como `ADMIN_BOOTSTRAP_TOKEN`. Retíralo de las variables del servidor después de crear la cuenta.</p>
          </>}
      </div>
    </section>
  </main>;
}
