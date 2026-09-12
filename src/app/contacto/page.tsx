"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ContactPage() {
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
          <p className="eyebrow">Tu carga, a un vistazo</p>
          <h1>
            Hablemos.
            <br />
            <em>Te ayudamos.</em>
          </h1>
          <p>
            Si tienes dudas sobre compras en Estados Unidos, rutas, costos o
            entregas en Honduras, escríbenos y te respondemos pronto.
          </p>
        </div>
        <span>Miami · Honduras</span>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form">
          <Link className="back-home" href="/">
            ← Inicio
          </Link>

          {submitted ? (
            <div className="register-success">
              <Check size={32} />
              <h2>Mensaje enviado</h2>
              <p>
                Gracias por contactarnos. Revisaremos tu mensaje y te responderemos
                en la brevedad posible desde KeyGo.
              </p>
              <Link href="/" className="form-button">
                Volver al inicio <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <h2>Contáctanos</h2>
              <p>Envíanos tus datos y te ayudaremos con lo que necesites.</p>

              <form onSubmit={handleSubmit}>
                <label>
                  Nombre completo
                  <div className="input-wrap">
                    <UserRound size={18} />
                    <input required placeholder="Tu nombre y apellido" autoComplete="name" />
                  </div>
                </label>

                <label>
                  Correo electronico
                  <div className="input-wrap">
                    <Mail size={18} />
                    <input required type="email" placeholder="nombre@correo.com" autoComplete="email" />
                  </div>
                </label>

                <label>
                  Telefono
                  <div className="input-wrap">
                    <Phone size={18} />
                    <input required type="tel" placeholder="+504 0000-0000" autoComplete="tel" />
                  </div>
                </label>

                <label>
                  Mensaje
                  <div className="input-wrap" style={{ height: "120px", alignItems: "flex-start", padding: "14px" }}>
                    <MessageSquareText size={18} />
                    <textarea
                      required
                      placeholder="Cuéntanos cómo podemos ayudarte"
                      style={{
                        border: 0,
                        color: "#082e59",
                        flex: 1,
                        font: "inherit",
                        minHeight: "90px",
                        outline: "none",
                        resize: "vertical",
                        width: "100%",
                      }}
                    />
                  </div>
                </label>

                <button className="form-button" type="submit">
                  Enviar mensaje <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
