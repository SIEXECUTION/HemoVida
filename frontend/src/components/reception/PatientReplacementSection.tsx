import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Heart, 
  Plus, 
  Calendar,
  Layers,
  FileCheck,
  ShieldCheck,
  Award,
  AlertTriangle,
  UserPlus,
  X
} from 'lucide-react';
import { PatientReplacementRecord } from '../../types';

interface PatientReplacementSectionProps {
  replacements: PatientReplacementRecord[];
  onDonateForPatient: (patient: PatientReplacementRecord) => void;
  onUpdateReplacement?: (updated: PatientReplacementRecord) => void;
}

export const PatientReplacementSection: React.FC<PatientReplacementSectionProps> = ({
  replacements,
  onDonateForPatient,
  onUpdateReplacement
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPatientForSubstitution, setSelectedPatientForSubstitution] = useState<PatientReplacementRecord | null>(null);
  const [substitutionGroup, setSubstitutionGroup] = useState('O Negativo (O-)');
  const [substitutionJustification, setSubstitutionJustification] = useState('Stock crítico hospitalario justifica sustitución por donante O-');

  // Stats calculation
  const totalCases = replacements.length;
  const completedCases = replacements.filter(r => r.estado === 'Completado').length;
  const pendingCases = replacements.filter(r => r.estado === 'Pendiente').length;
  const partialCases = replacements.filter(r => r.estado === 'Parcial').length;

  const totalRequiredDonors = replacements.reduce((acc, r) => acc + r.donantesRequeridos, 0);
  const totalReplacedDonors = replacements.reduce((acc, r) => acc + r.donantesRepuestos.length, 0);

  // Filter logic
  const filtered = replacements.filter(r => {
    const matchesSearch = 
      r.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pacienteCi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.hospital.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAuthorizeSubstitution = (patient: PatientReplacementRecord) => {
    if (!onUpdateReplacement) return;

    const updated: PatientReplacementRecord = {
      ...patient,
      sustitucionAutorizada: {
        autorizadaPorBioquimico: 'Lic. Bioq. Marcela Arteaga (Jefa de Laboratorio)',
        grupoSolicitado: patient.grupoReceptor || 'Mismo grupo',
        grupoSustitutoAceptado: substitutionGroup,
        justificacion: substitutionJustification,
        fechaAutorizacion: new Date().toISOString()
      }
    };

    onUpdateReplacement(updated);
    setSelectedPatientForSubstitution(null);
    alert(`Sustitución autorizada para el paciente ${patient.pacienteNombre}. Ahora se acepta el grupo ${substitutionGroup} para reponer su deuda biológica.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Padrón de Pacientes Receptores (CU20)
              </span>
              <span className="text-[11px] text-slate-400">• Equivalencia Estricta 1:1</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Historial de Reposición Familiar & Deuda Biológica
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl mt-0.5 leading-relaxed">
              Equivalencia estricta 1 a 1 (1 unidad recibida = 1 donante efectivo). Si el paciente está incapacitado, firma el tutor o familiar responsable. El Bioquímico puede autorizar sustitución por un grupo escaso (como O-) si el stock crítico lo amerita.
            </p>
          </div>

          {/* Bioethical guarantee notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 max-w-xs shrink-0">
            <span className="font-bold flex items-center gap-1.5 text-amber-800 text-[11px] uppercase">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Garantía Bioética Irrestricta:
            </span>
            <p className="text-[10px] text-amber-900 mt-1 leading-tight">
              La reposición es un compromiso ético-administrativo familiar que <strong>NUNCA condiciona ni retiene una transfusión de emergencia</strong>.
            </p>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Pacientes Receptores
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {totalCases}
              </span>
              <span className="text-xs text-slate-500">en padrón</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Unidades Recibidas (Deuda 1:1)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-700 font-mono">
                {totalRequiredDonors}
              </span>
              <span className="text-xs text-slate-500">donantes requeridos</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Donantes Repuestos
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {totalReplacedDonors}
              </span>
              <span className="text-xs text-emerald-600 font-medium">({Math.round((totalReplacedDonors / (totalRequiredDonors || 1)) * 100)}%)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Saldo Pendiente Total
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-700 font-mono">
                {totalRequiredDonors - totalReplacedDonors}
              </span>
              <span className="text-xs text-slate-500">por reponer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Content List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por paciente, C.I., hospital o tutor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="all">Todos los Estados ({totalCases})</option>
              <option value="Pendiente">Pendientes ({pendingCases})</option>
              <option value="Parcial">Reposición Parcial ({partialCases})</option>
              <option value="Completado">Completados ({completedCases})</option>
            </select>
          </div>
        </div>

        {/* Patients Replacement Cards */}
        <div className="p-4 sm:p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <UserCheck className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No se encontraron registros de reposición</p>
              <p className="text-xs">Intenta con otro término de búsqueda o filtro.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const pendingCount = item.donantesRequeridos - item.donantesRepuestos.length;
              const percent = Math.min(100, Math.round((item.donantesRepuestos.length / item.donantesRequeridos) * 100));

              return (
                <div 
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 transition-all bg-white space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 font-['Outfit',sans-serif]">
                          {item.pacienteNombre}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.estado === 'Completado' 
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado === 'Parcial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.estado}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span><strong>C.I.:</strong> {item.pacienteCi}</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> {item.hospital}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Solicitud: {item.fechaSolicitudInicial}
                        </span>
                        {item.grupoReceptor && (
                          <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                            Grupo {item.grupoReceptor}
                          </span>
                        )}
                      </div>

                      {/* Tutor Responsable Info (CU20) */}
                      {item.tutorResponsable && (
                        <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-950 flex flex-wrap items-center gap-3">
                          <span className="font-bold flex items-center gap-1 text-blue-800">
                            <FileCheck className="w-3.5 h-3.5" /> Tutor / Familiar Responsable:
                          </span>
                          <span><strong>{item.tutorResponsable.nombres}</strong> ({item.tutorResponsable.parentesco})</span>
                          <span>C.I.: {item.tutorResponsable.ci}</span>
                          <span className="text-emerald-700 font-bold">✓ Acta de Compromiso Firmada</span>
                        </div>
                      )}

                      {/* Scarce Group Substitution Authorization (CU20) */}
                      {item.sustitucionAutorizada && (
                        <div className="mt-2 p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-950 flex flex-wrap items-center gap-2">
                          <span className="font-bold text-teal-800 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> Sustitución Autorizada por Bioquímico:
                          </span>
                          <span>Se acepta reponer con <strong>{item.sustitucionAutorizada.grupoSustitutoAceptado}</strong> (Justificación: {item.sustitucionAutorizada.justificacion}).</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Cuota 1:1 Requerida:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold font-mono text-slate-900">
                            {item.donantesRepuestos.length} / {item.donantesRequeridos}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">donantes</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.estado !== 'Completado' && (
                          <button
                            onClick={() => onDonateForPatient(item)}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>+ Registrar Donante Repositor</span>
                          </button>
                        )}

                        {onUpdateReplacement && !item.sustitucionAutorizada && item.estado !== 'Completado' && (
                          <button
                            onClick={() => setSelectedPatientForSubstitution(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                            title="Autorizar sustitución por un grupo escaso como O-"
                          >
                            Autorizar Sustitución
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Progreso de reposición biológica: {percent}%</span>
                      <span>
                        {pendingCount > 0 ? (
                          <strong className="text-rose-700">Faltan {pendingCount} donante(s)</strong>
                        ) : (
                          <strong className="text-emerald-700">✓ Deuda Biológica Saldada</strong>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.estado === 'Completado' ? 'bg-emerald-500' : 'bg-rose-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Donantes Repuestos Details */}
                  {item.donantesRepuestos.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Donantes Efectivos Vinculados:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {item.donantesRepuestos.map((d, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{d.donanteNombre}</p>
                              <p className="text-slate-400 text-[10px]">C.I.: {d.donanteCi} • {d.fechaDonacion}</p>
                            </div>
                            <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-rose-700">
                              {d.codigoExtraccion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal for authorising scarce group substitution (CU20) */}
      {selectedPatientForSubstitution && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                Autorizar Sustitución por Grupo Escaso (CU20)
              </h3>
              <button 
                onClick={() => setSelectedPatientForSubstitution(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              El Bioquímico responsable puede autorizar que la reposición del paciente <strong>{selectedPatientForSubstitution.pacienteNombre}</strong> (Grupo {selectedPatientForSubstitution.grupoReceptor}) sea cubierta con un grupo escaso según la necesidad crítica de inventario.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Grupo Escaso Aceptado para Reponer:
                </label>
                <select
                  value={substitutionGroup}
                  onChange={(e) => setSubstitutionGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="O Negativo (O-)">O Negativo (O-) [Donante Universal]</option>
                  <option value="A Negativo (A-)">A Negativo (A-)</option>
                  <option value="B Negativo (B-)">B Negativo (B-)</option>
                  <option value="Cualquier Grupo Homólogo">Cualquier Grupo Homólogo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Justificación Técnica del Bioquímico:
                </label>
                <textarea
                  rows={2}
                  value={substitutionJustification}
                  onChange={(e) => setSubstitutionJustification(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleAuthorizeSubstitution(selectedPatientForSubstitution)}
                className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Autorizar Sustitución
              </button>
              <button
                onClick={() => setSelectedPatientForSubstitution(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
