"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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
          {submitted ? <div className="register-success"><Check size={32} /><h2>Cuenta lista para verificar</h2><p>Enviaremos un enlace de verificación a tu correo. Al confirmar, recibirás tu código de casillero KeyGo.</p><Link href="/ingresar" className="form-button">Ir a ingresar <ArrowRight size={18} /></Link></div> : <>
            <h2>Crea tu casillero</h2><p>Completa tus datos para iniciar.</p>
            <form onSubmit={handleSubmit}>
              <label>Nombre completo<div className="input-wrap"><UserRound size={18} /><input required placeholder="Tu nombre y apellido" autoComplete="name" /></div></label>
              <label>Correo electronico<div className="input-wrap"><Mail size={18} /><input required type="email" placeholder="nombre@correo.com" autoComplete="email" /></div></label>
              <label>Telefono<div className="input-wrap"><Phone size={18} /><input required type="tel" placeholder="+504 0000-0000" autoComplete="tel" /></div></label>
              <label>Crea una contrasena<div className="input-wrap"><LockKeyhole size={18} /><input required minLength={8} type="password" placeholder="Minimo 8 caracteres" autoComplete="new-password" /></div></label>
              <label className="check-label terms"><input required type="checkbox" /> Acepto los terminos y la politica de privacidad.</label>
              <button className="form-button" type="submit">Crear mi casillero <ArrowRight size={18} /></button>
            </form>
            <p className="auth-register">Ya tienes cuenta? <Link href="/ingresar">Ingresa aquí</Link></p>
          </>}
        </div>
      </section>
    </main>
  );
}