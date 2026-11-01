import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../services/api";
type Row = Record<string, any>;
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
  maxLength?: number;
  minLength?: number;
  options?: [string, string][];
};
const input =
  "w-full border border-slate-300 bg-slate-50 text-slate-900 rounded-xl p-3";
export function Form({
  title,
  fields,
  submit,
}: {
  title: string;
  fields: Field[];
  submit: (d: Row) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="p-6 rounded-3xl border bg-white shadow-sm space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget,
          fd = new FormData(f),
          d: Row = {};
        fields.forEach((x) => {
          const raw = fd.get(x.name);
          if (x.type === "checkbox") {
            d[x.name] = fd.has(x.name);
            return;
          }
          if (!raw && x.required === false) return;
          d[x.name] =
            x.type === "number"
              ? Number(raw)
              : x.type === "datetime-local" && raw
                ? new Date(String(raw)).toISOString()
                : raw;
        });
        setBusy(true);
        setError("");
        try {
          await submit(d);
          f.reset();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        {fields.map((x) => (
          <label key={x.name} className="text-sm font-semibold">
            {x.label}
            {x.options ? (
              <select
                aria-label={x.label}
                required={x.required !== false}
                name={x.name}
                className={input}
              >
                <option value="">Seleccionar</option>
                {x.options.map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={x.label}
                required={x.required !== false}
                name={x.name}
                type={x.type || "text"}
                step={x.step || (x.type === "number" ? "any" : undefined)}
                maxLength={x.maxLength}
                minLength={x.minLength}
                className={input}
              />
            )}
          </label>
        ))}
        <button
          disabled={busy}
          className="p-3 bg-rose-700 text-white rounded-xl font-bold"
        >
          {busy ? "Guardando…" : "Confirmar y guardar"}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-rose-800">
          {error}
        </p>
      )}
    </form>
  );
}
const types = [
  "Concentrado de Globulos Rojos",
  "Paquete Globular",
  "Plasma Fresco Congelado",
  "Concentrado Plaquetario",
  "Crioprecipitado",
];
const partFields: Field[] = [
  {
    name: "tipocomponente",
    label: "Componente realmente obtenido",
    options: types.map((x) => [x, x]),
  },
  { name: "volumenml", label: "Volumen (ml)", type: "number" },
  {
    name: "capacidadbolsaml",
    label: "Capacidad de bolsa (ml)",
    type: "number",
  },
  {
    name: "categoriaetaria",
    label: "Categoría",
    options: ["Adulto", "Adolescente", "Pediátrico"].map((x) => [x, x]),
  },
];
export function ClinicalCircuit({
  token,
  role,
}: {
  token?: string;
  role: string;
}) {
  const [data, setData] = useState<Row>({}),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [parts, setParts] = useState<Row[]>([]),
    [mother, setMother] = useState(""),
    [busy, setBusy] = useState(false);
  const bearer = token || sessionStorage.getItem("hemovida_jwt_token");
  async function api(path: string, d?: Row) {
    if (!bearer) throw new Error("Inicia sesión con un perfil autorizado.");
    const r = await fetch(`${API_BASE_URL}/clinica/${path}`, {
      method: d ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      ...(d ? { body: JSON.stringify(d) } : {}),
    });
    const b = await r.json();
    if (!r.ok)
      throw new Error(
        typeof b.detail === "string" ? b.detail : JSON.stringify(b),
      );
    return b;
  }
  async function load() {
    setError("");
    try {
      setData(await api(`operaciones/?q=${encodeURIComponent(search)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    setData({});
    void load();
  }, [bearer, role]);
  async function save(path: string, d: Row) {
    setMessage("");
    await api(path, d);
    await load();
    setMessage("Operación guardada en la base de datos.");
  }
  const opts = (
    key: string,
    id: string,
    label: (r: Row) => string,
  ): [string, string][] =>
    (data[key] || []).map((r: Row) => [String(r[id]), label(r)]);
  const person: Field = {
    name: "idpersona",
    label: "Persona verificada",
    options: opts(
      "personas",
      "idpersona",
      (r) => `${r.ci} · ${r.nombres} ${r.apellidos}`,
    ),
  };
  const triage: Field = {
    name: "idtriaje",
    label: "Triaje",
    options: opts(
      "triajes",
      "idtriaje",
      (r) =>
        `#${r.idtriaje} · Persona ${r.idposibledonador} · ${r.resultadoaptitud} · ${r.fechahora}`,
    ),
  };
  const appointment: Field = {
    name: "idcita",
    label: "Cita",
    options: opts(
      "citas",
      "idcita",
      (r) =>
        `#${r.idcita} · Persona ${r.idpersona} · ${r.asistenciaconfirmada ? "Admitida" : "Sin admisión"} · ${r.fechahoraprogramada}`,
    ),
  };
  const location: Field = {
    name: "idubicacion",
    label: "Ubicación y conservación verificadas",
    options: opts(
      "ubicaciones",
      "idubicacion",
      (r) =>
        `${r.identificadorcompartimento} · ${r.tipoequipo} · ${r.temperaturaregistro} °C · ${r.capacidadocupada}/${r.capacidadmaxima}`,
    ),
  };
  const bag: Field = {
    name: "bolsa",
    label: "Componente",
    options: opts(
      "componentes",
      "idejemplarbolsa",
      (r) => `${r.codigoejemplark} · ${r.estadobolsak}`,
    ),
  };
  const collect = ["ADMIN", "PERS_COLECTA"].includes(role),
    lab = ["ADMIN", "BIOQ_INTEGRAL", "TEC_LOGISTICA"].includes(role);
  return (
    <section
      id="circuito-clinico"
      className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 text-slate-800"
    >
      <header className="bg-gradient-to-r from-slate-900 to-rose-950 text-white p-8 rounded-3xl">
        <h1 className="text-3xl font-bold">Atención clínica y colecta</h1>
        <p>Expediente, dictamen profesional, consentimiento y custodia.</p>
      </header>
      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="flex-1">
          Buscar C.I. o nombre
          <input
            className={input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="p-3 border rounded-xl">
          Consultar / actualizar
        </button>
      </form>
      {error && (
        <p role="alert" className="text-rose-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-teal-50 p-4 rounded-xl">
          {message}
        </p>
      )}
      {collect && (
        <Form
          title="Confirmar identidad y admisión"
          fields={[person, appointment]}
          submit={(d) => save("admision/", d)}
        />
      )}
      {["ADMIN", "DOC_TRIAJE"].includes(role) && (
        <Form
          title="CU10 · Evaluación y dictamen"
          fields={[
            person,
            appointment,
            ...[
              "pesokg",
              "presionsistolicammhg",
              "presiondiastolicammhg",
              "nivelhemoglobina",
              "temperatura",
            ].map((name, i) => ({
              name,
              label: [
                "Peso (kg)",
                "Presión sistólica (mmHg)",
                "Presión diastólica (mmHg)",
                "Hemoglobina (g/dl)",
                "Temperatura (°C)",
              ][i],
              type: "number",
            })),
            {
              name: "observaciones",
              label: "Observaciones clínicas",
              required: false,
              maxLength: 4000,
            },
            {
              name: "resultadoaptitud",
              label: "Dictamen médico confirmado",
              options: [
                ["Apto", "Apto"],
                ["Rechazado", "Rechazado"],
              ],
            },
          ]}
          submit={(d) => save("triajes/", d)}
        />
      )}
      {["ADMIN", "DOC_TRIAJE", "BIOQ_INTEGRAL"].includes(role) && (
        <Form
          title="CU11 · Diferimiento"
          fields={[
            person,
            triage,
            {
              name: "tipo",
              label: "Clasificación profesional",
              options: [
                ["Temporal", "Temporal"],
                ["Definitivo", "Definitivo"],
              ],
            },
            {
              name: "diasinhabilitacion",
              label: "Días (0 para definitivo)",
              type: "number",
            },
            { name: "motivodetallado", label: "Motivo y seguimiento" },
          ]}
          submit={(d) => save("diferimientos/", d)}
        />
      )}
      {collect && (
        <Form
          title="CU15 · Consentimiento y colecta"
          fields={[
            triage,
            {
              name: "idgrupo",
              label: "Grupo de la madre (debe ser confirmado en CU14)",
              options: opts(
                "grupos",
                "idgrupo",
                (r) => `${r.grupoabo} ${r.factorrh}`,
              ),
            },
            {
              name: "brazoextraccion",
              label: "Brazo",
              options: [
                ["Izquierdo", "Izquierdo"],
                ["Derecho", "Derecho"],
              ],
            },
            {
              name: "volumenextraidoml",
              label: "Volumen extraído confirmado (ml)",
              type: "number",
            },
            {
              name: "firmadigital",
              label: "Firma / evidencia del consentimiento previo",
            },
            {
              name: "declaracionjuradaaceptada",
              label: "Declaración y firma aceptadas antes de la extracción",
              type: "checkbox",
            },
          ]}
          submit={(d) => save("colectas/", d)}
        />
      )}
      {lab && (
        <>
          <div className="border rounded-3xl p-6 space-y-4 bg-white">
            <h2 className="text-xl font-bold">CU15 · Fraccionamiento</h2>
            <p>
              Comprueba la conservación y registra los componentes realmente
              obtenidos antes de confirmar el lote.
            </p>
            <label>
              Madre
              <select
                className={input}
                value={mother}
                onChange={(e) => {
                  setMother(e.target.value);
                  setParts([]);
                }}
              >
                <option value="">Seleccionar</option>
                {opts(
                  "madres",
                  "idunidadmadre",
                  (r) => `${r.codigobolsamadre} · ${r.estadoliberacion}`,
                ).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Form
              title="Añadir componente al lote por confirmar"
              fields={[...partFields, location]}
              submit={async (d) => {
                setParts((ps) => [...ps, d]);
              }}
            />
            {parts.map((p, i) => (
              <p key={i}>
                {p.tipocomponente} · {p.volumenml} ml · {p.categoriaetaria} ·
                Ubicación {p.idubicacion}{" "}
                <button
                  onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </p>
            ))}
            <button
              className="bg-teal-800 text-white p-3 rounded-xl"
              disabled={busy || !mother || !parts.length}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await save(`madres/${mother}/fraccionar/`, {
                    componentes: parts,
                  });
                  setParts([]);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar y guardar fraccionamiento
            </button>
          </div>
          <Form
            title="CU15 · Traslado de custodia"
            fields={[bag, location]}
            submit={({ bolsa, ...d }) =>
              save(`componentes/${bolsa}/custodiar/`, d)
            }
          />
          <Form
            title="CU15 · Baja autorizada"
            fields={[
              bag,
              { name: "motivobaja", label: "Motivo (máximo 100 caracteres)" },
            ]}
            submit={({ bolsa, ...d }) => save(`componentes/${bolsa}/baja/`, d)}
          />
        </>
      )}
      {data.revision07 === false && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          Las extensiones del ciclo 3 requieren la migración 07.
        </p>
      )}
      {collect && (
        <>
          <Form
            title="CU15 · Colecta autóloga para el propio paciente"
            fields={[
              triage,
              {
                name: "idgrupo",
                label: "Grupo registrado",
                options: opts(
                  "grupos",
                  "idgrupo",
                  (r) => `${r.grupoabo} ${r.factorrh}`,
                ),
              },
              {
                name: "brazoextraccion",
                label: "Brazo",
                options: [
                  ["Izquierdo", "Izquierdo"],
                  ["Derecho", "Derecho"],
                ],
              },
              {
                name: "volumenextraidoml",
                label: "Volumen extraído (ml)",
                type: "number",
              },
              {
                name: "fechacirugia",
                label: "Fecha de cirugía del paciente",
                type: "date",
              },
              { name: "firmadigital", label: "Evidencia de firma previa" },
              {
                name: "declaracionjuradaaceptada",
                label: "Consentimiento aceptado antes de la extracción",
                type: "checkbox",
              },
            ]}
            submit={(d) => save("colectas/", { ...d, autologa: true })}
          />
          <Form
            title="CU15 · Colecta interrumpida"
            fields={[
              triage,
              {
                name: "motivo",
                label: "Motivo e indicaciones",
                maxLength: 4000,
              },
              {
                name: "volumenobtenidoml",
                label: "Volumen realmente obtenido (ml)",
                type: "number",
              },
            ]}
            submit={(d) => save("incidencias/", d)}
          />
        </>
      )}
      {["ADMIN", "DOC_TRIAJE", "BIOQ_INTEGRAL"].includes(role) && (
        <>
          <Form
            title="CU11 · Diferimiento por hallazgo de laboratorio"
            fields={[
              person,
              {
                name: "tipoanalisis",
                label: "Origen",
                options: [
                  ["idserologia", "CU13 · Serología"],
                  ["idhematologia", "CU14 · Inmunohematología"],
                ],
              },
              {
                name: "idanalisis",
                label: "ID del análisis registrado",
                type: "number",
              },
              {
                name: "tipo",
                label: "Clasificación profesional",
                options: [
                  ["Temporal", "Temporal"],
                  ["Definitivo", "Definitivo"],
                ],
              },
              {
                name: "diasinhabilitacion",
                label: "Días (0 para definitivo)",
                type: "number",
              },
              {
                name: "motivodetallado",
                label: "Motivo y seguimiento",
                maxLength: 255,
              },
            ]}
            submit={({ tipoanalisis, idanalisis, ...d }) =>
              save("diferimientos/", { ...d, [tipoanalisis]: idanalisis })
            }
          />
          <Form
            title="CU11 · Confirmar comunicación al candidato"
            fields={[
              {
                name: "diferimiento",
                label: "Diferimiento registrado",
                options: opts(
                  "diferimientos",
                  "iddiferimiento",
                  (r) => `#${r.iddiferimiento} · Persona ${r.idposibledonador}`,
                ),
              },
              {
                name: "canal",
                label: "Canal utilizado",
                options: [
                  ["Presencial", "Presencial"],
                  ["Telefono", "Teléfono"],
                  ["Correo", "Correo"],
                ],
              },
              {
                name: "confirmada",
                label: "La indicación ya fue comunicada al candidato",
                type: "checkbox",
              },
            ]}
            submit={({ diferimiento, ...d }) =>
              save(`diferimientos/${diferimiento}/comunicar/`, d)
            }
          />
        </>
      )}
      {lab && (
        <>
          <Form
            title="CU15 · Registrar condiciones verificadas del equipo"
            fields={[
              location,
              {
                name: "temperaturaregistro",
                label: "Temperatura medida (°C)",
                type: "number",
                step: "0.1",
              },
              {
                name: "tieneagitacion",
                label: "Equipo con agitación verificada",
                type: "checkbox",
                required: false,
              },
              {
                name: "verificadas",
                label: "Confirmo las condiciones registradas",
                type: "checkbox",
              },
            ]}
            submit={({ idubicacion, ...d }) =>
              save(`ubicaciones/${idubicacion}/condiciones/`, d)
            }
          />
          <Form
            title="CU15 · Traslado de custodia autóloga exclusiva"
            fields={[
              {
                name: "bolsa",
                label: "Componente autólogo",
                options: opts(
                  "componentes",
                  "idejemplarbolsa",
                  (r) =>
                    `${r.codigoejemplark} · ${r.estadobolsak}${r.esexclusivoautologo ? " · Autólogo" : " · No autólogo"}`,
                ),
              },
              location,
            ]}
            submit={({ bolsa, ...d }) =>
              save(`componentes/${bolsa}/custodia-autologa/`, d)
            }
          />
          {["ADMIN", "BIOQ_INTEGRAL"].includes(role) && (
            <Form
              title="CU15 · Revisar reserva autóloga después de corrección"
              fields={[
                {
                  name: "madre",
                  label: "Lote autólogo",
                  options: opts(
                    "autologas",
                    "idunidadmadre",
                    (r) =>
                      `Lote #${r.idunidadmadre} · Paciente ${r.idreceptor} · Cirugía ${r.fechacirugia}`,
                  ),
                },
                {
                  name: "confirmada",
                  label:
                    "Revisé ambos análisis y la cirugía del paciente exclusivo",
                  type: "checkbox",
                },
              ]}
              submit={({ madre, ...d }) =>
                save(`madres/${madre}/reactivar-autologa/`, d)
              }
            />
          )}
          <Form
            title="CU15 · Baja del lote completo"
            fields={[
              {
                name: "madre",
                label: "Bolsa madre registrada",
                options: opts(
                  "madres",
                  "idunidadmadre",
                  (r) => `${r.codigobolsamadre} · ${r.estadoliberacion}`,
                ),
              },
              { name: "motivobaja", label: "Motivo de baja", maxLength: 100 },
            ]}
            submit={({ madre, ...d }) => save(`madres/${madre}/baja/`, d)}
          />
        </>
      )}
      {role === "ADMIN" && (
        <Form
          title="CU15 · Aprobar protocolo institucional de conservación"
          fields={[
            {
              name: "tipocomponente",
              label: "Componente",
              options: types.map((x) => [x, x]),
            },
            {
              name: "temperaturamin",
              label: "Temperatura mínima aprobada (°C)",
              type: "number",
              step: "0.1",
            },
            {
              name: "temperaturamax",
              label: "Temperatura máxima aprobada (°C)",
              type: "number",
              step: "0.1",
            },
            {
              name: "diasconservacion",
              label: "Días de conservación aprobados",
              type: "number",
            },
            {
              name: "requiereagitacion",
              label: "Requiere agitación",
              type: "checkbox",
              required: false,
            },
          ]}
          submit={(d) => save("protocolos/", d)}
        />
      )}
      <div className="border rounded-3xl p-6 bg-white">
        <h2 className="text-xl font-bold">Diferimientos registrados</h2>
        {(data.diferimientos || []).map((r: Row) => (
          <p className="py-3 border-b" key={r.iddiferimiento}>
            Persona {r.idposibledonador} · {r.motivodetallado} ·{" "}
            {r.fechainiciodiferimiento} a{" "}
            {r.fechafindiferimiento || "Definitivo"} · Comunicación:{" "}
            {r.comunicacionfecha
              ? `${r.canalcomunicacion} · ${r.comunicacionfecha}`
              : "Pendiente"}
          </p>
        ))}
      </div>
    </section>
  );
}
