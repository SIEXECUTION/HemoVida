import React, { useEffect, useState } from "react";
import { Form } from "./clinical/ClinicalCircuit";
import { liveRequest } from "../services/liveApi";

type Program = {
  idprograma: number;
  idreceptor: number;
  nombres: string;
  apellidos: string;
  ci: string;
  fechacirugia: string;
  indicacion: string;
  referenciamedica: string;
  estado: string;
  version: number;
  colectas: number;
};
type Data = {
  programas: Program[];
  receptores: {
    idpersona: number;
    ci: string;
    nombres: string;
    apellidos: string;
  }[];
};
export function AutologousPage({
  token,
  role,
  onAgenda,
}: {
  token: string;
  role: string;
  onAgenda: () => void;
}) {
  const [data, setData] = useState<Data>({ programas: [], receptores: [] }),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [history, setHistory] = useState<
    {
      version: number;
      registrado: string;
      contenido: Program & { motivorevision: string };
    }[]
  >([]);
  const medical = ["MED_SOLICITANTE", "DOC_TRIAJE"].includes(role),
    reviewer = role === "BIOQ_INTEGRAL";
  async function load(signal?: AbortSignal) {
    try {
      setData(
        await liveRequest<Data>(
          `agenda/programas/?q=${encodeURIComponent(q)}`,
          token,
          undefined,
          signal,
        ),
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    }
  }
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [token]);
  const program = data.programas.find((p) => String(p.idprograma) === selected);
  async function revise(action: string, d: Record<string, unknown>) {
    if (!program) throw new Error("Selecciona una programación.");
    await liveRequest(
      `agenda/programas/${program.idprograma}/revision/`,
      token,
      { ...d, accion: action, version: program.version },
    );
    setHistory([]);
    setMessage(
      "Programación actualizada. Las reservas y liberación requieren sus controles propios.",
    );
    await load();
  }
  return (
    <section className="space-y-5">
      <header className="bg-white border rounded-3xl p-6">
        <h1 className="text-2xl font-bold">Donación autóloga programada</h1>
        <p>
          La indicación médica coordina la atención del propio paciente. Aprobar
          la programación no libera sangre ni reemplaza el consentimiento y los
          análisis.
        </p>
      </header>
      {error && (
        <p role="alert" className="p-4 bg-rose-50 text-rose-900 rounded-xl">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="p-4 bg-emerald-50 rounded-xl">
          {message}
        </p>
      )}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          void load();
        }}
      >
        <label className="flex-1">
          Buscar paciente por CI o nombre
          <input
            className="w-full p-3 border rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
          />
        </label>
        <button className="bg-slate-900 text-white p-3 rounded-xl">
          Buscar programación
        </button>
      </form>
      {medical && (
        <Form
          title="Registrar indicación autóloga"
          fields={[
            {
              name: "idreceptor",
              label: "Paciente receptor",
              options: data.receptores.map((p) => [
                String(p.idpersona),
                `${p.ci} · ${p.nombres} ${p.apellidos}`,
              ]),
            },
            {
              name: "fechacirugia",
              label: "Fecha prevista de cirugía",
              type: "date",
            },
            {
              name: "referenciamedica",
              label: "Referencia de la orden médica",
              maxLength: 120,
            },
            {
              name: "indicacion",
              label: "Indicación médica",
              minLength: 10,
              maxLength: 4000,
            },
          ]}
          submit={async (d) => {
            await liveRequest("agenda/programas/crear/", token, d);
            setMessage(
              "Indicación registrada. Pendiente de revisión bioquímica.",
            );
            await load();
          }}
        />
      )}
      <section className="bg-white border rounded-3xl p-6 space-y-4">
        <h2 className="font-bold text-xl">Programaciones del paciente</h2>
        <p>
          Se muestran hasta 100 coincidencias. Usa CI para localizar un
          expediente concreto.
        </p>
        <label>
          Programación
          <select
            aria-label="Programación"
            className="w-full border p-3 rounded-xl"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setHistory([]);
            }}
          >
            <option value="">Seleccionar</option>
            {data.programas.map((p) => (
              <option key={p.idprograma} value={p.idprograma}>
                #{p.idprograma} · {p.ci} · {p.fechacirugia} · {p.estado}
              </option>
            ))}
          </select>
        </label>
        {program && (
          <article className="space-y-3">
            <h3 className="font-bold">
              {program.nombres} {program.apellidos} · {program.estado}
            </h3>
            <p>
              Cirugía: {program.fechacirugia} · Colectas vinculadas:{" "}
              {program.colectas}
            </p>
            <p>Orden: {program.referenciamedica}</p>
            <p className="whitespace-pre-wrap break-words">
              {program.indicacion}
            </p>
            <button
              className="border p-3 rounded-xl"
              onClick={async () => {
                try {
                  setHistory(
                    await liveRequest(
                      `agenda/programas/${program.idprograma}/historial/`,
                      token,
                    ),
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Ver historial de indicación y revisiones
            </button>
            {history.map((h) => (
              <article key={h.version} className="border p-3 rounded-xl">
                <p>
                  Revisión {h.version} · {h.contenido.estado} · Cirugía{" "}
                  {h.contenido.fechacirugia}
                </p>
                <p>{h.contenido.indicacion}</p>
                <p>{h.contenido.motivorevision}</p>
              </article>
            ))}
            {[
              "ADMIN",
              "PERS_COLECTA",
              "DONANTE",
              "POSIBLE_DONADOR",
              "RECEPTOR",
            ].includes(role) &&
              program.estado === "Aprobada" && (
                <button
                  className="bg-rose-700 text-white p-3 rounded-xl"
                  onClick={onAgenda}
                >
                  Coordinar cita de este programa
                </button>
              )}
            {medical && !["Cancelada", "Cerrada"].includes(program.estado) && (
              <Form
                key={`m${program.idprograma}-${program.version}`}
                title="Modificar indicación o cirugía"
                fields={[
                  {
                    name: "fechacirugia",
                    label: "Nueva fecha de cirugía",
                    type: "date",
                    defaultValue: program.fechacirugia,
                  },
                  {
                    name: "referenciamedica",
                    label: "Referencia médica actualizada",
                    maxLength: 120,
                    defaultValue: program.referenciamedica,
                  },
                  {
                    name: "indicacion",
                    label: "Indicación actualizada",
                    minLength: 10,
                    maxLength: 4000,
                    defaultValue: program.indicacion,
                  },
                  {
                    name: "motivo",
                    label: "Motivo del cambio",
                    minLength: 10,
                    maxLength: 500,
                  },
                ]}
                submit={(d) => revise("Modificar", d)}
              />
            )}
            {reviewer && !["Cancelada", "Cerrada"].includes(program.estado) && (
              <Form
                key={`r${program.idprograma}-${program.version}`}
                title="Revisión bioquímica de programación"
                fields={[
                  {
                    name: "accion",
                    label: "Decisión profesional",
                    options: [
                      ["Aprobar", "Aprobar programación"],
                      ["Cancelar", "Cancelar cirugía/programación"],
                      ["Cerrar", "Cerrar episodio quirúrgico"],
                    ],
                  },
                  {
                    name: "motivo",
                    label: "Fundamento de la revisión",
                    minLength: 10,
                    maxLength: 500,
                  },
                  {
                    name: "confirmada",
                    label:
                      "Verifiqué indicación, paciente y unidades vinculadas",
                    type: "checkbox",
                  },
                ]}
                submit={(d) => revise(String(d.accion), d)}
              />
            )}
            <p className="text-sm">
              Cambiar o cancelar exige revisar las unidades: permanecen
              exclusivas, con reservas canceladas y cuarentena cuando
              corresponda. No se convierten a stock general ni se dan de baja
              automáticamente.
            </p>
          </article>
        )}
      </section>
    </section>
  );
}
