import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../services/api";
import { Form } from "../clinical/ClinicalCircuit";

const markers = [
  "resultadovih",
  "resultadochagas",
  "resultadohepatitisb",
  "resultadohepatitisc",
  "resultadosifilis",
  "resultadohtlv",
];
const names = [
  "VIH",
  "Chagas",
  "Hepatitis B",
  "Hepatitis C",
  "Sífilis",
  "HTLV",
];
const seroEmpty = () =>
  Object.fromEntries([
    ...markers.map((k) => [k, ""]),
    ["codigoanalisis", ""],
    ["dictamenfinal", ""],
  ]);
const hemaEmpty = () => ({
  grupoaboconfirmado: "",
  factorrhconfirmado: "",
  pruebacoombsdirecta: "",
  pruebacoombsindirecta: "",
  rastreoanticuerposirregulares: "",
  dictameninmunohematologico: "",
  observaciones: "",
  motivo_correccion: "",
});
type Lot = {
  idgrupo?: number;
  grupoabo?: string;
  factorrh?: string;
  id: number;
  codigo: string;
  estado: string;
  analisis_aprobados?: boolean;
  serologia?: Record<string, any>;
  hematologia?: Record<string, any>;
  componentes?: {
    id: number;
    codigo: string;
    estado: string;
    autologo: boolean;
  }[];
};

export function JointReleasePanel({
  token,
  role,
}: {
  token?: string;
  role?: string;
}) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [selected, setSelected] = useState("");
  const [lot, setLot] = useState<Lot | null>(null);
  const [sero, setSero] = useState<Record<string, string>>(seroEmpty);
  const [hema, setHema] = useState<Record<string, string>>(hemaEmpty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const bearer = token || sessionStorage.getItem("hemovida_jwt_token");
  async function api(path: string, method = "GET", data?: unknown) {
    if (!bearer) throw new Error("Inicia sesión con tu cuenta de laboratorio.");
    const response = await fetch(`${API_BASE_URL}/laboratorio/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        typeof body.detail === "string" ? body.detail : JSON.stringify(body),
      );
    return body;
  }
  async function load(id: string) {
    setLot(null);
    setSelected(id);
    setMessage("");
    if (!id) return;
    setBusy(true);
    try {
      const row: Lot = await api(`madres/${id}/`);
      setLot(row);
      setLots((previous) =>
        previous.map((item) =>
          item.id === row.id ? { ...item, estado: row.estado } : item,
        ),
      );
      setSero(
        Object.fromEntries(
          Object.keys(seroEmpty()).map((k) => [
            k,
            String(row.serologia?.[k] ?? ""),
          ]),
        ),
      );
      setHema(
        Object.fromEntries(
          Object.keys(hemaEmpty()).map((k) => [
            k,
            String(row.hematologia?.[k] ?? ""),
          ]),
        ),
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setBusy(true);
    api("madres/")
      .then(setLots)
      .catch((e) => setMessage(e.message))
      .finally(() => setBusy(false));
  }, [bearer]);
  async function save(
    kind: "serologia" | "hematologia",
    data: Record<string, string>,
  ) {
    if (!lot) return;
    const id =
      kind === "serologia"
        ? lot.serologia?.idanalisis
        : lot.hematologia?.idanalisishematologico;
    if (
      id &&
      !window.confirm(
        "La corrección puede devolver el lote a cuarentena y cancelar reservas. ¿Guardar?",
      )
    )
      return;
    setBusy(true);
    try {
      await api(
        `madres/${lot.id}/${kind}/${id ? `${id}/` : ""}`,
        id ? "PUT" : "POST",
        Object.fromEntries(
          Object.entries(data).filter(
            ([key, value]) => key !== "motivo_correccion" || value.trim(),
          ),
        ),
      );
      await load(String(lot.id));
      setMessage("Análisis guardado y operación registrada en bitácora.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function release() {
    if (
      !lot ||
      !window.confirm(
        "¿Confirmas la liberación ordinaria de este lote con ambos análisis aprobados?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api(`madres/${lot.id}/liberar/`, "POST", {});
      await load(String(lot.id));
      setMessage(
        `Liberación registrada: ${result.componentes_liberados.length} componentes.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = "border rounded p-2 w-full bg-white text-slate-900";
  const choice = (
    key: string,
    label: string,
    opts: string[],
    data: Record<string, string>,
    set: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    disabled = false,
  ) => (
    <label className="block" key={key}>
      {label}
      <select
        aria-label={label}
        className={input}
        disabled={busy || disabled}
        required
        value={data[key]}
        onChange={(e) => set((d) => ({ ...d, [key]: e.target.value }))}
      >
        <option value="">Seleccionar</option>
        {opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="max-w-6xl mx-auto p-6 space-y-5 text-slate-900">
      <h1 className="text-2xl font-bold">Laboratorio y liberación conjunta</h1>
      <p>
        Selecciona una bolsa madre registrada para consultar o guardar CU13 y
        CU14 y liberar sus componentes.
      </p>
      <label className="block">
        Bolsa madre
        <select
          className={input}
          disabled={busy}
          value={selected}
          onChange={(e) => load(e.target.value)}
        >
          <option value="">Seleccionar bolsa</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {l.codigo} · {l.estado}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p role="status" className="p-3 bg-slate-100 border rounded">
          {message}
        </p>
      )}
      {!busy && !lots.length && (
        <p>
          No hay bolsas disponibles para consultar o no se pudo cargar el
          listado.
        </p>
      )}
      {lot && (
        <>
          <p className="font-semibold">
            {lot.codigo} · {lot.estado} ·{" "}
            {lot.analisis_aprobados
              ? "Ambos análisis aprobados"
              : "Liberación pendiente"}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <form
              className="space-y-3 border p-4 rounded"
              onSubmit={(e) => {
                e.preventDefault();
                save("serologia", sero);
              }}
            >
              <h2 className="font-bold">CU13 Inmunoserología</h2>
              <label className="block">
                Código del análisis
                <input
                  className={input}
                  required
                  maxLength={30}
                  value={sero.codigoanalisis}
                  onChange={(e) =>
                    setSero((d) => ({ ...d, codigoanalisis: e.target.value }))
                  }
                />
              </label>
              {markers.map((k, i) =>
                choice(
                  k,
                  names[i],
                  ["No Reactivo", "Reactivo", "Indeterminado"],
                  sero,
                  setSero,
                ),
              )}
              {choice(
                "dictamenfinal",
                "Dictamen serológico",
                ["Apto", "No Apto"],
                sero,
                setSero,
              )}
              <button
                className="bg-teal-800 text-white rounded p-2"
                disabled={busy}
              >
                Guardar CU13
              </button>
            </form>
            <form
              className="space-y-3 border p-4 rounded"
              onSubmit={(e) => {
                e.preventDefault();
                save("hematologia", hema);
              }}
            >
              <h2 className="font-bold">CU14 Inmunohematología</h2>
              {choice(
                "grupoaboconfirmado",
                "Grupo ABO",
                ["A", "B", "AB", "O"],
                hema,
                setHema,
                !!lot.hematologia && role !== "BIOQ_INTEGRAL",
              )}
              {choice(
                "factorrhconfirmado",
                "Factor Rh",
                ["Positivo", "Negativo"],
                hema,
                setHema,
                !!lot.hematologia && role !== "BIOQ_INTEGRAL",
              )}
              {[
                "pruebacoombsdirecta",
                "pruebacoombsindirecta",
                "rastreoanticuerposirregulares",
              ].map((k, i) => (
                <label className="block" key={k}>
                  {
                    [
                      "Coombs directa",
                      "Coombs indirecta",
                      "Rastreo de anticuerpos irregulares",
                    ][i]
                  }
                  <input
                    className={input}
                    required
                    maxLength={i === 2 ? 100 : 30}
                    value={hema[k]}
                    onChange={(e) =>
                      setHema((d) => ({ ...d, [k]: e.target.value }))
                    }
                  />
                </label>
              ))}
              {choice(
                "dictameninmunohematologico",
                "Dictamen inmunohematológico",
                ["Apto", "No Apto", "Pendiente"],
                hema,
                setHema,
              )}
              <label className="block">
                Observaciones
                <textarea
                  className={input}
                  value={hema.observaciones}
                  onChange={(e) =>
                    setHema((d) => ({ ...d, observaciones: e.target.value }))
                  }
                />
              </label>
              {lot.hematologia &&
                (hema.grupoaboconfirmado !==
                  lot.hematologia.grupoaboconfirmado ||
                  hema.factorrhconfirmado !==
                    lot.hematologia.factorrhconfirmado) && (
                  <label>
                    Motivo de corrección ABO/Rh
                    <input
                      aria-label="Motivo de corrección ABO/Rh"
                      className={input}
                      required
                      minLength={10}
                      maxLength={120}
                      value={hema.motivo_correccion}
                      onChange={(e) =>
                        setHema((d) => ({
                          ...d,
                          motivo_correccion: e.target.value,
                        }))
                      }
                    />
                  </label>
                )}
              {role !== "BIOQ_INTEGRAL" && lot.hematologia && (
                <p>
                  Las correcciones ABO/Rh requieren el perfil Bioquímico
                  Integral.
                </p>
              )}
              <button
                className="bg-teal-800 text-white rounded p-2"
                disabled={busy}
              >
                Guardar CU14
              </button>
            </form>
          </div>
          <p>
            Grupo registrado del lote: {lot.grupoabo || "Sin registro"}{" "}
            {lot.factorrh || ""}.
          </p>
          {role === "BIOQ_INTEGRAL" &&
            lot.hematologia?.dictameninmunohematologico === "Apto" &&
            (lot.grupoabo !== lot.hematologia.grupoaboconfirmado ||
              lot.factorrh !== lot.hematologia.factorrhconfirmado) && (
              <Form
                title="Conciliar clasificación ABO/Rh del lote"
                fields={[
                  {
                    name: "motivo",
                    label: "Motivo de la conciliación",
                    minLength: 10,
                    maxLength: 120,
                  },
                  {
                    name: "confirmada",
                    label:
                      "Verifiqué el análisis y el rotulado de la madre y sus componentes",
                    type: "checkbox",
                  },
                ]}
                submit={async (data) => {
                  setBusy(true);
                  try {
                    await api(`madres/${lot.id}/corregir-grupo/`, "POST", {
                      ...data,
                      idgrupo_anterior: lot.idgrupo,
                      idanalisishematologico:
                        lot.hematologia!.idanalisishematologico,
                      grupoaboconfirmado: lot.hematologia!.grupoaboconfirmado,
                      factorrhconfirmado: lot.hematologia!.factorrhconfirmado,
                    });
                    await load(String(lot.id));
                    setMessage(
                      "Clasificación conciliada. El lote permanece en cuarentena y requiere nueva liberación conjunta.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          <h2 className="font-bold">Componentes del lote</h2>
          <ul>
            {lot.componentes?.map((c) => (
              <li key={c.id}>
                {c.codigo} · {c.estado}
                {c.autologo ? " · Exclusivo autólogo" : ""}
              </li>
            ))}
          </ul>
          {role === "BIOQ_INTEGRAL" ? (
            <button
              onClick={release}
              disabled={
                busy || !lot.analisis_aprobados || lot.estado === "Rechazada"
              }
              className="bg-teal-800 disabled:opacity-40 text-white rounded p-3"
            >
              Liberar lote
            </button>
          ) : (
            <p>
              La liberación biológica requiere el perfil Bioquímico Integral.
            </p>
          )}
          <button
            onClick={() => load(selected)}
            disabled={busy}
            className="border rounded p-3 ml-3"
          >
            Actualizar
          </button>
        </>
      )}
    </section>
  );
}
