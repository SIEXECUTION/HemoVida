import React, { useEffect, useRef, useState } from "react";
import { liveRequest } from "../services/liveApi";
import { Form } from "./clinical/ClinicalCircuit";
import { AgendaAdministration } from "./AgendaAdministration";
type Rule = { idrequisito: number; nombrerequisito: string };
type Answer = { idrequisito: number; cumple: boolean };
type Slot = { idturno: number; inicio: string; disponibles: number };
type Person = {
  idpersona: number;
  ci: string;
  nombres: string;
  apellidos: string;
};
type Appointment = Person & {
  idcita: number;
  fechahoraprogramada: string;
  tipoatencion: string | null;
  estadocita: string;
  prefiltroaprobado: boolean;
  asistenciaconfirmada: boolean;
  respuestas: Answer[] | null;
  requisitos_registrados: Rule[] | null;
};
type Page = { pagina: number; total: number; tamano: number };
type Draft = {
  versioncatalogo: string;
  respuestas: Answer[];
  idturno: number | null;
  tipoatencion: string;
  idprograma: number | null;
};
type Catalog = {
  requisitos: Rule[];
  versioncatalogo: string;
  turnos: Slot[];
  personas: Person[];
  citas: Appointment[];
  borrador?: Draft | null;
  paginacion?: Page;
  personas_paginacion?: Page;
  turnos_paginacion?: Page;
  programas?: {
    idprograma: number;
    idreceptor: number;
    fechacirugia: string;
  }[];
  cierres?: { fecha: string; cerrado: boolean; motivo: string }[];
};
const input = "w-full border border-slate-300 bg-slate-50 rounded-xl p-3";
function iso(s: string) {
  return /Z$|[+-]\d\d:\d\d$/.test(s) ? s : s + "Z";
}
function date(s: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(iso(s)));
}
function day(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function Pager({
  meta,
  label,
  onChange,
}: {
  meta?: Page;
  label: string;
  onChange: (p: number) => void;
}) {
  if (!meta) return null;
  const last = Math.max(1, Math.ceil(meta.total / meta.tamano));
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>
        {label}: {meta.total} · Página {meta.pagina} de {last}
      </span>
      <button
        type="button"
        className="p-2 border rounded-xl"
        disabled={meta.pagina <= 1}
        onClick={() => onChange(meta.pagina - 1)}
        aria-label={`Página anterior de ${label}`}
      >
        Anterior
      </button>
      <button
        type="button"
        className="p-2 border rounded-xl"
        disabled={meta.pagina >= last}
        onClick={() => onChange(meta.pagina + 1)}
        aria-label={`Página siguiente de ${label}`}
      >
        Siguiente
      </button>
    </div>
  );
}
export function AgendaPage({ token, role }: { token: string; role: string }) {
  const [data, setData] = useState<Catalog | null>(null),
    [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [person, setPerson] = useState(""),
    [slot, setSlot] = useState(""),
    [attention, setAttention] = useState("Evaluacion"),
    [program, setProgram] = useState(""),
    [walkIn, setWalkIn] = useState(false),
    [reason, setReason] = useState("");
  const [q, setQ] = useState(""),
    [filters, setFilters] = useState({
      q: "",
      fecha: "",
      fecha_turnos: "",
      estado: "",
      pagina: "1",
      pagina_personas: "1",
      pagina_turnos: "1",
    });
  const version = useRef(""),
    staff = ["ADMIN", "PERS_COLECTA"].includes(role);
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v),
  ).toString();
  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const d = await liveRequest<Catalog>(
        `agenda/catalogo/?${query}`,
        token,
        undefined,
        signal,
      );
      if (version.current !== d.versioncatalogo) setAnswers({});
      version.current = d.versioncatalogo;
      setData(d);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const c = new AbortController();
    setError("");
    void load(c.signal);
    return () => c.abort();
  }, [token, query]);
  async function act(path: string, body: unknown, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await liveRequest<{ mensaje?: string }>(path, token, body);
      setMessage(r.mensaje || success);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function payload(partial = false) {
    return {
      idturno: slot ? Number(slot) : undefined,
      tipoatencion: attention,
      ...(staff ? { idpersona: Number(person) } : {}),
      ...(program ? { idprograma: Number(program) } : {}),
      versioncatalogo: data!.versioncatalogo,
      respuestas: data!.requisitos
        .filter((r) => !partial || answers[r.idrequisito] !== undefined)
        .map((r) => ({
          idrequisito: r.idrequisito,
          cumple: answers[r.idrequisito] === "true",
        })),
    };
  }
  async function restore() {
    setBusy(true);
    setError("");
    try {
      const d = staff
        ? await liveRequest<Draft | null>(
            `agenda/borrador/?idpersona=${Number(person)}`,
            token,
          )
        : data?.borrador;
      if (!d) {
        setMessage("No hay borrador guardado.");
        return;
      }
      if (d.versioncatalogo !== data?.versioncatalogo) {
        setAnswers({});
        throw new Error(
          "El borrador usa un cuestionario anterior. Responde los requisitos vigentes.",
        );
      }
      setAnswers(
        Object.fromEntries(
          d.respuestas.map((a) => [a.idrequisito, String(a.cumple)]),
        ),
      );
      setAttention(d.tipoatencion);
      setProgram(d.idprograma ? String(d.idprograma) : "");
      setSlot(
        data?.turnos.some((t) => t.idturno === d.idturno)
          ? String(d.idturno)
          : "",
      );
      setMessage(
        "Borrador recuperado. Revisa respuestas y disponibilidad antes de confirmar.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || loading;
  return (
    <section className="space-y-5">
      <header className="bg-white rounded-3xl border p-6 space-y-2">
        <h1 className="text-2xl font-bold">Citas y prefiltro</h1>
        <p>
          Lunes a viernes: 08:00–12:00 y 13:00–17:00 en Bolivia. Citas de 15
          minutos, un cupo por intervalo y 32 al día completo.
        </p>
        <p>
          El prefiltro orienta la atención; no sustituye el dictamen clínico ni
          autoriza extracción.
        </p>
        <button
          className="text-rose-700 font-bold"
          disabled={disabled}
          onClick={() => {
            setError("");
            void load();
          }}
        >
          Actualizar agenda
        </button>
      </header>
      {error && (
        <p role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-900">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="p-4 rounded-xl bg-emerald-50 text-emerald-900"
        >
          {message}
        </p>
      )}
      {loading && <p>Actualizando agenda…</p>}
      {data && (
        <>
          {role === "ADMIN" && (
            <>
              <Form
                title="Publicar agenda del día"
                fields={[
                  {
                    name: "fecha",
                    label: "Fecha de atención (lunes a viernes)",
                    type: "date",
                  },
                ]}
                submit={async (d) => {
                  const r = await liveRequest<{ mensaje: string }>(
                    "agenda/turnos/",
                    token,
                    d,
                  );
                  setMessage(r.mensaje);
                  await load();
                }}
              />
              <AgendaAdministration token={token} onUpdate={load} />
            </>
          )}
          <form
            className="bg-white border rounded-3xl p-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPerson("");
              setFilters((f) => ({
                ...f,
                q,
                pagina: "1",
                pagina_personas: "1",
              }));
            }}
          >
            <label className="block">
              Buscar por CI, carnet o nombre
              <input
                className={input}
                value={q}
                maxLength={80}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button
              disabled={disabled}
              className="bg-slate-900 text-white p-3 rounded-xl"
            >
              Buscar en la agenda
            </button>
          </form>
          <form
            className="bg-white border rounded-3xl p-6 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                data.requisitos.some(
                  (r) => answers[r.idrequisito] === undefined,
                )
              ) {
                setError("Completa todos los requisitos.");
                return;
              }
              const body = payload();
              if (
                await act(
                  walkIn ? "agenda/presencial/" : "agenda/citas/",
                  walkIn ? { ...body, autorizada: true, motivo: reason } : body,
                  "Solicitud registrada.",
                )
              )
                setAnswers({});
            }}
          >
            <h2 className="font-bold text-xl">Solicitar atención</h2>
            <fieldset disabled={disabled} className="space-y-4">
              {staff && (
                <>
                  <label className="block">
                    Postulante
                    <select
                      aria-label="Postulante"
                      required
                      className={input}
                      value={person}
                      onChange={(e) => {
                        setPerson(e.target.value);
                        setProgram("");
                        setAnswers({});
                      }}
                    >
                      <option value="" disabled>
                        Selecciona la persona verificada
                      </option>
                      {data.personas.map((p) => (
                        <option key={p.idpersona} value={p.idpersona}>
                          {p.ci} · {p.nombres} {p.apellidos}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Pager
                    meta={data.personas_paginacion}
                    label="postulantes"
                    onChange={(p) => {
                      setPerson("");
                      setFilters((f) => ({ ...f, pagina_personas: String(p) }));
                    }}
                  />
                </>
              )}
              <label className="block">
                Tipo de atención
                <select
                  className={input}
                  value={attention}
                  onChange={(e) => setAttention(e.target.value)}
                >
                  <option value="Evaluacion">Evaluación previa</option>
                  <option value="Donacion">Donación sujeta a triaje</option>
                  <option value="Autologa">Colecta autóloga programada</option>
                </select>
              </label>
              <label className="block">
                Programa autólogo (solo cuando corresponda)
                <select
                  className={input}
                  value={program}
                  required={attention === "Autologa" || role === "RECEPTOR"}
                  onChange={(e) => setProgram(e.target.value)}
                >
                  <option value="">Sin programación autóloga</option>
                  {(data.programas || [])
                    .filter((p) => !staff || p.idreceptor === Number(person))
                    .map((p) => (
                      <option key={p.idprograma} value={p.idprograma}>
                        Programa #{p.idprograma} · Cirugía {p.fechacirugia}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                Día para buscar turnos
                <input
                  className={input}
                  type="date"
                  value={filters.fecha_turnos}
                  onChange={(e) => {
                    setSlot("");
                    setFilters((f) => ({
                      ...f,
                      fecha_turnos: e.target.value,
                      pagina_turnos: "1",
                    }));
                  }}
                />
              </label>
              <label className="block">
                Turno disponible
                <select
                  required
                  className={input}
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                >
                  <option value="" disabled>
                    Selecciona un turno
                  </option>
                  {data.turnos.map((t) => (
                    <option key={t.idturno} value={t.idturno}>
                      {date(t.inicio)} · {t.disponibles} cupos
                    </option>
                  ))}
                </select>
              </label>
              <Pager
                meta={data.turnos_paginacion}
                label="turnos"
                onChange={(p) => {
                  setSlot("");
                  setFilters((f) => ({ ...f, pagina_turnos: String(p) }));
                }}
              />
              <p>
                Si falta un requisito, solicita evaluación profesional. La
                solicitud ordinaria de donación queda pendiente y no reserva
                cupo. Una cita autóloga requiere programación aprobada.
              </p>
              {data.requisitos.map((r) => (
                <fieldset key={r.idrequisito} className="border rounded-xl p-4">
                  <legend className="px-2 font-semibold break-words">
                    {r.nombrerequisito}
                  </legend>
                  {["true", "false"].map((v) => (
                    <label
                      key={v}
                      className="inline-flex items-center gap-2 mr-5"
                    >
                      <input
                        required
                        type="radio"
                        name={`requisito-${r.idrequisito}`}
                        value={v}
                        checked={answers[r.idrequisito] === v}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [r.idrequisito]: v }))
                        }
                      />
                      {v === "true" ? "Cumplo" : "No cumplo"}
                    </label>
                  ))}
                </fieldset>
              ))}
              {staff && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={walkIn}
                      onChange={(e) => setWalkIn(e.target.checked)}
                    />
                    Autorizar ingreso presencial sin cita previa
                  </label>
                  {walkIn && (
                    <label className="block">
                      Motivo de la admisión presencial
                      <input
                        className={input}
                        required
                        minLength={10}
                        maxLength={250}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                  )}
                </>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="bg-rose-700 text-white rounded-xl px-5 py-3 font-bold"
                  disabled={!data.turnos.length || !data.requisitos.length}
                >
                  Guardar prefiltro y solicitar cita
                </button>
                <button
                  type="button"
                  className="border rounded-xl px-4 py-3"
                  onClick={() =>
                    void act(
                      "agenda/borrador/",
                      payload(true),
                      "Borrador guardado.",
                    )
                  }
                >
                  Guardar borrador incompleto
                </button>
                <button
                  type="button"
                  disabled={staff && !person}
                  className="border rounded-xl px-4 py-3"
                  onClick={() => void restore()}
                >
                  Recuperar borrador guardado
                </button>
              </div>
            </fieldset>
            {!data.turnos.length && (
              <p>
                No hay turnos con cupo para esta búsqueda. Elige otra fecha o
                consulta a recepción.
              </p>
            )}
            {!data.requisitos.length && (
              <p>El catálogo de requisitos requiere configuración.</p>
            )}
          </form>
          <section className="bg-white border rounded-3xl p-6 space-y-4">
            <h2 className="font-bold text-xl">
              {staff ? "Agenda y solicitudes" : "Mis citas y solicitudes"}
            </h2>
            <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-3">
              <label>
                Fecha de las citas
                <input
                  className={input}
                  type="date"
                  value={filters.fecha}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      fecha: e.target.value,
                      pagina: "1",
                    }))
                  }
                />
              </label>
              <label>
                Estado de las citas
                <select
                  className={input}
                  value={filters.estado}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      estado: e.target.value,
                      pagina: "1",
                    }))
                  }
                >
                  <option value="">Todos</option>
                  {[
                    "Programada",
                    "Atendida",
                    "Pendiente",
                    "Cancelada",
                    "Inasistencia",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </fieldset>
            <Pager
              meta={data.paginacion}
              label="citas"
              onChange={(p) => setFilters((f) => ({ ...f, pagina: String(p) }))}
            />
            {!data.citas.length && <p>No hay citas para esta búsqueda.</p>}
            {data.citas.map((a) => (
              <article
                key={a.idcita}
                className="border rounded-2xl p-4 space-y-3"
              >
                <h3 className="font-bold">
                  Cita #{a.idcita} · {date(a.fechahoraprogramada)}
                </h3>
                {staff && (
                  <p>
                    {a.ci} · {a.nombres} {a.apellidos}
                  </p>
                )}
                <p>
                  {a.tipoatencion || "Histórica sin clasificar"} ·{" "}
                  {a.estadocita} · Prefiltro{" "}
                  {a.prefiltroaprobado ? "aprobado" : "pendiente de revisión"}
                  {a.asistenciaconfirmada ? " · Asistencia confirmada" : ""}
                </p>
                {a.respuestas && (
                  <details>
                    <summary className="cursor-pointer text-rose-700">
                      Ver prefiltro registrado
                    </summary>
                    <ul className="space-y-2 mt-2">
                      {a.respuestas.map((r) => (
                        <li key={r.idrequisito}>
                          {a.requisitos_registrados?.find(
                            (q) => q.idrequisito === r.idrequisito,
                          )?.nombrerequisito || `Requisito ${r.idrequisito}`}
                          : {r.cumple ? "Cumple" : "No cumple"}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {["Programada", "Pendiente"].includes(a.estadocita) &&
                  !a.asistenciaconfirmada && (
                    <div className="flex flex-wrap items-start gap-3">
                      <button
                        disabled={disabled}
                        className="border rounded-xl px-4 py-2"
                        onClick={() => {
                          if (window.confirm(`¿Cancelar la cita #${a.idcita}?`))
                            void act(
                              `agenda/citas/${a.idcita}/cancelar/`,
                              {},
                              "Cita cancelada.",
                            );
                        }}
                      >
                        Cancelar cita #{a.idcita}
                      </button>
                      {a.estadocita === "Programada" && (
                        <form
                          className="flex flex-wrap gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void act(
                              `agenda/citas/${a.idcita}/reprogramar/`,
                              {
                                idturno: Number(
                                  new FormData(e.currentTarget).get("idturno"),
                                ),
                              },
                              "Cita reprogramada.",
                            );
                          }}
                        >
                          <select
                            required
                            disabled={disabled}
                            className={input}
                            name="idturno"
                            defaultValue=""
                            aria-label={`Nuevo turno de cita ${a.idcita}`}
                          >
                            <option value="" disabled>
                              Nuevo turno
                            </option>
                            {data.turnos.map((t) => (
                              <option key={t.idturno} value={t.idturno}>
                                {date(t.inicio)}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={disabled}
                            className="bg-slate-900 text-white rounded-xl px-4 py-2"
                          >
                            Reprogramar cita #{a.idcita}
                          </button>
                        </form>
                      )}
                      {staff && a.estadocita === "Programada" && (
                        <button
                          disabled={
                            disabled ||
                            day(new Date(iso(a.fechahoraprogramada))) !==
                              day(new Date())
                          }
                          className="bg-emerald-700 text-white rounded-xl px-4 py-2 disabled:opacity-50"
                          title="La asistencia se confirma únicamente el día de la cita"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Confirma presencia física e identidad. Se deriva a triaje, sin autorizar extracción.",
                              )
                            )
                              void act(
                                "clinica/admision/",
                                { idcita: a.idcita, idpersona: a.idpersona },
                                "Asistencia confirmada; derivar a triaje.",
                              );
                          }}
                        >
                          Confirmar asistencia #{a.idcita}
                        </button>
                      )}
                    </div>
                  )}
              </article>
            ))}
          </section>
          {!!data.cierres?.length && (
            <details className="bg-white border rounded-xl p-4">
              <summary>Días con cierre o reapertura registrada</summary>
              {data.cierres.map((c) => (
                <p key={c.fecha}>
                  {c.fecha}: {c.cerrado ? "Cerrado" : "Reabierto"} · {c.motivo}
                </p>
              ))}
            </details>
          )}
        </>
      )}
    </section>
  );
}
