import React from 'react';
import { 
  User, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Phone, 
  MapPin, 
  Briefcase, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Droplet,
  CreditCard
} from 'lucide-react';
import { UserSession } from '../types';

interface PosibleDonadorViewProps {
  session: UserSession;
  onOpenPrecheck: () => void;
  onOpenAppointments: () => void;
  onOpenDigitalCard: () => void;
}

export const PosibleDonadorView: React.FC<PosibleDonadorViewProps> = ({
  session,
  onOpenPrecheck,
  onOpenAppointments,
  onOpenDigitalCard,
}) => {
  const persona = session.user || session.persona || {};
  const estadoAptitud = session.posibleDonador?.estadoAptitud || 'No Apto';
  const tieneAnalisis = session.posibleDonador?.tieneAnalisis || false;
  const fechaRegistro = session.posibleDonador?.fechaRegistroPostulante || new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* 1. Banner Obligatorio de Regla de Negocio: Sin Análisis Serológico */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur px-3.5 py-1 rounded-full text-xs font-bold text-amber-100 border border-white/20">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Postulante en Evaluación Inicial • Sin Análisis Serológico Validado</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] tracking-tight">
            Bienvenido/a, {session.nombreCompleto}
          </h1>

          <p className="text-sm text-amber-50 max-w-3xl leading-relaxed">
            De acuerdo a la normativa transfusional de bioseguridad, tu cuenta se encuentra registrada como{' '}
            <strong>Posible Donador</strong>. Tu ascenso formal a <strong>Donante Calificado</strong> y la emisión
            de tu <strong>Carnet Digital Oficial con código QR</strong> se activarán automáticamente una vez que
            acudas a tu primera extracción y tu bolsa de sangre supere con dictamen <strong>Apto (No Reactivo)</strong>{' '}
            el panel de tamizaje serológico (VIH, Hepatitis B, Hepatitis C, Chagas, Sífilis y HTLV).
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenPrecheck}
              className="px-5 py-2.5 bg-white text-orange-950 font-bold text-xs rounded-xl shadow-md hover:bg-amber-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-orange-600" />
              <span>Llenar Cuestionario de Prefiltro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenAppointments}
              className="px-5 py-2.5 bg-black/30 hover:bg-black/40 border border-white/30 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-200" />
              <span>Agendar Cita en Centro de Colecta</span>
            </button>
            <button
              id="btn-ver-carnet-postulante"
              onClick={onOpenDigitalCard}
              className="px-5 py-2.5 bg-rose-600/90 hover:bg-rose-600 border border-rose-400/50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Ver mi Carnet Digital</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid de Información Básica y Estado Clínico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Tarjeta de Estado del Postulante */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rol Institucional
              </span>
              <h3 className="text-base font-black text-slate-800 font-['Outfit',sans-serif]">
                Posible Donador
              </h3>
            </div>
          </div>

          {/* Estado de Aptitud */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 block">
              Dictamen Clínico de Aptitud:
            </span>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  estadoAptitud === 'Apto' ? 'bg-emerald-500' :
                  estadoAptitud === 'En Evaluacion' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                }`} />
                <span className="text-sm font-bold text-slate-800">
                  {estadoAptitud}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {estadoAptitud === 'No Apto' ? 'Pendiente evaluación' : estadoAptitud}
              </span>
            </div>
          </div>

          {/* Tamizaje Inmunoserológico */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 block">
              Tamizaje Inmunoserológico:
            </span>
            <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-950">
                  {tieneAnalisis ? 'Análisis Registrado' : 'Sin Análisis Serológico'}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-200/80 text-rose-800">
                {tieneAnalisis ? 'Completado' : 'Pendiente'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Se analiza en laboratorio tras la donación de sangre total.
            </p>
          </div>

          {/* Fecha de Registro */}
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Fecha de Auto-registro:</span>
            <strong className="text-slate-700">{fechaRegistro}</strong>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Datos Básicos Registrados */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                Ficha Básica del Postulante
              </h2>
              <p className="text-xs text-slate-500">
                Datos personales registrados para la atención médica y trazabilidad de colecta.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              C.I. {persona.ci || 'Sin CI'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Nombres
              </span>
              <p className="font-bold text-slate-800 text-sm">{persona.nombres || session.nombreCompleto}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Apellidos
              </span>
              <p className="font-bold text-slate-800 text-sm">{persona.apellidos || '—'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Correo Electrónico
              </span>
              <p className="font-bold text-slate-800 text-sm truncate">{session.email}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Celular / Teléfono
              </span>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {persona.celular || 'No especificado'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Dirección de Domicilio
              </span>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{persona.direccion || 'Santa Cruz de la Sierra, Bolivia'}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                Ocupación
              </span>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {persona.ocupacion || 'Particular'}
              </p>
            </div>
          </div>

          {/* Pasos a seguir */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              ¿Qué pasos debo seguir para convertirme en Donante Oficial?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-amber-900">
              <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                <strong className="block text-amber-950 font-bold mb-1">1. Autoevaluación</strong>
                Llena el cuestionario de prefiltro para verificar si cumples con las condiciones básicas.
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                <strong className="block text-amber-950 font-bold mb-1">2. Cita & Triaje</strong>
                Agenda tu cita y asiste al banco de sangre para la toma de signos vitales y hemoglobina.
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                <strong className="block text-amber-950 font-bold mb-1">3. Donación & Serología</strong>
                Tras la extracción, el laboratorio analiza tu muestra. Al resultar Apto, se genera tu Carnet Digital con QR.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
