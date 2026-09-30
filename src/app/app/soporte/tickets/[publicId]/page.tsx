"use client";

import Link from "next/link";
import { ArrowLeft, Check, LockKeyhole, Send } from "lucide-react";
import { FormEvent, use, useEffect, useState } from "react";

type TicketData = { publicId: string; status: string };
type Message = { body: string; createdAt: string; authorName: string; isMine: boolean };
const statusLabels: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En atención", WAITING_CUSTOMER: "Esperando tu respuesta", RESOLVED: "Resuelto", CLOSED: "Cerrado" };
export default function TicketDetailPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = use(params);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(id: string) {
    const response = await fetch(`/api/me/tickets/${id}`, { cache: "no-store" }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo abrir el ticket.");
    setTicket(payload.ticket as TicketData); setMessages(payload.messages as Message[]);
  }
  useEffect(() => { let active = true; fetch(`/api/me/tickets/${publicId}`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo abrir el ticket."); return payload; }).then((payload) => { if (active) { setTicket(payload.ticket as TicketData); setMessages(payload.messages as Message[]); } }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "No se pudo cargar el ticket."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [publicId]);
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!publicId) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/me/tickets/${publicId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo enviar el mensaje."); setMessage(""); await load(publicId); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar la respuesta."); }
    finally { setBusy(false); }
  }
  async function closeTicket() {
    if (!publicId || !window.confirm("¿Cerrar este ticket? Podrás volver a consultar el historial.")) return;
    setBusy(true); setError("");
    try { const response = await fetch(`/api/me/tickets/${publicId}`, { method: "DELETE" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No se pudo cerrar el ticket."); await load(publicId); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo cerrar el ticket."); }
    finally { setBusy(false); }
  }
  return <section className="flow-page support-page"><Link className="back-link" href="/app/soporte/tickets"><ArrowLeft size={16} /> Mis tickets</Link>{loading ? <p className="support-empty">Cargando conversación…</p> : error && !ticket ? <p className="form-notice" role="alert">{error}</p> : ticket && <><p className="eyebrow">Conversación de soporte</p><div className="ticket-detail-heading"><h1>{ticket.status === "CLOSED" ? "Ticket cerrado" : "Tu ticket"}</h1><span className={`ticket-status ${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status] || ticket.status}</span></div><div className="ticket-messages">{messages.map((item, index) => <article className={`ticket-message ${item.isMine ? "mine" : "staff"}`} key={`${item.createdAt}-${index}`}><small>{item.isMine ? "Tú" : item.authorName} · {new Date(item.createdAt).toLocaleString("es-HN")}</small><p>{item.body}</p></article>)}</div>{error && <p className="form-notice" role="alert">{error}</p>}{ticket.status !== "CLOSED" ? <><form className="ticket-reply-form" onSubmit={reply}><label>Responder<textarea required minLength={2} maxLength={8000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></label><button className="form-button" disabled={busy}>{busy ? "Enviando…" : "Enviar respuesta"}<Send size={17} /></button></form><button type="button" className="quiet-button close-ticket-button" onClick={closeTicket} disabled={busy}><LockKeyhole size={16} /> Cerrar ticket</button></> : <aside className="info-box"><Check size={18} /><span>Este ticket está cerrado. El historial de mensajes sigue disponible.</span></aside>}</>}</section>;
}
