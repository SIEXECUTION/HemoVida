import React, { useState } from 'react';
import { 
  Stethoscope, 
  Heart, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  Activity, 
  Thermometer, 
  Scale, 
  Droplet, 
  FileText, 
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  ClinicalTriageRecord, 
  UserDonor, 
  Appointment, 
  StaffAccount 
} from '../../types';

interface DoctorTriageViewProps {
  staffAccount?: StaffAccount;
  appointments: Appointment[];
  donors: UserDonor[];
  triajes: ClinicalTriageRecord[];
  onConfirmTriage: (
    triageRecord: ClinicalTriageRecord,
    updatedDonor: UserDonor,
    updatedAppointment?: Appointment
  ) => void;
}

export const DoctorTriageView: React.FC<DoctorTriageViewProps> = ({
  staffAccount,
  appointments,
  donors,
  triajes,
  onConfirmTriage
}) => {
  // Pending donors who confirmed attendance (CU08) or are scheduled
  const waitingDonors = appointments.filter(a => a.asistenciaConfirmada && a.estadoCita === 'En Espera Triaje' || a.estadoCita === 'Programada');

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(
    waitingDonors[0]?.idCita || null
  );

  const selectedAppointment = appointments.find(a => a.idCita === selectedAppointmentId);
  const selectedDonor = selectedAppointment 
    ? donors.find(d => d.id === selectedAppointment.idDonante) 
    : donors[0];

  // Clinical measurements state
  const [presionSistolica, setPresionSistolica] = useState<number>(120);
  const [presionDiastolica, setPresionDiastolica] = useState<number>(80);
  const [pulso, setPulso] = useState<number>(72);
  const [temperatura, setTemperatura] = useState<number>(36.5);
  const [pesoKg, setPesoKg] = useState<number>(68.0);
  const [hemoglobinaGdl, setHemoglobinaGdl] = useState<number>(
    selectedDonor?.sexo === 'F' ? 13.0 : 14.8
  );
  const [viaVenosa, setViaVenosa] = useState<'Brazo Izquierdo Apto' | 'Brazo Derecho Apto' | 'Ambos Aptos' | 'Dificultosa'>('Ambos Aptos');
  const [dictamen, setDictamen] = useState<'Apto' | 'Diferido Temporal' | 'Diferido Definitivo'>('Apto');
  const [motivoDiferimiento, setMotivoDiferimiento] = useState('');
  const [diasDiferimiento, setDiasDiferimiento] = useState<number>(30);
  const [observacionesClinicas, setObservacionesClinicas] = useState('Donante normotenso, eupnéico, mucosas normocoloreadas y venas antecubitales prominentes.');

  // Validation rules
  const isWeightValid = pesoKg >= 50.0;
  const isBpValid = presionSistolica >= 90 && presionSistolica <= 140 && presionDiastolica >= 60 && presionDiastolica <= 90;
  const isPulseValid = pulso >= 50 && pulso <= 100;
  const isTempValid = temperatura < 37.5;
  const minHb = selectedDonor?.sexo === 'F' ? 12.5 : 13.5;
  const isHbValid = hemoglobinaGdl >= minHb;

  const allVitalsNormal = isWeightValid && isBpValid && isPulseValid && isTempValid && isHbValid;

  const handleSubmitTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;

    // Calculate reactivation date if deferred
    let fechaReactivacion: string | undefined = undefined;
    if (dictamen === 'Diferido Temporal') {
      const d = new Date();
      d.setDate(d.getDate() + diasDiferimiento);
      fechaReactivacion = d.toISOString().split('T')[0];
    }

    const triageRecord: ClinicalTriageRecord = {
      idTriaje: `TRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      idCita: selectedAppointment?.idCita,
      idDonante: selectedDonor.id,
      donanteNombre: `${selectedDonor.nombres} ${selectedDonor.apellidos}`,
      donanteCi: selectedDonor.ci,
      fechaHora: new Date().toISOString(),
      doctorNombre: staffAccount?.nombre || 'Dr. Fernando Valverde',
      doctorMatricula: staffAccount?.credencial || 'MED-COL-9481',
      signosVitales: {
        presionSistolica,
        presionDiastolica,
        pulso,
        temperatura,
        pesoKg,
        hemoglobinaGdl,
        viaVenosa
      },
      dictamen,
      motivoDiferimiento: dictamen !== 'Apto' ? motivoDiferimiento || 'Diferimiento preventivo según criterio clínico' : undefined,
      fechaReactivacion,
      observacionesClinicas
    };

    const updatedDonor: UserDonor = {
      ...selectedDonor,
      estadoHabilitacion: dictamen,
      motivoDiferimiento: dictamen !== 'Apto' ? motivoDiferimiento : undefined,
      fechaReactivacion
    };

    const updatedAppointment = selectedAppointment ? {
      ...selectedAppointment,
      estadoCita: 'Triaje Completado' as const
    } : undefined;

    onConfirmTriage(triageRecord, updatedDonor, updatedAppointment);
  };

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Stethoscope className="w-3.5 h-3.5" />
                Estación Médica de Triaje Clínico
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium">
                {staffAccount?.nombre || 'Dr. Fernando Valverde'} • {staffAccount?.cargo || 'Médico Hemoterapeuta'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Consulta Médica Habilitada
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Evaluación Médica, Signos Vitales & Dictamen de Aptitud
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Examen físico previo a la flebotomía: control de tensión arterial, pulso, temperatura, peso corporal (&gt;50 kg), hemoglobina capilar y venopunción antecubital para emitir la aptitud clínica obligatoria o el diferimiento temporal con fecha de reactivación.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting queue from Reception */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Fila de Postulantes en Espera
              </h3>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {waitingDonors.length} en espera
              </span>
            </div>

            <div className="space-y-2">
              {waitingDonors.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No hay postulantes con asistencia confirmada en este momento.
                </div>
              ) : (
                waitingDonors.map((app) => {
                  const donor = donors.find(d => d.id === app.idDonante);
                  const isSelected = selectedAppointmentId === app.idCita;

                  return (
                    <div
                      key={app.idCita}
                      onClick={() => setSelectedAppointmentId(app.idCita)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs' 
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {app.numeroTurnoTriaje || `TURNO-${app.idCita}`}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          Asistencia Confirmada
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-800 mt-1">
                        {donor ? `${donor.nombres} ${donor.apellidos}` : 'Donante Postulante'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        C.I.: {donor?.ci} • {app.modalidad}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Donor Profile Quick Inspection */}
          {selectedDonor && (
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-blue-800">
                Ficha del Postulante Seleccionado:
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex flex-col items-center justify-center font-bold text-xs shadow-xs border border-blue-700 shrink-0">
                  <span className="font-mono text-sm tracking-wider">
                    {selectedDonor.nombres[0]}{selectedDonor.apellidos[0]}
                  </span>
                  <span className="text-[8px] font-mono text-blue-200">DONANTE</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{selectedDonor.nombres} {selectedDonor.apellidos}</p>
                  <p className="text-[11px] text-slate-500">C.I.: {selectedDonor.ci} • Sexo: {selectedDonor.sexo === 'M' ? 'Varón (90d)' : 'Mujer (120d)'}</p>
                  <span className="inline-block mt-0.5 font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                    Grupo {selectedDonor.grupoSanguineo}{selectedDonor.factorRh === 'Positivo' ? '+' : '-'}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-600 text-[11px]">
                <p><strong>Última Donación:</strong> {selectedDonor.fechaUltimaDonacion || 'Sin registro previo'}</p>
                <p><strong>Historial:</strong> {selectedDonor.totalDonaciones} donaciones ({selectedDonor.volumenHistoricoMl} ml)</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Clinical Triage Form */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmitTriage} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Registro de Signos Vitales & Medición Capilar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores obligatorios según la Norma Técnica de Bancos de Sangre.
              </p>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Presión Sistólica */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Presión Sistólica (mmHg)
                </label>
                <input
                  type="number"
                  min="70"
                  max="200"
                  value={presionSistolica}
                  onChange={(e) => setPresionSistolica(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-sm font-bold border rounded-xl bg-white ${
                    presionSistolica >= 90 && presionSistolica <= 140 ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-700'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">Norma: 90 - 140</span>
              </div>

              {/* Presión Diastólica */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Presión Diastólica (mmHg)
                </label>
                <input
                  type="number"
                  min="40"
                  max="130"
                  value={presionDiastolica}
                  onChange={(e) => setPresionDiastolica(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-sm font-bold border rounded-xl bg-white ${
                    presionDiastolica >= 60 && presionDiastolica <= 90 ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-700'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">Norma: 60 - 90</span>
              </div>

              {/* Pulso */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Pulso / FC (lpm)
                </label>
                <input
                  type="number"
                  min="40"
                  max="150"
                  value={pulso}
                  onChange={(e) => setPulso(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-sm font-bold border rounded-xl bg-white ${
                    isPulseValid ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-700'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">Norma: 50 - 100</span>
              </div>

              {/* Temperatura */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="35.0"
                  max="41.0"
                  value={temperatura}
                  onChange={(e) => setTemperatura(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-sm font-bold border rounded-xl bg-white ${
                    isTempValid ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-700'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">Norma: &lt; 37.5°C</span>
              </div>
            </div>

            {/* Weight (>50kg) & Hemoglobin Capilar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Peso corporal */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Peso Corporal (kg) *
                  </label>
                  {isWeightValid ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Conforme (&gt;50kg)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Bajo peso
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="180"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 text-base font-black border rounded-xl bg-white ${
                    isWeightValid ? 'border-emerald-400 text-emerald-900' : 'border-rose-400 text-rose-800'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">
                  Volumen de extracción 450 ml exige peso superior a 50.0 kg.
                </span>
              </div>

              {/* Hemoglobina Capilar */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-rose-600" />
                    Hemoglobina Capilar (g/dL) *
                  </label>
                  {isHbValid ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Apto (&gt;={minHb})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Anemia / Hb Baja
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="8.0"
                  max="20.0"
                  value={hemoglobinaGdl}
                  onChange={(e) => setHemoglobinaGdl(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 text-base font-black border rounded-xl bg-white ${
                    isHbValid ? 'border-emerald-400 text-emerald-900' : 'border-rose-400 text-rose-800'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block">
                  Mínimo mujer: 12.5 g/dL • Mínimo varón: 13.5 g/dL
                </span>
              </div>

              {/* Vía Venosa */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Evaluación de Vía Venosa Antecubital
                </label>
                <select
                  value={viaVenosa}
                  onChange={(e) => setViaVenosa(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="Ambos Aptos">Ambos Brazos Aptos</option>
                  <option value="Brazo Izquierdo Apto">Solo Brazo Izquierdo</option>
                  <option value="Brazo Derecho Apto">Solo Brazo Derecho</option>
                  <option value="Dificultosa">Vena Difícil / Fina (Riesgo Hematoma)</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  Permite orientar el brazo de punción al flebotomista.
                </span>
              </div>
            </div>

            {/* Dictamen Médico (CU11) */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Dictamen Médico Formal de Aptitud o Diferimiento
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDictamen('Apto')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    dictamen === 'Apto'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Apto para Flebotomía</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Pasa a extracción de 450 ml</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDictamen('Diferido Temporal')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    dictamen === 'Diferido Temporal'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Diferido Temporal</span>
                  <span className="text-[10px] text-amber-700 font-normal">Con fecha de reactivación</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDictamen('Diferido Definitivo')}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    dictamen === 'Diferido Definitivo'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Diferido Definitivo</span>
                  <span className="text-[10px] text-rose-700 font-normal">Exclusión médica permanente</span>
                </button>
              </div>

              {/* Conditional fields if deferred */}
              {dictamen === 'Diferido Temporal' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Motivo Clínico del Diferimiento *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Hemoglobina en 12.0 g/dL (tratamiento ferroso)"
                        value={motivoDiferimiento}
                        onChange={(e) => setMotivoDiferimiento(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Días de Espera hasta Reactivación:
                      </label>
                      <select
                        value={diasDiferimiento}
                        onChange={(e) => setDiasDiferimiento(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white"
                      >
                        <option value="7">7 días (Infección respiratoria leve / antibióticos)</option>
                        <option value="14">14 días (Tratamiento dental menor)</option>
                        <option value="30">30 días (Recuperación de hemoglobina / suplemento)</option>
                        <option value="90">90 días (Descanso biológico varón)</option>
                        <option value="120">120 días (Descanso biológico mujer)</option>
                        <option value="180">180 días (Tatuaje o piercing reciente)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {dictamen === 'Diferido Definitivo' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
                  <label className="block text-[11px] font-bold text-rose-900">
                    Causa Médica de Inhabilitación Permanente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Antecedente confirmado de cardiopatía severa o reactividad confirmada"
                    value={motivoDiferimiento}
                    onChange={(e) => setMotivoDiferimiento(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-rose-300 rounded-xl bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones Clínicas & Recomendaciones
                </label>
                <textarea
                  rows={2}
                  value={observacionesClinicas}
                  onChange={(e) => setObservacionesClinicas(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Emitir Dictamen Médico & Firmar Ficha Clínica</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
