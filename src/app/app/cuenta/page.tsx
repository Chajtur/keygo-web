import Link from "next/link";
import { ChevronRight, LockKeyhole, MapPin, MessageCircleQuestion, UserRound } from "lucide-react";
import { getCurrentCustomer } from "@/server/auth";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  const options = [
    { icon: UserRound, label: "Mis datos personales", detail: customer ? `${customer.fullName} · ${customer.email}` : "Ver y actualizar tu perfil", href: "/app/cuenta/perfil" },
    { icon: MapPin, label: "Mi casillero", detail: customer?.lockerCode || "Dirección en Miami", href: "/app/casillero" },
    { icon: MessageCircleQuestion, label: "Soporte", detail: "Consultas y tickets", href: "/app/soporte" },
    { icon: LockKeyhole, label: "Seguridad y avisos", detail: "Sesiones y notificaciones", href: "/app/cuenta/preferencias" },
  ];
  return <section className="flow-page"><p className="eyebrow">Tu perfil</p><h1>Mi cuenta</h1><article className="account-summary"><i><UserRound size={27} /></i><div><b>{customer?.fullName || "Mi perfil"}</b><span>Cliente KeyGo</span></div></article><div className="account-options">{options.map(({ icon: Icon, ...option }) => <Link href={option.href} key={option.label}><Icon size={20} /><span><b>{option.label}</b><small>{option.detail}</small></span><ChevronRight size={18} /></Link>)}</div><Link href="/ingresar" className="quiet-button">Cerrar sesión</Link></section>;
}
