import React, { useEffect, useState } from "react";
import { DataContent } from "./ApiRecords";
import { liveRequest } from "../services/liveApi";
import { API_BASE_URL } from "../services/api";
type CatalogItem = {
  dimensiones: string[];
  filtros: string[];
  periodo: boolean;
  unidad: string;
  metricas: string[];
  opciones: Record<string, { valor: string; etiqueta: string }[]>;
};
type Result = {
  fuente: string;
  dimension: string;
  unidad: string;
  desde: string | null;
  hasta: string | null;
  actualizado: string;
  totales: Record<string, number | string | null>;
  filas: Record<string, any>[];
  criterios: Record<string, string>;
};
const labels: Record<string, string> = {
  extracciones: "Donaciones y volumen",
  triajes: "Aptitud clínica",
  citas: "Asistencia a citas",
  serologia: "Reactividad serológica",
  stock: "Stock actual",
  bajas: "Bajas de inventario",
  recaudacion: "Recaudación",
  cartera: "Cuentas por cobrar",
  intentos: "Intentos de pago",
  cantidad: "Cantidad",
  volumen: "Volumen (ml)",
  importe: "Importe (BOB)",
  aptos: "Evaluaciones aptas",
  porcentaje_aptitud: "Aptitud (%)",
  rechazados: "Evaluaciones rechazadas",
  porcentaje_diferimiento: "Tasa de diferimiento (%)",
  programadas: "Citas con turno confirmado",
  canceladas: "Citas canceladas",
  pendientes: "Solicitudes con prefiltro pendiente",
  asistencias: "Asistencias",
  porcentaje_asistencia: "Asistencia (%)",
  reactivas: "Bolsas reactivas concluidas",
  indeterminadas: "Bolsas con indeterminación",
  concluidas: "Tamizajes concluidos",
  porcentaje_reactividad: "Reactividad (%)",
  vencimiento_proximo: "Vencimiento próximo",
  madres: "Bajas de madre",
  componentes: "Bajas de componente",
  cartera_vencida: "Saldo vencido (BOB)",
  finalizados: "Intentos finalizados",
  confirmados: "Intentos confirmados",
  porcentaje_confirmacion: "Confirmación (%)",
  deudas_sin_moneda_excluidas: "Deudas sin moneda confirmada excluidas",
  dia: "Día",
  mes: "Mes",
  brazo: "Brazo",
  estado: "Estado",
  componente: "Componente",
  grupo: "Grupo ABO/Rh",
  categoria: "Categoría",
  motivo: "Motivo",
  origen: "Origen",
  metodo: "Método de pago",
  proveedor: "Proveedor",
  institucion: "Institución",
  prioridad: "Prioridad",
};
const display = (v: unknown) =>
  v === null || v === undefined
    ? "No aplica"
    : typeof v === "number"
      ? new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(v)
      : String(v);
export function ReportsPage({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<Record<string, CatalogItem>>({}),
    [source, setSource] = useState("extracciones"),
    [dimension, setDimension] = useState("dia"),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [horizon, setHorizon] = useState("7"),
    [metric, setMetric] = useState("cantidad"),
    [result, setResult] = useState<Result | null>(null),
    [applied, setApplied] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setCatalog({});
    setResult(null);
    setApplied("");
    setError("");
    liveRequest<Record<string, CatalogItem>>(
      "reportes/catalogo/",
      token,
      undefined,
      c.signal,
    )
      .then((d) => {
        if (c.signal.aborted) return;
        setCatalog(d);
        const first = Object.keys(d)[0];
        if (first) {
          setSource(first);
          setDimension(d[first].dimensiones[0]);
          setMetric(d[first].metricas[0]);
          setFilters({});
        } else setError("No hay consultas habilitadas para este perfil.");
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [token]);
  const config = catalog[source];
  function choose(value: string) {
    setSource(value);
    setDimension(catalog[value].dimensiones[0]);
    setMetric(catalog[value].metricas[0]);
    setFilters({});
    setResult(null);
    setApplied("");
    setError("");
  }
  async function query(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const params = new URLSearchParams({ fuente: source, dimension });
      if (config.periodo) {
        if (start) params.set("desde", start);
        if (end) params.set("hasta", end);
      }
      if (source === "stock") params.set("horizonte", horizon);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const r = await liveRequest<Result>(
        "reportes/consulta/?" + params,
        token,
      );
      setResult(r);
      setApplied(params.toString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "csv" | "pdf") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `${API_BASE_URL}/reportes/consulta/?${applied}&formato=${format}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || "No se pudo exportar el informe.");
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `hemovida-${result?.fuente}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rows = result?.filas || [];
  const maximum = Math.max(0, ...rows.map((r) => Number(r[metric]) || 0));
  const chartRows = rows.slice(0, 100);
  return (
    <section className="space-y-6">
      <header className="p-6 bg-white rounded-3xl border">
        <h1 className="text-2xl font-black">
          CU24 · Consultas dinámicas e indicadores
        </h1>
        <p>
          Selecciona una fuente, filtros y agrupación. Stock y cartera
          corresponden al estado actual.
        </p>
      </header>
      {error && (
        <p role="alert" className="bg-rose-50 text-rose-800 p-4 rounded-xl">
          {error}
        </p>
      )}
      {!config && !error && <p>Cargando catálogo de consultas…</p>}
      {config && (
        <form
          onSubmit={query}
          className="bg-white border rounded-3xl p-6 space-y-5"
        >
          <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-4">
            <label>
              Fuente
              <select
                aria-label="Fuente"
                className="w-full border p-3 rounded-xl"
                value={source}
                onChange={(e) => choose(e.target.value)}
              >
                {Object.keys(catalog).map((k) => (
                  <option key={k} value={k}>
                    {labels[k] || k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Agrupar por
              <select
                aria-label="Agrupar por"
                className="w-full border p-3 rounded-xl"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
              >
                {config.dimensiones.map((k) => (
                  <option key={k} value={k}>
                    {labels[k] || k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Indicador del gráfico
              <select
                aria-label="Indicador del gráfico"
                className="w-full border p-3 rounded-xl"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                {config.metricas.map((k) => (
                  <option key={k} value={k}>
                    {labels[k] || k}
                  </option>
                ))}
              </select>
            </label>
            {config.periodo ? (
              <>
                <label>
                  Desde
                  <input
                    className="w-full border p-3 rounded-xl"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    className="w-full border p-3 rounded-xl"
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Fotografía actual. No se reconstruye stock ni cartera histórica.
              </p>
            )}
            {source === "stock" && (
              <label>
                Horizonte de vencimiento (días)
                <input
                  className="w-full border p-3 rounded-xl"
                  type="number"
                  min="0"
                  max="365"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                />
              </label>
            )}
            {config.filtros.map((k) => (
              <label key={k}>
                {labels[k] || k}
                <select
                  aria-label={labels[k] || k}
                  className="w-full border p-3 rounded-xl"
                  value={filters[k] || ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [k]: e.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {(config.opciones[k] || []).map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button className="rounded-xl bg-slate-900 text-white p-3 font-bold">
              {busy ? "Consultando…" : "Consultar indicadores"}
            </button>
          </fieldset>
        </form>
      )}
      {result && (
        <>
          <div className="text-xs text-slate-500">
            Actualizado: {new Date(result.actualizado).toLocaleString("es-BO")}{" "}
            ·{" "}
            {result.desde
              ? `${result.desde} a ${result.hasta}`
              : "Estado actual"}{" "}
            · Fuente: {labels[result.fuente]}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(result.totales).map(([k, v]) => (
              <article key={k} className="rounded-3xl border bg-white p-6">
                <strong className="text-2xl block font-black">
                  {display(v)}
                </strong>
                <span className="text-xs text-slate-500">{labels[k] || k}</span>
              </article>
            ))}
          </div>
          <div className="bg-white rounded-3xl border p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {labels[metric] || metric} por{" "}
              {labels[result.dimension] || result.dimension}
            </h2>
            {rows.length ? (
              <>
                <svg
                  role="img"
                  aria-label={`${labels[metric] || metric} por ${result.dimension}`}
                  viewBox={`0 0 850 ${chartRows.length * 34 + 15}`}
                  className="w-full"
                  style={{ maxHeight: Math.max(180, chartRows.length * 34) }}
                >
                  {chartRows.map((r, i) => {
                    const n = Number(r[metric]) || 0;
                    return (
                      <g key={i} transform={`translate(0,${i * 34})`}>
                        <title>
                          {String(r.dimension)}: {display(r[metric])}
                        </title>
                        <text x="0" y="22" fontSize="12">
                          {String(r.dimension ?? "Sin registro").slice(0, 32)}
                        </text>
                        <rect
                          x="250"
                          y="8"
                          width={maximum ? (n / maximum) * 480 : 0}
                          height="20"
                          rx="5"
                          fill="#be123c"
                        />
                        <text x="750" y="22" fontSize="12">
                          {display(r[metric])}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {rows.length > 100 && (
                  <p>
                    El gráfico muestra los primeros 100 grupos; la tabla y
                    exportaciones conservan todos los resultados.
                  </p>
                )}
              </>
            ) : (
              <p>No hay actividad para estos criterios.</p>
            )}
          </div>
          <div className="bg-white rounded-3xl border p-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <h2 className="text-xl font-bold mr-auto">Resultados</h2>
              <button
                disabled={busy}
                className="border rounded-xl p-2"
                onClick={() => void download("csv")}
              >
                Exportar CSV
              </button>
              <button
                disabled={busy}
                className="border rounded-xl p-2"
                onClick={() => void download("pdf")}
              >
                Exportar PDF
              </button>
            </div>
            <DataContent value={result.filas} />
          </div>
          <div className="bg-slate-100 rounded-2xl p-5 text-xs space-y-2">
            <h3 className="font-bold">Criterios de cálculo</h3>
            {Object.values(result.criterios).map((v) => (
              <p key={v}>{v}</p>
            ))}
            <p>
              Las cifras sin denominador válido se muestran como «No aplica».
              Los comprobantes no se suman a los pagos.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
