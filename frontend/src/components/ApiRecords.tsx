import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { API_BASE_URL } from "../services/api";
const names: Record<string, string> = {
  grupoSanguineo: "Grupo sanguíneo",
  factorRh: "Factor Rh",
  estadoHabilitacion: "Habilitación",
  extraccionesRecientes: "Extracciones recientes",
  carnetDigitalCodigo: "Carnet",
  ci: "Documento de identidad",
  nombres: "Nombres",
  apellidos: "Apellidos",
  eventos: "Eventos",
  results: "Registros",
};
function Content({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-500">Sin registro</span>;
  if (Array.isArray(value))
    return value.length ? (
      <div className="space-y-4">
        {value.map((row, i) => (
          <div key={i} className="rounded-2xl border p-4">
            <Content value={row} />
          </div>
        ))}
      </div>
    ) : (
      <p>No hay registros.</p>
    );
  if (typeof value === "object")
    return (
      <dl className="grid gap-3">
        {Object.entries(value)
          .filter(([k]) => !/password|token|secret|firma/i.test(k))
          .map(([k, v]) => (
            <div key={k} className="border-b pb-2">
              <dt className="font-bold text-sm">
                {names[k] || k.replace(/([a-z])([A-Z])/g, "$1 $2")}
              </dt>
              <dd className="text-sm mt-1">
                <Content value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return (
    <span>
      {typeof value === "boolean" ? (value ? "Sí" : "No") : String(value)}
    </span>
  );
}
function CardQR({ code }: { code: string }) {
  const [qr, setQR] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(code, { width: 180 })
      .then((v) => {
        if (active) setQR(v);
      })
      .catch(() => {
        if (active) setQR("");
      });
    return () => {
      active = false;
    };
  }, [code]);
  return qr ? (
    <div className="rounded-2xl border p-4 inline-block">
      <img src={qr} alt="QR del carnet registrado" />
      <a href={qr} download="carnet-qr.png">
        Descargar QR
      </a>
    </div>
  ) : null;
}
export function ApiRecords({
  path,
  title,
  token,
}: {
  path: string;
  title: string;
  token: string;
}) {
  const [data, setData] = useState<unknown>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    fetch(`${API_BASE_URL}/${path}${path.includes("?") ? "&" : "?"}${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(
            typeof d.detail === "string"
              ? d.detail
              : "No se pudo cargar la información.",
          );
        setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, token, version, filter]);
  return (
    <section className="bg-white rounded-3xl border p-6 space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <button disabled={loading} onClick={() => setVersion((v) => v + 1)}>
          Actualizar
        </button>
      </div>
      {path.startsWith("auditoria/") && (
        <form
          className="grid sm:grid-cols-3 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            new FormData(e.currentTarget).forEach((v, k) => {
              if (v) params.set(k, String(v));
            });
            setFilter(params.toString());
          }}
        >
          <label>
            Buscar
            <input name="q" className="border rounded-xl p-2 w-full" />
          </label>
          <label>
            Desde
            <input
              type="date"
              name="fecha_inicio"
              className="border rounded-xl p-2 w-full"
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              name="fecha_fin"
              className="border rounded-xl p-2 w-full"
            />
          </label>
          <label>
            Tabla
            <input
              name="tabla_afectada"
              className="border rounded-xl p-2 w-full"
            />
          </label>
          <label>
            Fuera de turno
            <input type="checkbox" name="fuera_turno" value="true" />
          </label>
          <button className="rounded-xl bg-slate-900 text-white p-2">
            Filtrar eventos
          </button>
        </form>
      )}
      {loading ? (
        <p>Cargando…</p>
      ) : error ? (
        <p role="alert" className="text-rose-800">
          {error}
        </p>
      ) : (
        <>
          <Content value={data} />
          {path.startsWith("donantes/") &&
            data &&
            typeof data === "object" &&
            "carnetDigitalCodigo" in data &&
            typeof data.carnetDigitalCodigo === "string" && (
              <CardQR code={data.carnetDigitalCodigo} />
            )}
        </>
      )}
    </section>
  );
}
