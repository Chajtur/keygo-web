import Link from "next/link";
import { ArrowRight, PackagePlus, ScanLine } from "lucide-react";

export default function OperationsPage() {
  return <><header className="operations-header"><p className="eyebrow">Miami, USA</p><h1>Resumen operativo</h1><span>Turno activo</span></header><section className="operations-queue"><PackagePlus size={25} /><div><b>08</b><span>Paquetes por recibir</span><small>Con preregistro pendiente de ingreso</small></div><Link href="/operacion/recepcion"><ArrowRight size={19} /></Link></section><section className="operations-action"><ScanLine size={25} /><div><h2>Registrar recepcion</h2><p>Escanea un tracking y confirma identificación, medidas y ubicación.</p></div><Link href="/operacion/recepcion" className="form-button">Abrir recepcion <ArrowRight size={18} /></Link></section></>;
}