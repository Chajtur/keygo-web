import Image from "next/image";
import Link from "next/link";
import { Bell, House, Package, Send, UserRound } from "lucide-react";

const navigation = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/paquetes", label: "Paquetes", icon: Package },
  { href: "/app/envios", label: "Envios", icon: Send },
  { href: "/app/avisos", label: "Avisos", icon: Bell },
  { href: "/app/cuenta", label: "Cuenta", icon: UserRound },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-shell">
      <header className="customer-header">
        <Link href="/" aria-label="KeyGo, inicio">
          <Image src="/brand/imagotipo.png" alt="KeyGo Cargo Express" width={170} height={128} priority />
        </Link>
        <button className="icon-button" aria-label="Abrir avisos">
          <Bell size={21} strokeWidth={1.8} />
          <span className="notification-dot" />
        </button>
      </header>
      <main className="customer-content">{children}</main>
      <nav className="customer-nav" aria-label="Navegacion del portal">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link className={href === "/app" ? "active" : ""} href={href} key={href}>
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}