"use client";

import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";

type Ticket = { publicId: string; subject: string; status: string; customerName: string; customerEmail: string; assignedName: string | null; packageCode: string | null; lastMessage: string | null; updatedAt: string };
const labels: Record<string, string> = { OPEN: "Abiertos", IN_PROGRESS: "En atención", WAITING_CUSTOMER: "Esperando cliente", RESOLVED: "Resueltos", CLOSED: "Cerrados", ALL: "Todos" };
export default function StaffTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]); const [filter, setFilter] = useState("OPEN"); const [loadedFilter, setLoadedFilter] = useState<string | null>(null); const [error, setError] = useState("");
  const loading = loadedFilter !== filter;
  useEffect(() => { let active = true; fetch(`/api/operation/tickets?status=${filter}`, { cache: "no-store" }).then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error || "No se pudieron cargar los tickets."); return p.tickets as Ticket[]; }).then((rows) => { if (active) setTickets(rows); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar los tickets."); }).finally(() => { if (active) setLoadedFilter(filter); }); return () => { active = false; }; }, [filter]);
  return <section className="operations-support-page"><header className="operations-header"><p className="eyebrow">Atención al cliente</p><h1>Tickets de soporte</h1><p className="flow-intro">Revisa solicitudes, asígnalas y responde al cliente desde su historial.</p></header>{error && <p className="form-notice" role="alert">{error}</p>}<div className="ticket-filter-row">{["OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED","ALL"].map((status) => <button type="button" className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{labels[status]}</button>)}</div><div className="operations-ticket-list">{loading ? <p className="support-empty">Cargando tickets…</p> : tickets.length ? tickets.map((ticket) => <Link className="operations-ticket-card" href={`/operacion/tickets/${ticket.publicId}`} key={ticket.publicId}><i><MessageSquareText size={19} /></i><span><b>{ticket.subject}</b><small>{ticket.customerName} · {ticket.customerEmail}</small><small>{ticket.lastMessage || "Sin mensajes"}</small><small>{ticket.packageCode ? `Paquete ${ticket.packageCode} · ` : ""}Asignado: {ticket.assignedName || "Sin asignar"}</small></span><em className={`ticket-status ${ticket.status.toLowerCase()}`}>{labels[ticket.status] || ticket.status}</em></Link>) : <p className="support-empty">No hay tickets en esta vista.</p>}</div></section>;
}
