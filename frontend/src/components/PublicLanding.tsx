import React from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Heart,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  Truck,
  UserPlus,
} from "lucide-react";

export function PublicLanding({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 my-4">
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-rose-900/40 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-rose-600/30 border border-rose-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-rose-200">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Acceso Seguro • Usuario o Correo Electrónico y Contraseña
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
            Banco de Sangre & Transfusión HemoVida
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            Inicia sesión para consultar tu carnet, completar el prefiltro y
            programar tu próxima cita. El personal de salud accede a las
            herramientas de atención según su perfil autorizado.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onLogin()}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
              id="btn-hero-primary-login"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRegister()}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <BadgeCheck className="w-4 h-4 text-rose-300" />
              <span>Registrar Nueva Cuenta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pilares Institucionales de HemoVida (Información y Servicios) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TARJETA 1: REQUISITOS Y DONACIÓN VOLUNTARIA */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <Heart className="w-6 h-6 fill-rose-600" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                Donación Solidaria
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                Requisitos para Donar
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Con una sola donación salvas hasta tres vidas. Revisa los
                criterios básicos para donar con total seguridad:
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Edad entre <strong>18 y 65 años</strong> y peso mínimo de{" "}
                  <strong>50 kg</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Documento de identidad original y vigente (C.I. o Pasaporte).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Gozar de buena salud y haber descansado al menos 6 horas.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Desayuno ligero sin grasas ni lácteos antes de acudir.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onRegister()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              id="btn-portal-donor-register"
            >
              <BadgeCheck className="w-4 h-4" />
              <span>Crear Cuenta de Donante</span>
            </button>
            <button
              onClick={() => onLogin()}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              id="btn-portal-donor-precheck"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Autoevaluación: ¿Puedo Donar?</span>
            </button>
          </div>
        </div>

        {/* TARJETA 2: BIOSEGURIDAD Y HEMOVIGILANCIA */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                Seguridad Transfusional
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                Hemovigilancia y Calidad
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Protocolos internacionales de bioseguridad y análisis serológico
                estricto para garantizar la seguridad del proceso transfusional:
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Tamizaje obligatorio de <strong>6 marcadores</strong> (VIH,
                  Chagas, HepB, HepC, Sífilis, HTLV).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Fraccionamiento celular mecánico en menos de 6 horas
                  post-extracción.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Cadena de frío controlada con monitoreo térmico 24/7 (2°C a
                  6°C).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Trazabilidad de extracciones, bolsas madre y hemocomponentes.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-center">
              <p className="text-[11px] font-bold text-teal-900">
                Control de Calidad y Bioseguridad
              </p>
              <p className="text-[10px] text-teal-700 mt-0.5">
                Banco de Sangre HemoVida
              </p>
            </div>
          </div>
        </div>

        {/* TARJETA 3: RED HOSPITALARIA & CÓDIGO ROJO */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                Atención Continua 24/7
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                Red Hospitalaria & Urgencias
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Suministro de componentes sanguíneos para hospitales, clínicas e
                instituciones de salud en Santa Cruz:
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Protocolo de <strong>Código Rojo</strong> activado para
                  emergencias vitales y trauma.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Pruebas cruzadas mayores y menores de compatibilidad
                  pre-transfusional.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Abastecimiento prioritario a UCIs, quirófanos y maternidades.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Despacho preferencial y reserva de concentrados O Rh Negativo.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onLogin()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <LogIn className="w-4 h-4 text-rose-400" />
              <span>Acceder al Sistema HemoVida</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner Institucional de Personal de Salud y Administración */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-slate-700/60 border border-slate-600/60 px-3 py-1 rounded-full text-xs font-bold text-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Área Institucional & Médica Hospitalaria</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-['Outfit',sans-serif] tracking-tight text-white">
            Portal Exclusivo para Personal de Salud
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Acceso restringido para médicos de triaje, bioquímicos de
            laboratorio, recepción hospitalaria, despacho y administración. Las
            solicitudes de personal son verificadas y aprobadas por el
            administrador. Para solicitar un perfil sanitario, inicia sesión y
            entra en Mi cuenta.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => onLogin()}
            className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            id="btn-staff-portal-login"
          >
            <KeyRound className="w-4 h-4 text-rose-600" />
            <span>Iniciar Sesión Institucional</span>
          </button>
          <button
            onClick={() => onLogin()}
            className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="btn-staff-portal-register"
          >
            <UserPlus className="w-4 h-4 text-rose-400" />
            <span>+ Solicitar Perfil Sanitario</span>
          </button>
        </div>
      </div>
    </div>
  );
}
