import "./cloud.css";
import "./legacy.css";
import "./reference-theme.css";
import {
  LegacyRoleBanner,
  ReferenceOverview,
} from "./components/ReferenceOverview";
import {
  Heart,
  Activity,
  Package,
  FlaskConical,
  Users,
  ClipboardList,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { WalkthroughPage } from "./components/WalkthroughPage";
import { FinancePage } from "./components/FinancePage";
import { AgendaPage } from "./components/AgendaPage";
import { IncentivesPage } from "./components/IncentivesPage";
import { AutologousPage } from "./components/AutologousPage";
import { StaticReportsPage } from "./components/StaticReportsPage";
import { ReportsPage } from "./components/ReportsPage";
import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { ClinicalCircuit } from "./components/clinical/ClinicalCircuit";
import { JointReleasePanel } from "./components/lab/JointReleasePanel";
import { PublicLanding } from "./components/PublicLanding";
import { AdminActions } from "./components/AdminActions";
import { ApiRecords } from "./components/ApiRecords";
import { apiService } from "./services/api";
import { UserSession, RoleCode } from "./types";
const sessionKey = "hemovida_live_session";
function readSession(): UserSession | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    return s?.token && s?.usuarioId && s?.activeRole ? s : null;
  } catch {
    return null;
  }
}
export default function App() {
  const [session, setSession] = useState<UserSession | null>(readSession),
    [login, setLogin] = useState(false),
    [register, setRegister] = useState(false),
    [password, setPassword] = useState(false),
    [tab, setTab] = useState("inicio"),
    [error, setError] = useState("");
  const clinical =
    !!session &&
    [
      "ADMIN",
      "DOC_TRIAJE",
      "PERS_COLECTA",
      "BIOQ_INTEGRAL",
      "TEC_LOGISTICA",
    ].includes(session.activeRole);
  function commit(s: UserSession | null) {
    setSession(s);
    setTab("inicio");
    setError("");
    if (s) {
      sessionStorage.setItem(sessionKey, JSON.stringify(s));
      sessionStorage.setItem("hemovida_jwt_token", s.token!);
    } else {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem("hemovida_jwt_token");
    }
  }
  function openLogin() {
    setRegister(false);
    setLogin(true);
  }
  function openRegister() {
    setRegister(true);
    setLogin(true);
  }
  async function switchRole(role: RoleCode) {
    if (!session) return;
    try {
      const tokens = await apiService.selectRole(session.token || "", role);
      commit({
        ...session,
        activeRole: role,
        role,
        token: tokens.access,
        staff: undefined,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const verificationCode = new URLSearchParams(window.location.search).get("carnet");
  if (verificationCode) {
    return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <a href="/" className="underline">Volver a HemoVida</a>
        <p>Consulta del carnet registrado. La evaluación clínica confirma la aptitud para donar.</p>
        <ApiRecords path={`donantes/${encodeURIComponent(verificationCode)}/carnet/`} title="Verificación de carnet" token="" />
      </div>
    </main>;
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar
        showDesktopNavigation={false}
        session={session}
        activeTab={
          [
            "inicio",
            "citas",
            "historial",
            "mapa",
            "carnet",
            "autoevaluacion",
          ].includes(tab)
            ? (tab as "inicio")
            : "inicio"
        }
        onSelectTab={setTab}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
        onLogout={() => commit(null)}
        onOpenPrecheck={() => (session ? setTab("citas") : openLogin())}
        onOpenChangePassword={() => setPassword(true)}
        onSwitchRole={switchRole}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <p role="alert" className="bg-rose-50 p-4 text-rose-800">
            {error}
          </p>
        )}
        {!session ? (
          <PublicLanding onLogin={openLogin} onRegister={openRegister} />
        ) : (
          <>
            {(clinical || session.activeRole === "MED_SOLICITANTE") && (
              <LegacyRoleBanner
                session={session}
                onAccount={() => setPassword(true)}
              />
            )}
            <nav
              aria-label="Módulos"
              className="legacy-tabs flex flex-wrap gap-2 bg-white rounded-2xl p-2 border border-slate-200 shadow-sm"
            >
              {[
                ["inicio", "Mi espacio"],
                ["recorrido", "Guía de recorrido"],
                ...(["ADMIN", "PERS_COLECTA"].includes(session.activeRole)
                  ? [
                      ["citas", "Citas y recepción"],
                      ["incentivos", "Refrigerio e incentivos"],
                    ]
                  : []),
                ...(clinical
                  ? [
                      ["clinica", "Atención clínica"],
                      ["stock", "Inventario"],
                    ]
                  : ["DONANTE", "POSIBLE_DONADOR", "RECEPTOR"].includes(
                        session.activeRole,
                      )
                    ? [
                        ["carnet", "Carnet e historial"],
                        ["citas", "Citas y prefiltro"],
                      ]
                    : []),
                ...([
                  "ADMIN",
                  "MED_SOLICITANTE",
                  "DOC_TRIAJE",
                  "BIOQ_INTEGRAL",
                  "PERS_COLECTA",
                  "DONANTE",
                  "POSIBLE_DONADOR",
                  "RECEPTOR",
                ].includes(session.activeRole)
                  ? [["autologa", "Programación autóloga"]]
                  : []),
                ...(["ADMIN", "BIOQ_INTEGRAL"].includes(session.activeRole)
                  ? [["laboratorio", "Laboratorio"]]
                  : []),
                ...(session.activeRole === "ADMIN"
                  ? [
                      ["personal", "Personal"],
                      ["auditoria", "Auditoría"],
                      ["finanzas", "Finanzas"],
                    ]
                  : []),
                ...([
                  "ADMIN",
                  "DOC_TRIAJE",
                  "BIOQ_INTEGRAL",
                  "TEC_LOGISTICA",
                ].includes(session.activeRole)
                  ? [
                      ["estaticos", "Informes de gestión"],
                      ["reportes", "Consultas y KPIs"],
                    ]
                  : []),
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 ${tab === id ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"}`}
                >
                  {React.createElement(
                    (
                      {
                        inicio: Heart,
                        clinica: Activity,
                        stock: Package,
                        laboratorio: FlaskConical,
                        personal: Users,
                        auditoria: ClipboardList,
                        carnet: CreditCard,
                        citas: CalendarDays,
                      } as Record<string, React.ElementType>
                    )[id] || Heart,
                    { size: 15 },
                  )}
                  {label}
                </button>
              ))}
            </nav>
            {tab === "recorrido" && <WalkthroughPage />}
            {tab === "inicio" && session.activeRole === "MED_SOLICITANTE" && (
              <AutologousPage
                token={session.token!}
                role={session.activeRole}
                onAgenda={() => setTab("citas")}
              />
            )}
            {tab === "inicio" && session.activeRole !== "MED_SOLICITANTE" && (
              <ReferenceOverview
                session={session}
                clinical={clinical}
                onSelect={setTab}
              />
            )}
            <div
              className={`reference-screen legacy-role-${session.activeRole}`}
            >
              {tab === "autologa" &&
                [
                  "ADMIN",
                  "MED_SOLICITANTE",
                  "DOC_TRIAJE",
                  "BIOQ_INTEGRAL",
                  "PERS_COLECTA",
                  "DONANTE",
                  "POSIBLE_DONADOR",
                  "RECEPTOR",
                ].includes(session.activeRole) && (
                  <AutologousPage
                    key={session.activeRole}
                    token={session.token!}
                    role={session.activeRole}
                    onAgenda={() => setTab("citas")}
                  />
                )}
              {tab === "estaticos" &&
                [
                  "ADMIN",
                  "DOC_TRIAJE",
                  "BIOQ_INTEGRAL",
                  "TEC_LOGISTICA",
                ].includes(session.activeRole) && (
                  <StaticReportsPage
                    key={session.activeRole}
                    token={session.token!}
                  />
                )}
              {tab === "clinica" && clinical && (
                <ClinicalCircuit
                  key={session.activeRole}
                  token={session.token}
                  role={session.activeRole}
                />
              )}
              {tab === "laboratorio" &&
                ["ADMIN", "BIOQ_INTEGRAL"].includes(session.activeRole) && (
                  <JointReleasePanel
                    role={session.activeRole}
                    key={session.activeRole}
                    token={session.token}
                  />
                )}
              {tab === "finanzas" && session.activeRole === "ADMIN" && (
                <FinancePage token={session.token!} />
              )}
              {tab === "incentivos" &&
                ["ADMIN", "PERS_COLECTA"].includes(session.activeRole) && (
                  <IncentivesPage
                    key={session.activeRole}
                    token={session.token!}
                  />
                )}
              {tab === "reportes" &&
                [
                  "ADMIN",
                  "DOC_TRIAJE",
                  "BIOQ_INTEGRAL",
                  "TEC_LOGISTICA",
                ].includes(session.activeRole) && (
                  <ReportsPage
                    key={session.activeRole}
                    token={session.token!}
                  />
                )}
              {tab === "stock" && clinical && (
                <ApiRecords
                  key="stock"
                  path="stock/alertas/?todos=true"
                  title="Inventario y alertas"
                  token={session.token!}
                />
              )}
              {tab === "personal" && session.activeRole === "ADMIN" && (
                <AdminActions token={session.token!} />
              )}
              {tab === "auditoria" && session.activeRole === "ADMIN" && (
                <ApiRecords
                  key="auditoria"
                  path="auditoria/"
                  title="Bitácora de eventos"
                  token={session.token!}
                />
              )}
              {["carnet", "historial"].includes(tab) && session.persona?.ci && (
                <ApiRecords
                  key="carnet"
                  path={`donantes/${encodeURIComponent(session.persona.ci)}/carnet/`}
                  title="Carnet e historial"
                  token={session.token!}
                />
              )}
              {["citas", "autoevaluacion"].includes(tab) &&
                [
                  "ADMIN",
                  "PERS_COLECTA",
                  "DONANTE",
                  "POSIBLE_DONADOR",
                  "RECEPTOR",
                ].includes(session.activeRole) && (
                  <AgendaPage
                    key={session.activeRole}
                    token={session.token!}
                    role={session.activeRole}
                  />
                )}
              {tab === "mapa" && (
                <section className="bg-white border rounded-3xl p-8">
                  <h2 className="text-xl font-bold">
                    {tab === "mapa"
                      ? "Centros de atención"
                      : "Citas y prefiltro"}
                  </h2>
                  <p className="mt-3">
                    Este módulo está pendiente de integración. Consulta al
                    personal de recepción para gestionar tu atención.
                  </p>
                </section>
              )}
            </div>
          </>
        )}
      </main>
      <footer className="text-center text-xs p-6 border-t bg-white">
        HemoVida · Banco de Sangre y Transfusión
      </footer>
      <LoginModal
        isOpen={login}
        onClose={() => setLogin(false)}
        onSelectAccount={(selection) => {
          if (selection.type === "session") {
            commit(selection.session);
            setLogin(false);
          }
        }}
        availableUsers={[]}
        availableStaff={[]}
        initialMode={register ? "register" : "login"}
      />
      {session && (
        <ChangePasswordModal
          isOpen={password}
          onClose={() => setPassword(false)}
          session={session}
          onPasswordChanged={() => setPassword(false)}
        />
      )}
    </div>
  );
}
