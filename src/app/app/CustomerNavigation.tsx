"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Package, Plus, Send, UserRound } from "lucide-react";

const navigation = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/paquetes", label: "Paquetes", icon: Package },
  { href: "/app/preregistros/nuevo", label: "Registrar", icon: Plus, featured: true },
  { href: "/app/envios", label: "Envíos", icon: Send },
  { href: "/app/cuenta", label: "Cuenta", icon: UserRound },
];

export default function CustomerNavigation() {
  const pathname = usePathname();
  return <nav className="customer-nav" aria-label="Navegación del portal">
    {navigation.map(({ href, label, icon: Icon, featured }) => {
      const active = href === "/app"
        ? pathname === href
        : href === "/app/paquetes"
          ? pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith("/app/pagos/") || pathname.startsWith("/app/retiros/")
          : featured
            ? pathname === href || pathname.startsWith("/app/preregistros/")
            : href === "/app/cuenta"
              ? pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith("/app/soporte")
              : pathname === href || pathname.startsWith(`${href}/`);
      return <Link aria-current={active ? "page" : undefined} className={`${active ? "active" : ""}${featured ? " featured" : ""}`} href={href} key={href}>
        <i><Icon size={featured ? 25 : 21} strokeWidth={featured ? 2.5 : 1.8} /></i>
        <span>{label}</span>
      </Link>;
    })}
  </nav>;
}
