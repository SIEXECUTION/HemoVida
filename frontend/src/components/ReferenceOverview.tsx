import React, { useEffect, useState } from "react";
import {
  KeyRound,
  Package,
  Activity,
  ShieldCheck,
  Heart,
  CalendarDays,
  CreditCard,
  ArrowRight,
  Droplet,
} from "lucide-react";
import { UserSession } from "../types";
import { API_BASE_URL } from "../services/api";
export function LegacyRoleBanner({
  session,
  onAccount,
}: {
  session: UserSession;
  onAccount: () => void;
}) {
  const config: Record<string, [string, string, string]> = {
    ADMIN: [
      "from-slate-900 via-slate-800 to-rose-950",
      "Administración, Auditoría Forense & Control Institucional",
      "Gestiona cuentas, consulta la auditoría y parametriza los umbrales del banco de sangre.",
    ],
    DOC_TRIAJE: [
      "from-blue-950 via-slate-900 to-blue-950",
      "Evaluación Médica, Signos Vitales & Dictamen de Aptitud",
      "Consulta la admisión, registra el triaje y conserva el seguimiento de los diferimientos.",
    ],
    BIOQ_INTEGRAL: [
      "from-teal-950 via-slate-900 to-teal-950",
      "Control Serológico, Inmunohematología & Fraccionamiento",
      "Procesa las unidades en cuarentena, confirma resultados y asigna los componentes a sus ubicaciones.",
    ],
    PERS_COLECTA: [
      "from-slate-900 via-rose-950 to-slate-900",
      "Admisión, Asistencia Física & Colecta",
      "Verifica al donante, confirma la asistencia y registra la extracción y el consentimiento.",
    ],
    TEC_LOGISTICA: [
      "from-red-950 via-slate-900 to-red-950",
      "Inventario, Trazabilidad & Logística Transfusional",
      "Consulta la disponibilidad, las reservas exclusivas y las unidades próximas a vencer.",
    ],
    MED_SOLICITANTE: [
      "from-blue-950 via-slate-900 to-blue-950",
      "Gestión Médica & Donación Autóloga",
      "Programa y consulta los protocolos de autodonación para cirugía.",
    ],
  };
  const [color, title, description] = config[session.activeRole] || [
    "from-slate-900 to-rose-950",
    "Portal de Donación HemoVida",
    "Consulta tu carnet, tus citas y tu historial.",
  ];
  return (
    <section
      className={`bg-gradient-to-r ${color} rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800/40 relative overflow-hidden`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/10 border border-white/15 text-[11px] px-3 py-1 rounded-full font-bold">
              {
                session.rolesDisponibles.find(
                  (r) => r.codigo === session.activeRole,
                )?.nombre
              }
            </span>
            <span className="bg-white/10 text-white/90 text-[11px] px-3 py-1 rounded-full">
              {session.nombreCompleto}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>
        <button
          onClick={onAccount}
          className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
        >
          <KeyRound size={16} />
          Mi cuenta y contraseña
        </button>
      </div>
    </section>
  );
}

type Row = Record<string, any>;
export function ReferenceOverview({
  session,
  clinical,
  onSelect,
}: {
  session: UserSession;
  clinical: boolean;
  onSelect: (id: string) => void;
}) {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const path = clinical
      ? "clinica/operaciones/"
      : session.persona?.ci
        ? `donantes/${encodeURIComponent(session.persona.ci)}/carnet/`
        : null;
    if (!path) {
      setError("La cuenta no tiene un expediente personal asociado.");
      return;
    }
    fetch(`${API_BASE_URL}/${path}`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(
            typeof d.detail === "string"
              ? d.detail
              : "No se pudo consultar el expediente.",
          );
        setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [session.token, session.persona?.ci, clinical, version]);
  if (error)
    return (
      <div
        className="rounded-2xl bg-rose-50 border border-rose-200 p-5"
        role="alert"
      >
        {error}
        <button
          className="ml-4 underline"
          onClick={() => setVersion((v) => v + 1)}
        >
          Reintentar
        </button>
      </div>
    );
  if (!data) return <p role="status">Cargando información…</p>;
  if (clinical)
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            [Package, data.madres?.length, "Bolsas madre consultadas"],
            [Activity, data.triajes?.length, "Triajes consultados"],
            [ShieldCheck, data.componentes?.length, "Componentes consultados"],
          ].map(([Icon, value, label]) => {
            const Glyph = Icon as React.ElementType;
            return (
              <article
                key={String(label)}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
              >
                <Glyph className="w-8 h-8 p-1.5 rounded-lg bg-rose-50 text-rose-600 mb-3" />
                <strong className="block text-3xl font-black font-['Outfit',sans-serif]">
                  {value ?? "Sin registro"}
                </strong>
                <span className="text-xs text-slate-500">{String(label)}</span>
              </article>
            );
          })}
        </div>
        <button
          onClick={() => onSelect("clinica")}
          className="inline-flex gap-3 items-center bg-rose-600 hover:bg-rose-700 rounded-xl text-white font-bold p-4"
        >
          Abrir atención clínica <ArrowRight size={16} />
        </button>
      </>
    );
  const c = data;
  return (
    <>
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex gap-2 items-center bg-white/10 border border-white/15 px-3 py-1 rounded-full text-xs text-rose-200">
              <Heart size={14} />
              Portal de Donación HemoVida · Santa Cruz
            </span>
            <h1 className="text-3xl sm:text-4xl font-black font-['Outfit',sans-serif]">
              ¡Hola, {session.persona?.nombres || session.nombreCompleto}!
            </h1>
            <p className="text-sm text-slate-300">
              C.I.: {c.ci} · Carnet: {c.carnetDigitalCodigo}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onSelect("carnet")}
                className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold inline-flex items-center gap-2"
              >
                <CreditCard size={16} />
                Ver carnet digital
              </button>
              <button
                onClick={() => onSelect("citas")}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold inline-flex items-center gap-2"
              >
                <CalendarDays size={16} />
                Consultar atención
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 bg-white/10 border border-white/15 p-5 rounded-2xl space-y-3">
            <span className="text-xs text-amber-200 font-bold">
              {c.esPosibleDonador
                ? "Postulante en evaluación"
                : c.estadoHabilitacion}
            </span>
            <h2 className="text-xl font-black font-['Outfit',sans-serif]">
              Tu próxima evaluación
            </h2>
            <p className="text-xs text-slate-200">
              {c.esPosibleDonador
                ? "Completa la evaluación médica para conocer tu condición de donación."
                : `${c.diasRestantesEspera} días de descanso restantes.`}
            </p>
            {c.periodoEsperaDias > 0 && (
              <progress
                aria-label="Descanso biológico"
                className="w-full h-2 accent-rose-500"
                max={c.periodoEsperaDias}
                value={Math.max(0, c.periodoEsperaDias - c.diasRestantesEspera)}
              />
            )}
            <p className="text-[11px] text-slate-300">
              Próxima fecha por descanso:{" "}
              {c.fechaHabilitacionProxima || "Sin registro"}
            </p>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          [Droplet, c.totalDonacionesHistoricas, "Donaciones registradas"],
          [
            Heart,
            c.volumenHistoricoAportadoMl == null
              ? null
              : `${c.volumenHistoricoAportadoMl} ml`,
            "Aporte histórico",
          ],
          [
            ShieldCheck,
            c.grupoSanguineo ? `${c.grupoSanguineo} ${c.factorRh || ""}` : null,
            "Grupo sanguíneo",
          ],
          [
            CalendarDays,
            c.fechaHabilitacionProxima,
            "Próxima fecha por descanso",
          ],
        ].map(([Icon, value, label]) => {
          const Glyph = Icon as React.ElementType;
          return (
            <article
              key={String(label)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
            >
              <Glyph className="w-8 h-8 p-1.5 rounded-lg bg-rose-50 text-rose-600 mb-3" />
              <strong className="block text-2xl font-black font-['Outfit',sans-serif]">
                {String(value ?? "Sin registro")}
              </strong>
              <span className="text-xs text-slate-500">{String(label)}</span>
            </article>
          );
        })}
      </div>
    </>
  );
}
