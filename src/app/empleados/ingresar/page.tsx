"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/operation/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo iniciar sesión.");
      router.replace(payload.redirectTo || "/operacion");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page employee-auth-page">
    <section className="auth-aside employee-auth-aside">
      <Link href="/" aria-label="Volver al sitio de KeyGo"><Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority /></Link>
      <div><p className="eyebrow">Acceso de equipo</p><h1>La operación<br /><em>en movimiento.</em></h1><p>Gestiona recepción, seguimiento y entrega desde el panel interno de KeyGo.</p></div>
      <span>Personal autorizado · KeyGo</span>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-form employee-auth-form">
        <Link className="back-home" href="/">← Sitio KeyGo</Link>
        <div className="employee-login-mark"><ShieldCheck size={19} /><span>PORTAL DE EMPLEADOS</span></div>
        <h2>Inicia sesión</h2>
        <p>Usa las credenciales asignadas por el administrador de KeyGo.</p>
        <form onSubmit={handleSubmit}>
          <label>Correo de trabajo<div className="input-wrap"><Mail size={18} aria-hidden="true" /><input required type="email" autoCapitalize="none" autoComplete="username" maxLength={255} placeholder="nombre@keygo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label>Contraseña<div className="input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input required type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} placeholder="Tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-visibility" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="form-button" type="submit" disabled={submitting}>{submitting ? "Validando acceso..." : "Entrar al panel"}<ArrowRight size={18} /></button>
        </form>
        <p className="employee-auth-help">El acceso requiere una cuenta activa con rol de empleado y correo confirmado. Si necesitas acceso o recuperar tus credenciales, contacta al administrador de KeyGo.</p>
        <p className="auth-register">¿Eres cliente? <Link href="/ingresar">Ingresa a tu casillero</Link></p>
      </div>
    </section>
  </main>;
}
