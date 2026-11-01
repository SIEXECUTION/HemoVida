import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ClipboardCheck } from "lucide-react";
import { liveRequest } from "../services/liveApi";
import { Form } from "./clinical/ClinicalCircuit";

type Requirement = { idrequisito: number; nombrerequisito: string };
type Answer = { idrequisito: number; cumple: boolean; observacion?: string };
type Slot = { idturno: number; inicio: string; fin: string; disponibles: number; cupo: number };
type Appointment = {
  idcita: number; idpersona: number; nombres: string; apellidos: string; ci: string;
  fechahoraprogramada: string; tipoatencion: string | null; estadocita: string;
  prefiltroaprobado: boolean; asistenciaconfirmada: boolean;
  respuestas: Answer[] | null; requisitos_registrados: Requirement[] | null;
};
type Catalog = {
  requisitos: Requirement[]; versioncatalogo: string; turnos: Slot[]; citas: Appointment[];
  personas: { idpersona: number; nombres: string; apellidos: string; ci: string }[];
};
const input = "w-full border border-slate-300 bg-slate-50 rounded-xl p-3";
function date(value: string) {
  const iso = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + "Z";
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(iso));
}
export function AgendaPage({ token, role }: { token: string; role: string }) {
  const [data, setData] = useState<Catalog | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const catalogVersion = useRef("");
  const staff = ["ADMIN", "PERS_COLECTA"].includes(role);
  async function load(signal?: AbortSignal) {
    try {
      const next = await liveRequest<Catalog>("agenda/catalogo/", token, undefined, signal);
      if (catalogVersion.current !== next.versioncatalogo) setAnswers({});
      catalogVersion.current = next.versioncatalogo;
      setData(next);
    }
    catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setError((e as Error).message); }
  }
  useEffect(() => { const c = new AbortController(); void load(c.signal); return () => c.abort(); }, [token]);
  async function act(path: string, body: unknown, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await liveRequest<{ mensaje?: string }>(path, token, body);
      setMessage(result.mensaje || success); await load(); return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <header className="bg-white rounded-3xl border p-6 space-y-2">
      <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays /> Citas y prefiltro</h1>
      <p>Horarios en Bolivia (America/La_Paz). El prefiltro orienta la atención; la aptitud y la autorización de colecta requieren evaluación profesional.</p>
      <p>Lunes a viernes: 08:00–12:00 y 13:00–17:00. Citas de 15 minutos, una persona por intervalo y 32 cupos por día completo.</p>
      <button className="text-rose-700 font-bold" disabled={busy} onClick={() => { setError(""); void load(); }}>Actualizar agenda</button>
    </header>
    {error && <p role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-900">{error}</p>}
    {message && <p role="status" className="p-4 rounded-xl bg-emerald-50 text-emerald-900">{message}</p>}
    {!data && !error && <p>Cargando agenda…</p>}
    {data && <>
      {role === "ADMIN" && <Form title="Publicar agenda del día" fields={[
        { name: "fecha", label: "Fecha de atención (lunes a viernes)", type: "date" },
      ]} submit={async d => { const r = await liveRequest<{mensaje:string}>("agenda/turnos/", token, d); setMessage(r.mensaje); await load(); }} />}
      <form className="bg-white border rounded-3xl p-6 space-y-5" onSubmit={async e => {
        e.preventDefault(); const fd = new FormData(e.currentTarget);
        const body = {
          idturno: Number(fd.get("idturno")), tipoatencion: fd.get("tipoatencion"),
          ...(staff ? { idpersona: Number(fd.get("idpersona")) } : {}),
          versioncatalogo: data.versioncatalogo,
          respuestas: data.requisitos.map(r => ({ idrequisito: r.idrequisito, cumple: answers[r.idrequisito] === "true" })),
        };
        if (data.requisitos.some(r => answers[r.idrequisito] === undefined)) { setError("Completa todos los requisitos."); return; }
        if (await act("agenda/citas/", body, "Solicitud registrada.")) setAnswers({});
      }}>
        <h2 className="font-bold text-xl flex gap-2"><ClipboardCheck /> Solicitar atención</h2>
        <fieldset disabled={busy || !data.turnos.some(t => t.disponibles > 0) || !data.requisitos.length} className="space-y-4">
          {staff && <label className="block">Postulante<select required name="idpersona" className={input} defaultValue=""><option value="" disabled>Selecciona la persona verificada</option>{data.personas.map(p => <option key={p.idpersona} value={p.idpersona}>{p.ci} · {p.nombres} {p.apellidos}</option>)}</select></label>}
          <label className="block">Tipo de atención<select name="tipoatencion" className={input}><option value="Evaluacion">Evaluación previa</option><option value="Donacion">Donación sujeta a triaje</option></select></label>
          <label className="block">Turno disponible<select required name="idturno" defaultValue="" className={input}><option value="" disabled>Selecciona un turno</option>{data.turnos.filter(t => t.disponibles > 0).map(t => <option key={t.idturno} value={t.idturno}>{date(t.inicio)} · {t.disponibles} cupos</option>)}</select></label>
          <p>Indica si cumples cada requisito del catálogo vigente. Si falta un requisito, puedes agendar evaluación profesional; la solicitud de donación queda pendiente y no reserva cupo. No se declara un diferimiento médico automáticamente.</p>
          {data.requisitos.map(r => <fieldset key={r.idrequisito} className="border rounded-xl p-4">
            <legend className="px-2 font-semibold break-words">{r.nombrerequisito}</legend>
            {["true", "false"].map(value => <label key={value} className="inline-flex items-center gap-2 mr-5"><input required type="radio" name={`requisito-${r.idrequisito}`} value={value} checked={answers[r.idrequisito] === value} onChange={() => setAnswers(a => ({ ...a, [r.idrequisito]: value }))} />{value === "true" ? "Cumplo" : "No cumplo"}</label>)}
          </fieldset>)}
          <button className="bg-rose-700 text-white rounded-xl px-5 py-3 font-bold" type="submit">Guardar prefiltro y solicitar cita</button>
        </fieldset>
        {!data.turnos.some(t => t.disponibles > 0) && <p>No hay turnos con cupo publicados. Consulta a recepción.</p>}
        {!data.requisitos.length && <p>El catálogo de requisitos está pendiente de configuración. Consulta a recepción.</p>}
      </form>
      <section className="bg-white border rounded-3xl p-6 space-y-4">
        <h2 className="font-bold text-xl">{staff ? "Agenda y solicitudes recientes" : "Mis citas y solicitudes"}</h2>
        <p className="text-sm">Hasta 200 registros recientes. El número identifica la cita real.</p>
        {!data.citas.length && <p>No hay citas registradas.</p>}
        {data.citas.map(a => <article key={a.idcita} className="border rounded-2xl p-4 space-y-3">
          <h3 className="font-bold">Cita #{a.idcita} · {date(a.fechahoraprogramada)}</h3>
          {staff && <p>{a.ci} · {a.nombres} {a.apellidos}</p>}
          <p>{a.tipoatencion || "Histórica sin clasificar"} · {a.estadocita} · Prefiltro {a.prefiltroaprobado ? "aprobado" : "pendiente de revisión"}{a.asistenciaconfirmada ? " · Asistencia confirmada" : ""}</p>
          {a.respuestas && <details><summary className="cursor-pointer text-rose-700">Ver prefiltro registrado</summary><ul className="space-y-2 mt-2">{a.respuestas.map(r => <li key={r.idrequisito}>{a.requisitos_registrados?.find(q => q.idrequisito === r.idrequisito)?.nombrerequisito || `Requisito ${r.idrequisito}`}: {r.cumple ? "Cumple" : "No cumple"}</li>)}</ul></details>}
          {["Programada", "Pendiente"].includes(a.estadocita) && !a.asistenciaconfirmada && <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="border rounded-xl px-4 py-2" onClick={() => { if (window.confirm(`¿Cancelar la cita #${a.idcita}?`)) void act(`agenda/citas/${a.idcita}/cancelar/`, {}, "Cita cancelada."); }}>Cancelar cita #{a.idcita}</button>
            {a.estadocita === "Programada" && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void act(`agenda/citas/${a.idcita}/reprogramar/`, { idturno: Number(new FormData(e.currentTarget).get("idturno")) }, "Cita reprogramada."); }}>
              <select disabled={busy} required className={input} name="idturno" defaultValue="" aria-label={`Nuevo turno de cita ${a.idcita}`}><option value="" disabled>Nuevo turno</option>{data.turnos.filter(t => t.disponibles > 0).map(t => <option key={t.idturno} value={t.idturno}>{date(t.inicio)}</option>)}</select>
              <button disabled={busy} className="bg-slate-900 text-white rounded-xl px-4 py-2">Reprogramar cita #{a.idcita}</button>
            </form>}
            {staff && a.estadocita === "Programada" && <button disabled={busy} className="bg-emerald-700 text-white rounded-xl px-4 py-2" onClick={() => { if (window.confirm("Confirma presencia física e identidad. Este pase deriva a triaje y no autoriza extracción.")) void act("clinica/admision/", { idcita: a.idcita, idpersona: a.idpersona }, "Asistencia confirmada; derivar a triaje."); }}>Confirmar asistencia #{a.idcita}</button>}
          </div>}
        </article>)}
      </section>
    </>}
  </section>;
}
