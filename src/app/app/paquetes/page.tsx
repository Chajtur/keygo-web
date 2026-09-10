import Link from "next/link";
import { ArrowRight, Box, PackageCheck, Search } from "lucide-react";

const packages = [
  { code: "KG-P-000145", tracking: "1Z8A75E...", name: "Ropa y accesorios", status: "En Miami", balance: "USD 28.50", href: "/app/pagos/nuevo" },
  { code: "KG-P-000120", tracking: "940011...", name: "Articulos para hogar", status: "En transito", balance: "Sin cargos pendientes", href: "/app/envios" },
  { code: "KG-P-000131", tracking: "TBA308...", name: "Zapatos deportivos", status: "Listo para retirar", balance: "Pagado", href: "/app/retiros/nuevo" },
];

export default function PackagesPage() {
  return <section className="flow-page"><p className="eyebrow">Tu carga</p><h1>Mis paquetes</h1><p className="flow-intro">Consulta el estado y el saldo de cada pieza.</p><label className="search-field"><Search size={18} /><input placeholder="Buscar codigo o tracking" /></label><div className="package-list">{packages.map((item) => <article className="package-card" key={item.code}><span>{item.status}</span><div><i className="package-list-icon"><Box size={20} /></i><p><b>{item.code}</b><small>{item.name} · {item.tracking}</small><em>{item.balance}</em></p></div><Link href={item.href}>Ver detalle <ArrowRight size={17} /></Link></article>)}</div><Link href="/app/preregistros/nuevo" className="inline-action"><PackageCheck size={21} /><span><b>Esperas otro paquete?</b><small>Registra su tracking antes de que llegue a Miami.</small></span><ArrowRight size={18} /></Link></section>;
}