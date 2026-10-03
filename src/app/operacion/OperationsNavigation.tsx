"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, LayoutDashboard, MessageSquareText, PackageSearch, ScanLine, Send, UsersRound } from "lucide-react";

const links = [
  { href: "/operacion", label: "Resumen", icon: LayoutDashboard },
  { href: "/operacion/recepcion", label: "Recepción", icon: ScanLine },
  { href: "/operacion/paquetes", label: "Inventario", icon: PackageSearch },
  { href: "/operacion/despachos", label: "Despachos", icon: Send },
  { href: "/operacion/entregas", label: "Entregas", icon: ClipboardCheck },
  { href: "/operacion/tickets", label: "Tickets", icon: MessageSquareText },
  { href: "/operacion/soporte", label: "FAQs", icon: MessageSquareText },
  { href: "/operacion/personal", label: "Personal", icon: UsersRound },
];

export default function OperationsNavigation() {
  const pathname = usePathname();

  return <nav aria-label="Navegación operativa">
    {links.map(({ href, label, icon: Icon }) => {
      const active = href === "/operacion" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
      return <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} href={href} key={href}><Icon size={19} />{label}</Link>;
    })}
  </nav>;
}
