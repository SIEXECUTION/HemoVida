import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../services/api";
type Row = Record<string, any>;
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: [string, string][];
};
const input =
  "w-full border border-slate-300 bg-slate-50 text-slate-900 rounded-xl p-3";
function Form({
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
        fields.forEach(
          (x) =>
            (d[x.name] =
              x.type === "checkbox"
                ? fd.has(x.name)
                : x.type === "number"
                  ? Number(fd.get(x.name))
                  : fd.get(x.name)),
        );
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
              <select required name={x.name} className={input}>
                <option value="">Seleccionar</option>
                {x.options.map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                name={x.name}
                type={x.type || "text"}
                step={x.type === "number" ? "any" : undefined}
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
  const bearer = token || localStorage.getItem("hemovida_jwt_token");
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
      <div className="border rounded-3xl p-6 bg-white">
        <h2 className="text-xl font-bold">Diferimientos registrados</h2>
        {(data.diferimientos || []).map((r: Row) => (
          <p className="py-3 border-b" key={r.iddiferimiento}>
            Persona {r.idposibledonador} · {r.motivodetallado} ·{" "}
            {r.fechainiciodiferimiento} a{" "}
            {r.fechafindiferimiento || "Definitivo"}
          </p>
        ))}
      </div>
    </section>
  );
}
