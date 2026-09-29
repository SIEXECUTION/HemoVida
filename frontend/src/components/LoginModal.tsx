import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Droplet, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Truck,
  Heart,
  FileText,
  BadgeCheck,
  Stethoscope,
  FlaskConical,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  Mail,
  Sparkles,
  RefreshCw,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Building2,
  Clock,
  Send,
  UserCheck
} from 'lucide-react';
import { UserDonor, StaffAccount, AppRole, StaffRole, BloodGroup, RhFactor } from '../types';
import { evaluatePassword, getPasswordMissingAlerts } from '../utils/security';
import { PasswordSecurityIndicator } from './PasswordSecurityIndicator';
import { apiService } from '../services/api';

export type AccountLoginSelection = 
  | { type: 'donante'; user: UserDonor }
  | { type: 'recepcion'; staff: StaffAccount }
  | { type: 'despacho'; staff: StaffAccount }
  | { type: 'administrador'; staff: StaffAccount }
  | { type: 'medico'; staff: StaffAccount }
  | { type: 'bioquimico'; staff: StaffAccount };

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (selection: AccountLoginSelection) => void;
  availableUsers: UserDonor[];
  availableStaff: StaffAccount[];
  initialRole?: AppRole;
  initialMode?: 'login' | 'register';
  initialEmail?: string;
  initialRegisterType?: 'donante' | 'personal_salud';
  onRequestStaffAccount?: (staff: StaffAccount) => void;
  onUpdatePassword?: (email: string, newPassword: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  availableUsers,
  availableStaff,
  initialRole = 'donante',
  initialMode = 'login',
  initialEmail = '',
  initialRegisterType = 'donante',
  onRequestStaffAccount,
  onUpdatePassword
}) => {
  // Modal navigation mode: 'login' (email + password), 'register' (sign up) or 'forgot_password' (recuperar clave)
  const [modalMode, setModalMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  const [activeRoleTab, setActiveRoleTab] = useState<AppRole>(initialRole);
  const [registerAccountType, setRegisterAccountType] = useState<'donante' | 'personal_salud'>(initialRegisterType);
  
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setModalMode(initialMode);
      }
      if (initialRole) {
        setActiveRoleTab(initialRole);
        if (initialRole !== 'donante' && initialMode === 'register') {
          setRegisterAccountType('personal_salud');
          setRegStaffRol(initialRole as StaffRole);
        }
      }
      if (initialRegisterType) {
        setRegisterAccountType(initialRegisterType);
      }
      setLoginError(null);
      // Los campos de inicio de sesión SIEMPRE inician vacíos sin autorrelleno
      setLoginEmail('');
      setLoginPassword('');
    }
  }, [initialRole, initialMode, initialRegisterType, isOpen]);

  // LOGIN STATE (Strictly Email + Password - Limpios y sin datos demo)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // DONOR REGISTRATION STATE
  const [regNombres, setRegNombres] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regCi, setRegCi] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCelular, setRegCelular] = useState('');
  const [regFechaNacimiento, setRegFechaNacimiento] = useState('1998-06-20');
  const [regSexo, setRegSexo] = useState<'M' | 'F'>('M');
  const [regNacionalidad, setRegNacionalidad] = useState('Boliviana');
  const [regDireccion, setRegDireccion] = useState('');
  const [regOcupacion, setRegOcupacion] = useState('');
  const [regGrupo, setRegGrupo] = useState<BloodGroup>('O');
  const [regRh, setRegRh] = useState<RhFactor>('Positivo');
  const [regTipoDonante, setRegTipoDonante] = useState<'Voluntario Altruista' | 'Reposicion Familiar' | 'Brigada Movil'>('Voluntario Altruista');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerValidationAlerts, setRegisterValidationAlerts] = useState<string[]>([]);

  // Real-time evaluation of password rules in donor registration
  const regPasswordRules = evaluatePassword(regPassword, regConfirmPassword);

  // HEALTHCARE STAFF REGISTRATION STATE
  const [regStaffRol, setRegStaffRol] = useState<StaffRole>('medico');
  const [regStaffNombres, setRegStaffNombres] = useState('');
  const [regStaffApellidos, setRegStaffApellidos] = useState('');
  const [regStaffCargo, setRegStaffCargo] = useState('Médico Hemoterapeuta & Encargado de Triaje Clínico');
  const [regStaffCi, setRegStaffCi] = useState('');
  const [regStaffMatricula, setRegStaffMatricula] = useState('');
  const [regStaffTurno, setRegStaffTurno] = useState('Turno Mañana (07:00 - 15:00)');
  const [regStaffSede, setRegStaffSede] = useState('Banco de Sangre Central (Calle Warnes)');
  const [regStaffEmail, setRegStaffEmail] = useState('');
  const [regStaffCelular, setRegStaffCelular] = useState('');
  const [regStaffPassword, setRegStaffPassword] = useState('');
  const [regStaffConfirmPassword, setRegStaffConfirmPassword] = useState('');
  const [showRegStaffPassword, setShowRegStaffPassword] = useState(false);
  const [regStaffError, setRegStaffError] = useState<string | null>(null);
  const [regStaffValidationAlerts, setRegStaffValidationAlerts] = useState<string[]>([]);

  // Real-time evaluation of password rules in staff registration
  const regStaffPasswordRules = evaluatePassword(regStaffPassword, regStaffConfirmPassword);

  // PASSWORD RECOVERY STATE (Flujo completo con token y cambio de contraseña)
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1); // 1: Solicitud, 2: Token y nueva clave, 3: Éxito
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const recoveryPasswordRules = evaluatePassword(recoveryNewPassword, recoveryConfirmPassword);

  // STAFF APPROVAL PENDING STATE
  const [staffRequestSent, setStaffRequestSent] = useState(false);
  const [submittedStaffName, setSubmittedStaffName] = useState('');
  const [submittedStaffRole, setSubmittedStaffRole] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  if (!isOpen) return null;


  // Find staff accounts
  const receptionStaff = availableStaff.find(s => s.rol === 'recepcion') || availableStaff[0];
  const dispatchStaff = availableStaff.find(s => s.rol === 'despacho') || availableStaff[1];
  const adminStaff = availableStaff.find(s => s.rol === 'administrador') || availableStaff[2];
  const medicoStaff = availableStaff.find(s => s.rol === 'medico') || availableStaff[3];
  const bioquimicoStaff = availableStaff.find(s => s.rol === 'bioquimico') || availableStaff[4];

  const handleClearRegisterForm = () => {
    setRegNombres('');
    setRegApellidos('');
    setRegCi('');
    setRegEmail('');
    setRegCelular('');
    setRegFechaNacimiento('1998-06-20');
    setRegSexo('M');
    setRegNacionalidad('Boliviana');
    setRegDireccion('');
    setRegOcupacion('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegisterError(null);
    setRegisterValidationAlerts([]);
  };

  const handleStaffRoleChange = (role: StaffRole) => {
    setRegStaffRol(role);
    if (role === 'medico') {
      setRegStaffCargo('Médico Hemoterapeuta & Encargado de Triaje Clínico');
      setRegStaffTurno('Turno Mañana (07:00 - 15:00)');
    } else if (role === 'bioquimico') {
      setRegStaffCargo('Especialista en Inmunoserología e Inmunohematología');
      setRegStaffTurno('Laboratorio Central 24h');
    } else if (role === 'despacho') {
      setRegStaffCargo('Responsable de Despacho Transfusional & Hemoderivados');
      setRegStaffTurno('Guardia Transfusional 24h');
    } else if (role === 'recepcion') {
      setRegStaffCargo('Encargada de Recepción y Registro de Donantes');
      setRegStaffTurno('Turno Mañana (07:00 - 15:00)');
    } else if (role === 'administrador') {
      setRegStaffCargo('Administrador de Seguridad & Auditor RBAC');
      setRegStaffTurno('Dirección Central Continua');
    }
  };

  const handleClearStaffForm = () => {
    setRegStaffNombres('');
    setRegStaffApellidos('');
    setRegStaffCi('');
    setRegStaffMatricula('');
    setRegStaffEmail('');
    setRegStaffCelular('');
    setRegStaffPassword('');
    setRegStaffConfirmPassword('');
    setRegStaffError(null);
    setRegStaffValidationAlerts([]);
  };

  // 1. INICIAR SESIÓN ESTRICTAMENTE CON CORREO ELECTRÓNICO Y CONTRASEÑA
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPwd = loginPassword.trim();

    if (!cleanEmail) {
      setLoginError('Por favor ingrese su correo electrónico institucional o personal.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLoginError('Acceso restringido: Ingrese un correo válido (ej. usuario@hemovida.org).');
      return;
    }

    if (!cleanPwd) {
      setLoginError('Por favor ingrese su contraseña.');
      return;
    }

    setLoginLoading(true);

    // 1. Intentar autenticar contra el backend en Render
    try {
      const apiRes = await apiService.login(cleanEmail, cleanPwd);
      if (apiRes && apiRes.tokens) {
        localStorage.setItem('hemovida_jwt_token', apiRes.tokens.access);
        if (apiRes.usuario) {
          const userRol = apiRes.usuario.rol.nombreRol.toLowerCase();
          const persona = apiRes.usuario.persona;
          if (userRol === 'donante') {
            const donorObj: UserDonor = availableUsers.find(u => u.email.toLowerCase() === cleanEmail) || {
              id: apiRes.usuario.idUsuario,
              ci: persona?.ci || '0000000',
              nombres: persona?.nombres || apiRes.usuario.username,
              apellidos: persona?.apellidos || '',
              email: cleanEmail,
              celular: '+591 700-00000',
              sexo: 'M',
              fechaNacimiento: '1995-01-01',
              nacionalidad: 'Boliviana',
              direccion: 'Santa Cruz',
              ocupacion: 'Donante',
              tipoDonante: 'Voluntario Altruista',
              carnetDigitalCodigo: `HV-DON-${apiRes.usuario.idUsuario}`,
              grupoSanguineo: 'O',
              factorRh: 'Positivo',
              fechaUltimaDonacion: null,
              estadoHabilitacion: 'Apto',
              totalDonaciones: 1,
              volumenHistoricoMl: 450
            };
            donorObj.password = cleanPwd;
            onSelectAccount({ type: 'donante', user: donorObj });
            onClose();
            return;
          } else {
            const staffRoleMap: Record<string, StaffRole> = {
              'administrador': 'administrador',
              'médico': 'medico',
              'medico': 'medico',
              'bioquímico': 'bioquimico',
              'bioquimico': 'bioquimico',
              'recepcionista': 'recepcion',
              'recepcion': 'recepcion',
              'despacho': 'despacho'
            };
            const targetRole: StaffRole = staffRoleMap[userRol] || 'administrador';
            const staffObj: StaffAccount = availableStaff.find(s => s.rol === targetRole) || {
              id: `staff-${apiRes.usuario.idUsuario}`,
              rol: targetRole,
              nombre: persona?.nombreCompleto || apiRes.usuario.username,
              cargo: apiRes.usuario.rol.nombreRol,
              ci: persona?.ci || '0000000',
              email: cleanEmail,
              turno: 'Turno Mañana (07:00 - 15:00)',
              credencial: `HV-${targetRole.toUpperCase()}-01`,
              sede: 'Banco de Sangre Central'
            };
            staffObj.password = cleanPwd;
            onSelectAccount({ type: targetRole, staff: staffObj } as any);
            onClose();
            return;
          }
        }
      }
    } catch (apiErr: any) {
      setLoginLoading(false);
      setLoginError(apiErr?.message || 'Error de autenticación: No se pudo verificar la cuenta en el servidor central de HemoVida en Render/Supabase.');
      return;
    } finally {
      setLoginLoading(false);
    }

    setLoginError(`No se encontró ninguna cuenta activa con el correo "${cleanEmail}". Verifique sus datos o regístrese en la pestaña "Crear Nueva Cuenta".`);
  };

  // 2. RECUPERACIÓN DE CONTRASEÑA POR CORREO ELECTRÓNICO (PASO 1: ENVIAR TOKEN)
  const handleRecoverPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setRecoveryError('Por favor ingrese un correo electrónico válido para recibir el código.');
      return;
    }
    setRecoveryLoading(true);
    try {
      const res = await apiService.requestPasswordReset(recoveryEmail);
      setRecoveryStep(2);
      setRecoveryMsg(res.message);
    } catch (err: any) {
      setRecoveryError(err?.message || 'Error al enviar el correo de verificación. Intente nuevamente.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // PASO 2: VALIDAR TOKEN Y ESTABLECER NUEVA CONTRASEÑA
  const handleConfirmRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryToken.trim()) {
      setRecoveryError('Debe ingresar el código de verificación de 6 dígitos.');
      return;
    }

    if (!recoveryPasswordRules.isValid) {
      const missing = getPasswordMissingAlerts(recoveryNewPassword, recoveryConfirmPassword);
      setRecoveryError(`La nueva contraseña debe cumplir con todos los requisitos: ${missing.join(', ')}`);
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError('Las contraseñas no coinciden.');
      return;
    }

    setRecoveryLoading(true);
    try {
      await apiService.confirmPasswordReset(recoveryEmail, recoveryToken.trim(), recoveryNewPassword);
      if (onUpdatePassword) {
        onUpdatePassword(recoveryEmail, recoveryNewPassword);
      }
      setRecoveryStep(3);
    } catch (err: any) {
      setRecoveryError(err?.message || 'Error al validar el código o actualizar la contraseña.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // 3. CREAR CUENTA SENCILLA PARA DONANTE
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterValidationAlerts([]);

    if (!regNombres.trim() || !regApellidos.trim()) {
      setRegisterError('Debe ingresar sus nombres y apellidos completos.');
      return;
    }

    if (!regCi.trim()) {
      setRegisterError('La Cédula de Identidad (C.I.) es obligatoria para su carnet de donante.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegisterError('Debe ingresar un correo electrónico válido para iniciar sesión.');
      return;
    }

    if (!regPassword.trim() || regPassword.length < 6) {
      setRegisterError('Por favor ingrese una contraseña de al menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegisterError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    const registeredUser: UserDonor = {
      id: Date.now(),
      ci: regCi.trim(),
      nombres: regNombres.trim(),
      apellidos: regApellidos.trim(),
      email: regEmail.trim().toLowerCase(),
      celular: regCelular.trim() || '+591 700-00000',
      sexo: regSexo,
      fechaNacimiento: regFechaNacimiento || '1998-05-15',
      nacionalidad: regNacionalidad.trim() || 'Boliviana',
      direccion: regDireccion.trim() || 'Santa Cruz de la Sierra',
      ocupacion: regOcupacion.trim() || 'Profesional Independiente',
      tipoDonante: regTipoDonante,
      carnetDigitalCodigo: `HV-DON-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      grupoSanguineo: regGrupo,
      factorRh: regRh,
      fechaUltimaDonacion: null,
      estadoHabilitacion: 'Apto',
      totalDonaciones: 0,
      volumenHistoricoMl: 0,
      password: regPassword
    };

    onSelectAccount({ type: 'donante', user: registeredUser });
    onClose();
  };

  // 4. CREAR SOLICITUD DE CUENTA PARA PERSONAL DE SALUD (REQUIERE APROBACIÓN DE ADMINISTRADOR)
  const handleRegisterStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegStaffError(null);
    setRegStaffValidationAlerts([]);

    if (!regStaffNombres.trim() || !regStaffApellidos.trim()) {
      setRegStaffError('Debe ingresar los nombres y apellidos completos del profesional de salud.');
      return;
    }

    if (!regStaffCi.trim()) {
      setRegStaffError('La Cédula de Identidad (C.I.) es obligatoria para la acreditación hospitalaria.');
      return;
    }

    if (!regStaffMatricula.trim()) {
      setRegStaffError('La Matrícula Profesional o Registro de Colegiatura Médica/Bioquímica/SEDES es obligatoria.');
      return;
    }

    if (!regStaffEmail.trim() || !regStaffEmail.includes('@')) {
      setRegStaffError('Debe ingresar un correo electrónico válido para autenticación institucional.');
      return;
    }

    if (!regStaffPassword.trim() || regStaffPassword.length < 6) {
      setRegStaffError('Por favor ingrese una contraseña de al menos 6 caracteres.');
      return;
    }

    if (regStaffPassword !== regStaffConfirmPassword) {
      setRegStaffError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    const prefixMap: Record<StaffRole, string> = {
      medico: 'MED',
      bioquimico: 'BIOQ',
      despacho: 'DESP',
      recepcion: 'REC',
      administrador: 'ADM'
    };
    const prefix = prefixMap[regStaffRol] || 'STF';
    const credCode = `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStaffMember: StaffAccount = {
      id: `staff-${regStaffRol}-${Date.now()}`,
      rol: regStaffRol,
      nombre: `${regStaffNombres.trim()} ${regStaffApellidos.trim()}`,
      cargo: regStaffCargo.trim() || `Personal de Salud (${regStaffRol})`,
      ci: regStaffCi.trim(),
      email: regStaffEmail.trim().toLowerCase(),
      turno: regStaffTurno,
      credencial: credCode,
      matriculaProfesional: regStaffMatricula.trim(),
      especialidad: regStaffCargo.trim(),
      telefono: regStaffCelular.trim() || '+591 700-00000',
      sede: regStaffSede,
      password: regStaffPassword,
      fechaSolicitud: new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      estadoAprobacion: 'pendiente'
    };

    if (onRequestStaffAccount) {
      onRequestStaffAccount(newStaffMember);
      setStaffRequestSent(true);
      setSubmittedStaffName(newStaffMember.nombre);
      setSubmittedStaffRole(newStaffMember.rol);
    } else {
      onSelectAccount({ type: regStaffRol, staff: newStaffMember } as any);
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden transform transition-all my-6"
        id="account-selector-modal"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <h3 className="text-xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Acceso Seguro • Banco de Sangre HemoVida
                </h3>
                <p className="text-xs text-rose-200/90 font-medium mt-0.5">
                  Autenticación con correo, política de contraseñas de 5 reglas y gestión de roles RBAC.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              id="close-account-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary View Switcher: [ Iniciar Sesión ] [ Crear Cuenta ] */}
          <div className="grid grid-cols-2 gap-1.5 mt-5 p-1 bg-white/10 backdrop-blur rounded-2xl border border-white/15 text-xs font-bold">
            <button
              onClick={() => { setModalMode('login'); setLoginError(null); }}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalMode === 'login' ? 'bg-rose-600 text-white shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              id="tab-mode-login"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Iniciar Sesión (Correo & Contraseña)</span>
            </button>

            <button
              onClick={() => { setModalMode('register'); setRegisterError(null); }}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalMode === 'register' ? 'bg-rose-600 text-white shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              id="tab-mode-register"
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Crear Nueva Cuenta</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {/* ========================================================
              MODE 1: INICIAR SESIÓN CON CORREO ELECTRÓNICO Y CONTRASEÑA
              ======================================================== */}
          {modalMode === 'login' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-rose-600" />
                    Iniciar Sesión con Correo Electrónico & Contraseña
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    El acceso al sistema está restringido únicamente a usuarios autenticados mediante correo electrónico y contraseña.
                  </p>
                </div>
              </div>

              {/* Login Error Alert */}
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Error de autenticación</span>
                    <span>{loginError}</span>
                  </div>
                </div>
              )}

              {/* Form - Sin autorrellenos ni contraseñas demo */}
              <form onSubmit={handleEmailPasswordLogin} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico (Obligatorio)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Ej. usuario@hemovida.org o mi.correo@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      id="input-login-email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Contraseña *
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Ingrese su contraseña"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      id="input-login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { 
                        setModalMode('forgot_password'); 
                        setRecoveryStep(1); 
                        setRecoveryError(null); 
                        setRecoveryToken('');
                        setRecoveryNewPassword('');
                        setRecoveryConfirmPassword('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña? Recuperar por correo
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  id="btn-submit-email-login"
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? (
                    <span>Validando credenciales...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle to Sign Up */}
              <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                ¿Aún no tienes cuenta registrada de donante?{' '}
                <button
                  type="button"
                  onClick={() => { setModalMode('register'); setRegisterError(null); }}
                  className="font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Regístrate aquí con tus datos personales
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              MODE: RECUPERAR CONTRASEÑA POR CORREO ELECTRÓNICO (TOKEN)
              ======================================================== */}
          {modalMode === 'forgot_password' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-rose-600" />
                    Recuperación de Contraseña con Token
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {recoveryStep === 1 && 'Ingrese su correo electrónico para recibir un código de verificación seguro de 6 dígitos.'}
                    {recoveryStep === 2 && 'Ingrese el código de verificación recibido e introduzca su nueva contraseña segura.'}
                    {recoveryStep === 3 && '¡Proceso completado! Su nueva contraseña ha sido establecida.'}
                  </p>
                </div>
              </div>

              {recoveryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* PASO 1: SOLICITAR TOKEN AL CORREO */}
              {recoveryStep === 1 && (
                <form onSubmit={handleRecoverPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correo Electrónico Registrado (Obligatorio)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="Ej. mi.correo@ejemplo.com o doctor@hemovida.org"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {recoveryLoading ? (
                      <span>Generando y enviando código...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Código / Token al Correo</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setModalMode('login')}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      ← Volver a la pantalla de Inicio de Sesión
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: INGRESAR TOKEN Y CREAR NUEVA CONTRASEÑA */}
              {recoveryStep === 2 && (
                <form onSubmit={handleConfirmRecoverySubmit} className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{recoveryMsg || `Código de verificación enviado a ${recoveryEmail}`}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Por favor revise su bandeja de entrada (y la carpeta de spam o correo no deseado) de <strong>{recoveryEmail}</strong>. Ingrese el código recibido a continuación para confirmar su identidad.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código / Token de Verificación (6 Dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Ej. 748291"
                      value={recoveryToken}
                      onChange={(e) => setRecoveryToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono text-center tracking-widest font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showRecoveryNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 8 caracteres (mayúscula, minúscula, número, especial)"
                        value={recoveryNewPassword}
                        onChange={(e) => setRecoveryNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryNewPassword(!showRecoveryNewPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRecoveryNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showRecoveryConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Repita la nueva contraseña"
                        value={recoveryConfirmPassword}
                        onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryConfirmPassword(!showRecoveryConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRecoveryConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <PasswordSecurityIndicator rules={recoveryPasswordRules} />
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryPasswordRules.isValid}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {recoveryLoading ? (
                      <span>Validando y actualizando...</span>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Restablecer y Crear Nueva Contraseña</span>
                      </>
                    )}
                  </button>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep(1)}
                      className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      ← Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('login')}
                      className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                    >
                      Cancelar e ir al login
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 3: CONFIRMACIÓN EXITOSA */}
              {recoveryStep === 3 && (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-emerald-950 text-base">¡Contraseña Restablecida con Éxito!</h5>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Su contraseña ha sido modificada correctamente para la cuenta <strong>{recoveryEmail}</strong>. Ya puede iniciar sesión de forma segura.
                  </p>
                  <button
                    type="button"
                    onClick={() => { 
                      setLoginEmail(recoveryEmail);
                      setLoginPassword('');
                      setModalMode('login'); 
                      setRecoveryStep(1); 
                    }}
                    className="mt-3 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Iniciar Sesión Ahora
                  </button>
                </div>
              )}
            </div>
          )}


          {/* ========================================================
              MODE 2: CREAR CUENTA (DONANTE O PERSONAL DE SALUD)
              ======================================================== */}
          {modalMode === 'register' && (
            <div className="space-y-4">
              {/* SELECTOR DE TIPO DE CUENTA: DONANTE VS PERSONAL DE SALUD */}
              <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 text-xs font-bold border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => { setRegisterAccountType('donante'); setRegisterError(null); setRegStaffError(null); }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerAccountType === 'donante'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  id="btn-register-type-donor"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Cuenta de Donante</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setRegisterAccountType('personal_salud'); setRegisterError(null); setRegStaffError(null); }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerAccountType === 'personal_salud'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  id="btn-register-type-staff"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-amber-300" />
                  <span>Personal de Salud / Staff</span>
                </button>
              </div>

              {/* ----------------------------------------------------
                  SUB-RAMA A: REGISTRO DE DONANTE DE SANGRE
                  ---------------------------------------------------- */}
              {registerAccountType === 'donante' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 text-rose-600" />
                        Registro de Cuenta & Carnet Digital de Donante
                      </h4>
                      <p className="text-xs text-slate-500">
                        Complete sus datos personales para habilitar su carnet y trazabilidad hematológica oficial.
                      </p>
                    </div>

                    {/* BOTÓN RELLENADO RÁPIDO DE DATOS PERSONALES DONANTE */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearRegisterForm}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold flex items-center gap-1"
                        title="Limpiar formulario"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </div>

                  {/* Register Error / Policy Alert */}
                  {registerError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold text-rose-700">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{registerError}</span>
                      </div>
                      {registerValidationAlerts.length > 0 && (
                        <ul className="list-disc list-inside text-rose-800 text-[11px] space-y-0.5 pl-1">
                          {registerValidationAlerts.map((msg, idx) => (
                            <li key={idx}><strong>Requisito faltante:</strong> {msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {/* 1. SECCIÓN IDENTIDAD PERSONAL */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-rose-600" />
                        1. Datos de Identidad Personal
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Nombres *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Mariana Nicole"
                            value={regNombres}
                            onChange={(e) => setRegNombres(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-nombres-input"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Apellidos *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Fernández Justiniano"
                            value={regApellidos}
                            onChange={(e) => setRegApellidos(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-apellidos-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Cédula de Identidad (C.I.) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. 8492014 SC"
                            value={regCi}
                            onChange={(e) => setRegCi(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-ci-input"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Fecha de Nacimiento
                          </label>
                          <input
                            type="date"
                            required
                            value={regFechaNacimiento}
                            onChange={(e) => setRegFechaNacimiento(e.target.value)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Sexo Biológico (Intervalo)
                          </label>
                          <select
                            value={regSexo}
                            onChange={(e) => setRegSexo(e.target.value as 'M' | 'F')}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            <option value="M">Masculino (90 días descanso)</option>
                            <option value="F">Femenino (120 días descanso)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. SECCIÓN CONTACTO & DOMICILIO */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-rose-600" />
                        2. Contacto & Domicilio
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Correo Electrónico (para inicio de sesión) *
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="email"
                              required
                              placeholder="usuario@ejemplo.com"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-email-input"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Celular / WhatsApp *
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="tel"
                              required
                              placeholder="+591 760-00000"
                              value={regCelular}
                              onChange={(e) => setRegCelular(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Dirección de Domicilio
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Ej. Equipetrol Norte, Calle 8 #142"
                              value={regDireccion}
                              onChange={(e) => setRegDireccion(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Ocupación / Profesión
                          </label>
                          <div className="relative">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Ej. Docente, Ingeniero, Estudiante"
                              value={regOcupacion}
                              onChange={(e) => setRegOcupacion(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. SECCIÓN GRUPO SANGUÍNEO & MODALIDAD */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-rose-600 fill-current" />
                        3. Perfil Hematológico & Modalidad
                      </span>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Grupo Sanguíneo
                          </label>
                          <select
                            value={regGrupo}
                            onChange={(e) => setRegGrupo(e.target.value as BloodGroup)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                          >
                            <option value="O">Grupo O</option>
                            <option value="A">Grupo A</option>
                            <option value="B">Grupo B</option>
                            <option value="AB">Grupo AB</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Factor Rh
                          </label>
                          <select
                            value={regRh}
                            onChange={(e) => setRegRh(e.target.value as RhFactor)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                          >
                            <option value="Positivo">Positivo (+)</option>
                            <option value="Negativo">Negativo (-)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Modalidad
                          </label>
                          <select
                            value={regTipoDonante}
                            onChange={(e) => setRegTipoDonante(e.target.value as any)}
                            className="w-full px-2 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            <option value="Voluntario Altruista">Voluntario</option>
                            <option value="Reposicion Familiar">Reposición</option>
                            <option value="Brigada Movil">Brigada</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 4. SECCIÓN CONTRASEÑA CON ALERTA DE LAS 5 REGLAS */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        4. Credenciales de Seguridad (Contraseña)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Contraseña *
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer font-semibold"
                            >
                              {showRegPassword ? 'Ocultar' : 'Ver'}
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              required
                              placeholder="Ej. MiClave#2026"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showRegPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Confirmar Contraseña *
                          </label>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              required
                              placeholder="Repite exactamente la contraseña"
                              value={regConfirmPassword}
                              onChange={(e) => setRegConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-confirm-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showRegPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ALERTA DE LAS 5 REGLAS DE SEGURIDAD (8 caracteres, 1 min, 1 may, 1 numero, 1 especial) */}
                      <PasswordSecurityIndicator
                        rules={regPasswordRules}
                        showMatchRule={true}
                        isCreationMode={true}
                      />
                    </div>

                    {/* Submit Register Button */}
                    <button
                      type="submit"
                      disabled={!regPasswordRules.isValid}
                      className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                        regPasswordRules.isValid 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md shadow-rose-600/30' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      id="btn-submit-donor-register"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>Crear Cuenta & Obtener Carnet Digital Acreditado</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* ----------------------------------------------------
                  SUB-RAMA B: REGISTRO DE PERSONAL DE SALUD / STAFF
                  ---------------------------------------------------- */}
              {registerAccountType === 'personal_salud' && staffRequestSent ? (
                <div className="p-6 bg-amber-50/90 border border-amber-200 rounded-2xl text-center space-y-4 animate-fadeIn">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-900 text-base">¡Solicitud de Cuenta Institucional Enviada!</h5>
                    <p className="text-xs text-amber-900 font-semibold">
                      Registro para: <span className="text-slate-900 font-bold">{submittedStaffName}</span> ({submittedStaffRole.toUpperCase()})
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Por motivos de bioseguridad y control de acceso hospitalario, las cuentas de personal de salud requieren la <strong>aprobación previa del Administrador del Sistema</strong>.
                  </p>
                  <div className="p-3 bg-white border border-amber-200 rounded-xl text-left text-xs text-slate-700 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-amber-800 font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Estado: En espera de validación administrativa</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      El administrador del Banco de Sangre ha recibido su solicitud en su panel de control. Una vez validada su matrícula y rol, se activará su credencial y podrá iniciar sesión con su correo y contraseña.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setStaffRequestSent(false); setModalMode('login'); }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Ir al Inicio de Sesión</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStaffRequestSent(false); handleClearStaffForm(); }}
                      className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Nueva Solicitud
                    </button>
                  </div>
                </div>
              ) : registerAccountType === 'personal_salud' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-rose-600" />
                        Registro de Personal de Salud & Acreditación Institucional
                      </h4>
                      <p className="text-xs text-slate-500">
                        Alta de facultativos médicos, bioquímicos, despacho o administración con matrícula profesional y acceso seguro.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearStaffForm}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold flex items-center gap-1"
                        title="Limpiar formulario"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </div>

                  {/* Error Alert for Staff */}
                  {regStaffError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold text-rose-700">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{regStaffError}</span>
                      </div>
                      {regStaffValidationAlerts.length > 0 && (
                        <ul className="list-disc list-inside text-rose-800 text-[11px] space-y-0.5 pl-1">
                          {regStaffValidationAlerts.map((msg, idx) => (
                            <li key={idx}><strong>Requisito faltante:</strong> {msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleRegisterStaffSubmit} className="space-y-4">
                    {/* SELECCIÓN DE ROL / ESPECIALIDAD SANITARIA */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-rose-600" />
                          Seleccione su Rol Institucional en el Banco de Sangre
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                          Obligatorio
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleStaffRoleChange('medico')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            regStaffRol === 'medico'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <Stethoscope className="w-4 h-4" />
                          <span className="text-[11px]">Médico Triaje</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStaffRoleChange('bioquimico')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            regStaffRol === 'bioquimico'
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <FlaskConical className="w-4 h-4" />
                          <span className="text-[11px]">Bioquímica</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStaffRoleChange('despacho')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            regStaffRol === 'despacho'
                              ? 'bg-red-700 text-white border-red-700 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                          <span className="text-[11px]">Despacho</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStaffRoleChange('recepcion')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            regStaffRol === 'recepcion'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[11px]">Recepción</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStaffRoleChange('administrador')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            regStaffRol === 'administrador'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <KeyRound className="w-4 h-4" />
                          <span className="text-[11px]">Admin RBAC</span>
                        </button>
                      </div>
                    </div>

                    {/* 1. SECCIÓN IDENTIDAD PROFESIONAL */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                        1. Datos Personales & Colegiatura Profesional
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Nombres del Profesional *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Dr. Marcelo Antonio"
                            value={regStaffNombres}
                            onChange={(e) => setRegStaffNombres(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-staff-nombres-input"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Apellidos *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Rocha Justiniano"
                            value={regStaffApellidos}
                            onChange={(e) => setRegStaffApellidos(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-staff-apellidos-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Cédula de Identidad (C.I.) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. 5819441 SC"
                            value={regStaffCi}
                            onChange={(e) => setRegStaffCi(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-staff-ci-input"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Matrícula Profesional / Registro SEDES / Colegio *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. MP-9412-SC o BIOQ-SC-7821"
                            value={regStaffMatricula}
                            onChange={(e) => setRegStaffMatricula(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            id="reg-staff-matricula-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Cargo / Título Oficial Asignado *
                        </label>
                        <input
                          type="text"
                          required
                          value={regStaffCargo}
                          onChange={(e) => setRegStaffCargo(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Turno de Guardia Asignado
                          </label>
                          <select
                            value={regStaffTurno}
                            onChange={(e) => setRegStaffTurno(e.target.value)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            <option value="Turno Mañana (07:00 - 15:00)">Turno Mañana (07:00 - 15:00)</option>
                            <option value="Turno Tarde (14:00 - 22:00)">Turno Tarde (14:00 - 22:00)</option>
                            <option value="Guardia Transfusional 24h">Guardia Transfusional 24h</option>
                            <option value="Laboratorio Central 24h">Laboratorio Central 24h</option>
                            <option value="Dirección Central Continua">Dirección Central Continua</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Sede Hospitalaria / Banco de Sangre
                          </label>
                          <select
                            value={regStaffSede}
                            onChange={(e) => setRegStaffSede(e.target.value)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            <option value="Banco de Sangre Central (Calle Warnes)">Banco Central Warnes</option>
                            <option value="Hospital Japonés (Sede Tercer Nivel)">Hospital Japonés</option>
                            <option value="Clínica Foianini">Clínica Foianini</option>
                            <option value="Hospital de la Mujer Percy Boland">Hospital Percy Boland</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. SECCIÓN CONTACTO INSTITUCIONAL & CREDENCIAL */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-rose-600" />
                        2. Contacto Institucional & Credencial de Acceso
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Correo Institucional (para inicio de sesión) *
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="email"
                              required
                              placeholder="doctor.apellido@hemovida.org"
                              value={regStaffEmail}
                              onChange={(e) => setRegStaffEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-staff-email-input"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Celular / WhatsApp Institucional
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="tel"
                              placeholder="+591 770-00000"
                              value={regStaffCelular}
                              onChange={(e) => setRegStaffCelular(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          Credencial Oficial Asignada:
                        </span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {regStaffRol.toUpperCase()}-2026-AUTOGEN
                        </span>
                      </div>
                    </div>

                    {/* 3. SECCIÓN CONTRASEÑA CON ALERTA DE LAS 5 REGLAS */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        3. Contraseña Segura Institucional (5 Reglas de Seguridad)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Contraseña *
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowRegStaffPassword(!showRegStaffPassword)}
                              className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer font-semibold"
                            >
                              {showRegStaffPassword ? 'Ocultar' : 'Ver'}
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type={showRegStaffPassword ? 'text' : 'password'}
                              required
                              placeholder="Ej. HemoVida#2026"
                              value={regStaffPassword}
                              onChange={(e) => setRegStaffPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-staff-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegStaffPassword(!showRegStaffPassword)}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showRegStaffPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                              {showRegStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Confirmar Contraseña *
                          </label>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type={showRegStaffPassword ? 'text' : 'password'}
                              required
                              placeholder="Repite exactamente la contraseña"
                              value={regStaffConfirmPassword}
                              onChange={(e) => setRegStaffConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                              id="reg-staff-confirm-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegStaffPassword(!showRegStaffPassword)}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showRegStaffPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                              {showRegStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ALERTA DE LAS 5 REGLAS DE SEGURIDAD PARA PERSONAL DE SALUD */}
                      <PasswordSecurityIndicator
                        rules={regStaffPasswordRules}
                        showMatchRule={true}
                        isCreationMode={true}
                      />
                    </div>

                    {/* Submit Register Staff Button */}
                    <button
                      type="submit"
                      disabled={!regStaffPasswordRules.isValid}
                      className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                        regStaffPasswordRules.isValid 
                          ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-md shadow-slate-900/30' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      id="btn-submit-staff-register"
                    >
                      <Stethoscope className="w-4 h-4 text-amber-300" />
                      <span>Enviar Solicitud de Registro para Aprobación Administrativa</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* Toggle back to Login */}
              <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                ¿Ya posees una cuenta registrada en el sistema?{' '}
                <button
                  type="button"
                  onClick={() => { setModalMode('login'); setLoginError(null); setRegStaffError(null); }}
                  className="font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Inicia sesión aquí con tu correo y contraseña
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Sistema de Hemovigilancia HemoVida • Control de Acceso Seguro
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Seguridad Clínica & Trazabilidad
          </span>
        </div>
      </div>
    </div>
  );
};
