import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardSummary } from './components/DashboardSummary';
import { AppointmentsSection } from './components/AppointmentsSection';
import { DonationHistorySection } from './components/DonationHistorySection';
import { CentersMapSection } from './components/CentersMapSection';
import { LoginModal, AccountLoginSelection } from './components/LoginModal';
import { DigitalCardModal } from './components/DigitalCardModal';
import { PrecheckModal } from './components/PrecheckModal';
import { ReceptionDeskView } from './components/reception/ReceptionDeskView';
import { DispatchDeskView } from './components/dispatch/DispatchDeskView';
import { AdminAuditView } from './components/admin/AdminAuditView';
import { DoctorTriageView } from './components/doctor/DoctorTriageView';
import { LabProcessingView } from './components/lab/LabProcessingView';
import { 
  MOCK_USERS, 
  MOCK_STAFF_ACCOUNTS,
  MOCK_CENTERS, 
  MOCK_DONATIONS, 
  MOCK_APPOINTMENTS, 
  MOCK_INVENTORY,
  MOCK_DISPATCHES,
  MOCK_PATIENT_REPLACEMENTS,
  MOCK_BITACORA,
  MOCK_STOCK_THRESHOLDS,
  MOCK_CLINICAL_TRIAJES,
  MOCK_LAB_ANALYSES,
  MOCK_BAJAS_INVENTARIO,
  MOCK_INCENTIVOS_ENTREGA
} from './data/mockData';
import { 
  UserDonor, 
  StaffAccount,
  AppRole,
  UserSession,
  Appointment, 
  DonationRecord,
  BloodInventoryItem,
  BloodDispatchRecord,
  PatientReplacementRecord,
  BitacoraAuditoria,
  StockThresholdConfig,
  ClinicalTriageRecord,
  LaboratoryAnalysisRecord,
  BajaInventarioRecord,
  IncentivoEntregaRecord,
  EmergencyActRecord,
  CompatibilityTestRecord
} from './types';
import { generateForensicIp } from './utils/security';
import { 
  Droplet, 
  Heart, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  History, 
  CreditCard, 
  Truck, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  LogIn,
  UserCheck,
  UserPlus,
  BadgeCheck,
  Stethoscope,
  FlaskConical,
  KeyRound
} from 'lucide-react';

export default function App() {
  // Active Exclusive Session: Either Donante, Recepcion, Despacho, Administrador, Medico, or Bioquimico
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('hemovida_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && ['donante', 'recepcion', 'despacho', 'administrador', 'medico', 'bioquimico'].includes(parsed.role)) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Access is restricted strictly to email and password authentication: no default auto-login!
    return null;
  });

  // Core Data States with localStorage persistence
  const [inventory, setInventory] = useState<BloodInventoryItem[]>(() => {
    const saved = localStorage.getItem('hemovida_inventory');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_INVENTORY; }
    }
    return MOCK_INVENTORY;
  });

  const [dispatches, setDispatches] = useState<BloodDispatchRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_dispatches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_DISPATCHES; }
    }
    return MOCK_DISPATCHES;
  });

  const [replacements, setReplacements] = useState<PatientReplacementRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_replacements');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_PATIENT_REPLACEMENTS; }
    }
    return MOCK_PATIENT_REPLACEMENTS;
  });

  const [donors, setDonors] = useState<UserDonor[]>(() => {
    const saved = localStorage.getItem('hemovida_donors_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_USERS; }
    }
    return MOCK_USERS;
  });

  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => {
    const saved = localStorage.getItem('hemovida_staff_accounts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_STAFF_ACCOUNTS; }
    }
    return MOCK_STAFF_ACCOUNTS;
  });

  const [pendingStaffRequests, setPendingStaffRequests] = useState<StaffAccount[]>(() => {
    const saved = localStorage.getItem('hemovida_pending_staff_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: 'STAFF-REQ-001',
        rol: 'medico',
        nombre: 'Dr. Alejandro Vaca Moreno',
        cargo: 'Médico Hemoterapeuta & Encargado de Triaje Clínico',
        ci: '4912084 SC',
        matricula: 'MP-8831-SC',
        credencial: 'MEDICO-2026-AUTOGEN',
        email: 'alejandro.vaca@hemovida.org',
        turno: 'Turno Mañana (07:00 - 15:00)',
        sede: 'Hospital Japonés (Sede Tercer Nivel)',
        telefono: '+591 780-33211',
        password: 'Password#2026',
        fechaSolicitud: '28 Sep 2026, 09:30',
        estadoAprobacion: 'pendiente'
      }
    ];
  });

  const [allDonations, setAllDonations] = useState<DonationRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_all_donations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_DONATIONS; }
    }
    return MOCK_DONATIONS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('hemovida_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_APPOINTMENTS; }
    }
    return MOCK_APPOINTMENTS;
  });

  // CU03: Forensic Audit Logs
  const [auditLogs, setAuditLogs] = useState<BitacoraAuditoria[]>(() => {
    const saved = localStorage.getItem('hemovida_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_BITACORA; }
    }
    return MOCK_BITACORA;
  });

  // CU04: Stock Threshold Config
  const [stockThresholds, setStockThresholds] = useState<StockThresholdConfig[]>(() => {
    const saved = localStorage.getItem('hemovida_stock_thresholds');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_STOCK_THRESHOLDS; }
    }
    return MOCK_STOCK_THRESHOLDS;
  });

  // CU10 / CU11: Clinical Triajes
  const [triajes, setTriajes] = useState<ClinicalTriageRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_clinical_triajes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_CLINICAL_TRIAJES; }
    }
    return MOCK_CLINICAL_TRIAJES;
  });

  // CU13 / CU14: Parallel Lab Analyses
  const [labAnalyses, setLabAnalyses] = useState<LaboratoryAnalysisRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_lab_analyses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_LAB_ANALYSES; }
    }
    return MOCK_LAB_ANALYSES;
  });

  // CU14: Bajas Inventario
  const [bajasInventario, setBajasInventario] = useState<BajaInventarioRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_bajas_inventario');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_BAJAS_INVENTARIO; }
    }
    return MOCK_BAJAS_INVENTARIO;
  });

  // CU09: Incentivos Entrega
  const [incentivosEntrega, setIncentivosEntrega] = useState<IncentivoEntregaRecord[]>(() => {
    const saved = localStorage.getItem('hemovida_incentivos_entrega');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return MOCK_INCENTIVOS_ENTREGA; }
    }
    return MOCK_INCENTIVOS_ENTREGA;
  });

  // Active view tab in donor portal
  const [activeTab, setActiveTab] = useState<'inicio' | 'citas' | 'historial' | 'mapa' | 'carnet' | 'autoevaluacion'>('inicio');

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalInitialRole, setLoginModalInitialRole] = useState<AppRole>('donante');
  const [loginModalInitialMode, setLoginModalInitialMode] = useState<'login' | 'register'>('login');
  const [loginModalInitialEmail, setLoginModalInitialEmail] = useState<string>('');
  const [loginModalInitialRegisterType, setLoginModalInitialRegisterType] = useState<'donante' | 'personal_salud'>('donante');
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);
  const [isPrecheckOpen, setIsPrecheckOpen] = useState(false);
  const [preselectedCenterId, setPreselectedCenterId] = useState<string | null>(null);

  // Persistence effects
  useEffect(() => {
    if (session) {
      localStorage.setItem('hemovida_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('hemovida_session');
    }
  }, [session]);

  useEffect(() => {
    localStorage.setItem('hemovida_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('hemovida_dispatches', JSON.stringify(dispatches));
  }, [dispatches]);

  useEffect(() => {
    localStorage.setItem('hemovida_replacements', JSON.stringify(replacements));
  }, [replacements]);

  useEffect(() => {
    localStorage.setItem('hemovida_donors_list', JSON.stringify(donors));
  }, [donors]);

  useEffect(() => {
    localStorage.setItem('hemovida_staff_accounts', JSON.stringify(staffAccounts));
  }, [staffAccounts]);

  useEffect(() => {
    localStorage.setItem('hemovida_pending_staff_requests', JSON.stringify(pendingStaffRequests));
  }, [pendingStaffRequests]);

  useEffect(() => {
    localStorage.setItem('hemovida_all_donations', JSON.stringify(allDonations));
  }, [allDonations]);

  useEffect(() => {
    localStorage.setItem('hemovida_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('hemovida_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('hemovida_stock_thresholds', JSON.stringify(stockThresholds));
  }, [stockThresholds]);

  useEffect(() => {
    localStorage.setItem('hemovida_clinical_triajes', JSON.stringify(triajes));
  }, [triajes]);

  useEffect(() => {
    localStorage.setItem('hemovida_lab_analyses', JSON.stringify(labAnalyses));
  }, [labAnalyses]);

  useEffect(() => {
    localStorage.setItem('hemovida_bajas_inventario', JSON.stringify(bajasInventario));
  }, [bajasInventario]);

  useEffect(() => {
    localStorage.setItem('hemovida_incentivos_entrega', JSON.stringify(incentivosEntrega));
  }, [incentivosEntrega]);

  // Authentication & Session Handlers (CU01 / CU02 / CU03)
  const handleSelectAccount = (selection: AccountLoginSelection) => {
    if (selection.type === 'donante') {
      setDonors(prev => {
        const exists = prev.some(d => d.id === selection.user.id || d.ci === selection.user.ci || (d.email && d.email.toLowerCase() === selection.user.email.toLowerCase()));
        if (!exists) {
          return [selection.user, ...prev];
        }
        return prev;
      });
      setSession({ role: 'donante', user: selection.user });
      setActiveTab('inicio');
    } else {
      // Healthcare Staff role login / registration
      setStaffAccounts(prev => {
        const exists = prev.some(s => s.id === selection.staff.id || (s.email && s.email.toLowerCase() === selection.staff.email.toLowerCase()) || s.ci === selection.staff.ci);
        if (!exists) {
          return [selection.staff, ...prev];
        }
        return prev;
      });
      if (selection.type === 'recepcion') {
        setSession({ role: 'recepcion', staff: selection.staff });
      } else if (selection.type === 'despacho') {
        setSession({ role: 'despacho', staff: selection.staff });
      } else if (selection.type === 'administrador') {
        setSession({ role: 'administrador', staff: selection.staff });
      } else if (selection.type === 'medico') {
        setSession({ role: 'medico', staff: selection.staff });
      } else if (selection.type === 'bioquimico') {
        setSession({ role: 'bioquimico', staff: selection.staff });
      }
    }

    // CU03: Log event in forensic audit log
    const actorName = selection.type === 'donante' 
      ? `${selection.user.nombres} ${selection.user.apellidos}` 
      : selection.staff.nombre;
    const actorCi = selection.type === 'donante' ? selection.user.ci : selection.staff.ci;

    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: actorName,
      actorRol: selection.type,
      actorCi,
      ipSimulada: generateForensicIp(),
      tipoEvento: 'LOGIN',
      accion: `Inicio de sesión autorizada en rol ${selection.type.toUpperCase()}`,
      detalles: `Autenticación exitosa con credenciales validadas bajo política de contraseñas seguras.`
    };

    setAuditLogs(prev => [auditEntry, ...prev]);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    if (session) {
      const actorName = session.role === 'donante' 
        ? `${session.user.nombres} ${session.user.apellidos}` 
        : session.staff.nombre;
      const actorCi = session.role === 'donante' ? session.user.ci : session.staff.ci;

      const auditEntry: BitacoraAuditoria = {
        idEvento: `EVT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorNombre: actorName,
        actorRol: session.role,
        actorCi,
        ipSimulada: generateForensicIp(),
        tipoEvento: 'LOGOUT',
        accion: `Cierre formal de sesión de ${session.role.toUpperCase()}`,
        detalles: `Sesión cerrada voluntariamente. Terminal segura.`
      };
      setAuditLogs(prev => [auditEntry, ...prev]);
    }
    setSession(null);
    setIsLoginModalOpen(false);
  };

  const handleOpenLogin = (email: string = '') => {
    setLoginModalInitialMode('login');
    setLoginModalInitialRole('donante');
    setLoginModalInitialEmail(email);
    setIsLoginModalOpen(true);
  };

  const handleOpenRegister = (type: 'donante' | 'personal_salud' = 'donante', role: AppRole = 'donante') => {
    setLoginModalInitialMode('register');
    setLoginModalInitialRegisterType(type);
    setLoginModalInitialRole(role);
    setIsLoginModalOpen(true);
  };

  const handleOpenLoginForRole = (role: AppRole) => {
    const roleEmails: Record<AppRole, string> = {
      donante: 'carlos.pimentel@hemovida.org',
      recepcion: 'recepcion@hemovida.org',
      despacho: 'despacho@hemovida.org',
      medico: 'medico@hemovida.org',
      bioquimico: 'laboratorio@hemovida.org',
      administrador: 'admin@hemovida.org'
    };
    setLoginModalInitialRole(role);
    setLoginModalInitialMode('login');
    setLoginModalInitialEmail(roleEmails[role] || '');
    setIsLoginModalOpen(true);
  };

  const handleRequestStaffAccount = (newStaff: StaffAccount) => {
    setPendingStaffRequests(prev => {
      const exists = prev.some(s => s.ci === newStaff.ci || s.email.toLowerCase() === newStaff.email.toLowerCase());
      if (exists) {
        return prev.map(s => (s.ci === newStaff.ci || s.email.toLowerCase() === newStaff.email.toLowerCase()) ? newStaff : s);
      }
      return [newStaff, ...prev];
    });

    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: newStaff.nombre,
      actorRol: newStaff.rol,
      actorCi: newStaff.ci,
      ipSimulada: generateForensicIp(),
      tipoEvento: 'SOLICITUD_PERSONAL',
      accion: `Solicitud de Cuenta de Personal de Salud (${newStaff.rol.toUpperCase()})`,
      detalles: `El profesional ${newStaff.nombre} (Matrícula: ${newStaff.matricula || newStaff.matriculaProfesional || 'N/A'}) solicitó alta institucional. Pendiente de aprobación administrativa.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
  };

  const handleApproveStaff = (staffId: string) => {
    const staffToApprove = pendingStaffRequests.find(s => s.id === staffId);
    if (!staffToApprove) return;

    const approvedStaff: StaffAccount = {
      ...staffToApprove,
      estadoAprobacion: 'aprobado'
    };

    setPendingStaffRequests(prev => prev.filter(s => s.id !== staffId));
    setStaffAccounts(prev => {
      const exists = prev.some(s => s.id === approvedStaff.id || s.email.toLowerCase() === approvedStaff.email.toLowerCase() || s.ci === approvedStaff.ci);
      if (exists) {
        return prev.map(s => (s.id === approvedStaff.id || s.email.toLowerCase() === approvedStaff.email.toLowerCase() || s.ci === approvedStaff.ci) ? approvedStaff : s);
      }
      return [approvedStaff, ...prev];
    });

    const adminActor = (session && session.role !== 'donante') ? session.staff : { nombre: 'Administrador del Sistema', ci: '1000000 SC' };

    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: adminActor.nombre,
      actorRol: 'administrador',
      actorCi: adminActor.ci,
      ipSimulada: generateForensicIp(),
      tipoEvento: 'APROBACION_PERSONAL',
      accion: `Aprobación de Cuenta de Personal: ${approvedStaff.nombre} (${approvedStaff.rol.toUpperCase()})`,
      detalles: `El administrador aprobó la solicitud institucional. Matrícula: ${approvedStaff.matricula || approvedStaff.matriculaProfesional || 'N/A'}, Sede: ${approvedStaff.sede || 'Central'}. Acceso habilitado.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    alert(`Cuenta de ${approvedStaff.nombre} aprobada exitosamente. Ahora puede iniciar sesión con sus credenciales.`);
  };

  const handleRejectStaff = (staffId: string) => {
    const staffToReject = pendingStaffRequests.find(s => s.id === staffId);
    setPendingStaffRequests(prev => prev.filter(s => s.id !== staffId));

    if (staffToReject) {
      const adminActor = (session && session.role !== 'donante') ? session.staff : { nombre: 'Administrador del Sistema', ci: '1000000 SC' };

      const auditEntry: BitacoraAuditoria = {
        idEvento: `EVT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorNombre: adminActor.nombre,
        actorRol: 'administrador',
        actorCi: adminActor.ci,
        ipSimulada: generateForensicIp(),
        tipoEvento: 'RECHAZO_PERSONAL',
        accion: `Rechazo de Solicitud de Personal: ${staffToReject.nombre}`,
        detalles: `El administrador rechazó la solicitud de registro institucional.`
      };
      setAuditLogs(prev => [auditEntry, ...prev]);
    }
  };

  const handleAddAppointment = (newApp: Appointment) => {
    setAppointments(prev => [newApp, ...prev]);
  };

  const handleCancelAppointment = (idCita: number) => {
    setAppointments(prev =>
      prev.map(app => (app.idCita === idCita ? { ...app, estadoCita: 'Cancelada' } : app))
    );
  };

  const handleSelectCenterToBook = (centerId: string) => {
    setPreselectedCenterId(centerId);
    setActiveTab('citas');
  };

  // CU10 / CU11: Doctor confirms triage
  const handleConfirmDoctorTriage = (
    triageRecord: ClinicalTriageRecord,
    updatedDonor: UserDonor,
    updatedAppointment?: Appointment
  ) => {
    setTriajes(prev => [triageRecord, ...prev]);
    setDonors(prev => prev.map(d => d.id === updatedDonor.id ? updatedDonor : d));
    if (updatedAppointment) {
      setAppointments(prev => prev.map(a => a.idCita === updatedAppointment.idCita ? updatedAppointment : a));
    }

    // Audit log
    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: triageRecord.doctorNombre,
      actorRol: 'medico',
      actorCi: '5190422 SC',
      ipSimulada: generateForensicIp(),
      tipoEvento: 'FLEBOTOMIA_REGISTRADA',
      accion: `Triaje Clínico Médico Realizado: Dictamen ${triageRecord.dictamen}`,
      detalles: `Postulante ${triageRecord.donanteNombre} (C.I. ${triageRecord.donanteCi}). PA: ${triageRecord.signosVitales.presionSistolica}/${triageRecord.signosVitales.presionDiastolica}, Peso: ${triageRecord.signosVitales.pesoKg}kg, Hb: ${triageRecord.signosVitales.hemoglobinaGdl}g/dL.`,
      entidadId: triageRecord.idTriaje
    };
    setAuditLogs(prev => [auditEntry, ...prev]);

    alert(`Dictamen médico registrado exitosamente: ${triageRecord.dictamen}.`);
  };

  // Pre-configured staff accounts
  const receptionStaff = MOCK_STAFF_ACCOUNTS.find(s => s.rol === 'recepcion') || MOCK_STAFF_ACCOUNTS[0];
  const dispatchStaff = MOCK_STAFF_ACCOUNTS.find(s => s.rol === 'despacho') || MOCK_STAFF_ACCOUNTS[1];
  const adminStaff = MOCK_STAFF_ACCOUNTS.find(s => s.rol === 'administrador') || MOCK_STAFF_ACCOUNTS[2];
  const medicoStaff = MOCK_STAFF_ACCOUNTS.find(s => s.rol === 'medico') || MOCK_STAFF_ACCOUNTS[3];
  const bioquimicoStaff = MOCK_STAFF_ACCOUNTS.find(s => s.rol === 'bioquimico') || MOCK_STAFF_ACCOUNTS[4];

  // Donor-specific filter for donor portal
  const currentDonorUser = session?.role === 'donante' ? session.user : null;
  const userDonations = currentDonorUser 
    ? allDonations.filter(d => d.donanteCi === currentDonorUser.ci || (d.donanteNombre && d.donanteNombre.toLowerCase().includes(currentDonorUser.nombres.toLowerCase())))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      {/* Primary Navigation Bar */}
      <Navbar
        session={session}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'carnet') {
            setIsDigitalCardOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenLogin={handleOpenLogin}
        onOpenRegister={() => handleOpenRegister('donante')}
        onLogout={handleLogout}
        onOpenPrecheck={() => setIsPrecheckOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* ======================================================== */}
        {/* ESTADO 1: SESIÓN NO INICIADA -> PORTAL DE ACCESO         */}
        {/* ======================================================== */}
        {!session && (
          <div className="max-w-5xl mx-auto space-y-8 my-4">
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-rose-900/40 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 bg-rose-600/30 border border-rose-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-rose-200">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Acceso Restringido • Solo con Correo Electrónico y Contraseña</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Banco de Sangre & Transfusión HemoVida
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                  Por estrictas normas de seguridad, confidencialidad y control RBAC, <strong>el acceso a todos los módulos está restringido únicamente a usuarios autenticados mediante correo electrónico y contraseña</strong>. No se permite el acceso sin credenciales válidas.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleOpenLogin()}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
                    id="btn-hero-primary-login"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión con Correo & Contraseña</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenRegister('donante')}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <BadgeCheck className="w-4 h-4 text-rose-300" />
                    <span>Registrar Nueva Cuenta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Tarjetas de Selección de Rol Exclusivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* ROL 1: DONADOR */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <Heart className="w-6 h-6 fill-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      Portal Ciudadano
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Donador de Sangre</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Carnet digital con QR, autoevaluación médica en línea, reserva de citas y seguimiento de historial hematológico.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-rose-700 font-bold">carlos.pimentel@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('donante')}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    id="btn-portal-donor-login"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('donante')}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    id="btn-portal-donor-register"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>+ Crear Cuenta de Donante</span>
                  </button>
                </div>
              </div>

              {/* ROL 2: RECEPCIÓN */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Cuenta Institucional
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Recepción & Admisión</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Confirmación de asistencia física en ventanilla, validación biológica por C.I., entrega de incentivos y reposición de pacientes internados.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-amber-800 font-bold">recepcion@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('recepcion')}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('personal_salud', 'recepcion')}
                    className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Personal de Recepción</span>
                  </button>
                </div>
              </div>

              {/* ROL 3: DESPACHO */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                      Cuenta Institucional
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Despacho Transfusional</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Gestión de Código Rojo transfusional, pruebas de compatibilidad cruzada, aranceles y monitoreo de cadena de frío.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-red-700 font-bold">despacho@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('despacho')}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-amber-300" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('personal_salud', 'despacho')}
                    className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Personal de Despacho</span>
                  </button>
                </div>
              </div>

              {/* ROL 4: MÉDICO TRIAJE */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      Área Clínica
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Médico de Triaje Clínico</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Control de signos vitales, peso (&gt;50kg), hemoglobina capilar y dictamen de aptitud clínica o diferimiento.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-blue-700 font-bold">medico@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('medico')}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-white" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('personal_salud', 'medico')}
                    className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Médico de Triaje</span>
                  </button>
                </div>
              </div>

              {/* ROL 5: BIOQUÍMICO LAB */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                      Laboratorio Central
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Bioquímica & Fraccionamiento</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Fraccionamiento mecánico &lt;6h, panel serológico de 6 marcadores, pruebas inmunohematológicas y barrera de liberación.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-teal-700 font-bold">laboratorio@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('bioquimico')}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-white" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('personal_salud', 'bioquimico')}
                    className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Bioquímico / Laboratorio</span>
                  </button>
                </div>
              </div>

              {/* ROL 6: ADMINISTRADOR */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Auditoría Forense
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Administrador & Auditor RBAC</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Bitácora inmutable de auditoría forense, validación y aprobación de personal, y parametrización de umbrales mínimos de stock.
                    </p>
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600">
                      <strong>Correo Demo:</strong> <code className="text-rose-400 font-bold">admin@hemovida.org</code>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenLoginForRole('administrador')}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-rose-400" />
                    <span>Iniciar Sesión con Correo & Clave</span>
                  </button>
                  <button
                    onClick={() => handleOpenRegister('personal_salud', 'administrador')}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar Administrador</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 2: CUENTA DE RECEPCIÓN EXCLUSIVA                  */}
        {/* ======================================================== */}
        {session?.role === 'recepcion' && (
          <ReceptionDeskView
            inventory={inventory}
            setInventory={setInventory}
            dispatches={dispatches}
            setDispatches={setDispatches}
            replacements={replacements}
            setReplacements={setReplacements}
            donors={donors}
            setDonors={setDonors}
            allDonations={allDonations}
            setAllDonations={setAllDonations}
            appointments={appointments}
            setAppointments={setAppointments}
            incentivosEntrega={incentivosEntrega}
            setIncentivosEntrega={setIncentivosEntrega}
            staffAccount={session.staff}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 3: CUENTA DE DESPACHO TRANSFUSIONAL EXCLUSIVA     */}
        {/* ======================================================== */}
        {session?.role === 'despacho' && (
          <DispatchDeskView
            inventory={inventory}
            setInventory={setInventory}
            dispatches={dispatches}
            setDispatches={setDispatches}
            replacements={replacements}
            setReplacements={setReplacements}
            staffAccount={session.staff}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 4: CUENTA DE ADMINISTRADOR & AUDITORÍA FORENSE     */}
        {/* ======================================================== */}
        {session?.role === 'administrador' && (
          <AdminAuditView
            staffAccount={session.staff}
            allStaff={staffAccounts}
            auditLogs={auditLogs}
            stockThresholds={stockThresholds}
            onUpdateStockThresholds={(newThresholds) => {
              setStockThresholds(newThresholds);
              // Log event
              const auditEntry: BitacoraAuditoria = {
                idEvento: `EVT-${Date.now()}`,
                timestamp: new Date().toISOString(),
                actorNombre: session.staff.nombre,
                actorRol: 'administrador',
                actorCi: session.staff.ci,
                ipSimulada: generateForensicIp(),
                tipoEvento: 'CAMBIO_UMBRAL_STOCK',
                accion: 'Actualización de Umbrales Mínimos de Stock',
                detalles: 'Parametrización modificada por el administrador.'
              };
              setAuditLogs(prev => [auditEntry, ...prev]);
            }}
            inventory={inventory}
            pendingStaffRequests={pendingStaffRequests}
            onApproveStaff={handleApproveStaff}
            onRejectStaff={handleRejectStaff}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 5: CUENTA MÉDICA DE TRIAJE CLÍNICO (CU10/11)      */}
        {/* ======================================================== */}
        {session?.role === 'medico' && (
          <DoctorTriageView
            staffAccount={session.staff}
            appointments={appointments}
            donors={donors}
            triajes={triajes}
            onConfirmTriage={handleConfirmDoctorTriage}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 6: CUENTA DE BIOQUÍMICO DE LABORATORIO (CU12-15)  */}
        {/* ======================================================== */}
        {session?.role === 'bioquimico' && (
          <LabProcessingView
            staffAccount={session.staff}
            allDonations={allDonations}
            setAllDonations={setAllDonations}
            inventory={inventory}
            setInventory={setInventory}
            labAnalyses={labAnalyses}
            setLabAnalyses={setLabAnalyses}
            bajasInventario={bajasInventario}
            setBajasInventario={setBajasInventario}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 7: CUENTA DE DONADOR EXCLUSIVA                     */}
        {/* ======================================================== */}
        {session?.role === 'donante' && currentDonorUser && (
          <>
            {activeTab === 'inicio' && (
              <DashboardSummary
                user={currentDonorUser}
                upcomingAppointments={appointments.filter(a => a.idDonante === currentDonorUser.id)}
                onNavigate={(tab) => {
                  if (tab === 'carnet') {
                    setIsDigitalCardOpen(true);
                  } else {
                    setActiveTab(tab);
                  }
                }}
                onOpenNewAppointment={() => setActiveTab('citas')}
                onOpenDigitalCard={() => setIsDigitalCardOpen(true)}
                onOpenPrecheck={() => setIsPrecheckOpen(true)}
              />
            )}

            {activeTab === 'citas' && (
              <AppointmentsSection
                appointments={appointments.filter(a => a.idDonante === currentDonorUser.id)}
                centers={MOCK_CENTERS}
                currentUser={currentDonorUser}
                onAddAppointment={handleAddAppointment}
                onCancelAppointment={handleCancelAppointment}
                preselectedCenterId={preselectedCenterId}
              />
            )}

            {activeTab === 'historial' && (
              <DonationHistorySection
                donations={userDonations}
                currentUser={currentDonorUser}
              />
            )}

            {activeTab === 'mapa' && (
              <CentersMapSection
                centers={MOCK_CENTERS}
                onSelectCenterToBook={handleSelectCenterToBook}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center">
                <Droplet className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-base font-['Outfit',sans-serif]">
                Hemo<span className="text-rose-500">Vida</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Banco de Sangre y Servicio de Transfusión HemoVida. Trazabilidad hematológica de extremo a extremo, separación estricta de roles institucionales y seguridad transfusional certificada.
            </p>
            <p className="text-[10px] text-slate-500">
              Calle Warnes N° 271, Santa Cruz de la Sierra, Bolivia.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Perfiles Institucionales
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li><strong>Donador:</strong> Carnet digital y agendamiento inteligente</li>
              <li><strong>Recepción:</strong> Asistencia física, viabilidad e incentivos</li>
              <li><strong>Médico:</strong> Triaje clínico, signos vitales y dictamen</li>
              <li><strong>Bioquímico:</strong> Fraccionamiento y panel serológico</li>
              <li><strong>Despacho:</strong> Código Rojo, compatibilidad y cadena de frío</li>
              <li><strong>Admin:</strong> Auditoría forense, aprobación de personal y stock</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Horarios & Contacto
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rose-400" /> Tel: +591 (3) 334-2150
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Calle Warnes N° 271 (Central)
              </p>
              <p>Lunes a Sábado: 07:00 a 20:00 continuo</p>
              <p className="text-emerald-400 font-semibold">Guardia transfusional 24/7</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Normativa y Seguridad
            </h4>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex items-center gap-1.5 text-white font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Hemo-Vigilancia
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Cumplimiento estricto con las normas de Inmuno-Serología (6 marcadores: VIH, Chagas, HepB, HepC, Sífilis, HTLV) y descanso biológico (90d M / 120d F).
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
          <p>© 2026 Banco de Sangre HemoVida • Santa Cruz de la Sierra.</p>
          <p className="flex items-center gap-1 text-slate-400 mt-2 sm:mt-0">
            <span>Seguridad Transfusional & Bioseguridad Hospitalaria</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </footer>

      {/* MODALS */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSelectAccount={handleSelectAccount}
        availableUsers={donors}
        availableStaff={staffAccounts}
        initialRole={loginModalInitialRole}
        initialMode={loginModalInitialMode}
        initialEmail={loginModalInitialEmail}
        initialRegisterType={loginModalInitialRegisterType}
        onRequestStaffAccount={handleRequestStaffAccount}
      />

      {currentDonorUser && (
        <DigitalCardModal
          isOpen={isDigitalCardOpen}
          onClose={() => setIsDigitalCardOpen(false)}
          user={currentDonorUser}
        />
      )}

      <PrecheckModal
        isOpen={isPrecheckOpen}
        onClose={() => setIsPrecheckOpen(false)}
        onGoToAppointments={(modalidad) => {
          if (session?.role === 'donante') {
            setActiveTab('citas');
          }
        }}
      />
    </div>
  );
}
