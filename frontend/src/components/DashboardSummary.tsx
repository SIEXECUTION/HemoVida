import React from 'react';
import { 
  Droplet, 
  Calendar, 
  History, 
  MapPin, 
  Heart, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { UserDonor, Appointment } from '../types';
import { calculateBiologicalEligibility, formatDateTime } from '../utils/donationCalculator';

interface DashboardSummaryProps {
  user: UserDonor;
  upcomingAppointments: Appointment[];
  onNavigate: (tab: 'citas' | 'historial' | 'mapa' | 'carnet' | 'autoevaluacion') => void;
  onOpenNewAppointment: () => void;
  onOpenDigitalCard: () => void;
  onOpenPrecheck: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  user,
  upcomingAppointments,
  onNavigate,
  onOpenNewAppointment,
  onOpenDigitalCard,
  onOpenPrecheck
}) => {
  const eligibility = calculateBiologicalEligibility(user);
  const nextAppointment = upcomingAppointments.find(a => a.estadoCita === 'Programada');
  const livesSavedEstimate = Math.max(1, user.totalDonaciones * 3);

  // Calculate percentage of recovery progress (0 - 100%)
  const progressPercent = Math.min(
    100,
    Math.round((eligibility.diasTranscurridos / eligibility.diasRequeridosPorSexo) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Welcome & Biological Eligibility Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/40">
        {/* Background Blood Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* User Presentation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1 rounded-full text-xs font-semibold text-rose-200">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Portal de Donación HemoVida • Santa Cruz de la Sierra</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-700 via-rose-600 to-red-800 border-2 border-rose-400 shadow-md flex flex-col items-center justify-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-30 pointer-events-none" />
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-rose-200" />
                  <span className="font-mono font-black text-xs sm:text-sm tracking-wider mt-0.5">
                    {user.nombres[0]}{user.apellidos[0]}
                  </span>
                </div>
                <span className="absolute -bottom-2 -right-2 bg-rose-600 text-white font-black text-xs px-2 py-0.5 rounded-lg border-2 border-slate-900 shadow">
                  {user.grupoSanguineo}{user.factorRh === 'Positivo' ? '+' : '-'}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
                  ¡Hola, {user.nombres.split(' ')[0]}!
                </h1>
                <p className="text-sm text-slate-300 mt-0.5">
                  C.I.: <span className="font-semibold text-white">{user.ci}</span> • Carnet: <span className="text-rose-300 font-mono text-xs">{user.carnetDigitalCodigo}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="bg-rose-500/20 text-rose-300 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-rose-500/30">
                    {user.tipoDonante}
                  </span>
                  <span className="bg-white/10 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-white/10">
                    {user.sexo === 'M' ? 'Donante Masculino (Intervalo: 90 días)' : 'Donante Femenino (Intervalo: 120 días)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                id="btn-hero-agendar"
                onClick={onOpenNewAppointment}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:scale-102 cursor-pointer flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Agendar Próxima Cita
              </button>

              <button
                id="btn-hero-carnet"
                onClick={onOpenDigitalCard}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-4 py-2.5 rounded-xl backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-amber-400" />
                Ver Carnet Digital
              </button>
            </div>
          </div>

          {/* Biological Countdown Card (OCL Rule & SQL calculated) */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Aptitud Biológica
                </span>
              </div>
              {eligibility.isEligible ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Habilitado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> En Recuperación
                </span>
              )}
            </div>

            {/* Countdown / Status Box */}
            <div className="bg-black/25 rounded-xl p-3.5 border border-white/5">
              {eligibility.isEligible ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      ¡Tu cuerpo está 100% listo para donar!
                    </p>
                    <p className="text-xs text-slate-300">
                      Ya transcurrieron los {eligibility.diasRequeridosPorSexo} días necesarios para reponer tus niveles de hemoglobina.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-slate-300 font-medium">
                      Faltan para habilitarte:
                    </span>
                    <span className="text-xl font-extrabold text-amber-300">
                      {eligibility.diasRestantes} días
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Última donación: {user.fechaUltimaDonacion || 'Sin registro'} • Podrás donar el{' '}
                    <strong className="text-white">
                      {eligibility.fechaProximaHabilitada.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Recuperación celular:</span>
              <span className="font-bold text-white">{progressPercent}% completado</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onNavigate('historial')}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
          id="stat-card-donaciones"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Donaciones Realizadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Droplet className="w-5 h-5 fill-rose-600 group-hover:fill-white" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {user.totalDonaciones}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Total acumulado histórico <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => onNavigate('historial')}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
          id="stat-card-volumen"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Volumen Aportado
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {user.volumenHistoricoMl} <span className="text-base font-semibold text-slate-500">ml</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {(user.volumenHistoricoMl / 1000).toFixed(2)} Litros de sangre donada
          </p>
        </div>

        {/* Metric 3 */}
        <div 
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all group"
          id="stat-card-vidas"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vidas Impactadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Heart className="w-5 h-5 fill-emerald-600 group-hover:fill-white" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 font-['Outfit',sans-serif]">
            ~{livesSavedEstimate}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            1 donación beneficia hasta 3 pacientes
          </p>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={onOpenDigitalCard}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
          id="stat-card-grupo"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Grupo & Factor
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {user.grupoSanguineo} <span className="text-rose-600">{user.factorRh === 'Positivo' ? 'Rh+' : 'Rh-'}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Carnet Digital Verificado <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>
      </div>

      {/* Two Column Layout: Next Appointment & Quick Centers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Appointment Card */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Próxima Cita de Donación
                </h3>
              </div>
              <button
                onClick={() => onNavigate('citas')}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Ver todas ({upcomingAppointments.length})
              </button>
            </div>

            {nextAppointment ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-1">
                      {nextAppointment.modalidad}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {nextAppointment.centroNombre}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {nextAppointment.centroDireccion}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                      {nextAppointment.codigoCita}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(nextAppointment.fechaHoraProgramada)}
                  </div>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Prefiltro Aprobado
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No tienes citas programadas actualmente
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Programa tu visita en 2 minutos para evitar filas en sala de espera.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onOpenNewAppointment}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              + Agendar nueva cita en centro de colecta
            </button>
            <button
              onClick={onOpenPrecheck}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Revisar requisitos previos
            </button>
          </div>
        </div>

        {/* Quick Map & Centers Banner */}
        <div className="lg:col-span-6 bg-gradient-to-br from-rose-50 via-white to-slate-50 rounded-2xl p-6 border border-rose-200/70 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Centros de Colecta Cercanos
                </h3>
              </div>
              <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                6 centros en Santa Cruz
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              El Banco Central de Sangre opera de forma continua en <strong>Calle Warnes N° 271</strong> junto a hospitales satélites y unidades móviles.
            </p>

            <div className="space-y-2">
              <div 
                onClick={() => onNavigate('mapa')}
                className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-400 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800">
                    Banco de Sangre Central (Calle Warnes)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Calle Warnes N° 271 • Lun a Sáb 07:00 a 20:00
                  </p>
                </div>
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
                  Sede Central
                </span>
              </div>

              <div 
                onClick={() => onNavigate('mapa')}
                className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-400 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800">
                    Centro de Colecta Hospital Japonés
                  </p>
                  <p className="text-[11px] text-slate-500">
                    3er Anillo Externo • Lun a Vie 07:30 a 18:30
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                  Hospitalario
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <button
              onClick={() => onNavigate('mapa')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-rose-400" />
              Explorar Mapa Interactivo y Horarios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
