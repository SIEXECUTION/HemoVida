import React, { useState } from 'react';
import { 
  Layers, 
  Truck, 
  UserCheck, 
  BarChart3, 
  Heart, 
  UserPlus, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Search,
  Droplet,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Gift,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { 
  BloodInventoryItem, 
  BloodDispatchRecord, 
  PatientReplacementRecord, 
  UserDonor, 
  DonationRecord,
  StaffAccount,
  Appointment,
  IncentivoEntregaRecord
} from '../../types';
import { BloodInventorySection } from './BloodInventorySection';
import { DispatchHistorySection } from './DispatchHistorySection';
import { PatientReplacementSection } from './PatientReplacementSection';
import { DonorCheckAndViability } from './DonorCheckAndViability';
import { DonationStatsHistory } from './DonationStatsHistory';
import { NewDispatchModal } from './NewDispatchModal';
import { NewDonorModal } from './NewDonorModal';
import { ReceptionDonationModal } from './ReceptionDonationModal';

interface ReceptionDeskViewProps {
  inventory: BloodInventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<BloodInventoryItem[]>>;
  dispatches: BloodDispatchRecord[];
  setDispatches: React.Dispatch<React.SetStateAction<BloodDispatchRecord[]>>;
  replacements: PatientReplacementRecord[];
  setReplacements: React.Dispatch<React.SetStateAction<PatientReplacementRecord[]>>;
  donors: UserDonor[];
  setDonors: React.Dispatch<React.SetStateAction<UserDonor[]>>;
  allDonations: DonationRecord[];
  setAllDonations: React.Dispatch<React.SetStateAction<DonationRecord[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  incentivosEntrega: IncentivoEntregaRecord[];
  setIncentivosEntrega: React.Dispatch<React.SetStateAction<IncentivoEntregaRecord[]>>;
  staffAccount?: StaffAccount;
}

export type ReceptionTab = 'viabilidad' | 'asistencia' | 'incentivos' | 'reposiciones' | 'estadisticas' | 'inventario';

export const ReceptionDeskView: React.FC<ReceptionDeskViewProps> = ({
  inventory,
  setInventory,
  dispatches,
  setDispatches,
  replacements,
  setReplacements,
  donors,
  setDonors,
  allDonations,
  setAllDonations,
  appointments,
  setAppointments,
  incentivosEntrega,
  setIncentivosEntrega,
  staffAccount
}) => {
  const [activeTab, setActiveTab] = useState<ReceptionTab>('viabilidad');

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isNewDonorModalOpen, setIsNewDonorModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donorForDonation, setDonorForDonation] = useState<UserDonor | null>(null);

  // Quick summary counts
  const availableBagsCount = inventory.filter(i => i.estado === 'Disponible').length;
  const pendingReplacementsCount = replacements.filter(r => r.estado !== 'Completado').length;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayDonationsCount = allDonations.filter(d => d.fechaHora.startsWith(todayDateStr)).length;
  const voluntaryIncentivesCount = incentivosEntrega.length;

  // Handlers
  const handleConfirmDispatch = (
    dispatchRecord: BloodDispatchRecord,
    updatedInventory: BloodInventoryItem[],
    updatedReplacements: PatientReplacementRecord[]
  ) => {
    setDispatches(prev => [dispatchRecord, ...prev]);
    setInventory(updatedInventory);
    setReplacements(updatedReplacements);
  };

  const handleDonorRegistered = (newDonor: UserDonor) => {
    setDonors(prev => [newDonor, ...prev]);
    setActiveTab('viabilidad');
  };

  const handleProceedToDonateFromViability = (donor: UserDonor) => {
    setDonorForDonation(donor);
    setIsDonationModalOpen(true);
  };

  const handleDonateForPatient = (patient: PatientReplacementRecord) => {
    setDonorForDonation(donors[0] || null);
    setIsDonationModalOpen(true);
  };

  const handleConfirmDonation = (
    newDonation: DonationRecord,
    updatedDonor: UserDonor,
    updatedReplacements: PatientReplacementRecord[],
    newInventoryItems: BloodInventoryItem[]
  ) => {
    setAllDonations(prev => [newDonation, ...prev]);
    setDonors(prev => prev.map(d => d.id === updatedDonor.id ? updatedDonor : d));
    setReplacements(updatedReplacements);
    setInventory(prev => [...newInventoryItems, ...prev]);

    // Automatically register post-extraction incentive (CU09)
    const newIncentivo: IncentivoEntregaRecord = {
      idEntrega: `INC-${Date.now()}`,
      idDonacion: newDonation.idExtraccion,
      codigoExtraccion: newDonation.codigoExtraccion,
      donanteNombre: newDonation.donanteNombre || 'Donante Acreditado',
      donanteCi: newDonation.donanteCi || 'S/N',
      tipoDonante: newDonation.tipoDonante,
      tipoIncentivo: newDonation.tipoDonante === 'Voluntario Altruista'
        ? (newDonation.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo' ? 'Vaso Conmemorativo HemoVida' : 'Llavero Oficial HemoVida')
        : 'Refrigerio Clínico de Recuperación',
      refrigerioEntregado: true,
      flebotomiaConfirmadaPreviamente: true,
      fechaHora: new Date().toISOString(),
      responsableEntrega: staffAccount?.nombre || 'Lic. Patricia Arteaga'
    };

    setIncentivosEntrega(prev => [newIncentivo, ...prev]);
  };

  // CU08: Confirm physical attendance of postulant at desk
  const handleConfirmAttendance = (idCita: number) => {
    const app = appointments.find(a => a.idCita === idCita);
    if (!app) return;

    const turnoNum = `TURNO-MED-${String(Math.floor(10 + Math.random() * 90))}`;
    setAppointments(prev => prev.map(a => {
      if (a.idCita === idCita) {
        return {
          ...a,
          asistenciaConfirmada: true,
          horaLlegadaConfirmada: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          numeroTurnoTriaje: turnoNum,
          estadoCita: 'En Espera Triaje' as const
        };
      }
      return a;
    }));

    alert(`¡Asistencia Física Confirmada! Asignado ${turnoNum}. El postulante ha sido derivado a la fila del Médico de Triaje Clínico.`);
  };

  return (
    <div className="space-y-6">
      {/* Reception Operational Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-rose-950/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cuenta de Recepción & Admisión
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium">
                {staffAccount?.nombre || 'Lic. Patricia Arteaga'} • {staffAccount?.cargo || 'Encargada de Recepción y Admisión'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ventanilla Activa
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Admisión, Asistencia Física, Viabilidad & Incentivos
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Verificación del intervalo biológico por C.I. (90d varones / 120d mujeres), confirmación de asistencia en ventanilla para generar turnos médicos, entrega de incentivos exclusivamente post-flebotomía y gestión de reposición de pacientes internados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewDonorModalOpen(true)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Donante</span>
            </button>

            <button
              onClick={() => {
                setDonorForDonation(donors[0] || null);
                setIsDonationModalOpen(true);
              }}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-950/40"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>+ Registrar Flebotomía</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Stock Disponible en Frío:</span>
            <strong className="text-lg font-mono font-bold text-white">{availableBagsCount} unidades</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Donaciones Hoy:</span>
            <strong className="text-lg font-mono font-bold text-emerald-300">{todayDonationsCount} atendidas</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Pacientes en Reposición:</span>
            <strong className="text-lg font-mono font-bold text-amber-300">{pendingReplacementsCount} pendientes</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Incentivos Post-Extracción:</span>
            <strong className="text-lg font-mono font-bold text-rose-300">{voluntaryIncentivesCount} entregados</strong>
          </div>
        </div>
      </div>

      {/* Main Reception Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-1.5 flex items-center gap-1.5 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('viabilidad')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'viabilidad' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Viabilidad por C.I. & Admisión</span>
        </button>

        <button
          onClick={() => setActiveTab('asistencia')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'asistencia' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Asistencia Física & Turnos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'asistencia' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {appointments.filter(a => !a.asistenciaConfirmada).length} pendientes
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incentivos')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'incentivos' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Incentivos Post-Extracción</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'incentivos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {incentivosEntrega.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reposiciones')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reposiciones' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Historial de Reposición</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'reposiciones' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {replacements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('estadisticas')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'estadisticas' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Historial Día / Mes / Año</span>
        </button>

        <button
          onClick={() => setActiveTab('inventario')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'inventario' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Hemático en Frío</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'inventario' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {availableBagsCount}
          </span>
        </button>
      </div>

      {/* TAB 1: VIABILIDAD POR C.I. */}
      {activeTab === 'viabilidad' && (
        <DonorCheckAndViability
          donors={donors}
          onOpenNewDonorModal={() => setIsNewDonorModalOpen(true)}
          onProceedToDonate={handleProceedToDonateFromViability}
        />
      )}

      {/* TAB 2: CONFIRMACIÓN DE ASISTENCIA FÍSICA & TURNOS MÉDICOS (CU08) */}
      {activeTab === 'asistencia' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-600" />
                Confirmación de Asistencia Física en Ventanilla
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Al presentarse el postulante con su C.I. física, Ventanilla confirma su llegada y le genera un número oficial de turno médico hacia el área de Triaje Clínico.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {appointments.map((app) => {
              const donor = donors.find(d => d.id === app.idDonante);

              return (
                <div 
                  key={app.idCita}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    app.asistenciaConfirmada 
                      ? 'border-emerald-200 bg-emerald-50/30' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {app.codigoCita}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">
                        {donor ? `${donor.nombres} ${donor.apellidos}` : 'Donante Postulante'}
                      </h4>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {app.modalidad}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span><strong>C.I.:</strong> {donor?.ci}</span>
                      <span><strong>Centro:</strong> {app.centroNombre}</span>
                      <span><strong>Programado:</strong> {new Date(app.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {app.numeroTurnoTriaje && (
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                          {app.numeroTurnoTriaje}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.asistenciaConfirmada ? (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Asistencia Confirmada (Turno Generado)</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmAttendance(app.idCita)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Confirmar Asistencia Física & Emitir Turno</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ENTREGA DE INCENTIVOS Y REFRIGERIO POST-EXTRACCIÓN */}
      {activeTab === 'incentivos' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Gift className="w-5 h-5 text-rose-600" />
                Entrega de Incentivos y Refrigerio Post-Extracción
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Regla obligatoria: La entrega del incentivo oficial (vaso conmemorativo o llavero oficial) y refrigerio clínico ocurre <strong>estrictamente después de completada la flebotomía</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {incentivosEntrega.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No hay entregas registradas hoy.
              </div>
            ) : (
              incentivosEntrega.map((inc) => (
                <div key={inc.idEntrega} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-700">{inc.idEntrega}</span>
                      <strong className="text-slate-900 text-sm">{inc.donanteNombre}</strong>
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        {inc.tipoIncentivo}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      C.I.: {inc.donanteCi} • Extracción vinculada: <span className="font-mono text-slate-700">{inc.codigoExtraccion}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Entregado Post-Flebotomía
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(inc.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REPOSICIONES */}
      {activeTab === 'reposiciones' && (
        <PatientReplacementSection
          replacements={replacements}
          onDonateForPatient={handleDonateForPatient}
          onUpdateReplacement={(updated) => {
            setReplacements(prev => prev.map(r => r.id === updated.id ? updated : r));
          }}
        />
      )}

      {/* TAB 5: ESTADÍSTICAS */}
      {activeTab === 'estadisticas' && (
        <DonationStatsHistory
          donations={allDonations}
          onOpenDonationModal={() => {
            setDonorForDonation(donors[0] || null);
            setIsDonationModalOpen(true);
          }}
        />
      )}

      {/* TAB 6: INVENTARIO */}
      {activeTab === 'inventario' && (
        <BloodInventorySection
          inventory={inventory}
          onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
        />
      )}

      {/* Modals */}
      <NewDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        inventory={inventory}
        replacements={replacements}
        onConfirmDispatch={handleConfirmDispatch}
      />

      <NewDonorModal
        isOpen={isNewDonorModalOpen}
        onClose={() => setIsNewDonorModalOpen(false)}
        onDonorRegistered={handleDonorRegistered}
      />

      <ReceptionDonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        donors={donors}
        selectedDonor={donorForDonation}
        replacements={replacements}
        onConfirmDonation={handleConfirmDonation}
      />
    </div>
  );
};
