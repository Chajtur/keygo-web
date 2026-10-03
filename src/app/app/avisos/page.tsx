import Link from "next/link";
import { BellRing, ChevronRight, PackageCheck, WalletCards } from "lucide-react";
import type { RowDataPacket } from "mysql2";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Notice = RowDataPacket & { id: string; source: "NOTICE" | "EVENT"; eventType: string; payload: unknown; createdAt: Date; readAt: Date | null; packageCode: string | null; observation: string | null };
type NoticePayload = { title?: unknown; detail?: unknown; message?: unknown; packageCode?: unknown; code?: unknown };

const titles: Record<string, string> = {
  RECEIVED_USA: "Paquete recibido en Miami", CONSOLIDATING: "Paquete en consolidación", CONSOLIDATED: "Consolidación completada",
  READY_TO_DISPATCH: "Paquete listo para despacho", DISPATCHED: "Paquete despachado", IN_TRANSIT: "Paquete en tránsito",
  CUSTOMS_HN: "Paquete en proceso de aduanas", ARRIVED_HN: "Tu carga llegó a Honduras", RECEIVED_HN: "Paquete recibido en Honduras",
  INVOICE_ISSUED: "Cargo final disponible", PAYMENT_PENDING: "Pago pendiente", PAYMENT_CONFIRMED: "Pago confirmado",
  READY_FOR_PICKUP: "Paquete listo para retirar", OUT_FOR_DELIVERY: "Paquete en ruta de entrega", DELIVERED: "Paquete entregado",
};

function asPayload(value: unknown): NoticePayload {
  if (value && typeof value === "object") return value as NoticePayload;
  if (typeof value === "string") { try { return JSON.parse(value) as NoticePayload; } catch { return {}; } }
  return {};
}

export default async function NoticesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return <section className="flow-page"><p className="eyebrow">Centro de avisos</p><h1>Inicia sesión para ver tus avisos</h1><Link href="/ingresar" className="form-button">Iniciar sesión</Link></section>;

  const [notices] = await getDatabase().execute<Notice[]>(`SELECT * FROM (
      SELECT CONCAT('notice-',n.id) id,'NOTICE' source,n.type eventType,n.payload,n.created_at createdAt,n.read_at readAt,NULL packageCode,NULL observation
      FROM notifications n WHERE n.user_id=?
      UNION ALL
      SELECT CONCAT('event-',e.id) id,'EVENT' source,e.event_code eventType,NULL payload,e.occurred_at createdAt,NULL readAt,p.code packageCode,e.observation
      FROM package_events e JOIN packages p ON p.id=e.package_id
      WHERE p.customer_id=? AND e.customer_visible=TRUE
    ) customer_notices ORDER BY createdAt DESC LIMIT 50`, [customer.userId, customer.customerId]);

  return <section className="flow-page"><p className="eyebrow">Centro de avisos</p><h1>Avisos</h1><p className="flow-intro">Actualizaciones reales de tus paquetes y notificaciones de tu cuenta.</p>
    {notices.length ? <div className="notice-list">{notices.map((notice) => {
      const payload = asPayload(notice.payload);
      const title = String(payload.title || titles[notice.eventType] || notice.eventType.replaceAll("_", " ").toLowerCase());
      const detail = String(payload.detail || payload.message || notice.observation || (notice.packageCode ? `Paquete ${notice.packageCode}` : "Actualización de tu cuenta."));
      const packageCode = String(payload.packageCode || payload.code || notice.packageCode || "");
      const href = ["PAYMENT_PENDING", "INVOICE_ISSUED"].includes(notice.eventType) ? "/app/pagos/nuevo" : notice.eventType === "READY_FOR_PICKUP" ? "/app/retiros/nuevo" : "/app/paquetes";
      const Icon = notice.eventType.includes("PAYMENT") || notice.eventType.includes("INVOICE") ? WalletCards : notice.source === "EVENT" ? PackageCheck : BellRing;
      return <Link className={notice.source === "NOTICE" && !notice.readAt ? "notice unread" : "notice"} href={href} key={notice.id}><i><Icon size={20} /></i><span><b>{title}</b><small>{packageCode && !detail.includes(packageCode) ? `${detail} · ${packageCode}` : detail}</small><time>{new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notice.createdAt))}</time></span><ChevronRight size={18} /></Link>;
    })}</div> : <aside className="empty-notices"><BellRing size={25} /><span>Aún no hay avisos para tu cuenta. Aquí aparecerán las actualizaciones de tus paquetes cuando cambien de estado.</span></aside>}
  </section>;
}
