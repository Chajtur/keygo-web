"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Anchor, Check, Plane, RefreshCw, Ship } from "lucide-react";

type PackageOption = { code: string; tracking: string | null; weightKg: string | null; lengthCm: string | null; widthCm: string | null; heightCm: string | null };
type Estimate = { plan: string; currency: string; total: number; weightKg: number; breakdown: { concept: string; basis: string; quantity: number; amount: number }[] } | null;
type Data = { packages: PackageOption[]; estimates: { AIR: Estimate; SEA: Estimate } };

export default function ShipmentRequestForm() {
  const [data, setData] = useState<Data>({ packages: [], estimates: { AIR: null, SEA: null } });
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<"AIR" | "SEA">("AIR");
  const [consolidate, setConsolidate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (codes: string[] = []) => {
    const search = new URLSearchParams();
    codes.forEach((code) => search.append("code", code));
    const response = await fetch(`/api/me/shipment-requests?${search}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "No se pudieron cargar los paquetes disponibles.");
    setData(body as Data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/shipment-requests", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo cargar."); setData(body as Data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selected.length) return;
    const controller = new AbortController();
    const search = new URLSearchParams();
    selected.forEach((code) => search.append("code", code));
    fetch(`/api/me/shipment-requests?${search}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No se pudo calcular el estimado."); setData(body as Data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo calcular el estimado."); });
    return () => controller.abort();
  }, [selected, load]);

  const selectedPackages = useMemo(() => data.packages.filter((item) => selected.includes(item.code)), [data.packages, selected]);
  const togglePackage = (code: string) => setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);

  const submit = async () => {
    if (!selected.length) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/me/shipment-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageCodes: selected, method, consolidate }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo enviar la solicitud.");
      setMessage(`${body.shipmentCode} solicitado: ${body.packageCount} paquete${body.packageCount === 1 ? "" : "s"} · ${method === "AIR" ? "Aéreo" : "Marítimo"}${body.consolidationCode ? ` · Consolidación ${body.consolidationCode}` : ""}. KeyGo lo incluirá en un próximo despacho disponible.`);
      setSelected([]); setConsolidate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo enviar la solicitud."); }
    finally { setSaving(false); }
  };

  return <section className="dispatch-request-card">
    <div className="dispatch-request-title"><span className="eyebrow">Solicita el despacho</span><h2>Envía paquetes desde Miami</h2><p>Selecciona los paquetes que quieres incluir y el medio de transporte.</p></div>
    {error ? <p className="profile-error">{error}</p> : null}
    {message ? <p className="profile-success"><Check size={17} />{message}</p> : null}
    {loading ? <div className="support-empty">Cargando paquetes recibidos en Miami…</div> : data.packages.length ? <>
      <div className="dispatch-package-list">{data.packages.map((item) => <label className={`dispatch-package-option ${selected.includes(item.code) ? "selected" : ""}`} key={item.code}>
        <input type="checkbox" checked={selected.includes(item.code)} onChange={() => togglePackage(item.code)} />
        <span><b>{item.code}</b><small>Tracking {item.tracking || "No registrado"} · {item.weightKg ? `${item.weightKg} kg · ${item.lengthCm} × ${item.widthCm} × ${item.heightCm} cm` : "Medidas pendientes"}</small></span>
      </label>)}</div>
      <div className="dispatch-methods" aria-label="Tipo de transporte">
        <button type="button" className={method === "AIR" ? "selected" : ""} onClick={() => setMethod("AIR")}><Plane size={19} /><span><b>Aéreo</b><small>{data.estimates.AIR ? `Estimado ${data.estimates.AIR.currency} ${data.estimates.AIR.total.toFixed(2)}` : "Estimado no disponible"}</small></span></button>
        <button type="button" className={method === "SEA" ? "selected" : ""} onClick={() => setMethod("SEA")}><Ship size={19} /><span><b>Marítimo</b><small>{data.estimates.SEA ? `Estimado ${data.estimates.SEA.currency} ${data.estimates.SEA.total.toFixed(2)}` : "Estimado no disponible"}</small></span></button>
      </div>
      {selected.length ? <div className="dispatch-estimate-note">
        {consolidate ? <><Anchor size={17} /><span>La consolidación y el reempaque cambian las dimensiones. El flete se estimará después de preparar la caja consolidada.</span></> : <span>{(method === "AIR" ? data.estimates.AIR : data.estimates.SEA) ? `Estimado basado en ${selectedPackages.length} paquete${selectedPackages.length === 1 ? "" : "s"} y el plan ${(method === "AIR" ? data.estimates.AIR : data.estimates.SEA)?.plan}. El monto final se confirma al llegar a Honduras.` : "No hay tarifa vigente configurada para este transporte o faltan medidas de uno o más paquetes."}</span>}
      </div> : null}
      <label className="dispatch-consolidate"><input type="checkbox" checked={consolidate} onChange={(event) => setConsolidate(event.target.checked)} /><span><b>Consolidar y reempacar</b><small>Solicitar que KeyGo agrupe los paquetes en una caja más pequeña antes del despacho.</small></span></label>
      <button className="form-button" type="button" disabled={!selected.length || saving} onClick={() => void submit()}>{saving ? "Enviando solicitud…" : `Solicitar despacho · ${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`}</button>
    </> : <div className="support-empty"><RefreshCw size={19} />No tienes paquetes disponibles en Miami. Los paquetes ya solicitados aparecen en “Mis envíos”.</div>}
  </section>;
}
