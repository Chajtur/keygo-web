import Link from "next/link";
import { ArrowRight, PackageSearch, Search } from "lucide-react";

const packages = [{ code: "KG-P-000145", customer: "Andrea Martinez · KG-032875", location: "MIA-A-03-12", status: "Recibido en Miami" }, { code: "KG-P-000146", customer: "Carlos Rivera · KG-032944", location: "MIA-B-01-04", status: "Pendiente de ubicación" }];

export default function OperationsPackagesPage() {
  return <section><header className="operations-header"><p className="eyebrow">Inventario</p><h1>Paquetes</h1></header><label className="search-field"><Search size={18} /><input placeholder="Buscar tracking, código o casillero" /></label><div className="operations-list">{packages.map((item) => <article key={item.code}><i><PackageSearch size={21} /></i><div><b>{item.code}</b><span>{item.customer}</span><small>{item.location} · {item.status}</small></div><Link href="/operacion/recepcion"><ArrowRight size={18} /></Link></article>)}</div></section>;
}