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
  iddeuda: "Obligación",
  idsolicitud: "Solicitud",
  idpago: "Pago",
  numerosolicitud: "Número de solicitud",
  montooriginal: "Importe original (BOB)",
  montoabonado: "Abonado (BOB)",
  saldopendiente: "Saldo (BOB)",
  montopagado: "Importe del pago (BOB)",
  estado_actual: "Estado actual",
  estadotransaccion: "Estado del pago",
  estadopago: "Tratamiento",
  metodopago: "Método de pago",
  proveedorpasarela: "Proveedor",
  referenciaexterna: "Referencia",
  fechavencimiento: "Vencimiento",
  fechahorapago: "Fecha del pago",
  fechacreacion: "Fecha de registro",
  numerorecibofactura: "Número de comprobante",
  conceptoservicio: "Concepto",
  montototal: "Total (BOB)",
  moneda: "Moneda",
  motivodeuda: "Motivo",
  pagoposteriorautorizado: "Pago posterior autorizado",
  observacionautorizacion: "Justificación",
  idevento: "Notificación",
  tipo: "Tipo",
  resultado: "Resultado",
  fecharecepcion: "Recibida",
  dimension: "Agrupación",
  cantidad: "Cantidad",
  importe: "Importe (BOB)",
  volumen: "Volumen (ml)",
};
function Content({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-500">Sin registro</span>;
  if (Array.isArray(value)) {
    if (!value.length)
      return <p className="text-slate-500 py-5">No hay registros.</p>;
    if (
      value.every(
        (row) => row && typeof row === "object" && !Array.isArray(row),
      )
    ) {
      const columns = [
        ...new Set(value.flatMap((row) => Object.keys(row))),
      ].filter((k) => !/password|token|secret|firma/i.test(k));
      return (
        <div className="reference-table">
          <table>
            <thead>
              <tr>
                {columns.map((k) => (
                  <th key={k}>
                    {names[k] || k.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.map((row, i) => (
                <tr key={i}>
                  {columns.map((k) => (
                    <td key={k}>
                      <Content value={row[k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="space-y-2">
        {value.map((v, i) => (
          <li key={i}>
            <Content value={v} />
          </li>
        ))}
      </ul>
    );
  }
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
    <div className="rounded-2xl bg-white text-slate-900 p-3 inline-flex flex-col items-center gap-2 text-xs font-bold">
      <img src={qr} width={150} height={150} alt="QR del carnet registrado" />
      <a href={qr} download="carnet-qr.png">
        Descargar QR
      </a>
    </div>
  ) : null;
}
function DonorCard({ data: c }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 rounded-3xl text-white p-6 flex flex-wrap justify-between gap-6">
          <div className="space-y-3">
            <span className="text-xs font-bold tracking-widest text-rose-300">
              {c.esPosibleDonador ? "CARNET PROVISIONAL" : "CARNET DE DONANTE"}
            </span>
            <h3 className="text-2xl font-black text-white">
              {String(
                c.donante || [c.nombres, c.apellidos].filter(Boolean).join(" "),
              )}
            </h3>
            <p className="text-slate-300">
              C.I. {String(c.ci || "Sin registro")}
            </p>
            <strong className="block text-2xl text-rose-300">
              {c.grupoSanguineo
                ? `${c.grupoSanguineo} ${c.factorRh || ""}`
                : "Pendiente de tipificación"}
            </strong>
            <p className="font-mono text-rose-200">
              {String(c.carnetDigitalCodigo)}
            </p>
          </div>
          <CardQR code={String(c.carnetDigitalCodigo)} />
        </div>
        <div className="border border-slate-200 rounded-3xl p-6 space-y-4">
          <h3 className="text-xl font-black">Tu próxima evaluación</h3>
          <span className="inline-flex rounded-full bg-amber-50 text-amber-800 px-3 py-2 text-xs font-bold">
            {String(
              c.estadoHabilitacion ||
                c.estadoAptitud ||
                "Pendiente de evaluación",
            )}
          </span>
          <p className="text-sm text-slate-500">
            La evaluación clínica confirma la aptitud. El descanso biológico no
            sustituye el dictamen del personal de salud.
          </p>
          <dl className="space-y-2 text-sm">
            <div>
              Próxima fecha por descanso:{" "}
              {String(c.fechaHabilitacionProxima || "Sin registro")}
            </div>
            <div>
              Días de descanso restantes:{" "}
              {String(c.diasRestantesEspera ?? "Sin registro")}
            </div>
          </dl>
        </div>
      </div>
      <section className="border rounded-3xl p-6 space-y-4">
        <h3 className="text-xl font-black">Historial de donaciones</h3>
        <Content value={c.extraccionesRecientes || []} />
      </section>
    </div>
  );
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
          {path.startsWith("donantes/") &&
          data &&
          typeof data === "object" &&
          "carnetDigitalCodigo" in data ? (
            <DonorCard data={data as Record<string, unknown>} />
          ) : (
            <Content value={data} />
          )}
        </>
      )}
    </section>
  );
}

export { Content as DataContent };
