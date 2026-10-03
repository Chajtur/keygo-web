import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import CustomerNavigation from "./CustomerNavigation";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-shell">
      <header className="customer-header">
        <Link href="/" aria-label="KeyGo, inicio">
          <Image src="/brand/imagotipo.png" alt="KeyGo Cargo Express" width={170} height={128} priority />
        </Link>
        <Link className="icon-button" href="/app/avisos" aria-label="Abrir avisos" title="Avisos">
          <Bell size={21} strokeWidth={1.8} />
        </Link>
      </header>
      <main className="customer-content">{children}</main>
      <CustomerNavigation />
    </div>
  );
}
