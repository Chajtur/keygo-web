"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Anchor, PackageCheck, Plane, RefreshCw, Ship } from "lucide-react";

type RequestItem = { publicId: string; code: string; method: "AIR" | "SEA"; requestedAt: string; customerName: string; consolidationCode: string | null; packageCount: number; packageCodes: string; totalWeightKg: string | null; totalVolumeM3: string | null };
type BatchItem = { code: string; method: "AIR" | "SEA"; status: string; shipmentCount: number; packageCount: number; totalWeightKg: string | null; totalVolumeM3: string | null };

export default function DispatchRequestsClient() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [selected, setSelected] = useState<Record<"AIR" | "SEA", string[]>>({ AIR: [], SEA: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"AIR" | "SEA" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/operation/dispatch-requests", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "No se pudieron cargar las solicitudes.");
    setRequests(body.requests || []);
    setBatches(body.batches || []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/operation/dispatch-requests", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo cargar la lista."); setRequests(body.requests || []); setBatches(body.batches || []); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la lista."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const groups = useMemo(() => ({ AIR: requests.filter((item) => item.method === "AIR"), SEA: requests.filter((item) => item.method === "SEA") }), [requests]);
  const toggle = (method: "AIR" | "SEA", id: string) => setSelected((current) => ({ ...current, [method]: current[method].includes(id) ? current[method].filter((value) => value !== id) : [...current[method], id] }));

  const createBatch = async (method: "AIR" | "SEA") => {
    const ids = selected[method];
    if (!ids.length) return;
    setSaving(method); setError(""); setMessage("");
    try {
      const response = await fetch("/api/operation/dispatch-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipmentPublicIds: ids, method }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo preparar el lote.");
      setMessage(`Lote ${body.batchCode} creado con ${body.requestCount} solicitud${body.requestCount === 1 ? "" : "es"} ${method === "AIR" ? "aéreas" : "marítimas"}.`);
      setSelected((current) => ({ ...current, [method]: [] }));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el lote."); }
    finally { setSaving(null); }
  };

  return <section className="dispatch-operations-page">
    <header className="operations-header"><p className="eyebrow">Planificación · Miami</p><div className="inventory-heading"><div><h1>Solicitudes de despacho</h1><p>Organiza la carga solicitada para el siguiente vuelo o barco hacia Honduras.</p></div><button className="inventory-refresh" type="button" onClick={() => void load()} disabled={loading || saving !== null}><RefreshCw size={16} />Actualizar</button></div></header>
    {error ? <p className="profile-error">{error}</p> : null}{message ? <p className="profile-success">{message}</p> : null}
    {loading ? <div className="inventory-state">Cargando solicitudes…</div> : null}
    {!loading && !error && requests.length === 0 ? <div className="inventory-state inventory-empty"><PackageCheck size={22} />Aún no hay solicitudes pendientes de planificación.</div> : null}
    {batches.length ? <section className="dispatch-method-queue"><header><PackageCheck size={21} /><div><h2>Lotes abiertos para el siguiente despacho</h2><p>Solicitudes ya agrupadas y pendientes de preparación o salida.</p></div></header><div className="dispatch-request-list">{batches.map((batch) => <article className="dispatch-batch-row" key={batch.code}><b>{batch.code} · {batch.method === "AIR" ? "Aéreo" : "Marítimo"}</b><span>{batch.shipmentCount} solicitudes · {batch.packageCount} paquetes · {batch.totalWeightKg ? `${Number(batch.totalWeightKg).toFixed(3)} kg` : "peso pendiente"} · {batch.totalVolumeM3 ? `${Number(batch.totalVolumeM3).toFixed(3)} m³` : "volumen pendiente"}</span></article>)}</div></section> : null}
    {(["AIR", "SEA"] as const).map((method) => {
      const items = groups[method];
      const count = items.reduce((sum, item) => sum + Number(item.packageCount), 0);
      const weight = items.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0);
      const volume = items.reduce((sum, item) => sum + Number(item.totalVolumeM3 || 0), 0);
      const Icon = method === "AIR" ? Plane : Ship;
      return <section className="dispatch-method-queue" key={method}>
        <header><Icon size={21} /><div><h2>{method === "AIR" ? "Transporte aéreo" : "Transporte marítimo"}</h2><p>{items.length} solicitudes · {count} paquetes · {weight.toFixed(3)} kg medidos · {volume.toFixed(3)} m³</p></div></header>
        {items.length ? <div className="dispatch-request-list">{items.map((item) => <label className="dispatch-request-row" key={item.publicId}><input type="checkbox" checked={selected[method].includes(item.publicId)} onChange={() => toggle(method, item.publicId)} /><span><b>{item.code} · {item.customerName}</b><small>{item.packageCount} paquete{item.packageCount === 1 ? "" : "s"} · {item.totalWeightKg ? `${Number(item.totalWeightKg).toFixed(3)} kg` : "peso pendiente"} · {item.totalVolumeM3 ? `${Number(item.totalVolumeM3).toFixed(3)} m³` : "volumen pendiente"} · Solicitado {new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(item.requestedAt))}</small><small>Paquetes: {item.packageCodes}</small>{item.consolidationCode ? <em><Anchor size={13} /> Consolidación solicitada · {item.consolidationCode}</em> : null}</span></label>)}</div> : <p className="dispatch-no-requests">No hay solicitudes {method === "AIR" ? "aéreas" : "marítimas"} pendientes.</p>}
        <button className="form-button" type="button" disabled={!selected[method].length || saving !== null} onClick={() => void createBatch(method)}>{saving === method ? "Preparando lote…" : `Agregar ${selected[method].length || "solicitudes"} al siguiente lote ${method === "AIR" ? "aéreo" : "marítimo"}`}</button>
      </section>;
    })}
  </section>;
}
