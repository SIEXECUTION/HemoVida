import React, { useState } from 'react';
import { 
  Heart, 
  X, 
  CheckCircle2, 
  Gift, 
  UserCheck, 
  Building2, 
  AlertCircle,
  Printer,
  Sparkles,
  Droplet
} from 'lucide-react';
import { 
  UserDonor, 
  DonationRecord, 
  PatientReplacementRecord, 
  BloodInventoryItem 
} from '../../types';

interface ReceptionDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  donors: UserDonor[];
  selectedDonor: UserDonor | null;
  replacements: PatientReplacementRecord[];
  onConfirmDonation: (
    newDonation: DonationRecord,
    updatedDonor: UserDonor,
    updatedReplacements: PatientReplacementRecord[],
    newInventoryItems: BloodInventoryItem[]
  ) => void;
}

export const ReceptionDonationModal: React.FC<ReceptionDonationModalProps> = ({
  isOpen,
  onClose,
  donors,
  selectedDonor,
  replacements,
  onConfirmDonation
}) => {
  const [donorId, setDonorId] = useState<number>(selectedDonor?.id || donors[0]?.id || 1);
  const currentDonor = donors.find(d => d.id === donorId) || donors[0];

  // Tipo de donación
  const [tipoDonante, setTipoDonante] = useState<'Voluntario Altruista' | 'Reposicion Familiar'>('Voluntario Altruista');

  // Incentivo exclusivo para donantes voluntarios: Vaso o Llavero
  const [incentivoVoluntario, setIncentivoVoluntario] = useState<'Vaso Conmemorativo' | 'Llavero Oficial'>('Vaso Conmemorativo');

  // Reposición dirigida: a qué persona va a hacer la reposición
  const pendingReplacements = replacements.filter(r => r.estado !== 'Completado');
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>(pendingReplacements[0]?.id || 'manual');
  const [pacienteManualNombre, setPacienteManualNombre] = useState('');
  const [pacienteManualCi, setPacienteManualCi] = useState('');
  const [pacienteManualHospital, setPacienteManualHospital] = useState('Hospital Japonés');

  // Clinical & extraction parameters
  const [modalidad, setModalidad] = useState<'Sangre Total' | 'Aferesis Plaquetaria'>('Sangre Total');
  const [brazo, setBrazo] = useState<'Izquierdo' | 'Derecho'>('Izquierdo');
  const [volumenMl, setVolumenMl] = useState<number>(450);
  const [personalSalud, setPersonalSalud] = useState('Lic. Silvia Guerrero (Bioquímica / Reg: 4421-SC)');
  const [centroNombre, setCentroNombre] = useState('Banco de Sangre Central (Calle Warnes)');

  // Completed record preview
  const [completedRecord, setCompletedRecord] = useState<DonationRecord | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentDonor) {
      alert('Debe seleccionar un donante válido.');
      return;
    }

    const todayIso = new Date().toISOString();
    const todayDateStr = todayIso.split('T')[0];
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const codigoExtraccion = `EXT-${new Date().getFullYear()}-${uniqueSuffix}`;
    const codigoBolsaMadre = `MAD-${todayDateStr.replace(/-/g, '')}-${uniqueSuffix}-${currentDonor.grupoSanguineo}${currentDonor.factorRh === 'Positivo' ? '+' : '-'}`;

    // Paciente de reposición
    let pacienteReceptorInfo: { nombre: string; ci: string; hospital: string } | undefined = undefined;
    let updatedReplacements = [...replacements];

    if (tipoDonante === 'Reposicion Familiar') {
      if (selectedReplacementId !== 'manual') {
        const foundIndex = updatedReplacements.findIndex(r => r.id === selectedReplacementId);
        if (foundIndex >= 0) {
          const rec = updatedReplacements[foundIndex];
          pacienteReceptorInfo = {
            nombre: rec.pacienteNombre,
            ci: rec.pacienteCi,
            hospital: rec.hospital
          };

          // Append this donor to the patient's replacement history
          const updatedDonantesRepuestos = [
            ...rec.donantesRepuestos,
            {
              idDonacion: Date.now(),
              donanteNombre: `${currentDonor.nombres} ${currentDonor.apellidos}`,
              donanteCi: currentDonor.ci,
              fechaDonacion: todayDateStr,
              codigoExtraccion,
              grupoSanguineo: `${currentDonor.grupoSanguineo}${currentDonor.factorRh === 'Positivo' ? '+' : '-'}`
            }
          ];

          const isFullyCompleted = updatedDonantesRepuestos.length >= rec.donantesRequeridos;

          updatedReplacements[foundIndex] = {
            ...rec,
            donantesRepuestos: updatedDonantesRepuestos,
            estado: isFullyCompleted ? 'Completado' : 'Parcial'
          };
        }
      } else {
        if (!pacienteManualNombre.trim()) {
          alert('Por favor indique el nombre del paciente receptor al que se hace la reposición.');
          return;
        }
        pacienteReceptorInfo = {
          nombre: pacienteManualNombre.trim(),
          ci: pacienteManualCi.trim() || 'S/N',
          hospital: pacienteManualHospital
        };

        // Create new patient replacement record if none existed
        const newRep: PatientReplacementRecord = {
          id: `rep-${Date.now()}`,
          pacienteNombre: pacienteManualNombre.trim(),
          pacienteCi: pacienteManualCi.trim() || 'S/N',
          hospital: pacienteManualHospital,
          fechaSolicitudInicial: todayDateStr,
          unidadesRecibidas: 1,
          donantesRequeridos: 1,
          donantesRepuestos: [
            {
              idDonacion: Date.now(),
              donanteNombre: `${currentDonor.nombres} ${currentDonor.apellidos}`,
              donanteCi: currentDonor.ci,
              fechaDonacion: todayDateStr,
              codigoExtraccion,
              grupoSanguineo: `${currentDonor.grupoSanguineo}${currentDonor.factorRh === 'Positivo' ? '+' : '-'}`
            }
          ],
          estado: 'Completado'
        };
        updatedReplacements = [newRep, ...updatedReplacements];
      }
    }

    // New donation record (CU12: whole blood mother bag in Quarantine + pilot tubes)
    const tubosPilotoCodigos = [
      `${codigoBolsaMadre}-TUB-EDTA (Inmunohematología)`,
      `${codigoBolsaMadre}-TUB-SECO (Inmunoserología 6 marcadores)`
    ];

    const donationRecord: DonationRecord = {
      idExtraccion: Date.now(),
      codigoExtraccion,
      codigoBolsaMadre,
      donanteId: currentDonor.id,
      donanteNombre: `${currentDonor.nombres} ${currentDonor.apellidos}`,
      donanteCi: currentDonor.ci,
      fechaHora: todayIso,
      centroId: 'center-1',
      centroNombre,
      modalidad,
      tipoDonante,
      pacienteReceptorReposicion: pacienteReceptorInfo,
      volumenExtraidoMl: volumenMl,
      brazo,
      personalSalud,
      grupoSanguineo: currentDonor.grupoSanguineo,
      factorRh: currentDonor.factorRh,
      tubosPilotoCodigos,
      serologia: {
        vih: 'No Reactivo',
        chagas: 'No Reactivo',
        hepatitisB: 'No Reactivo',
        hepatitisC: 'No Reactivo',
        sifilis: 'No Reactivo',
        htlv: 'No Reactivo',
        dictamenFinal: 'Apto'
      },
      incentivo: {
        articulo: tipoDonante === 'Voluntario Altruista'
          ? `${incentivoVoluntario} HemoVida + Refrigerio Nutricional Post-Extracción`
          : 'Refrigerio Clínico de Recuperación Transfusional',
        refrigerioEntregado: true,
        entregadoPostExtraccion: true,
        tipoIncentivoVoluntario: tipoDonante === 'Voluntario Altruista' ? incentivoVoluntario : 'Ninguno',
        fechaHoraEntrega: todayIso
      },
      estadoLiberacion: 'En Cuarentena', // Nace estrictamente en Cuarentena hasta pasar la Barrera de Liberación
      componentesDerivados: [
        {
          codigoK: `${codigoBolsaMadre}-K1-GR`,
          tipo: 'Concentrado de Globulos Rojos',
          volumenMl: 250,
          estado: 'En Cuarentena',
          ubicacionCamara: 'Cámara Fría A - Bandeja 1'
        },
        {
          codigoK: `${codigoBolsaMadre}-K2-PL`,
          tipo: 'Plasma Fresco Congelado',
          volumenMl: 150,
          estado: 'En Cuarentena',
          ubicacionCamara: 'Ultra-Freezer -30°C B-1'
        },
        {
          codigoK: `${codigoBolsaMadre}-K3-CP`,
          tipo: 'Concentrado Plaquetario',
          volumenMl: 60,
          estado: 'En Cuarentena',
          ubicacionCamara: 'Agitador Plaquetario Incubado 22°C'
        }
      ]
    };

    // Update donor stats
    const updatedDonor: UserDonor = {
      ...currentDonor,
      fechaUltimaDonacion: todayDateStr,
      totalDonaciones: currentDonor.totalDonaciones + 1,
      volumenHistoricoMl: currentDonor.volumenHistoricoMl + volumenMl
    };

    // Add derived blood bags into inventory in QUARANTINE (CU15)
    const expCgr = new Date();
    expCgr.setDate(expCgr.getDate() + 35);
    const expPfc = new Date();
    expPfc.setFullYear(expPfc.getFullYear() + 1);
    const expCp = new Date();
    expCp.setDate(expCp.getDate() + 5);

    const newInventoryBags: BloodInventoryItem[] = [
      {
        id: `inv-${Date.now()}-1`,
        codigoBolsa: `${codigoBolsaMadre}-K1-GR`,
        codigoBolsaMadre,
        codigoExtraccion,
        componente: 'Concentrado de Globulos Rojos',
        grupoSanguineo: currentDonor.grupoSanguineo,
        factorRh: currentDonor.factorRh,
        volumenMl: 250,
        fechaExtraccion: todayDateStr,
        fechaCaducidad: expCgr.toISOString().split('T')[0],
        diasRestantes: 35,
        estado: 'En Cuarentena',
        ubicacionCamara: 'Cámara Fría A - Bandeja 1',
        temperaturaCamara: '4.0 °C'
      },
      {
        id: `inv-${Date.now()}-2`,
        codigoBolsa: `${codigoBolsaMadre}-K2-PL`,
        codigoBolsaMadre,
        codigoExtraccion,
        componente: 'Plasma Fresco Congelado',
        grupoSanguineo: currentDonor.grupoSanguineo,
        factorRh: currentDonor.factorRh,
        volumenMl: 150,
        fechaExtraccion: todayDateStr,
        fechaCaducidad: expPfc.toISOString().split('T')[0],
        diasRestantes: 365,
        estado: 'En Cuarentena',
        ubicacionCamara: 'Ultra-Freezer -30°C B-1',
        temperaturaCamara: '-28.0 °C'
      },
      {
        id: `inv-${Date.now()}-3`,
        codigoBolsa: `${codigoBolsaMadre}-K3-CP`,
        codigoBolsaMadre,
        codigoExtraccion,
        componente: 'Concentrado Plaquetario',
        grupoSanguineo: currentDonor.grupoSanguineo,
        factorRh: currentDonor.factorRh,
        volumenMl: 60,
        fechaExtraccion: todayDateStr,
        fechaCaducidad: expCp.toISOString().split('T')[0],
        diasRestantes: 5,
        estado: 'En Cuarentena',
        ubicacionCamara: 'Agitador Plaquetario Incubado 22°C',
        temperaturaCamara: '22.0 °C'
      }
    ];

    onConfirmDonation(donationRecord, updatedDonor, updatedReplacements, newInventoryBags);
    setCompletedRecord(donationRecord);
  };

  const resetAndClose = () => {
    setCompletedRecord(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-800 via-rose-700 to-red-700 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <Droplet className="w-6 h-6 fill-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 bg-rose-950/40 px-2 py-0.5 rounded">
                Módulo de Recepción y Extracción
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif]">
                Registro de Nueva Donación de Sangre
              </h2>
              <p className="text-xs text-rose-100">
                Seleccione si es donación voluntaria (con entrega de vaso o llavero) o reposición a paciente hospitalizado.
              </p>
            </div>
          </div>
          <button 
            onClick={resetAndClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Certificate if completed, else Form */}
        {completedRecord ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">¡Donación Registrada Exitosamente en Recepción!</h4>
                <p className="text-xs text-emerald-700">
                  La extracción ha sido contabilizada, los componentes fueron derivados al inventario y se emitió el comprobante de entrega.
                </p>
              </div>
            </div>

            {/* Receipt Card */}
            <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-black text-base text-slate-900 font-['Outfit',sans-serif]">
                    COMPROBANTE DE EXTRACCIÓN Y DONACIÓN HEMÁTICA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Banco de Sangre Central HemoVida • Santa Cruz
                  </p>
                  <p className="text-xs font-mono font-bold text-rose-700 mt-1">
                    Código: {completedRecord.codigoExtraccion}
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-200 text-slate-800 px-2 py-1 rounded font-bold">
                  {new Date(completedRecord.fechaHora).toLocaleString('es-BO')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <p className="text-slate-500 font-semibold text-[11px]">Donante:</p>
                  <p className="text-slate-900 font-bold text-sm">{completedRecord.donanteNombre}</p>
                  <p><span className="text-slate-500">C.I.:</span> {completedRecord.donanteCi}</p>
                  <p><span className="text-slate-500">Grupo/Rh:</span> <strong className="text-rose-700">{completedRecord.grupoSanguineo}{completedRecord.factorRh === 'Positivo' ? '+' : '-'}</strong></p>
                  <p><span className="text-slate-500">Volumen:</span> {completedRecord.volumenExtraidoMl} ml ({completedRecord.modalidad})</p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <p className="text-slate-500 font-semibold text-[11px]">Modalidad & Destino:</p>
                  <p className="text-slate-900 font-bold text-sm">
                    {completedRecord.tipoDonante}
                  </p>
                  {completedRecord.tipoDonante === 'Voluntario Altruista' ? (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                      <span className="text-[10px] font-bold uppercase block">Incentivo Exclusivo Entregado:</span>
                      <strong className="text-xs flex items-center gap-1.5 mt-0.5">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        {completedRecord.incentivo.tipoIncentivoVoluntario} HemoVida
                      </strong>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200 text-blue-900">
                      <span className="text-[10px] font-bold uppercase block">Reposición para Paciente:</span>
                      <p className="text-xs font-bold">{completedRecord.pacienteReceptorReposicion?.nombre}</p>
                      <p className="text-[10px] text-blue-700">Hospital: {completedRecord.pacienteReceptorReposicion?.hospital}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer text-xs"
              >
                Finalizar y Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* Donation Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            
            {/* 1. Seleccionar Donante */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-slate-700 font-bold text-xs">
                1. Persona / Donante que va a donar *
              </label>
              <select
                value={donorId}
                onChange={(e) => setDonorId(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombres} {d.apellidos} • C.I.: {d.ci} • Grupo: {d.grupoSanguineo}{d.factorRh === 'Positivo' ? '+' : '-'} ({d.estadoHabilitacion})
                  </option>
                ))}
              </select>

              {currentDonor && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Última donación: <strong>{currentDonor.fechaUltimaDonacion || 'Ninguna (Primerizo)'}</strong></span>
                  <span className="font-mono font-bold text-rose-700">
                    Historial: {currentDonor.totalDonaciones} donaciones acumuladas
                  </span>
                </div>
              )}
            </div>

            {/* 2. Tipo de Donación: Voluntaria vs Reposición */}
            <div className="space-y-3">
              <label className="block text-slate-800 font-bold text-xs">
                2. Seleccione el Tipo de Donación *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Voluntario Altruista */}
                <div
                  onClick={() => setTipoDonante('Voluntario Altruista')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    tipoDonante === 'Voluntario Altruista'
                      ? 'border-rose-600 bg-rose-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Donación Voluntaria Altruista
                        </h4>
                        <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
                          Entrega de Incentivo Exclusivo
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="tipoDonante"
                      checked={tipoDonante === 'Voluntario Altruista'}
                      onChange={() => setTipoDonante('Voluntario Altruista')}
                      className="text-rose-600 focus:ring-rose-500 h-4 w-4 mt-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Donación desinteresada para la reserva general del banco. Recibe por normativa un <strong>Vaso</strong> o un <strong>Llavero oficial</strong> de recuerdo.
                  </p>
                </div>

                {/* Option B: Reposición Familiar */}
                <div
                  onClick={() => setTipoDonante('Reposicion Familiar')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    tipoDonante === 'Reposicion Familiar'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Reposición Familiar / Dirigida
                        </h4>
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                          A nombre de un paciente
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="tipoDonante"
                      checked={tipoDonante === 'Reposicion Familiar'}
                      onChange={() => setTipoDonante('Reposicion Familiar')}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4 mt-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Destinada a cubrir la cuota de sangre de un paciente específico internado en un centro de salud. Descuenta de su historial de reposición.
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-branch A: Incentivo exclusivo solo si es Voluntario Altruista */}
            {tipoDonante === 'Voluntario Altruista' ? (
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Gift className="w-4 h-4 text-amber-700" />
                  <span>Entrega de Incentivo Conmemorativo (Solo Donantes Voluntarios):</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Por disposición del Programa de Sangre Segura, todo donante voluntario altruista puede llevarse un <strong>Vaso oficial</strong> o un <strong>Llavero oficial</strong> como reconocimiento cívico.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setIncentivoVoluntario('Vaso Conmemorativo')}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      incentivoVoluntario === 'Vaso Conmemorativo'
                        ? 'bg-white border-amber-600 shadow-xs'
                        : 'bg-white/60 border-amber-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="incentivo"
                      checked={incentivoVoluntario === 'Vaso Conmemorativo'}
                      onChange={() => setIncentivoVoluntario('Vaso Conmemorativo')}
                      className="text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        🥛 Vaso Conmemorativo HemoVida
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Vaso térmico serigrafiado "Donante Héroe de la Vida"
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setIncentivoVoluntario('Llavero Oficial')}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      incentivoVoluntario === 'Llavero Oficial'
                        ? 'bg-white border-amber-600 shadow-xs'
                        : 'bg-white/60 border-amber-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="incentivo"
                      checked={incentivoVoluntario === 'Llavero Oficial'}
                      onChange={() => setIncentivoVoluntario('Llavero Oficial')}
                      className="text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        🔑 Llavero Oficial Gota HemoVida
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Llavero acrílico con emblema de gota y tipo sanguíneo
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              /* Sub-branch B: ¿A qué persona va a hacer la reposición? */
              <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>¿A qué persona / paciente va a hacer la reposición? *</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold text-xs">
                    Seleccionar Paciente con Reposición Pendiente en el Banco:
                  </label>
                  <select
                    value={selectedReplacementId}
                    onChange={(e) => setSelectedReplacementId(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pendingReplacements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.pacienteNombre} • CI: {r.pacienteCi} • {r.hospital} (Pendiente: {r.donantesRequeridos - r.donantesRepuestos.length} donante/s)
                      </option>
                    ))}
                    <option value="manual">+ Ingresar paciente no listado / manual...</option>
                  </select>
                </div>

                {selectedReplacementId === 'manual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Nombre del Paciente Receptor *
                      </label>
                      <input
                        type="text"
                        required
                        value={pacienteManualNombre}
                        onChange={(e) => setPacienteManualNombre(e.target.value)}
                        placeholder="Ej. Juan Carlos Roca"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        C.I. del Paciente
                      </label>
                      <input
                        type="text"
                        value={pacienteManualCi}
                        onChange={(e) => setPacienteManualCi(e.target.value)}
                        placeholder="Ej. 4521992 SC"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Centro Hospitalario
                      </label>
                      <input
                        type="text"
                        value={pacienteManualHospital}
                        onChange={(e) => setPacienteManualHospital(e.target.value)}
                        placeholder="Hospital Japonés"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong>Aviso Normativo:</strong> Los incentivos de Vaso o Llavero conmemorativo corresponden únicamente a donaciones 100% voluntarias. Esta donación acreditará 1 unidad de reposición al paciente seleccionado y el donante recibirá su refrigerio de recuperación y certificación.
                </div>
              </div>
            )}

            {/* 3. Parámetros Técnicos de la Extracción */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Modalidad de Extracción
                </label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Sangre Total">Sangre Total (450 ml)</option>
                  <option value="Aferesis Plaquetaria">Aféresis Plaquetaria (300 ml)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Brazo de Punción
                </label>
                <select
                  value={brazo}
                  onChange={(e) => setBrazo(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Izquierdo">Brazo Izquierdo</option>
                  <option value="Derecho">Brazo Derecho</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Personal de Salud Responsable
                </label>
                <input
                  type="text"
                  value={personalSalud}
                  onChange={(e) => setPersonalSalud(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer text-xs flex items-center gap-2 shadow-md"
              >
                <Droplet className="w-4 h-4 fill-white" />
                Confirmar y Registrar Extracción
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
