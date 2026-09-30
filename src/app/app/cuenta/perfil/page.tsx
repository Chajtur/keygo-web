"use client";

import Link from "next/link";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Profile = { fullName: string; email: string; phone: string | null; emailVerified: boolean };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [values, setValues] = useState({ fullName: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Inicia sesión para ver tu perfil.");
      setProfile(data);
      setValues({ fullName: data.fullName || "", email: data.email || "", phone: data.phone || "" });
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu perfil."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try {
      const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudieron guardar los cambios.");
      setNotice(data.message || "Tus datos se actualizaron.");
      setProfile((current) => current ? { ...current, ...values, phone: values.phone || null, emailVerified: data.emailVerificationRequired ? false : current.emailVerified } : current);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los cambios."); }
    finally { setSaving(false); }
  }

  return <section className="flow-page profile-page">
    <Link href="/app/cuenta" className="back-link"><ArrowLeft size={18} /> Mi cuenta</Link>
    <p className="eyebrow">Tu perfil</p><h1>Datos personales</h1>
    <p className="flow-intro">Mantén actualizados tus datos de contacto. Tu casillero y el historial de paquetes se conservarán.</p>
    {loading ? <p className="profile-state">Cargando tus datos...</p> : profile ? <form className="keygo-form" onSubmit={handleSubmit}>
      <fieldset><legend>Información de tu cuenta</legend>
        <label>Nombre completo<input name="fullName" autoComplete="name" required maxLength={160} value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} /></label>
        <label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={255} value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /><small>Si cambias el correo, te enviaremos un enlace para verificarlo.</small></label>
        <label>Número de teléfono<input name="phone" type="tel" autoComplete="tel" maxLength={40} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></label>
      </fieldset>
      {!profile.emailVerified && <div className="info-box"><UserRound size={19} /><span>Tu correo está pendiente de verificación. Verifícalo para poder iniciar sesión con él.</span></div>}
      {error && <p className="profile-error" role="alert">{error}</p>}{notice && <p className="profile-success" role="status">{notice}</p>}
      <button className="form-button" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}<Save size={18} /></button>
    </form> : <p className="profile-error" role="alert">{error || "No se pudo cargar tu perfil."} <Link href="/ingresar">Ingresar</Link></p>}
  </section>;
}
