import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  UserPlus, 
  Heart, 
  FileText, 
  ShieldCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import { UserDonor } from '../../types';

interface DonorCheckAndViabilityProps {
  donors: UserDonor[];
  onOpenNewDonorModal: () => void;
  onProceedToDonate: (donor: UserDonor) => void;
}

export const DonorCheckAndViability: React.FC<DonorCheckAndViabilityProps> = ({
  donors,
  onOpenNewDonorModal,
  onProceedToDonate
}) => {
  const [searchCi, setSearchCi] = useState('');
  const [selectedDonor, setSelectedDonor] = useState<UserDonor | null>(donors[0] || null);
  const [hasSearched, setHasSearched] = useState(false);

  // Search logic
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const cleaned = searchCi.trim().toLowerCase();
    if (!cleaned) return;

    const found = donors.find(d => 
      d.ci.toLowerCase().includes(cleaned) ||
      `${d.nombres} ${d.apellidos}`.toLowerCase().includes(cleaned)
    );

    setSelectedDonor(found || null);
  };

  const selectDonorDirectly = (d: UserDonor) => {
    setSelectedDonor(d);
    setSearchCi(d.ci);
    setHasSearched(true);
  };

  // Calculate age
  const calculateAge = (birthdate: string) => {
    const birth = new Date(birthdate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Viability calculation
  const calculateViability = (donor: UserDonor) => {
    const age = calculateAge(donor.fechaNacimiento);
    const isAgeValid = age >= 18 && age <= 65;
    const requiredDays = donor.sexo === 'F' ? 120 : 90;

    let daysSinceLast = 999;
    let daysRemaining = 0;
    let eligibleDate = new Date();

    if (donor.fechaUltimaDonacion) {
      const lastDate = new Date(donor.fechaUltimaDonacion);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      daysSinceLast = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysSinceLast < requiredDays) {
        daysRemaining = requiredDays - daysSinceLast;
        eligibleDate = new Date(lastDate);
        eligibleDate.setDate(eligibleDate.getDate() + requiredDays);
      }
    }

    const isIntervalValid = daysSinceLast >= requiredDays;
    const isViable = isAgeValid && isIntervalValid && donor.estadoHabilitacion !== 'Diferido Definitivo';

    return {
      age,
      isAgeValid,
      requiredDays,
      daysSinceLast,
      daysRemaining,
      eligibleDate,
      isIntervalValid,
      isViable
    };
  };

  const viability = selectedDonor ? calculateViability(selectedDonor) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick CI Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Consulta Rápida en Recepción
              </span>
              <span className="text-[11px] text-slate-400">• Sistema de Triaje Clínico</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Verificación de Viabilidad de Donantes por C.I.
            </h2>
            <p className="text-xs text-slate-500">
              Consulte el historial de la persona para certificar si cumple el intervalo biológico obligatorio (90d varones / 120d mujeres) y requisitos de aptitud.
            </p>
          </div>

          <button
            onClick={onOpenNewDonorModal}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/10 transition-all shrink-0 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Nueva Persona
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-5">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCi}
                onChange={(e) => setSearchCi(e.target.value)}
                placeholder="Ingrese Cédula de Identidad (ej. 7894561 SC) o Nombre del Donante..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              Comprobar Viabilidad
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto text-xs pb-1">
          <span className="text-slate-400 text-[11px] whitespace-nowrap">Accesos Rápidos:</span>
          {donors.slice(0, 4).map((d) => (
            <button
              key={d.id}
              onClick={() => selectDonorDirectly(d)}
              className={`px-2.5 py-1 rounded-lg border text-left whitespace-nowrap cursor-pointer transition-all ${
                selectedDonor?.id === d.id
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="font-mono">{d.ci}</span> • {d.nombres.split(' ')[0]} {d.apellidos.split(' ')[0]} ({d.grupoSanguineo}{d.factorRh === 'Positivo' ? '+' : '-'})
            </button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      {selectedDonor && viability ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Status Header Bar */}
          <div className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-white ${
            viability.isViable
              ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
              : 'bg-gradient-to-r from-amber-700 to-orange-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                {viability.isViable ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Dictamen de Viabilidad Inmunohematológica
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif]">
                  {viability.isViable ? 'VIABLE / APTO PARA DONAR HOY' : 'NO VIABLE TEMPORALMENTE (EN DESCANSO)'}
                </h3>
                <p className="text-xs text-white/90">
                  {viability.isViable 
                    ? 'El donante cumple con la edad reglamentaria y el periodo de descanso biológico.'
                    : `Aún no cumple el periodo de descanso de ${viability.requiredDays} días. Habilitado a partir de ${viability.eligibleDate.toLocaleDateString('es-BO')}.`
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => onProceedToDonate(selectedDonor)}
              className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors shadow-md text-xs cursor-pointer flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
              Proceder a Registrar Donación
            </button>
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-6 space-y-6">
            {/* Donor Identity Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monogram Badge & Main info */}
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-red-800 text-white flex flex-col items-center justify-center font-bold text-sm shadow-xs border-2 border-rose-400 shrink-0">
                  <span className="font-mono">{selectedDonor.nombres[0]}{selectedDonor.apellidos[0]}</span>
                  <span className="text-[8px] font-mono text-rose-200">ID BIO</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {selectedDonor.nombres} {selectedDonor.apellidos}
                  </h4>
                  <p className="font-mono text-xs font-bold text-rose-700">
                    C.I.: {selectedDonor.ci}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Carnet: {selectedDonor.carnetDigitalCodigo}
                  </span>
                </div>
              </div>

              {/* Blood Group & Factor */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                    Tipificación Sanguínea
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-rose-900 font-mono">
                      {selectedDonor.grupoSanguineo}
                    </span>
                    <span className="text-xl font-bold text-rose-700">
                      {selectedDonor.factorRh === 'Positivo' ? 'Rh (+)' : 'Rh (-)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    {selectedDonor.grupoSanguineo === 'O' && selectedDonor.factorRh === 'Negativo' 
                      ? 'Donante Universal Crítico' 
                      : 'Hemocomponente de alta demanda'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-rose-200/60 flex items-center justify-center text-rose-700 font-bold text-lg">
                  🩸
                </div>
              </div>

              {/* History stats */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Historial en el Banco
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Donaciones:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedDonor.totalDonaciones} donaciones</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Volumen Aportado:</span>
                  <span className="font-bold text-emerald-700 font-mono">{selectedDonor.volumenHistoricoMl} ml</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tipo Preferente:</span>
                  <span className="font-bold text-rose-700">{selectedDonor.tipoDonante}</span>
                </div>
              </div>
            </div>

            {/* Viability Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Criterion 1: Intervalo biológico */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                viability.isIntervalValid
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600" />
                    1. Intervalo Biológico
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    viability.isIntervalValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {viability.isIntervalValid ? 'Cumplido' : 'En Espera'}
                  </span>
                </div>

                <div>
                  <p className="text-slate-600">
                    Regla legal: <strong>{viability.requiredDays} días</strong> ({selectedDonor.sexo === 'M' ? 'Varón: 3 meses' : 'Mujer: 4 meses'})
                  </p>
                  <p className="text-slate-600 mt-1">
                    Última donación: <strong>{selectedDonor.fechaUltimaDonacion || 'Sin donación previa (Nuevo)'}</strong>
                  </p>
                  {selectedDonor.fechaUltimaDonacion && (
                    <p className="font-mono text-[11px] text-slate-700 mt-1">
                      Días transcurridos: <strong>{viability.daysSinceLast}</strong> de {viability.requiredDays} días requeridos
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                {selectedDonor.fechaUltimaDonacion && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        viability.isIntervalValid ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (viability.daysSinceLast / viability.requiredDays) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Criterion 2: Edad reglamentaria */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                viability.isAgeValid
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-red-50/50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-600" />
                    2. Rango de Edad
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    viability.isAgeValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viability.isAgeValid ? 'Apto' : 'Fuera de rango'}
                  </span>
                </div>

                <p className="text-slate-600">
                  Edad calculada: <strong className="text-sm font-mono text-slate-900">{viability.age} años</strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Normativa Boliviana (PRONAHEBAS): Entre 18 y 65 años cumplidos.
                </p>
                <p className="text-slate-600">
                  Fecha de Nacimiento: {selectedDonor.fechaNacimiento}
                </p>
              </div>

              {/* Criterion 3: Estado serológico previo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    3. Tamizaje Serológico Previo
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    No Reactivo
                  </span>
                </div>

                <p className="text-slate-600">
                  VIH, Chagas, Hepatitis B, Hepatitis C, Sífilis y HTLV en extracciones anteriores no registran reactividad.
                </p>
                <p className="text-slate-500 text-[10px]">
                  Se realizará confirmación serológica estándar de cada nueva bolsa extraída.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Persona registrada en: <strong>{selectedDonor.direccion}</strong> • Celular: <strong>{selectedDonor.celular}</strong>
              </div>
              <button
                onClick={() => onProceedToDonate(selectedDonor)}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Heart className="w-4 h-4" />
                Registrar Donación para {selectedDonor.nombres.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        /* Not found banner */
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
              Persona no encontrada con C.I. "{searchCi}"
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Esta persona aún no está registrada en el padrón del Banco de Sangre Central HemoVida. Puede registrarla en menos de 1 minuto para evaluar su viabilidad e iniciar su donación.
            </p>
          </div>
          <button
            onClick={onOpenNewDonorModal}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Registrar a esta Persona Ahora
          </button>
        </div>
      ) : null}
    </div>
  );
};
