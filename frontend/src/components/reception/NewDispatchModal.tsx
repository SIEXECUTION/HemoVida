import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  X, 
  DollarSign, 
  Layers, 
  AlertCircle, 
  Truck, 
  Printer, 
  AlertTriangle, 
  Thermometer, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Flame,
  FileCheck
} from 'lucide-react';
import { 
  BloodInventoryItem, 
  BloodDispatchRecord, 
  PatientReplacementRecord, 
  BloodGroup, 
  RhFactor,
  CompatibilityTestRecord,
  EmergencyActRecord
} from '../../types';

interface NewDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: BloodInventoryItem[];
  replacements: PatientReplacementRecord[];
  onConfirmDispatch: (
    dispatchData: BloodDispatchRecord,
    updatedInventory: BloodInventoryItem[],
    updatedReplacements: PatientReplacementRecord[],
    emergencyAct?: EmergencyActRecord,
    compatibilityTest?: CompatibilityTestRecord
  ) => void;
}

const COMMON_HOSPITALS = [
  'Hospital Japonés (Sede Tercer Nivel)',
  'Hospital San Juan de Dios',
  'Hospital de Niños Mario Ortiz',
  'Hospital de la Mujer Percy Boland',
  'Hospital Francés (Segundo Nivel)',
  'Clínica Foianini',
  'Clínica Incor',
  'Hospital Municipal Villa 1° de Mayo',
  'Hospital Municipal Los Pocitos (Plan 3000)'
];

const COMPONENT_PRICES: Record<string, number> = {
  'Concentrado de Globulos Rojos': 180,
  'Plasma Fresco Congelado': 150,
  'Concentrado Plaquetario': 200,
  'Crioprecipitado': 160,
  'Sangre Total': 220
};

export const NewDispatchModal: React.FC<NewDispatchModalProps> = ({
  isOpen,
  onClose,
  inventory,
  replacements,
  onConfirmDispatch
}) => {
  // Priority: Ordinaria, Urgente, or Código Rojo (CU17)
  const [prioridad, setPrioridad] = useState<'Ordinaria' | 'Urgente' | 'Código Rojo'>('Ordinaria');

  // Available items in inventory (only 'Disponible')
  const availableItems = inventory.filter(i => i.estado === 'Disponible');

  // Form states
  const [hospitalDestino, setHospitalDestino] = useState(COMMON_HOSPITALS[0]);
  const [otroHospital, setOtroHospital] = useState('');
  const [codigoSolicitudHospital, setCodigoSolicitudHospital] = useState(
    `SOL-HOSP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [medicoSolicitante, setMedicoSolicitante] = useState('Dr. Alejandro Justiniano');
  const [matriculaMedica, setMatriculaMedica] = useState('MED-COL-4419');

  // Paciente Receptor
  const [pacienteNombre, setPacienteNombre] = useState('');
  const [pacienteCi, setPacienteCi] = useState('');
  const [pacienteSalaCama, setPacienteSalaCama] = useState('Emergencias / Cama 4');
  const [pacienteDiagnostico, setPacienteDiagnostico] = useState('Shock hipovolémico / Requerimiento transfusional');
  const [pacienteGrupo, setPacienteGrupo] = useState<BloodGroup>('O');
  const [pacienteRh, setPacienteRh] = useState<RhFactor>('Positivo');
  const [pacienteIncapacitado, setPacienteIncapacitado] = useState(false);

  // Persona que retira la sangre (Solicitante autorizado o Tutor)
  const [retiraNombre, setRetiraNombre] = useState('');
  const [retiraCi, setRetiraCi] = useState('');
  const [retiraTelefono, setRetiraTelefono] = useState('+591 760-12345');
  const [retiraParentesco, setRetiraParentesco] = useState('Familiar (Hijo/a, Cónyuge o Hermano)');
  const [firmoActaCompromisoTutor, setFirmoActaCompromisoTutor] = useState(true);

  // Selected inventory bags to dispatch
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);

  // Código Rojo: Acta de extrema urgencia (CU17)
  const [actaOmisionJustificada, setActaOmisionJustificada] = useState(true);
  const [actaFirmaConfirmada, setActaFirmaConfirmada] = useState(true);

  // CU18: Crossmatching / Pruebas Cruzadas In Vitro simulator
  const [crossmatchResults, setCrossmatchResults] = useState<Record<string, 'Compatible' | 'Incompatible'>>({});
  const [crossmatchAudits, setCrossmatchAudits] = useState<CompatibilityTestRecord[]>([]);

  // Cobro del servicio (CU19: Cobro de aranceles de procesamiento - NUNCA venta de sangre)
  const [estadoPago, setEstadoPago] = useState<'Pagado' | 'Exonerado SUS' | 'Convenio Institucional' | 'Pendiente'>('Pagado');
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'QR / Transferencia' | 'Tarjeta de Débito' | 'SUS / Gratuito Ley 475'>('QR / Transferencia');
  const [numeroRecibo, setNumeroRecibo] = useState(`ARANCEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Cadena de frío (CU19)
  const [tempSalida, setTempSalida] = useState<number>(3.8);
  const [tempLlegada, setTempLlegada] = useState<number>(4.2);

  // Observations
  const [observaciones, setObservaciones] = useState('Cadena de frío verificada en conservadora térmica certificada. Rango 2°C - 6°C con data logger.');

  // Completed record preview
  const [completedDispatch, setCompletedDispatch] = useState<BloodDispatchRecord | null>(null);

  if (!isOpen) return null;

  // If Código Rojo is selected: filter for universal donor O-
  const isCodigoRojo = prioridad === 'Código Rojo';
  const displayItems = isCodigoRojo 
    ? availableItems.filter(i => i.grupoSanguineo === 'O' && i.factorRh === 'Negativo' && i.componente === 'Concentrado de Globulos Rojos')
    : availableItems;

  const toggleSelectBag = (id: string) => {
    setSelectedBagIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedUnits = availableItems.filter(item => selectedBagIds.includes(item.id));

  // Handle in vitro crossmatching test for a unit (CU18)
  const handleTestCompatibility = (bagId: string, simulateIncompatible: boolean) => {
    const bag = availableItems.find(i => i.id === bagId);
    if (!bag) return;

    if (simulateIncompatible) {
      // RULE: UNIT IS NOT DESTROYED OR DISCARDED!
      // It remains unlocked in 'Disponible' for other patients.
      const testRecord: CompatibilityTestRecord = {
        idPrueba: `CRX-${Date.now()}`,
        codigoSolicitud: codigoSolicitudHospital,
        pacienteNombre: pacienteNombre || 'Paciente Receptor',
        pacienteCi: pacienteCi || 'S/N',
        pacienteGrupoRh: `${pacienteGrupo}${pacienteRh === 'Positivo' ? '+' : '-'}`,
        codigoBolsa: bag.codigoBolsa,
        componente: bag.componente,
        bolsaGrupoRh: `${bag.grupoSanguineo}${bag.factorRh === 'Positivo' ? '+' : '-'}`,
        resultado: 'Incompatible',
        pruebaMayor: 'Aglutinación detectada (Positivo)',
        pruebaMenor: 'Sin aglutinación (Negativo)',
        autotestigo: 'Negativo',
        coombsCruzado: 'Positivo',
        observaciones: 'Incompatibilidad detectada in vitro por anticuerpo irregular. REGLA BIOLÓGICA: La unidad NO fue descartada; permanece disponible para otro paciente compatible.',
        fechaHora: new Date().toISOString(),
        bioquimico: 'Lic. Bioq. Carlos Mendoza',
        retroactivaCodigoRojo: false
      };

      setCrossmatchAudits(prev => [testRecord, ...prev]);
      setCrossmatchResults(prev => ({ ...prev, [bagId]: 'Incompatible' }));

      // Unselect bag automatically to prevent dangerous dispatch
      setSelectedBagIds(prev => prev.filter(id => id !== bagId));

      alert(`⚠️ RESULTADO ADVERSO AUDITADO:\nLa unidad ${bag.codigoBolsa} resultó INCOMPATIBLE in vitro con el suero del paciente.\n\n🛡️ REGLA BIOLÓGICA CUMPLIDA:\nLa bolsa NO se descarta. Ha sido liberada de vuelta a stock Disponible para otro paciente compatible. Por favor elija otra unidad idéntica.`);
    } else {
      setCrossmatchResults(prev => ({ ...prev, [bagId]: 'Compatible' }));
    }
  };

  // Compute total service fee
  const calculatedTotalBs = estadoPago === 'Exonerado SUS' 
    ? 0 
    : selectedUnits.reduce((acc, item) => acc + (COMPONENT_PRICES[item.componente] || 180), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigoSolicitudHospital.trim()) {
      alert('Debe ingresar el código de solicitud médica hospitalaria.');
      return;
    }
    if (!pacienteNombre.trim() || !pacienteCi.trim()) {
      alert('Debe completar los datos del paciente receptor (Nombre y C.I.).');
      return;
    }
    if (!retiraNombre.trim() || !retiraCi.trim()) {
      alert('Debe completar los datos de la persona autorizada o tutor que retira.');
      return;
    }
    if (selectedBagIds.length === 0) {
      alert('Debe seleccionar al menos una unidad de hemocomponente para despachar.');
      return;
    }

    // Código Rojo validation
    let emergencyAct: EmergencyActRecord | undefined = undefined;
    if (isCodigoRojo) {
      if (!actaFirmaConfirmada || !actaOmisionJustificada) {
        alert('En Código Rojo se requiere confirmar el Acta de Responsabilidad Médica de Extrema Urgencia.');
        return;
      }

      emergencyAct = {
        idActa: `ACT-URG-${Date.now()}`,
        codigoSolicitud: codigoSolicitudHospital,
        fechaHora: new Date().toISOString(),
        medicoSolicitante,
        matriculaMedica,
        hospital: hospitalDestino === 'Otro' ? otroHospital : hospitalDestino,
        pacienteNombre,
        pacienteCi,
        diagnosticoShock: pacienteDiagnostico,
        unidadesUniversalORhNegativo: selectedUnits.map(u => `${u.codigoBolsa} (${u.componente} O-)`),
        omisionPruebasCruzadasPreviasJustificada: true,
        firmaDigitalConfirmada: true,
        responsableBancoSangre: 'Lic. Bioq. Carlos Mendoza'
      };
    }

    const finalHospital = hospitalDestino === 'Otro' ? otroHospital : hospitalDestino;

    const dispatchRecord: BloodDispatchRecord = {
      idDespacho: `DSP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fechaHora: new Date().toISOString(),
      codigoSolicitudHospital,
      hospitalDestino: finalHospital || 'Hospital General',
      medicoSolicitante,
      prioridad,
      pacienteReceptor: {
        nombres: pacienteNombre,
        ci: pacienteCi,
        salaCama: pacienteSalaCama || 'Emergencias / UCI',
        diagnostico: pacienteDiagnostico,
        grupoSanguineo: pacienteGrupo,
        factorRh: pacienteRh
      },
      personaQueRetira: {
        nombres: retiraNombre,
        ci: retiraCi,
        telefono: retiraTelefono || '+591 760-00000',
        parentescoOInstitucion: retiraParentesco
      },
      unidadesDespachadas: selectedUnits.map(unit => ({
        codigoBolsa: unit.codigoBolsa,
        componente: unit.componente,
        grupoSanguineo: unit.grupoSanguineo,
        factorRh: unit.factorRh,
        volumenMl: unit.volumenMl,
        precioUnitarioBs: COMPONENT_PRICES[unit.componente] || 180
      })),
      cobroServicio: {
        concepto: 'Cobro de aranceles por concepto de procesamiento y servicios analíticos de laboratorio',
        montoTotalBs: calculatedTotalBs,
        estadoPago,
        metodoPago,
        numeroReciboFactura: numeroRecibo
      },
      cadenaFrio: {
        temperaturaSalida: tempSalida,
        temperaturaLlegadaEstimada: tempLlegada,
        conservadoraTipo: 'Conservadora Térmica Certificada con Sellos de Bioseguridad',
        precintoSeguridad: `PREC-${Math.floor(10000 + Math.random() * 90000)}`
      },
      actaUrgenciaId: emergencyAct?.idActa,
      responsableDespacho: 'Lic. Bioq. Carlos Mendoza (Despacho Transfusional)',
      observaciones: `${observaciones} ${isCodigoRojo ? '[DESPACHO INMEDIATO CÓDIGO ROJO O Rh-]' : ''}`
    };

    // Update inventory: selected items set to 'Despachada'
    const updatedInventory = inventory.map(item => {
      if (selectedBagIds.includes(item.id)) {
        return { ...item, estado: 'Despachada' as const };
      }
      return item;
    });

    // Update patient replacement record (CU20: strict 1 to 1 equivalence)
    const existingReplacementIndex = replacements.findIndex(
      r => r.pacienteCi.trim().toLowerCase() === pacienteCi.trim().toLowerCase()
    );

    let updatedReplacements = [...replacements];
    const unitsCount = selectedUnits.length;

    const tutorObj = pacienteIncapacitado ? {
      nombres: retiraNombre,
      ci: retiraCi,
      parentesco: retiraParentesco,
      telefono: retiraTelefono,
      asistioActa: firmoActaCompromisoTutor
    } : undefined;

    if (existingReplacementIndex >= 0) {
      const existing = updatedReplacements[existingReplacementIndex];
      const newTotalReceived = existing.unidadesRecibidas + unitsCount;
      const newTotalRequired = existing.donantesRequeridos + unitsCount; // 1 to 1 equivalence
      const repuestos = existing.donantesRepuestos.length;
      const newStatus = repuestos >= newTotalRequired ? 'Completado' : repuestos > 0 ? 'Parcial' : 'Pendiente';

      updatedReplacements[existingReplacementIndex] = {
        ...existing,
        unidadesRecibidas: newTotalReceived,
        donantesRequeridos: newTotalRequired,
        tutorResponsable: tutorObj || existing.tutorResponsable,
        estado: newStatus
      };
    } else {
      const newReplacement: PatientReplacementRecord = {
        id: `rep-${Date.now()}`,
        pacienteNombre,
        pacienteCi,
        hospital: finalHospital || 'Hospital General',
        fechaSolicitudInicial: new Date().toISOString().split('T')[0],
        unidadesRecibidas: unitsCount,
        donantesRequeridos: unitsCount, // strict 1 to 1 (CU20)
        grupoReceptor: `${pacienteGrupo}${pacienteRh === 'Positivo' ? '+' : '-'}`,
        donantesRepuestos: [],
        estado: 'Pendiente',
        tutorResponsable: tutorObj,
        observacionEtica: 'Compromiso ético-administrativo de reposición que NUNCA condiciona la transfusión de emergencia.'
      };
      updatedReplacements = [newReplacement, ...updatedReplacements];
    }

    onConfirmDispatch(
      dispatchRecord, 
      updatedInventory, 
      updatedReplacements, 
      emergencyAct,
      crossmatchAudits[0]
    );

    setCompletedDispatch(dispatchRecord);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden transform transition-all my-6">
        
        {/* Header */}
        <div className={`p-5 sm:p-6 text-white relative ${
          isCodigoRojo 
            ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 animate-pulse' 
            : 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center shadow-xs">
                <Truck className="w-6 h-6 text-red-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black font-['Outfit',sans-serif] tracking-tight">
                    Nuevo Despacho Transfusional Oficial
                  </h3>
                  {isCodigoRojo && (
                    <span className="bg-red-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                      🚨 CÓDIGO ROJO ACTIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-200/90 font-medium mt-0.5">
                  Gestión integral de despachos programados, emergencias Código Rojo, pruebas cruzadas y reposición institucional.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Priority Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-white/10 backdrop-blur rounded-2xl border border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrioridad('Ordinaria')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                prioridad === 'Ordinaria' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>Ordinaria (Programada 48-72h)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrioridad('Urgente')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                prioridad === 'Urgente' ? 'bg-amber-500 text-white shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>Urgencia Clínica (&lt;2h)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrioridad('Código Rojo')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                prioridad === 'Código Rojo' ? 'bg-red-600 text-white shadow-md ring-2 ring-white/50' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span>Código Rojo (Despacho Inmediato O-)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!completedDispatch ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* WARNING BANNER FOR CÓDIGO ROJO */}
              {isCodigoRojo && (
                <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl space-y-2 text-xs text-red-950">
                  <div className="flex items-center gap-2 font-black text-sm text-red-900 uppercase tracking-wide">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>Protocolo de Extrema Urgencia Vital: Código Rojo Transfusional</span>
                  </div>
                  <p className="leading-relaxed">
                    Se autoriza la <strong>omisión de la espera de pruebas cruzadas previas</strong> y se despachan de inmediato unidades de donante universal <strong>O Rh- Negativo (CGR)</strong> para salvar la vida del paciente en shock hemorrágico, bajo suscripción obligatoria del Acta de Responsabilidad Médica.
                  </p>
                </div>
              )}

              {/* SECTION 1: DATOS DE LA SOLICITUD Y HOSPITAL */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4" />
                  1. Solicitud Hospitalaria & Médico Solicitante
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Centro de Salud / Hospital Destino *
                    </label>
                    <select
                      value={hospitalDestino}
                      onChange={(e) => setHospitalDestino(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                    >
                      {COMMON_HOSPITALS.map((hosp) => (
                        <option key={hosp} value={hosp}>{hosp}</option>
                      ))}
                      <option value="Otro">Otro Centro de Salud...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Código / Orden Médica Oficial *
                    </label>
                    <input
                      type="text"
                      required
                      value={codigoSolicitudHospital}
                      onChange={(e) => setCodigoSolicitudHospital(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Médico Solicitante & Matrícula *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Dr. Nombre"
                        value={medicoSolicitante}
                        onChange={(e) => setMedicoSolicitante(e.target.value)}
                        className="w-2/3 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Matrícula"
                        value={matriculaMedica}
                        onChange={(e) => setMatriculaMedica(e.target.value)}
                        className="w-1/3 px-2 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DATOS DEL PACIENTE RECEPTOR & TUTOR RESPONSABLE */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <UserCheck className="w-4 h-4" />
                  2. Datos del Paciente Receptor & Tutor Responsable
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Nombre Completo del Paciente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Roberto Vaca Morales"
                      value={pacienteNombre}
                      onChange={(e) => setPacienteNombre(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Cédula de Identidad (C.I.) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 3819200 SC"
                      value={pacienteCi}
                      onChange={(e) => setPacienteCi(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Grupo Sanguíneo Receptor
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={pacienteGrupo}
                        onChange={(e) => setPacienteGrupo(e.target.value as BloodGroup)}
                        className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="O">O</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                      </select>
                      <select
                        value={pacienteRh}
                        onChange={(e) => setPacienteRh(e.target.value as RhFactor)}
                        className="w-1/2 px-1 py-2 text-xs border border-slate-300 rounded-xl font-bold"
                      >
                        <option value="Positivo">Rh+</option>
                        <option value="Negativo">Rh-</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tutor Responsable Toggle if patient is incapacitated */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={pacienteIncapacitado}
                        onChange={(e) => setPacienteIncapacitado(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      />
                      <span>¿El paciente está incapacitado, en coma o en quirófano de emergencia? (Firma Tutor Responsable)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        {pacienteIncapacitado ? 'Nombre del Tutor / Familiar Responsable *' : 'Persona que Retira la Sangre *'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Carmen Morales (Cónyuge)"
                        value={retiraNombre}
                        onChange={(e) => setRetiraNombre(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        C.I. del Tutor / Solicitante *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 4819002 SC"
                        value={retiraCi}
                        onChange={(e) => setRetiraCi(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Parentesco o Cargo
                      </label>
                      <input
                        type="text"
                        placeholder="Cónyuge / Hijo / Enfermero"
                        value={retiraParentesco}
                        onChange={(e) => setRetiraParentesco(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SELECCIÓN DE UNIDADES & PRUEBAS CRUZADAS IN VITRO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    3. Unidades en Stock & Pruebas Cruzadas de Compatibilidad in vitro
                  </h4>
                  <span className="text-[11px] font-bold text-slate-600">
                    {selectedBagIds.length} seleccionada(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {displayItems.length === 0 ? (
                    <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      {isCodigoRojo 
                        ? 'No hay unidades de Glóbulos Rojos O- Negativo disponibles en inventario.' 
                        : 'No hay unidades disponibles en inventario.'}
                    </div>
                  ) : (
                    displayItems.map((bag) => {
                      const isSelected = selectedBagIds.includes(bag.id);
                      const crossResult = crossmatchResults[bag.id];

                      return (
                        <div
                          key={bag.id}
                          className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                            isSelected 
                              ? 'border-red-600 bg-red-50/50 shadow-xs' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900">{bag.codigoBolsa}</span>
                            <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[11px]">
                              {bag.grupoSanguineo}{bag.factorRh === 'Positivo' ? '+' : '-'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            <p className="font-semibold text-slate-800">{bag.componente}</p>
                            <p>{bag.volumenMl} ml • {bag.ubicacionCamara}</p>
                          </div>

                          {/* Interactive Crossmatching Controls */}
                          {!isCodigoRojo && (
                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                              <span className="text-[10px] text-slate-500 block font-semibold">
                                Prueba Cruzada: {crossResult ? (
                                  <strong className={crossResult === 'Compatible' ? 'text-emerald-700' : 'text-rose-700'}>
                                    {crossResult}
                                  </strong>
                                ) : 'Pendiente'}
                              </span>
                              <div className="flex gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => handleTestCompatibility(bag.id, false)}
                                  className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded cursor-pointer"
                                >
                                  Probar Compatible
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTestCompatibility(bag.id, true)}
                                  className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded cursor-pointer"
                                  title="Prueba regla biológica: la bolsa no se descarta, se audita y se desbloquea para otro receptor"
                                >
                                  Simular Incompatible
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleSelectBag(bag.id)}
                            className={`w-full py-1.5 font-bold rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-red-700 text-white' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Seleccionada para Despacho' : '+ Seleccionar Bolsa'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION 4: ACTA DE EXTREMA URGENCIA SI ES CÓDIGO ROJO (CU17) */}
              {isCodigoRojo && (
                <div className="p-4 bg-red-950 text-white rounded-2xl space-y-3 text-xs border border-red-800">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-200">
                    <FileCheck className="w-5 h-5 text-red-400" />
                    <span>Acta de Responsabilidad Médica de Extrema Urgencia Transfusional</span>
                  </div>
                  <p className="text-[11px] text-red-200/90 leading-relaxed">
                    Al suscribir digitalmente este documento, el médico solicitante ({medicoSolicitante}, Mat: {matriculaMedica}) asume la responsabilidad clínica de transfundir componentes O Rh- sin esperar el informe serológico ni inmunohematológico previo de pruebas cruzadas, debido a riesgo inminente de muerte.
                  </p>
                  <div className="space-y-1.5 pt-1 text-white font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={actaOmisionJustificada}
                        onChange={(e) => setActaOmisionJustificada(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Certifico la extrema urgencia que justifica la omisión de pruebas previas conforme a ley.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={actaFirmaConfirmada}
                        onChange={(e) => setActaFirmaConfirmada(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Firma digital y matrícula médica verificada para salida inmediata de ambulancia.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* SECTION 5: FACTURACIÓN DE ARANCELES & CADENA DE FRÍO */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <DollarSign className="w-4 h-4" />
                  4. Aranceles de Procesamiento y Cadena de Frío (Nunca Venta de Sangre)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Régimen de Cobro / Arancel *
                    </label>
                    <select
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      <option value="Pagado">Liquidado / Pagado</option>
                      <option value="Exonerado SUS">Exonerado Gratuito SUS Ley 475</option>
                      <option value="Convenio Institucional">Convenio Seguro Social</option>
                      <option value="Pendiente">Pendiente de Liquidación</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Medio de Pago
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="QR / Transferencia">QR / Transferencia</option>
                      <option value="Efectivo">Efectivo en Ventanilla</option>
                      <option value="Tarjeta de Débito">Tarjeta Débito / Crédito</option>
                      <option value="SUS / Gratuito Ley 475">SUS / Gratuito Ley 475</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Temp. Salida Conservadora (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempSalida}
                      onChange={(e) => setTempSalida(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-center font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Total Arancel (Bs.):
                    </label>
                    <div className="w-full px-3 py-2 text-base font-black text-slate-900 bg-slate-100 rounded-xl border border-slate-300 font-mono text-center">
                      {calculatedTotalBs} Bs.
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  * Concepto legal obligatorio: "Cobro de aranceles por concepto de procesamiento y servicios analíticos de laboratorio". La venta de sangre está prohibida.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-4 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  isCodigoRojo 
                    ? 'bg-red-700 hover:bg-red-800 shadow-red-900/40 animate-pulse' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                }`}
              >
                <Truck className="w-5 h-5" />
                <span>
                  {isCodigoRojo 
                    ? 'AUTORIZAR DESPACHO INMEDIATO CÓDIGO ROJO (O Rh-)' 
                    : 'Autorizar y Despachar Hemocomponentes'}
                </span>
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </form>
          ) : (
            /* COMPLETED DISPATCH COMPROBANTE */
            <div className="space-y-5 text-xs">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                  ¡Despacho Transfusional Autorizado con Éxito!
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Comprobante Oficial: {completedDispatch.idDespacho}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Hospital Destino:</span>
                    <strong className="text-slate-900">{completedDispatch.hospitalDestino}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Paciente Receptor:</span>
                    <strong className="text-slate-900">{completedDispatch.pacienteReceptor.nombres}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Unidades Despachadas:</span>
                    <strong className="text-red-700 font-bold">{completedDispatch.unidadesDespachadas.length} bolsas</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cadena de Frío:</span>
                    <strong className="text-blue-700 font-mono">
                      {completedDispatch.cadenaFrio ? `${completedDispatch.cadenaFrio.temperaturaSalida}°C salida` : '4°C verificada'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  <p><strong>Concepto:</strong> {completedDispatch.cobroServicio.concepto}</p>
                  <p><strong>Régimen:</strong> {completedDispatch.cobroServicio.estadoPago} ({completedDispatch.cobroServicio.montoTotalBs} Bs.)</p>
                  <p><strong>Deuda Biológica:</strong> Aperturada en el padrón de reposición con equivalencia 1 a 1 ({completedDispatch.unidadesDespachadas.length} donante(s) requeridos).</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Acta de Despacho & Cadena de Frío</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedDispatch(null);
                    onClose();
                  }}
                  className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
