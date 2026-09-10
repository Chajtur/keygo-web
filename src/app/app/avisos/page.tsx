import Link from "next/link";
import { BellRing, CheckCircle2, ChevronRight, PackageCheck, WalletCards } from "lucide-react";

const notices = [
  { icon: PackageCheck, title: "Tu paquete está disponible", detail: "KG-P-000131 ya puede retirarse en Tegucigalpa.", time: "Hoy, 9:42 a. m.", href: "/app/retiros/nuevo", unread: true },
  { icon: WalletCards, title: "Pago confirmado", detail: "El pago de KG-P-000131 fue aplicado correctamente.", time: "Ayer, 3:18 p. m.", href: "/app/paquetes", unread: false },
];

export default function NoticesPage() {
  return <section className="flow-page"><p className="eyebrow">Centro de avisos</p><h1>Avisos</h1><p className="flow-intro">Entérate de cambios importantes en tus paquetes y pagos.</p><div className="notice-list">{notices.map(({ icon: Icon, ...notice }) => <Link className={notice.unread ? "notice unread" : "notice"} href={notice.href} key={notice.title}><i><Icon size={20} /></i><span><b>{notice.title}</b><small>{notice.detail}</small><time>{notice.time}</time></span><ChevronRight size={18} /></Link>)}</div><button className="quiet-button"><CheckCircle2 size={17} /> Marcar todo como leído</button><aside className="empty-notices"><BellRing size={25} /><span>Recibirás aquí los avances de tus envíos, pagos y solicitudes de retiro.</span></aside></section>;
}