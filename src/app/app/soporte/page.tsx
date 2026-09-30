"use client";

import Link from "next/link";
import { ArrowRight, Headset, MessageCircleQuestion } from "lucide-react";
import { useEffect, useState } from "react";

type FAQ = { publicId: string; question: string; answer: string; category: string; sortOrder: number };
export default function SupportPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/faqs", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las preguntas frecuentes.");
      return payload.faqs as FAQ[];
    }).then((items) => { if (active) setFaqs(items); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Error al cargar las preguntas frecuentes."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const categories = [...new Set(faqs.map((faq) => faq.category))];

  return <section className="flow-page support-page">
    <p className="eyebrow">Estamos para ayudarte</p><h1>Soporte</h1>
    <p className="flow-intro">Encuentra respuestas rápidas o continúa la conversación con nuestro equipo.</p>
    <Link className="support-ticket-cta" href="/app/soporte/tickets"><i><Headset size={22} /></i><span><b>Mis tickets</b><small>Consulta, responde o crea una solicitud de soporte</small></span><ArrowRight size={19} /></Link>
    <div className="support-section-heading"><div><p className="eyebrow">Respuestas rápidas</p><h2>Preguntas frecuentes</h2></div><MessageCircleQuestion size={22} /></div>
    {loading ? <p className="support-empty">Cargando respuestas…</p> : error ? <p className="form-notice" role="alert">{error}</p> : !faqs.length ? <p className="support-empty">Aún no hay preguntas publicadas. Si necesitas ayuda, abre un ticket.</p> : categories.map((category) => <section className="faq-category" key={category}><h3>{category}</h3>{faqs.filter((faq) => faq.category === category).map((faq) => <details className="faq-item" key={faq.publicId}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</section>)}
    <p className="support-contact">¿No encontraste la respuesta? <Link href="/app/soporte/tickets">Escríbenos por un ticket</Link></p>
  </section>;
}
