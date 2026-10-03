import Link from "next/link";
import { ArrowLeft, Bell, Handshake, LockKeyhole, Megaphone, ShieldCheck } from "lucide-react";
import { getCurrentCustomer } from "@/server/auth";
import ShareKeyGoCard from "./ShareKeyGoCard";

export default async function PreferencesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return <section className="flow-page"><p className="eyebrow">Tu cuenta</p><h1>Inicia sesión para ver tus preferencias</h1><Link href="/ingresar" className="form-button">Iniciar sesión</Link></section>;
  const registrationUrl = new URL("/", process.env.APP_BASE_URL || "https://keygo-web-production.up.railway.app").toString();

  return <section className="flow-page preferences-page">
    <Link href="/app/cuenta" className="back-link"><ArrowLeft size={18} /> Mi cuenta</Link>
    <p className="eyebrow">Tu cuenta</p><h1>Seguridad y avisos</h1>
    <p className="flow-intro">Administra la información de tu cuenta, revisa las comunicaciones y comparte KeyGo con otras personas.</p>

    <div className="preference-cards">
      <Link className="preference-card" href="/app/cuenta/perfil"><i><LockKeyhole size={21} /></i><span><b>Seguridad de la cuenta</b><small>Tu sesión se mantiene protegida. Revisa y actualiza tus datos de acceso desde tu perfil.</small><em>Administrar perfil</em></span></Link>
      <Link className="preference-card" href="/app/avisos"><i><Bell size={21} /></i><span><b>Centro de avisos</b><small>Consulta las actualizaciones de tus paquetes y los avisos de tu cuenta.</small><em>Ver avisos</em></span></Link>
    </div>

    <section className="preference-section" id="privacidad">
      <header><ShieldCheck size={21} /><div><h2>Privacidad y uso de datos</h2><p>Información clara sobre los datos usados para atender tus envíos.</p></div></header>
      <div className="privacy-summary"><p>KeyGo utiliza tus datos de contacto y la información de tus paquetes para administrar tu cuenta, identificar tus compras en Miami, coordinar envíos a Honduras y mantenerte informado sobre el estado de tu carga.</p><p>Desde tu perfil puedes mantener actualizados tu nombre, correo y teléfono. Para consultas sobre tu información o una solicitud relacionada con privacidad, contacta a soporte desde tu cuenta.</p><Link href="/app/soporte">Contactar a soporte</Link></div>
      <small className="preference-caption">El documento legal completo de privacidad debe ser publicado por KeyGo cuando se aprueben su responsable, alcance y condiciones de conservación de datos.</small>
    </section>

    <section className="preference-section">
      <header><Megaphone size={21} /><div><h2>Promociones</h2><p>Ofertas y beneficios que KeyGo comparta con sus clientes.</p></div></header>
      <div className="preference-empty"><b>Próximamente</b><span>Cuando haya promociones activas, podrás consultarlas aquí y revisar sus condiciones.</span></div>
    </section>

    <section className="preference-section">
      <header><Handshake size={21} /><div><h2>Alianzas</h2><p>Beneficios de comercios y empresas aliadas con KeyGo.</p></div></header>
      <div className="preference-empty"><b>Próximamente</b><span>Las alianzas disponibles aparecerán aquí con información del comercio y sus beneficios.</span></div>
    </section>

    <ShareKeyGoCard url={registrationUrl} />
  </section>;
}
