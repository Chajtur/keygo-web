"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, PackageSearch, RefreshCw, Search } from "lucide-react";

type InventoryPackage = {
  code: string;
  tracking: string;
  customerName: string;
  lockerCode: string;
  location: string | null;
  status: string;
  receivedAt: string | null;
};

const statusLabels: Record<string, string> = {
  RECEIVED_USA: "Recibido en Miami",
  CONSOLIDATING: "En consolidación",
  CONSOLIDATED: "Consolidado",
  READY_TO_DISPATCH: "Listo para despacho",
  DISPATCHED: "Despachado",
  IN_TRANSIT: "En tránsito",
};

export default function OperationsPackagesClient() {
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPackages = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/operation/packages", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el inventario.");
      setPackages(Array.isArray(body.packages) ? body.packages : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/operation/packages", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo cargar el inventario.");
        setPackages(Array.isArray(body.packages) ? body.packages : []);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filteredPackages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return packages;
    return packages.filter((item) => [item.code, item.tracking, item.customerName, item.lockerCode, item.location]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));
  }, [packages, query]);

  return (
    <section>
      <header className="operations-header">
        <p className="eyebrow">Inventario · Miami</p>
        <div className="inventory-heading">
          <div><h1>Paquetes</h1><p>Paquetes registrados en la bodega de Miami.</p></div>
          <button className="inventory-refresh" onClick={() => void loadPackages(true)} disabled={loading || refreshing} type="button">
            <RefreshCw size={16} className={refreshing ? "inventory-spinning" : ""} />
            Actualizar
          </button>
        </div>
      </header>

      <label className="search-field">
        <Search size={18} />
        <input aria-label="Buscar paquetes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tracking, código o casillero" />
      </label>

      {error ? <div className="inventory-state inventory-error"><AlertCircle size={18} /><span>{error}</span><button type="button" onClick={() => void loadPackages(true)}>Reintentar</button></div> : null}
      {loading ? <p className="inventory-state">Cargando paquetes de Miami…</p> : null}
      {!loading && !error && filteredPackages.length === 0 ? (
        <div className="inventory-state inventory-empty"><PackageSearch size={22} /><span>{packages.length ? "No hay paquetes que coincidan con la búsqueda." : "Todavía no hay paquetes recibidos en la bodega de Miami."}</span></div>
      ) : null}
      {!loading && !error && filteredPackages.length > 0 ? (
        <div className="operations-list">
          {filteredPackages.map((item) => (
            <article key={item.code}>
              <i><PackageSearch size={21} /></i>
              <div>
                <b>{item.code}</b>
                <span>{item.customerName} · {item.lockerCode}</span>
                <small>{item.location || "Sin ubicación"} · {statusLabels[item.status] || item.status.replaceAll("_", " ")}{item.tracking ? ` · Tracking ${item.tracking}` : ""}</small>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
