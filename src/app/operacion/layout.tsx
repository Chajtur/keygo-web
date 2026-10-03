import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { getCurrentStaff } from "@/server/auth";
import OperationsNavigation from "./OperationsNavigation";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/empleados/ingresar");
  return <div className="operations-shell"><aside className="operations-sidebar"><Link href="/operacion" className="operations-brand"><Boxes size={28} /><span>KeyGo<br /><b>OPERACION</b></span></Link><OperationsNavigation /><p><small>Bodega activa</small><b>Miami, USA</b></p></aside><main className="operations-content">{children}</main></div>;
}
