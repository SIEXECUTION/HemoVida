import React, { useState } from 'react';
import { 
  X, 
  Stethoscope, 
  FlaskConical, 
  Truck, 
  UserCheck, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Briefcase,
  Building2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { UserSession, RoleCode, StaffRole } from '../types';

interface OtherRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onSwitchRole: (roleCode: RoleCode) => void;
  onRequestRole: (roleCode: RoleCode, details: { motivo: string; especialidad?: string; sede?: string }) => void;
}

interface AvailableHealthRole {
  code: RoleCode;
  staffRole: StaffRole;
  title: string;
  department: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  responsibilities: string[];
}

const HEALTH_ROLES: AvailableHealthRole[] = [
  {
    code: 'DOC_TRIAJE',
    staffRole: 'medico',
    title: 'Médico Hemoterapeuta (Triaje Clínico)',
    department: 'Área Médica y Evaluación Clínica',
    icon: Stethoscope,
    color: 'border-blue-500 bg-blue-50/50 text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeText: 'Médico',
    description: 'Responsable de la evaluación clínica previa a la donación, medición de signos vitales (PA, pulso, hemoglobina, peso) y emisión del dictamen de aptitud o diferimiento.',
    responsibilities: [
      'Toma y registro de signos vitales (PA, FC, Hb, Peso)',
      'Dictamen clínico de aptitud (Apto, Diferido Temporal o Definitivo)',
      'Autorización médica de extracción de bolsas'
    ]
  },
  {
    code: 'BIOQ_INTEGRAL',
    staffRole: 'bioquimico',
    title: 'Bioquímico / Analista de Laboratorio',
    department: 'Inmuno-Serología e Inmuno-Hematología',
    icon: FlaskConical,
    color: 'border-teal-500 bg-teal-50/50 text-teal-700',
    badgeBg: 'bg-teal-100 text-teal-800',
    badgeText: 'Bioquímica',
    description: 'Procesamiento de muestras, tamizaje serológico de 6 agentes infecciosos (VIH, Chagas, HepB, HepC, Sífilis, HTLV) y fraccionamiento de hemoderivados.',
    responsibilities: [
      'Fraccionamiento celular (Concentrado Eritrocitario, Plasma, Plaquetas)',
      'Panel inmuno-serológico de 6 marcadores infecciosos',
      'Liberación serológica o descarte biológico por reactividad'
    ]
  },
  {
    code: 'PERS_COLECTA',
    staffRole: 'recepcion',
    title: 'Personal de Colecta & Recepción',
    department: 'Admisión y Atención al Donante',
    icon: UserCheck,
    color: 'border-rose-500 bg-rose-50/50 text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
    badgeText: 'Recepción',
    description: 'Atención inicial de donantes y postulantes, verificación de identidad en padrón central, confirmación de citas y entrega de incentivos autorizados.',
    responsibilities: [
      'Registro oficial de nuevos postulantes y verificación de C.I.',
      'Control de flujo de atención y recepción en salas de colecta',
      'Gestión y entrega de refrigerios e incentivos solidarios'
    ]
  },
  {
    code: 'TEC_LOGISTICA',
    staffRole: 'despacho',
    title: 'Técnico de Despacho & Logística Transfusional',
    department: 'Cadena de Frío, Compatibilidad y Emergencias',
    icon: Truck,
    color: 'border-amber-500 bg-amber-50/50 text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeText: 'Despacho',
    description: 'Control de hemocomponentes aptos, verificación de compatibilidad cruzada mayor/menor, atención de Código Rojo y salida hospitalaria con cadena de frío.',
    responsibilities: [
      'Monitoreo continuo de stock por grupo ABO y Rh',
      'Protocolos de Código Rojo para emergencias transfusionales',
      'Pruebas de compatibilidad pre-transfusional y despacho en frío'
    ]
  }
];

export const OtherRolesModal: React.FC<OtherRolesModalProps> = ({
  isOpen,
  onClose,
  session,
  onSwitchRole,
  onRequestRole
}) => {
  const [selectedRole, setSelectedRole] = useState<AvailableHealthRole | null>(null);
  const [motivo, setMotivo] = useState('');
  const [registroProfesional, setRegistroProfesional] = useState('');
  const [sede, setSede] = useState('Banco de Sangre Central (Calle Warnes)');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const rolesAsignados = session.rolesDisponibles || [];
  const activeRoleCode = session.activeRole;

  const handleApply = (role: AvailableHealthRole) => {
    // Si ya posee el rol asignado en su cuenta, cambiar directamente
    const yaAsignado = rolesAsignados.some(r => r.codigo === role.code);
    if (yaAsignado) {
      onSwitchRole(role.code);
      onClose();
      return;
    }

    // Si no lo tiene, abrir formulario de solicitud/activación de rol
    setSelectedRole(role);
    setSuccessMessage(null);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    onRequestRole(selectedRole.code, {
      motivo: motivo.trim() || 'Solicitud de acceso para operar en nueva área de salud.',
      especialidad: registroProfesional.trim() || selectedRole.title,
      sede
    });

    setSuccessMessage(`¡Solicitud enviada exitosamente para ${selectedRole.title}! Se ha registrado en la bitácora institucional y ahora puedes acceder de prueba a esta área.`);
    
    // Auto cambiar de rol para permitir la experiencia/prueba inmediata
    setTimeout(() => {
      onSwitchRole(selectedRole.code);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 flex items-start justify-between relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-rose-400 border border-white/15 shadow-inner">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-rose-400/30 mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Explorador Institucional • Otros Roles del Área de Salud
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif]">
                Cambio & Solicitud de Nuevos Roles en Salud
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Usuario activo: <strong>{session.nombreCompleto}</strong> (Rol actual: <span className="text-rose-400 font-bold">{activeRoleCode}</span>)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Explicación de la funcionalidad */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-600 leading-relaxed space-y-1.5">
            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Flexibilidad y Movilidad Hospitalaria HemoVida
            </p>
            <p className="text-[11px] text-slate-600">
              Si eres donante, posible donador o ya formas parte de un área sanitaria específica, puedes explorar, conmutar o solicitar acreditación para desempeñarte en las demás áreas operativas del banco de sangre (Triaje Médico, Bioquímica, Recepción o Logística).
            </p>
          </div>

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Si se seleccionó un rol para solicitar o activar */}
          {selectedRole ? (
            <form onSubmit={handleSubmitRequest} className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRole.color}`}>
                    <selectedRole.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedRole.title}</h4>
                    <span className="text-[10px] text-slate-500">{selectedRole.department}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer underline"
                >
                  ← Volver a la lista
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Matrícula Profesional / Registro Médico o Bioquímico (Opcional)
                  </label>
                  <input
                    type="text"
                    value={registroProfesional}
                    onChange={(e) => setRegistroProfesional(e.target.value)}
                    placeholder="Ej. MP-7892-SC o REG-SAN-2026"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Sede / Hospital Destino
                  </label>
                  <select
                    value={sede}
                    onChange={(e) => setSede(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Banco de Sangre Central (Calle Warnes)">Banco Central Warnes</option>
                    <option value="Hospital Japonés (Sede Tercer Nivel)">Hospital Japonés</option>
                    <option value="Clínica Foianini">Clínica Foianini</option>
                    <option value="Hospital de la Mujer Percy Boland">Hospital Percy Boland</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Motivo o Justificación de Acceso al Área de Salud *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Indique brevemente el motivo para probar o integrarse a este rol operativo (ej. Rotación médica, apoyo en colecta, validación de laboratorio)..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirmar y Acceder a Esta Área</span>
                </button>
              </div>
            </form>
          ) : (
            /* Lista de Roles del Área de Salud */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HEALTH_ROLES.map((role) => {
                const IconComponent = role.icon;
                const isCurrentlyActive = activeRoleCode === role.code;
                const isAlreadyAssigned = rolesAsignados.some(r => r.codigo === role.code);

                return (
                  <div 
                    key={role.code}
                    className={`rounded-2xl p-4.5 border transition-all flex flex-col justify-between gap-3 ${
                      isCurrentlyActive 
                        ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-300/60 shadow-xs' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${role.color}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                              {role.title}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {role.department}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${role.badgeBg}`}>
                          {role.badgeText}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {role.description}
                      </p>

                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-700">
                        <strong className="block text-slate-800 font-bold mb-0.5">Funciones Clave:</strong>
                        {role.responsibilities.map((resp, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{resp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {isCurrentlyActive ? (
                        <div className="flex items-center gap-1.5 text-rose-700 font-black text-[11px]">
                          <CheckCircle2 className="w-4 h-4 text-rose-600" />
                          <span>Rol Activo Actualmente</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(role)}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                            isAlreadyAssigned
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {isAlreadyAssigned ? (
                            <>
                              <span>Cambiar a este Perfil</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Solicitar / Probar esta Área</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>HemoVida Santa Cruz • Sistema de Trazabilidad y Gestión de Roles RBAC</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
