import Link from "next/link";
import { Boxes, ClipboardCheck, LayoutDashboard, PackageSearch, ScanLine } from "lucide-react";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <div className="operations-shell"><aside className="operations-sidebar"><Link href="/operacion" className="operations-brand"><Boxes size={28} /><span>KeyGo<br /><b>OPERACION</b></span></Link><nav aria-label="Navegacion operativa"><Link href="/operacion"><LayoutDashboard size={19} />Resumen</Link><Link href="/operacion/recepcion"><ScanLine size={19} />Recepcion</Link><Link href="/operacion/paquetes"><PackageSearch size={19} />Inventario</Link><Link href="/operacion/entregas"><ClipboardCheck size={19} />Entregas</Link></nav><p><small>Bodega activa</small><b>Miami, USA</b></p></aside><main className="operations-content">{children}</main></div>;
}