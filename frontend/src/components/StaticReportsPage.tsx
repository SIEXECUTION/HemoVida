import React, { useEffect, useState } from "react";
import { liveRequest } from "../services/liveApi";
import { API_BASE_URL } from "../services/api";

type Template = { titulo: string; periodo: boolean; columnas: string[] };
type Result = {
  titulo: string;
  actualizado: string;
  columnas: string[];
  filas: Record<string, unknown>[];
  totales: Record<string, unknown>;
  criterios: Record<string, string>;
  etiquetas?: Record<string, string>;
};
export function StaticReportsPage({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<Record<string, Template>>({}),
    [selected, setSelected] = useState("");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setResult(null);
    setCatalog({});
    setSelected("");
    liveRequest<Record<string, Template>>(
      "reportes/estaticos/catalogo/",
      token,
      undefined,
      c.signal,
    )
      .then((d) => {
        setCatalog(d);
        setSelected(Object.keys(d)[0] || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [token]);
  async function generate(format: string) {
    setError("");
    setBusy(true);
    setResult(null);
    const params = new URLSearchParams({
      plantilla: selected,
      formato: format,
    });
    if (catalog[selected]?.periodo) {
      if (from) params.set("desde", from);
      if (to) params.set("hasta", to);
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/reportes/estaticos/informe/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const d = await response.json();
        throw new Error(
          typeof d.detail === "string"
            ? d.detail
            : "No se pudo generar el informe.",
        );
      }
      if (format === "json") setResult(await response.json());
      else {
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `hemovida-${selected}.${format}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bg-white border rounded-3xl p-6 space-y-5">
      <h1 className="text-2xl font-bold">Informes de gestión</h1>
      <p>
        Plantillas de estructura fija. Selecciona el informe y, cuando
        corresponda, su período. El inventario y la cartera reflejan el estado
        actual.
      </p>
      {error && (
        <p role="alert" className="bg-rose-50 text-rose-900 p-4 rounded-xl">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-4">
        <label>
          Informe
          <select
            className="w-full border p-3 rounded-xl"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setResult(null);
              setError("");
            }}
          >
            {Object.entries(catalog).map(([id, t]) => (
              <option key={id} value={id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </label>
        {catalog[selected]?.periodo && (
          <>
            <label>
              Desde
              <input
                className="w-full border p-3 rounded-xl"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              Hasta
              <input
                className="w-full border p-3 rounded-xl"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setResult(null);
                }}
              />
            </label>
          </>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        {[
          ["json", "Consultar informe"],
          ["csv", "Descargar CSV"],
          ["pdf", "Descargar PDF"],
        ].map(([f, label]) => (
          <button
            key={f}
            disabled={busy || !selected}
            className="bg-slate-900 text-white rounded-xl px-4 py-3"
            onClick={() => void generate(f)}
          >
            {label}
          </button>
        ))}
      </div>
      {result && (
        <section className="space-y-4" aria-label="Informe generado">
          <h2 className="text-xl font-bold">{result.titulo}</h2>
          <p>
            Generado:{" "}
            {new Date(result.actualizado).toLocaleString("es-BO", {
              timeZone: "America/La_Paz",
            })}
          </p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(result.totales).map(([k, v]) => (
              <p key={k} className="border p-3 rounded-xl">
                {result.etiquetas?.[k] || k.replaceAll("_", " ")}:{" "}
                {v == null ? "No aplica" : String(v)}
              </p>
            ))}
          </div>
          {!result.filas.length ? (
            <p>No hay registros en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {result.columnas.map((c) => (
                      <th key={c} className="p-3 text-left border-b">
                        {result.etiquetas?.[c] || c.replaceAll("_", " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.filas.map((r, i) => (
                    <tr key={i}>
                      {result.columnas.map((c) => (
                        <td key={c} className="p-3 border-b">
                          {r[c] == null ? "No aplica" : String(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary>Criterios del informe</summary>
            {Object.entries(result.criterios).map(([k, v]) => (
              <p key={k} className="mt-2">
                {v}
              </p>
            ))}
          </details>
        </section>
      )}
    </section>
  );
}
