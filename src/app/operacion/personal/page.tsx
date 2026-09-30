"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Pencil, Plus, UserRound, UserX, X } from "lucide-react";

type Role = { code: string; description: string };
type Warehouse = { code: string; name: string; city: string };
type StaffMember = { publicId: string; fullName: string; email: string; status: "ACTIVE" | "INACTIVE"; roleCodes: string; warehouseCodes: string };
type StaffPayload = { staff: StaffMember[]; roles: Role[]; warehouses: Warehouse[] };

const emptyForm = { fullName: "", email: "", password: "", status: "ACTIVE", roleCodes: [] as string[], warehouseCodes: [] as string[] };

export default function StaffPage() {
  const [data, setData] = useState<StaffPayload>({ staff: [], roles: [], warehouses: [] });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestStaff() {
    const response = await fetch("/api/operation/staff", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo cargar el personal.");
    return result as StaffPayload;
  }

  async function loadStaff() { setData(await requestStaff()); }

  useEffect(() => {
    let active = true;
    requestStaff().then((result) => { if (active) setData(result); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Error al cargar personal."); });
    return () => { active = false; };
  }, []);

  function toggle(list: string[], code: string) { return list.includes(code) ? list.filter((value) => value !== code) : [...list, code]; }

  function startEdit(member: StaffMember) {
    setEditing(member.publicId);
    setForm({ fullName: member.fullName, email: member.email, password: "", status: member.status, roleCodes: member.roleCodes ? member.roleCodes.split(",") : [], warehouseCodes: member.warehouseCodes ? member.warehouseCodes.split(",") : [] });
    setError(""); setNotice("");
  }

  function resetForm() { setEditing(null); setForm(emptyForm); setError(""); setNotice(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const endpoint = editing ? `/api/operation/staff/${editing}` : "/api/operation/staff";
      const method = editing ? "PATCH" : "POST";
      const body = editing
        ? { fullName: form.fullName, status: form.status, roleCodes: form.roleCodes, warehouseCodes: form.warehouseCodes, ...(form.password ? { password: form.password } : {}) }
        : form;
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar los cambios.");
      await loadStaff();
      setNotice(editing ? "Se actualizaron los datos del empleado." : "Se creó la cuenta del empleado.");
      setEditing(null); setForm(emptyForm);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Error al guardar el empleado."); }
    finally { setBusy(false); }
  }

  async function deactivate(member: StaffMember) {
    if (!window.confirm(`¿Desactivar la cuenta de ${member.fullName}? Se cerrarán sus sesiones activas.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/operation/staff/${member.publicId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo desactivar el empleado.");
      await loadStaff(); setNotice("La cuenta fue desactivada y sus sesiones cerradas.");
      if (editing === member.publicId) resetForm();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Error al desactivar la cuenta."); }
    finally { setBusy(false); }
  }

  return <section className="staff-page">
    <header className="operations-header"><p className="eyebrow">Administración</p><h1>Personal y permisos</h1><p className="flow-intro">Crea cuentas del equipo, asigna funciones y limita el acceso a sus bodegas.</p></header>
    {error && <p className="form-notice" role="alert">{error}</p>}{notice && <p className="staff-success" role="status"><Check size={17} />{notice}</p>}

    <form className="staff-form" onSubmit={submit}>
      <div className="staff-form-heading"><h2>{editing ? "Editar empleado" : "Agregar empleado"}</h2>{editing && <button type="button" className="staff-icon-button" onClick={resetForm} aria-label="Cancelar edición"><X size={18} /></button>}</div>
      <div className="staff-fields"><label>Nombre completo<input required minLength={2} maxLength={160} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        {!editing && <label>Correo electrónico<input required type="email" maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>}
        <label>{editing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}<input required={!editing} type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>Mínimo 12 caracteres. Se guarda protegida y no se vuelve a mostrar.</small></label>
        {editing && <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></label>}
      </div>
      <fieldset className="staff-checks"><legend>Roles</legend>{data.roles.map((role) => <label key={role.code}><input type="checkbox" checked={form.roleCodes.includes(role.code)} onChange={() => setForm({ ...form, roleCodes: toggle(form.roleCodes, role.code) })} /><span><b>{role.code}</b><small>{role.description}</small></span></label>)}</fieldset>
      <fieldset className="staff-checks"><legend>Bodegas autorizadas</legend>{data.warehouses.length ? data.warehouses.map((warehouse) => <label key={warehouse.code}><input type="checkbox" checked={form.warehouseCodes.includes(warehouse.code)} onChange={() => setForm({ ...form, warehouseCodes: toggle(form.warehouseCodes, warehouse.code) })} /><span><b>{warehouse.name} · {warehouse.code}</b><small>{warehouse.city}</small></span></label>) : <p className="staff-empty">No hay bodegas activas configuradas.</p>}</fieldset>
      <button className="form-button" disabled={busy || !data.roles.length || !data.warehouses.length}>{busy ? "Guardando..." : editing ? "Guardar cambios" : <><Plus size={18} /> Crear empleado</>}</button>
    </form>

    <section className="staff-list"><div className="staff-list-heading"><h2>Equipo</h2><span>{data.staff.length} cuentas</span></div>
      {data.staff.length ? data.staff.map((member) => <article className="staff-card" key={member.publicId}><i><UserRound size={20} /></i><div className="staff-card-body"><b>{member.fullName}</b><small>{member.email}</small><span className={member.status === "ACTIVE" ? "staff-status active" : "staff-status"}>{member.status === "ACTIVE" ? "Activo" : "Inactivo"}</span><small>Roles: {member.roleCodes.replaceAll(",", ", ") || "Sin roles"}</small><small>Bodegas: {member.warehouseCodes.replaceAll(",", ", ") || "Sin acceso"}</small></div><div className="staff-card-actions"><button type="button" className="staff-icon-button" onClick={() => startEdit(member)} disabled={busy} aria-label={`Editar ${member.fullName}`}><Pencil size={17} /></button>{member.status === "ACTIVE" && <button type="button" className="staff-icon-button danger" onClick={() => deactivate(member)} disabled={busy} aria-label={`Desactivar ${member.fullName}`}><UserX size={18} /></button>}</div></article>) : <p className="staff-empty">Todavía no hay cuentas de personal asignadas a roles.</p>}
    </section>
  </section>;
}
