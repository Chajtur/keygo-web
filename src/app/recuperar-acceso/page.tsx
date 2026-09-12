"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link href="/" aria-label="Volver al inicio">
          <Image src="/brand/isologo.png" alt="KeyGo Cargo Express" width={270} height={203} priority />
        </Link>
        <div>
          <p className="eyebrow">Tu acceso, siempre contigo</p>
          <h1>
            Recupera tu
            <br />
            <em>contraseña.</em>
          </h1>
          <p>
            Ingresa tu correo y te enviaremos instrucciones para restablecer tu
            acceso a KeyGo.
          </p>
        </div>
        <span>Miami · Honduras</span>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form">
          <Link className="back-home" href="/ingresar">
            ← Volver
          </Link>

          {submitted ? (
            <div className="register-success">
              <Check size={32} />
              <h2>Correo enviado</h2>
              <p>
                Si existe una cuenta asociada a ese correo, te enviaremos un enlace
                para restablecer tu contraseña.
              </p>
              <Link href="/ingresar" className="form-button">
                Volver a ingresar <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <h2>Recuperar acceso</h2>
              <p>Olvidaste tu contraseña? Te ayudamos a recuperarla.</p>

              <form onSubmit={handleSubmit}>
                <label>
                  Correo electronico
                  <div className="input-wrap">
                    <Mail size={18} />
                    <input
                      required
                      type="email"
                      placeholder="nombre@correo.com"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <button className="form-button" type="submit">
                  Enviar enlace <ArrowRight size={18} />
                </button>
              </form>

              <p className="auth-register">
                Recordaste tu contraseña? <Link href="/ingresar">Ingresa aquí</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
