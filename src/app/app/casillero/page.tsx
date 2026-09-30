"use client";

import { Check, Copy, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locker = {
  fullName: string;
  lockerCode: string;
  warehouseName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  countryCode: string;
};

export default function LockerPage() {
  const [locker, setLocker] = useState<Locker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/locker", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "No se pudo cargar tu casillero.");
        return payload.locker as Locker;
      })
      .then((result) => { if (active) setLocker(result); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu casillero."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const address = useMemo(() => {
    if (!locker) return "";
    const country = locker.countryCode === "US" ? "United States" : locker.countryCode;
    return [locker.fullName, locker.lockerCode, locker.addressLine1, locker.addressLine2, locker.city, country]
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }, [locker]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona la dirección y cópiala manualmente.");
    }
  }

  return <section className="flow-page">
    <p className="eyebrow">Compras en USA</p>
    <h1>Mi casillero</h1>
    <p className="flow-intro">Usa esta dirección exactamente como aparece en tus compras.</p>
    {loading ? <article className="locker-address locker-loading" aria-live="polite"><p>Cargando los datos de tu casillero…</p></article>
      : locker ? <>
        <article className="locker-address">
          <div><i className="locker-icon"><MapPin size={21} /></i><p><small>Tu código personal</small><b>{locker.lockerCode}</b></p></div>
          <p className="locker-warehouse-name">{locker.warehouseName}</p>
          <pre>{address}</pre>
          <button className="form-button" type="button" onClick={copyAddress}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Dirección copiada" : "Copiar dirección"}</button>
        </article>
        <aside className="info-box"><MapPin size={19} /><span>Incluye tu nombre y código de casillero en la dirección de entrega para identificar tu compra al llegar.</span></aside>
      </> : <article className="locker-load-error" role="alert"><p>{error || "No pudimos encontrar un casillero activo para tu cuenta."}</p><Link href="/app/cuenta">Revisar mi cuenta</Link></article>}
    {error && locker && <p className="form-notice" role="status">{error}</p>}
  </section>;
}
