"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Ticket = { publicId: string; subject: string; status: string; createdAt: string; updatedAt: string; lastMessage: string | null; messageCount: number };
const statusLabels: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En atención", WAITING_CUSTOMER: "Esperando tu respuesta", RESOLVED: "Resuelto", CLOSED: "Cerrado" };
export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [error, setError] = useState("");

  async function loadTickets() {
    const response = await fetch("/api/me/tickets", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudieron cargar tus tickets.");
    setTickets(payload.tickets as Ticket[]);
  }
  useEffect(() => { let active = true; fetch("/api/me/tickets", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudieron cargar tus tickets."); return payload.tickets as Ticket[]; }).then((rows) => { if (active) setTickets(rows); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar tus tickets."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/me/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message, packageCode }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo abrir el ticket.");
      setSubject(""); setMessage(""); setPackageCode(""); setCreating(false); await loadTickets();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el ticket."); }
    finally { setBusy(false); }
  }

  return <section className="flow-page support-page"><Link className="back-link" href="/app/soporte"><ArrowLeft size={16} /> Soporte</Link><p className="eyebrow">Atención KeyGo</p><h1>Mis tickets</h1><p className="flow-intro">Consulta las respuestas del equipo y mantén tus solicitudes en un solo lugar.</p>
    {error && <p className="form-notice" role="alert">{error}</p>}
    {creating ? <form className="support-ticket-form" onSubmit={submit}><div className="support-form-heading"><h2>Nuevo ticket</h2><button className="quiet-button" type="button" onClick={() => setCreating(false)}>Cancelar</button></div><label>Asunto<input required minLength={4} maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="¿En qué podemos ayudarte?" /></label><label>Paquete relacionado (opcional)<input maxLength={32} value={packageCode} onChange={(e) => setPackageCode(e.target.value)} placeholder="KG-P-…" /></label><label>Cuéntanos los detalles<textarea required minLength={10} maxLength={8000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></label><button className="form-button" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}<ArrowRight size={18} /></button></form>
      : <button className="form-button support-new-ticket" onClick={() => { setCreating(true); setError(""); }}><Plus size={18} /> Crear ticket</button>}
    <div className="customer-ticket-list">{loading ? <p className="support-empty">Cargando tus tickets…</p> : tickets.length ? tickets.map((ticket) => <Link className="customer-ticket-card" href={`/app/soporte/tickets/${ticket.publicId}`} key={ticket.publicId}><i><MessageCircle size={19} /></i><span><b>{ticket.subject}</b><small>{ticket.lastMessage || "Sin mensajes"}</small><small>Actualizado {new Date(ticket.updatedAt).toLocaleDateString("es-HN")}</small></span><em className={`ticket-status ${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status] || ticket.status}</em></Link>) : <p className="support-empty">Todavía no has creado tickets. Si no encuentras una respuesta en las preguntas frecuentes, cuéntanos qué necesitas.</p>}</div>
  </section>;
}
