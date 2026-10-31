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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Navbar
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
            <header className="rounded-3xl bg-gradient-to-r from-slate-900 to-rose-950 text-white p-8">
              <h1 className="text-3xl font-bold">
                Hola, {session.nombreCompleto}
              </h1>
              <p>
                {session.rolesDisponibles.find(
                  (r) => r.codigo === session.activeRole,
                )?.nombre || session.activeRole}
              </p>
            </header>
            <nav
              aria-label="Módulos"
              className="flex flex-wrap gap-3 bg-white rounded-2xl p-3 border"
            >
              {[
                ["inicio", "Mi espacio"],
                ...(clinical
                  ? [
                      ["clinica", "Atención clínica"],
                      ["stock", "Inventario"],
                    ]
                  : [
                      ["carnet", "Carnet e historial"],
                      ["citas", "Citas y prefiltro"],
                    ]),
                ...(["ADMIN", "BIOQ_INTEGRAL"].includes(session.activeRole)
                  ? [["laboratorio", "Laboratorio"]]
                  : []),
                ...(session.activeRole === "ADMIN"
                  ? [
                      ["personal", "Personal"],
                      ["auditoria", "Auditoría"],
                    ]
                  : []),
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`p-3 rounded-xl ${tab === id ? "bg-rose-700 text-white" : "text-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {(tab === "clinica" || (tab === "inicio" && clinical)) && (
              <ClinicalCircuit
                key={session.activeRole}
                token={session.token}
                role={session.activeRole}
              />
            )}
            {tab === "laboratorio" &&
              ["ADMIN", "BIOQ_INTEGRAL"].includes(session.activeRole) && (
                <JointReleasePanel
                  key={session.activeRole}
                  token={session.token}
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
            {(["carnet", "historial"].includes(tab) ||
              (tab === "inicio" && !clinical)) &&
              session.persona?.ci && (
                <ApiRecords
                  key="carnet"
                  path={`donantes/${encodeURIComponent(session.persona.ci)}/carnet/`}
                  title="Carnet e historial"
                  token={session.token!}
                />
              )}
            {["citas", "autoevaluacion", "mapa"].includes(tab) && (
              <section className="bg-white border rounded-3xl p-8">
                <h2 className="text-xl font-bold">
                  {tab === "mapa" ? "Centros de atención" : "Citas y prefiltro"}
                </h2>
                <p className="mt-3">
                  Este módulo está pendiente de integración. Consulta al
                  personal de recepción para gestionar tu atención.
                </p>
              </section>
            )}
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
