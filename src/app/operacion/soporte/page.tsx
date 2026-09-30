"use client";

import { Check, Pencil, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type FAQ = { publicId: string; question: string; answer: string; category: string; sortOrder: number; published: boolean };
const emptyFAQ = { question: "", answer: "", category: "General", sortOrder: 0, published: false };
export default function ManageFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [form, setForm] = useState(emptyFAQ);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function fetchFAQs() { const response = await fetch("/api/operation/faqs", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las FAQs."); return payload.faqs as FAQ[]; }
  async function reload() { setFaqs(await fetchFAQs()); }
  useEffect(() => { let active = true; fetchFAQs().then((items) => { if (active) setFaqs(items); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar las FAQs."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  function reset() { setEditing(null); setForm(emptyFAQ); setError(""); setNotice(""); }
  function startEdit(faq: FAQ) { setEditing(faq.publicId); setForm({ question: faq.question, answer: faq.answer, category: faq.category, sortOrder: faq.sortOrder, published: Boolean(faq.published) }); setError(""); setNotice(""); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const response = await fetch(editing ? `/api/operation/faqs/${editing}` : "/api/operation/faqs", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo guardar la FAQ."); await reload(); setNotice(editing ? "FAQ actualizada." : "FAQ creada."); setEditing(null); setForm(emptyFAQ); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la FAQ."); } finally { setBusy(false); } }
  async function archive(faq: FAQ) { if (!window.confirm(`¿Archivar la pregunta “${faq.question}”?`)) return; setBusy(true); setError(""); try { const response = await fetch(`/api/operation/faqs/${faq.publicId}`, { method: "DELETE" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo archivar la FAQ."); await reload(); setNotice("FAQ archivada; ya no aparece en Soporte."); if (editing === faq.publicId) reset(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo archivar la FAQ."); } finally { setBusy(false); } }

  return <section className="support-admin-page"><header className="operations-header"><p className="eyebrow">Contenido de ayuda</p><h1>Preguntas frecuentes</h1><p className="flow-intro">Crea respuestas para clientes, ordénalas por categoría y publícalas en la página de Soporte.</p></header>
    {(error || notice) && <p className={error ? "form-notice" : "staff-success"} role={error ? "alert" : "status"}>{error || <><Check size={16} />{notice}</>}</p>}
    <form className="staff-form" onSubmit={submit}><div className="staff-form-heading"><h2>{editing ? "Editar FAQ" : "Nueva FAQ"}</h2>{editing && <button className="staff-icon-button" type="button" onClick={reset} aria-label="Cancelar edición"><X size={18} /></button>}</div><div className="staff-fields"><label>Pregunta<input required minLength={8} maxLength={255} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></label><label>Categoría<input required maxLength={80} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Orden<input type="number" min={0} max={10000} step={1} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label><label className="faq-publish-toggle"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Publicada para clientes</label></div><label className="faq-answer-label">Respuesta<textarea required minLength={5} maxLength={12000} rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></label><button className="form-button" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : <><Plus size={17} /> Crear FAQ</>}</button></form>
    <section className="faq-admin-list"><div className="staff-list-heading"><h2>Catálogo</h2><span>{faqs.length} preguntas</span></div>{loading ? <p className="support-empty">Cargando…</p> : faqs.length ? faqs.map((faq) => <article className="faq-admin-card" key={faq.publicId}><div><span className={faq.published ? "staff-status active" : "staff-status"}>{faq.published ? "Publicada" : "Borrador"} · {faq.category}</span><b>{faq.question}</b><p>{faq.answer}</p></div><div className="staff-card-actions"><button className="staff-icon-button" type="button" onClick={() => startEdit(faq)} disabled={busy} aria-label={`Editar ${faq.question}`}><Pencil size={17} /></button><button className="staff-icon-button danger" type="button" onClick={() => archive(faq)} disabled={busy} aria-label={`Archivar ${faq.question}`}><X size={18} /></button></div></article>) : <p className="support-empty">No hay FAQs. Crea la primera respuesta para el portal.</p>}</section>
  </section>;
}
