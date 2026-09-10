"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link href="/" aria-label="Volver al inicio"><Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority /></Link>
        <div><p className="eyebrow">Tu carga, a un vistazo</p><h1>Compra con libertad.<br /><em>Recibe con certeza.</em></h1><p>Consulta tus paquetes, solicita envios y paga solo lo que necesitas retirar.</p></div>
        <span>Miami · Honduras</span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <Link className="back-home" href="/">← Inicio</Link>
          <h2>Bienvenido de vuelta</h2><p>Ingresa a tu cuenta KeyGo.</p>
          <form onSubmit={handleSubmit}>
            <label>Correo electronico<div className="input-wrap"><Mail size={18} /><input required type="email" placeholder="nombre@correo.com" autoComplete="email" /></div></label>
            <label>Contrasena<div className="input-wrap"><LockKeyhole size={18} /><input required type="password" placeholder="Tu contrasena" autoComplete="current-password" /><Eye size={18} /></div></label>
            <div className="auth-options"><label className="check-label"><input type="checkbox" /> Recordarme</label><Link href="/recuperar-acceso">Olvide mi contrasena</Link></div>
            {submitted && <p className="form-notice">El acceso se conectara a la base de datos cuando el servicio de autenticacion este disponible.</p>}
            <button className="form-button" type="submit">Ingresar <ArrowRight size={18} /></button>
          </form>
          <p className="auth-register">Aun no tienes casillero? <Link href="/registrarse">Crea tu cuenta</Link></p>
        </div>
      </section>
    </main>
  );
}