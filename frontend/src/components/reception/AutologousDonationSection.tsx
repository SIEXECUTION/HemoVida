import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Heart,
  AlertTriangle,
  FileText,
  Printer,
  Search,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  X,
  Plus,
  Hospital,
  Stethoscope,
  Trash2,
  Droplet,
  Layers,
  Thermometer,
  QrCode,
  Building2,
  Phone,
  Mail,
  Info
} from 'lucide-react';
import {
  AutologousProgramRecord,
  BloodInventoryItem,
  BloodGroup,
  RhFactor,
  UserDonor
} from '../../types';

interface AutologousDonationSectionProps {
  programs: AutologousProgramRecord[];
  setPrograms: React.Dispatch<React.SetStateAction<AutologousProgramRecord[]>>;
  inventory: BloodInventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<BloodInventoryItem[]>>;
  donors?: UserDonor[];
}

export const AutologousDonationSection: React.FC<AutologousDonationSectionProps> = ({
  programs,
  setPrograms,
  inventory,
  setInventory,
  donors = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProgramForCert, setSelectedProgramForCert] = useState<AutologousProgramRecord | null>(null);
  const [selectedProgramForDetails, setSelectedProgramForDetails] = useState<AutologousProgramRecord | null>(null);

  // New program form state
  const [newNombre, setNewNombre] = useState('');
  const [newCi, setNewCi] = useState('');
  const [newTelefono, setNewTelefono] = useState('+591 ');
  const [newEmail, setNewEmail] = useState('');
  const [newGrupo, setNewGrupo] = useState<BloodGroup>('O');
  const [newRh, setNewRh] = useState<RhFactor>('Positivo');
  const [newCirugia, setNewCirugia] = useState('');
  const [newFechaCirugia, setNewFechaCirugia] = useState('2026-11-20');
  const [newCentroSalud, setNewCentroSalud] = useState('Hospital Universitario Japonés (Pabellón A)');
  const [newMedico, setNewMedico] = useState('Dr. Roberto Salinas (MP-7712)');
  const [newOrden, setNewOrden] = useState(`ORD-QX-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newHb, setNewHb] = useState<number>(13.5);
  const [newVolumen, setNewVolumen] = useState<number>(450);
  const [newFechaExtraccion, setNewFechaExtraccion] = useState('2026-10-25');
  const [newAceptaCondiciones, setNewAceptaCondiciones] = useState(true);

  // Filtered autologous blood bags in cold storage
  const autologousBags = inventory.filter(b => b.esExclusivoAutologo || b.codigoBolsa.includes('AUT'));

  // Filtering programs
  const filteredPrograms = programs.filter(prog => {
    const matchesSearch =
      prog.nombrePaciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.ciPaciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.diagnosticoCirugia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prog.ordenMedicaNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prog.email && prog.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'custodia' ? prog.estadoPrograma === 'En Custodia Fria' :
      statusFilter === 'programada' ? prog.estadoPrograma === 'Extraccion Programada' :
      statusFilter === 'baja' ? prog.estadoPrograma === 'Baja Sanitaria' : true;

    return matchesSearch && matchesStatus;
  });

  // Calculate days remaining to surgery
  const getDaysUntilSurgery = (dateStr: string) => {
    const surgeryDate = new Date(dateStr);
    const today = new Date('2026-10-14'); // System date
    const diffTime = surgeryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handler: Register New Autologous Program (CU21)
  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newCi || !newCirugia || !newFechaCirugia) {
      alert('Por favor complete todos los datos obligatorios del paciente y la cirugía.');
      return;
    }

    if (newHb < 11.0) {
      const confirmLowHb = window.confirm(
        `ADVERTENCIA: La hemoglobina del paciente (${newHb} g/dL) es inferior al umbral recomendado (>= 11.0 g/dL). ¿Desea registrar con autorización médica especial?`
      );
      if (!confirmLowHb) return;
    }

    const newId = `PROG-AUT-2026-${String(programs.length + 1).padStart(3, '0')}`;
    const newRecord: AutologousProgramRecord = {
      idPrograma: newId,
      nombrePaciente: newNombre,
      ciPaciente: newCi,
      telefono: newTelefono,
      email: newEmail,
      grupoSanguineo: newGrupo,
      factorRh: newRh,
      diagnosticoCirugia: newCirugia,
      fechaCirugiaProgramada: newFechaCirugia,
      centroSaludQuirurgico: newCentroSalud,
      medicoPrescriptor: newMedico,
      ordenMedicaNumero: newOrden,
      hemoglobinaPrevia: Number(newHb),
      volumenRequeridoMl: Number(newVolumen),
      estadoPrograma: 'Extraccion Programada',
      fechaExtraccion: newFechaExtraccion,
      codigoBolsaAsignada: 'Pendiente Flebotomía',
      observaciones: `Programa autólogo registrado formalmente. Extracción programada para el ${newFechaExtraccion}. Custodia exclusiva reservada.`
    };

    setPrograms(prev => [newRecord, ...prev]);
    setIsNewModalOpen(false);
    alert(`¡Programa Autólogo ${newId} creado con éxito para ${newNombre}! Puede programar la flebotomía o emitir el Certificado de Custodia.`);
  };

  // Handler: Confirm Autologous Extraction (CU21 / Flebotomía)
  const handlePerformExtraction = (program: AutologousProgramRecord) => {
    const codMadre = `MAD-2026-AUT-${String(Math.floor(10 + Math.random() * 90))}`;
    const codBolsaGR = `${codMadre}-GR`;
    const codBolsaPL = `${codMadre}-PL`;

    // 1. Create inventory items in quarantine / reserved
    const redCellsBag: BloodInventoryItem = {
      id: `inv-${Date.now()}-gr`,
      codigoBolsa: codBolsaGR,
      codigoBolsaMadre: codMadre,
      codigoExtraccion: `EXT-AUT-${Date.now()}`,
      componente: 'Concentrado de Globulos Rojos',
      grupoSanguineo: program.grupoSanguineo,
      factorRh: program.factorRh,
      volumenMl: 250,
      fechaExtraccion: '2026-10-14',
      fechaCaducidad: '2026-11-25',
      diasRestantes: 42,
      estado: 'Reservada',
      ubicacionCamara: 'Cámara Fría A - Bandeja Cuarentena Autóloga #1',
      temperaturaCamara: '4.0°C',
      esExclusivoAutologo: true,
      pacienteAutologo: {
        nombre: program.nombrePaciente,
        ci: program.ciPaciente,
        fechaCirugia: program.fechaCirugiaProgramada,
        centroSalud: program.centroSaludQuirurgico,
        ordenMedica: `${program.ordenMedicaNumero} (${program.medicoPrescriptor})`
      }
    };

    const plasmaBag: BloodInventoryItem = {
      id: `inv-${Date.now()}-pl`,
      codigoBolsa: codBolsaPL,
      codigoBolsaMadre: codMadre,
      codigoExtraccion: `EXT-AUT-${Date.now()}`,
      componente: 'Plasma Fresco Congelado',
      grupoSanguineo: program.grupoSanguineo,
      factorRh: program.factorRh,
      volumenMl: 150,
      fechaExtraccion: '2026-10-14',
      fechaCaducidad: '2027-10-14',
      diasRestantes: 365,
      estado: 'Reservada',
      ubicacionCamara: 'Ultra-Freezer -30°C - Compartimento Autólogo B-9',
      temperaturaCamara: '-30.0°C',
      esExclusivoAutologo: true,
      pacienteAutologo: {
        nombre: program.nombrePaciente,
        ci: program.ciPaciente,
        fechaCirugia: program.fechaCirugiaProgramada,
        centroSalud: program.centroSaludQuirurgico,
        ordenMedica: `${program.ordenMedicaNumero} (${program.medicoPrescriptor})`
      }
    };

    // Update inventory
    setInventory(prev => [redCellsBag, plasmaBag, ...prev]);

    // Update program
    setPrograms(prev => prev.map(p => {
      if (p.idPrograma === program.idPrograma) {
        return {
          ...p,
          estadoPrograma: 'En Custodia Fria',
          fechaExtraccion: '2026-10-14',
          codigoBolsaAsignada: codBolsaGR,
          codigoBolsaPlasma: codBolsaPL,
          ubicacionCamara: 'Cámara Fría A (4°C) / Ultra-Freezer (-30°C)',
          observaciones: `Flebotomía autóloga completada. Generadas bolsas ${codBolsaGR} y ${codBolsaPL} en custodia exclusiva. Bloqueadas contra terceros.`
        };
      }
      return p;
    }));

    alert(`¡Flebotomía Autóloga Registrada con Éxito!\n\nSe fraccionaron 2 unidades:\n1. ${codBolsaGR} (Concentrado Eritrocitario 250ml)\n2. ${codBolsaPL} (Plasma Fresco 150ml)\n\nAmbas quedan marcadas con esExclusivoAutologo = TRUE y custodia reservada para ${program.nombrePaciente}.`);
  };

  // Handler: Baja Sanitaria por Suspensión Quirúrgica (CU15 / CU21)
  const handleBajaSanitaria = (program: AutologousProgramRecord) => {
    const reason = window.prompt(
      `ATENCIÓN SANITARIA:\nBajo la norma transfusional, la sangre autóloga NO puede transferirse a otros pacientes.\n\nIndique el motivo de la baja / descarte sanitario (ej. 'Cirugía cancelada por el cirujano / Infección intercurrente'):`,
      'Cirugía electiva cancelada definitivamente por condición médica del paciente'
    );
    if (!reason) return;

    // Remove or mark bags as Baja / Descarte
    setInventory(prev => prev.map(bag => {
      if (
        (bag.codigoBolsa === program.codigoBolsaAsignada || bag.codigoBolsa === program.codigoBolsaPlasma) ||
        (bag.pacienteAutologo && bag.pacienteAutologo.ci === program.ciPaciente)
      ) {
        return {
          ...bag,
          estado: 'Baja / Descarte' as const
        };
      }
      return bag;
    }));

    // Update program state
    setPrograms(prev => prev.map(p => {
      if (p.idPrograma === program.idPrograma) {
        return {
          ...p,
          estadoPrograma: 'Baja Sanitaria',
          observaciones: `Baja biológica sanitaria ejecutada por: ${reason}. Unidades incineradas según protocolo de bioseguridad. Prohibida reasignación a terceros.`
        };
      }
      return p;
    }));

    alert(`Se ha registrado la baja sanitaria biológica () para el paciente ${program.nombrePaciente}.\nLas bolsas asociadas han sido retiradas de reserva y enviadas a incineración.`);
  };

  return (
    <div className="space-y-6">
      {/* CU21 Regulatory & Clinical Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-purple-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Programa autólogo
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-300" />
                Custodia Exclusiva Autóloga
              </span>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold">
                Bloqueo Absoluto a Terceros
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Donación Autóloga Programada (Cirugías Electivas)
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Coordinación, flebotomía y custodia en frío de hemocomponentes recolectados del propio paciente previo a su intervención quirúrgica programada. Cumplimiento estricto del rotulado <code className="bg-purple-900/60 px-1 py-0.5 rounded text-purple-200">esExclusivoAutologo = TRUE</code> y cuarentena hospitalaria.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Programación Autóloga </span>
            </button>
          </div>
        </div>

        {/* Technical Safety Rules Alert Banner */}
        <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-purple-500/30 flex items-start gap-3 text-xs text-purple-200">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white">Normativa de Seguridad Transfusional (PRONAHEBAS / HemoVida):</strong>{' '}
            Las bolsas autólogas se mantienen separadas del stock ordinario. Si la intervención quirúrgica del paciente se cancela o no requiere transfusión, la sangre <strong>NUNCA</strong> ingresa al stock general de terceros por razones inmunológicas y de consentimiento informado; se procede a la incineración bajo acta de descarte biológico .
          </div>
        </div>

        {/* 4 Highlight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Pacientes en Programa:</span>
            <strong className="text-xl font-mono font-bold text-white">{programs.length} registrados</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Bolsas en Custodia Fría:</span>
            <strong className="text-xl font-mono font-bold text-purple-300">{autologousBags.length} unidades</strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Próxima Cirugía Electiva:</span>
            <strong className="text-base font-bold text-amber-300">
              {programs[0] ? `${getDaysUntilSurgery(programs[0].fechaCirugiaProgramada)} días (${programs[0].fechaCirugiaProgramada})` : 'Sin cirugías'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Seguridad Transfusional:</span>
            <strong className="text-base font-bold text-emerald-300">100% Sin Despacho a Terceros</strong>
          </div>
        </div>
      </div>

      {/* Control Bar: Search and Status Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por paciente, C.I., cirugía, orden..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({programs.length})
          </button>
          <button
            onClick={() => setStatusFilter('custodia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'custodia'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            En Custodia Fría ({programs.filter(p => p.estadoPrograma === 'En Custodia Fria').length})
          </button>
          <button
            onClick={() => setStatusFilter('programada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'programada'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Extracción Programada ({programs.filter(p => p.estadoPrograma === 'Extraccion Programada').length})
          </button>
          <button
            onClick={() => setStatusFilter('baja')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'baja'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bajas Sanitarias ({programs.filter(p => p.estadoPrograma === 'Baja Sanitaria').length})
          </button>
        </div>
      </div>

      {/* List of Autologous Programs */}
      <div className="space-y-4">
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sm text-slate-700">No se encontraron programas de donación autóloga</p>
            <p className="text-xs text-slate-400 mt-1">Crea una nueva solicitud con el botón "+ Nueva Programación Autóloga ".</p>
          </div>
        ) : (
          filteredPrograms.map(program => {
            const daysLeft = getDaysUntilSurgery(program.fechaCirugiaProgramada);
            const isLuisCamacho = program.email === 'luiscamachorivera7@gmail.com' || program.nombrePaciente.toLowerCase().includes('camacho');

            return (
              <div
                key={program.idPrograma}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:shadow-md ${
                  isLuisCamacho ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                      <span className="text-[10px] uppercase text-purple-500 font-mono">GRUPO</span>
                      <span className="font-black text-sm">{program.grupoSanguineo}{program.factorRh === 'Positivo' ? '+' : '-'}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                          {program.nombrePaciente}
                        </h2>
                        {isLuisCamacho && (
                          <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                            Usuario Activo Solicitado
                          </span>
                        )}
                        <span className="font-mono text-xs text-slate-500">C.I.: {program.ciPaciente}</span>
                        {program.email && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-mono">
                            {program.email}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Hospital className="w-3.5 h-3.5 text-purple-600" />
                          {program.centroSaludQuirurgico}
                        </span>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                          {program.medicoPrescriptor}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Ord. Médica: <strong>{program.ordenMedicaNumero}</strong>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      program.estadoPrograma === 'En Custodia Fria' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      program.estadoPrograma === 'Extraccion Programada' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        program.estadoPrograma === 'En Custodia Fria' ? 'bg-purple-600 animate-pulse' :
                        program.estadoPrograma === 'Extraccion Programada' ? 'bg-amber-600' : 'bg-rose-600'
                      }`} />
                      {program.estadoPrograma}
                    </span>

                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-mono">
                      Cirugía: {program.fechaCirugiaProgramada} ({daysLeft > 0 ? `en ${daysLeft} días` : 'Hoy'})
                    </span>
                  </div>
                </div>

                {/* Surgery & Units Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Intervención Quirúrgica:</span>
                    <strong className="text-slate-800 text-xs mt-0.5 block">{program.diagnosticoCirugia}</strong>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Hb Previa: <strong>{program.hemoglobinaPrevia} g/dL</strong> • Vol. Meta: <strong>{program.volumenRequeridoMl} ml</strong>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-900 font-bold text-[11px] flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-purple-600" />
                        Unidades Autólogas en Custodia :
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded">
                        PROHIBIDO DESPACHO A TERCEROS
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-mono font-bold text-xs flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {program.codigoBolsaAsignada || 'Pendiente Flebotomía'}
                      </span>
                      {program.codigoBolsaPlasma && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-mono font-bold text-xs flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {program.codigoBolsaPlasma}
                        </span>
                      )}
                      <span className="text-slate-500 text-[11px] self-center ml-auto">
                        Ubicación: <strong className="text-slate-700">{program.ubicacionCamara || 'Sin asignar'}</strong>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 italic">
                      {program.observaciones}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 text-xs">
                  {program.estadoPrograma === 'Extraccion Programada' && (
                    <button
                      onClick={() => handlePerformExtraction(program)}
                      className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      <span>Registrar Flebotomía Autóloga</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedProgramForCert(program)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Certificado de Custodia </span>
                  </button>

                  <button
                    onClick={() => setSelectedProgramForDetails(program)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ficha de Trazabilidad</span>
                  </button>

                  {program.estadoPrograma !== 'Baja Sanitaria' && (
                    <button
                      onClick={() => handleBajaSanitaria(program)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-200"
                      title="Si la cirugía se cancela, se destruye la unidad bajo norma sanitaria "
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Baja Sanitaria por Suspensión</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Live Cold Storage Table for Autologous Units */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Almacén de Cadena de Frío: Unidades Autólogas Exclusivas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hemocomponentes tamizados y resguardados en cuarentena con flag <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono">esExclusivoAutologo = true</code>.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold font-mono">
            {autologousBags.length} bolsas en cámara
          </span>
        </div>

        {autologousBags.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No hay bolsas autólogas en custodia actualmente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Código Bolsa</th>
                  <th className="py-2.5 px-3">Componente</th>
                  <th className="py-2.5 px-3">Grupo / Rh</th>
                  <th className="py-2.5 px-3">Paciente Titular</th>
                  <th className="py-2.5 px-3">Fecha Cirugía</th>
                  <th className="py-2.5 px-3">Cámara / Temp</th>
                  <th className="py-2.5 px-3">Caducidad</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {autologousBags.map(bag => (
                  <tr key={bag.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-purple-900">
                      {bag.codigoBolsa}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {bag.componente} ({bag.volumenMl} ml)
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-black bg-purple-100 text-purple-800">
                        {bag.grupoSanguineo}{bag.factorRh === 'Positivo' ? '+' : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">{bag.pacienteAutologo?.nombre || 'Titular Asignado'}</strong>
                      <span className="text-slate-400 font-mono text-[11px]">C.I.: {bag.pacienteAutologo?.ci || 'S/N'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-700 font-semibold">
                      {bag.pacienteAutologo?.fechaCirugia || 'Programada'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-700 block">{bag.ubicacionCamara}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{bag.temperaturaCamara || '4.0°C'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {bag.fechaCaducidad}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-2xs">
                        Bloqueada a Terceros
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: NUEVA SOLICITUD DE PROGRAMACIÓN AUTÓLOGA (CU21) */}
      {/* ========================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-purple-200 relative my-8">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">
                  Programa autólogo
                </span>
                <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                  Nueva Solicitud de Donación Autóloga Programada
                </h2>
              </div>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4 text-xs">
              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 text-purple-900 leading-relaxed">
                <strong className="block text-purple-950">Protocolo de Aptitud Autóloga:</strong>
                Se requiere orden médica del cirujano tratante, valor de hemoglobina igual o mayor a 11.0 g/dL y un intervalo mínimo de 72 horas previo a la intervención quirúrgica.
              </div>

              {/* Paciente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nombre y Apellidos del Paciente *</label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={e => setNewNombre(e.target.value)}
                    placeholder="Ej. Luis Alberto Camacho Rivera"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cédula de Identidad (C.I.) *</label>
                  <input
                    type="text"
                    required
                    value={newCi}
                    onChange={e => setNewCi(e.target.value)}
                    placeholder="Ej. 6948210 SC"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contacto & Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={newTelefono}
                    onChange={e => setNewTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="luiscamachorivera7@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Grupo ABO / Factor Rh</label>
                  <div className="flex gap-2">
                    <select
                      value={newGrupo}
                      onChange={e => setNewGrupo(e.target.value as BloodGroup)}
                      className="w-1/2 px-2.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                    >
                      <option value="O">O</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                    </select>
                    <select
                      value={newRh}
                      onChange={e => setNewRh(e.target.value as RhFactor)}
                      className="w-1/2 px-2.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                    >
                      <option value="Positivo">Rh (+)</option>
                      <option value="Negativo">Rh (-)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cirugía y Hospital */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Procedimiento / Cirugía Programada *</label>
                  <input
                    type="text"
                    required
                    value={newCirugia}
                    onChange={e => setNewCirugia(e.target.value)}
                    placeholder="Ej. Artroplastia Total de Cadera"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha Programada de Cirugía *</label>
                  <input
                    type="date"
                    required
                    value={newFechaCirugia}
                    onChange={e => setNewFechaCirugia(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Centro de Salud y Médico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Centro Hospitalario Quirúrgico *</label>
                  <input
                    type="text"
                    required
                    value={newCentroSalud}
                    onChange={e => setNewCentroSalud(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Médico Cirujano y N° de Matrícula *</label>
                  <input
                    type="text"
                    required
                    value={newMedico}
                    onChange={e => setNewMedico(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Orden y Parámetros Clínicos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">N° Orden Quirúrgica</label>
                  <input
                    type="text"
                    value={newOrden}
                    onChange={e => setNewOrden(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hemoglobina Basal (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="8"
                    max="20"
                    value={newHb}
                    onChange={e => setNewHb(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-purple-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha Sugerida Flebotomía</label>
                  <input
                    type="date"
                    value={newFechaExtraccion}
                    onChange={e => setNewFechaExtraccion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Consent check */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAceptaCondiciones}
                    onChange={e => setNewAceptaCondiciones(e.target.checked)}
                    className="mt-1 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-slate-600 leading-tight">
                    Certifico que el paciente cuenta con prescripción quirúrgica verificada y consiente la custodia exclusiva con bloqueo a terceros bajo el protocolo .
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newAceptaCondiciones}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-purple-900/30 cursor-pointer"
                >
                  Registrar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CERTIFICADO OFICIAL DE CUSTODIA AUTÓLOGA (CU21) */}
      {/* ========================================================= */}
      {selectedProgramForCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-4 border-purple-600 relative my-8 text-slate-900 print:m-0 print:border-none print:shadow-none">
            <button
              onClick={() => setSelectedProgramForCert(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              <div className="flex items-center justify-center gap-2 text-rose-700 font-black text-xl tracking-tight">
                <Droplet className="w-6 h-6 fill-rose-600" />
                <span>HEMOVIDA • BANCO REGIONAL DE SANGRE</span>
              </div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                Red Departamental de Transfusión Sanguínea • Santa Cruz de la Sierra
              </p>
              <h2 className="text-lg font-black text-purple-900 font-mono tracking-tight mt-2 uppercase">
                CERTIFICADO OFICIAL DE RESERVA Y CUSTODIA AUTÓLOGA
              </h2>
              <span className="inline-block bg-purple-100 text-purple-900 font-mono font-bold text-xs px-3 py-0.5 rounded-full border border-purple-300">
                CÓDIGO PROTOCOLO: {selectedProgramForCert.idPrograma}
              </span>
            </div>

            {/* Document Body */}
            <div className="py-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Paciente Titular:</span>
                  <strong className="text-slate-900 text-sm block">{selectedProgramForCert.nombrePaciente}</strong>
                  <span className="text-slate-600 font-mono">C.I.: {selectedProgramForCert.ciPaciente}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Grupo ABO & Factor Rh:</span>
                  <strong className="text-purple-900 text-lg font-black">
                    {selectedProgramForCert.grupoSanguineo} {selectedProgramForCert.factorRh}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cirugía Electiva:</span>
                  <span className="text-slate-800 font-semibold">{selectedProgramForCert.diagnosticoCirugia}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Fecha Programada Quirófano:</span>
                  <strong className="text-slate-900 font-mono text-sm">{selectedProgramForCert.fechaCirugiaProgramada}</strong>
                </div>
              </div>

              {/* Medical and Bag info */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-purple-900 block text-[10px] uppercase font-bold">Centro Quirúrgico:</span>
                  <span className="text-slate-800 font-medium">{selectedProgramForCert.centroSaludQuirurgico}</span>
                </div>
                <div>
                  <span className="text-purple-900 block text-[10px] uppercase font-bold">Médico Cirujano:</span>
                  <span className="text-slate-800 font-medium">{selectedProgramForCert.medicoPrescriptor}</span>
                  <span className="block text-[11px] font-mono text-slate-500">Ord: {selectedProgramForCert.ordenMedicaNumero}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-purple-200">
                  <span className="text-purple-900 block text-[10px] uppercase font-bold">Hemocomponentes en Custodia Exclusiva:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-2.5 py-1 bg-white rounded border border-purple-300 font-mono font-bold text-purple-950">
                      {selectedProgramForCert.codigoBolsaAsignada || 'MAD-2026-AUT-01-GR'} (CGR 250ml)
                    </span>
                    {selectedProgramForCert.codigoBolsaPlasma && (
                      <span className="px-2.5 py-1 bg-white rounded border border-purple-300 font-mono font-bold text-purple-950">
                        {selectedProgramForCert.codigoBolsaPlasma} (PFC 150ml)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Ubicación actual: {selectedProgramForCert.ubicacionCamara || 'Cámara Fría A (4.0°C)'}
                  </span>
                </div>
              </div>

              {/* Strict Regulatory Clause */}
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1">
                <strong className="flex items-center gap-1.5 text-rose-800 font-black text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Cláusula Obligatoria de Custodia e Intransferibilidad
                </strong>
                <p className="text-[11px] leading-relaxed">
                  Las unidades certificadas fueron extraídas exclusivamente para el titular arriba mencionado bajo el protocolo . <strong>QUEDA TERMINANTEMENTE PROHIBIDO SU USO O TRASPASO A CUALQUIER OTRO PACIENTE.</strong> Si la cirugía es suspendida o los componentes no son requeridos, las bolsas deben ser remitidas al Banco de Sangre para su incineración sanitaria controlada .
                </p>
              </div>

              {/* Signatures & QR */}
              <div className="pt-6 grid grid-cols-3 gap-4 items-end text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Lic. Patricia Arteaga</p>
                  <p>Recepción & Admisión</p>
                  <p className="font-mono text-[9px]">HemoVida Central</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-2 border-purple-900 rounded-lg p-1 bg-white flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-purple-950" />
                  </div>
                  <span className="font-mono text-[9px] mt-1 text-slate-400">Verificación Digital</span>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Dr. Fernando Valverde</p>
                  <p>Médico Hemoterapeuta</p>
                  <p className="font-mono text-[9px]">MP-9481 SC</p>
                </div>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedProgramForCert(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-1.5 transition-all shadow-md text-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Certificado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: FICHA DE TRAZABILIDAD COMPLETA                   */}
      {/* ========================================================= */}
      {selectedProgramForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 text-xs">
            <button
              onClick={() => setSelectedProgramForDetails(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  Trazabilidad de Custodia Autóloga
                </h2>
                <span className="text-slate-400 font-mono text-[11px]">{selectedProgramForDetails.idPrograma}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block text-sm">{selectedProgramForDetails.nombrePaciente}</strong>
                <p className="text-slate-500 text-xs">C.I.: {selectedProgramForDetails.ciPaciente} • Grupo: {selectedProgramForDetails.grupoSanguineo} {selectedProgramForDetails.factorRh}</p>
                <p className="text-slate-500 text-xs mt-1">Cirugía: <strong>{selectedProgramForDetails.diagnosticoCirugia}</strong> ({selectedProgramForDetails.fechaCirugiaProgramada})</p>
              </div>

              <div className="space-y-2 border-l-2 border-purple-500 pl-4 py-1">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white" />
                  <p className="font-bold text-slate-800">1. Registro de Solicitud Quirúrgica </p>
                  <p className="text-slate-500 text-[11px]">Orden médica {selectedProgramForDetails.ordenMedicaNumero} autorizada por {selectedProgramForDetails.medicoPrescriptor}.</p>
                </div>

                <div className="relative pt-2">
                  <span className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white" />
                  <p className="font-bold text-slate-800">2. Flebotomía & Fraccionamiento Especial</p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedProgramForDetails.fechaExtraccion
                      ? `Extracción ejecutada el ${selectedProgramForDetails.fechaExtraccion}. Generadas bolsas ${selectedProgramForDetails.codigoBolsaAsignada}.`
                      : 'Pendiente de realización física en ventanilla.'}
                  </p>
                </div>

                <div className="relative pt-2">
                  <span className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white" />
                  <p className="font-bold text-slate-800">3. Cadena de Frío & Bloqueo en Almacén</p>
                  <p className="text-slate-500 text-[11px]">
                    Bolsa alojada en {selectedProgramForDetails.ubicacionCamara || 'Cámara Fría A'}. Atributo <code className="text-purple-700 bg-purple-50 px-1 rounded">esExclusivoAutologo = TRUE</code> activo.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedProgramForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
