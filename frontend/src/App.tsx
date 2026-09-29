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
import { ChangePasswordModal } from './components/ChangePasswordModal';
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
import { apiService } from './services/api';
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

  // CU03: Forensic Audit Logs (Normalización con tabla BitacoraAuditoria de PostgreSQL / Supabase)
  const normalizeAuditEntry = (evt: any): BitacoraAuditoria => {
    const idAuditoria = typeof evt.idAuditoria === 'number' ? evt.idAuditoria : (typeof evt.id_registro === 'number' ? evt.id_registro : undefined);
    const idEvento = evt.idAuditoria ? `AUD-${evt.idAuditoria}` : (evt.idEvento || `EVT-${Date.now()}`);
    const timestamp = evt.fechaHora || evt.timestamp || new Date().toISOString();
    const actorNombre = evt.funcionario || evt.actorNombre || 'Personal HemoVida';
    const actorRol = evt.nombreRol || evt.actorRol || 'Personal Institucional';
    const actorCi = evt.ci || evt.actorCi || 'N/A';
    const ipSimulada = evt.ipOrigen || evt.ipSimulada || '127.0.0.1';
    const accion = evt.accionRealizada || evt.accion || 'Operación en Plataforma';
    const tablaAfectada = evt.tablaAfectada || 'Usuario';
    const idRegistroAfectado = typeof evt.idRegistroAfectado === 'number' ? evt.idRegistroAfectado : undefined;
    const nacionalidad = evt.nacionalidad || 'Boliviana';

    return {
      idAuditoria,
      idEvento,
      timestamp,
      fechaHora: timestamp,
      idUsuario: evt.idUsuario,
      username: evt.username || 'admin',
      funcionario: actorNombre,
      actorNombre,
      actorRol,
      nombreRol: actorRol,
      ci: actorCi,
      actorCi,
      nacionalidad,
      ipOrigen: ipSimulada,
      ipSimulada,
      tipoEvento: evt.tipoEvento || 'SISTEMA',
      accion,
      accionRealizada: accion,
      tablaAfectada,
      idRegistroAfectado,
      detalles: evt.detalles || accion,
      entidadId: evt.entidadId || (idRegistroAfectado ? `#${idRegistroAfectado}` : undefined)
    };
  };

  const [auditLogs, setAuditLogs] = useState<BitacoraAuditoria[]>(() => {
    const saved = localStorage.getItem('hemovida_audit_logs');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeAuditEntry);
        }
      } catch (e) { 
        return MOCK_BITACORA.map(normalizeAuditEntry); 
      }
    }
    return MOCK_BITACORA.map(normalizeAuditEntry);
  });

  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const data = await apiService.getAuditoria();
      if (data && Array.isArray(data.eventos) && data.eventos.length > 0) {
        const normalized = data.eventos.map(normalizeAuditEntry);
        setAuditLogs(normalized);
        localStorage.setItem('hemovida_audit_logs', JSON.stringify(normalized));
      }
    } catch (err) {
      console.warn('Carga inicial de auditoría remota:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [preselectedCenterId, setPreselectedCenterId] = useState<string | null>(null);

  // Carnet Digital QR Public Verification State
  const [scannedDonor, setScannedDonor] = useState<UserDonor | null>(null);
  const [isScannedDonorModalOpen, setIsScannedDonorModalOpen] = useState(false);

  // Detect ?carnet=... when user scans QR code with mobile camera
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const carnetCode = params.get('carnet');
      if (carnetCode) {
        const found = donors.find(d => 
          (d.carnetDigitalCodigo && d.carnetDigitalCodigo.toLowerCase() === carnetCode.toLowerCase()) || 
          d.ci === carnetCode ||
          String(d.id) === carnetCode
        );
        if (found) {
          setScannedDonor(found);
          setIsScannedDonorModalOpen(true);
        } else {
          // Consultar endpoint público de verificación médica del backend
          apiService.getCarnetDigital(carnetCode).then(res => {
            if (res) {
              const donorFromApi: UserDonor = {
                id: res.id || parseInt((res.ci || '0').replace(/[^0-9]/g, '')) || 999999,
                nombres: res.nombres || (res.donante ? res.donante.split(' ')[0] : 'Donante'),
                apellidos: res.apellidos || (res.donante ? res.donante.split(' ').slice(1).join(' ') : 'Acreditado'),
                ci: res.ci || carnetCode,
                email: res.email || `donante.${res.ci || 'acreditado'}@hemovida.org`,
                celular: res.celular || '+591 70000000',
                nacionalidad: res.nacionalidad || 'Boliviana',
                direccion: res.direccion || 'Santa Cruz de la Sierra, Bolivia',
                ocupacion: res.ocupacion || 'Donante Registrado',
                grupoSanguineo: (res.grupoSanguineo as any) || 'O',
                factorRh: (res.factorRh as any) || 'Positivo',
                tipoDonante: (res.tipoDonante as any) || 'Voluntario Altruista',
                totalDonaciones: res.totalDonacionesHistoricas || 1,
                volumenHistoricoMl: res.volumenHistoricoAportadoMl || 450,
                fechaUltimaDonacion: res.fechaUltimaDonacion || undefined,
                carnetDigitalCodigo: res.carnetDigitalCodigo || carnetCode,
                fechaNacimiento: res.fechaNacimiento || '1995-05-15',
                sexo: (res.sexo === 'F' ? 'F' : 'M'),
                estadoHabilitacion: (res.estadoHabilitacion as any) || (res.estaHabilitadoParaDonar ? 'Apto' : 'Diferido Temporal')
              };
              setScannedDonor(donorFromApi);
              setIsScannedDonorModalOpen(true);
            } else {
              // Respaldo de contingencia si no responde el backend
              const cleanCi = carnetCode.replace(/[^0-9]/g, '') || '7821940';
              const numericId = parseInt(cleanCi, 10) || 999999;
              const fallbackDonor: UserDonor = {
                id: numericId,
                nombres: 'Donante Acreditado',
                apellidos: 'HemoVida Regional',
                ci: cleanCi,
                email: `donante.${cleanCi}@hemovida.org`,
                celular: '+591 70000000',
                nacionalidad: 'Boliviana',
                direccion: 'Santa Cruz de la Sierra, Bolivia',
                ocupacion: 'Donante Activo',
                grupoSanguineo: 'O',
                factorRh: 'Positivo',
                tipoDonante: 'Voluntario Altruista',
                totalDonaciones: 1,
                volumenHistoricoMl: 450,
                fechaUltimaDonacion: new Date().toISOString().split('T')[0],
                carnetDigitalCodigo: carnetCode,
                fechaNacimiento: '1995-05-15',
                sexo: 'M',
                estadoHabilitacion: 'Apto'
              };
              setScannedDonor(fallbackDonor);
              setIsScannedDonorModalOpen(true);
            }
          }).catch(err => {
            console.warn('Error al verificar carnet con API:', err);
          });
        }
      }
    }
  }, [donors]);

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
    setLoginModalInitialRole(role);
    setLoginModalInitialMode('login');
    setLoginModalInitialEmail('');
    setIsLoginModalOpen(true);
  };

  const handleChangePassword = (newPassword: string) => {
    if (!session) return;
    if (session.role === 'donante') {
      const updatedUser: UserDonor = { ...session.user, password: newPassword };
      setSession({ role: 'donante', user: updatedUser });
      setDonors(prev => prev.map(d => d.id === updatedUser.id ? updatedUser : d));
    } else {
      const updatedStaff: StaffAccount = { ...session.staff, password: newPassword };
      setSession({ ...session, staff: updatedStaff } as any);
      setStaffAccounts(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    }

    const actorName = session.role === 'donante' ? `${session.user.nombres} ${session.user.apellidos}` : session.staff.nombre;
    const actorCi = session.role === 'donante' ? session.user.ci : session.staff.ci;

    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: actorName,
      actorRol: session.role,
      actorCi,
      ipSimulada: generateForensicIp(),
      tipoEvento: 'CAMBIO_PASSWORD',
      accion: 'Modificación de Contraseña',
      detalles: `El usuario ${actorName} (${session.role}) modificó su clave de acceso bajo política de seguridad.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
  };

  const handleUpdateUserPassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setDonors(prev => prev.map(d => d.email.toLowerCase() === cleanEmail ? { ...d, password: newPassword } : d));
    setStaffAccounts(prev => prev.map(s => s.email.toLowerCase() === cleanEmail ? { ...s, password: newPassword } : s));

    const auditEntry: BitacoraAuditoria = {
      idEvento: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorNombre: cleanEmail,
      actorRol: 'donante',
      actorCi: 'N/A',
      ipSimulada: generateForensicIp(),
      tipoEvento: 'CAMBIO_PASSWORD',
      accion: 'Restablecimiento de Contraseña con Token',
      detalles: `Se actualizó la contraseña para la cuenta ${cleanEmail} tras validar el token de verificación.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
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
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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

            {/* Pilares Institucionales de HemoVida (Información y Servicios) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* TARJETA 1: REQUISITOS Y DONACIÓN VOLUNTARIA */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                    <Heart className="w-6 h-6 fill-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                      Donación Solidaria
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                      Requisitos para Donar
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Con una sola donación salvas hasta tres vidas. Revisa los criterios básicos para donar con total seguridad:
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Edad entre <strong>18 y 65 años</strong> y peso mínimo de <strong>50 kg</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Documento de identidad original y vigente (C.I. o Pasaporte).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Gozar de buena salud y haber descansado al menos 6 horas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Desayuno ligero sin grasas ni lácteos antes de acudir.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleOpenRegister('donante')}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    id="btn-portal-donor-register"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Crear Cuenta de Donante</span>
                  </button>
                  <button
                    onClick={() => setIsPrecheckOpen(true)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    id="btn-portal-donor-precheck"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Autoevaluación: ¿Puedo Donar?</span>
                  </button>
                </div>
              </div>

              {/* TARJETA 2: BIOSEGURIDAD Y HEMOVIGILANCIA */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                      Bioseguridad Certificada
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                      Hemovigilancia y Calidad
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Protocolos internacionales de bioseguridad y análisis serológico estricto para garantizar transfusiones 100% seguras:
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Tamizaje obligatorio de <strong>6 marcadores</strong> (VIH, Chagas, HepB, HepC, Sífilis, HTLV).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Fraccionamiento celular mecánico en menos de 6 horas post-extracción.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Cadena de frío controlada con monitoreo térmico 24/7 (2°C a 6°C).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Trazabilidad hematológica unívoca con códigos ISBT-128.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-teal-900">
                      Certificación de Calidad y Bioseguridad
                    </p>
                    <p className="text-[10px] text-teal-700 mt-0.5">
                      Banco de Sangre de Referencia Departamental de Santa Cruz
                    </p>
                  </div>
                </div>
              </div>

              {/* TARJETA 3: RED HOSPITALARIA & CÓDIGO ROJO */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
                    <Truck className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                      Atención Continua 24/7
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-2 font-['Outfit',sans-serif]">
                      Red Hospitalaria & Urgencias
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Suministro de componentes sanguíneos para hospitales, clínicas e instituciones de salud en Santa Cruz:
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>Protocolo de <strong>Código Rojo</strong> activado para emergencias vitales y trauma.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>Pruebas cruzadas mayores y menores de compatibilidad pre-transfusional.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>Abastecimiento prioritario a UCIs, quirófanos y maternidades.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>Despacho preferencial y reserva de concentrados O Rh Negativo.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleOpenLogin()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <LogIn className="w-4 h-4 text-rose-400" />
                    <span>Acceder al Sistema HemoVida</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Banner Institucional de Personal de Salud y Administración */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-slate-700/60 border border-slate-600/60 px-3 py-1 rounded-full text-xs font-bold text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Área Institucional & Médica Hospitalaria</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-['Outfit',sans-serif] tracking-tight text-white">
                  Portal Exclusivo para Personal de Salud
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Acceso restringido para médicos de triaje, bioquímicos de laboratorio, recepción hospitalaria, despacho y administración. Las solicitudes de registro de nuevo personal son verificadas y aprobadas por el administrador del sistema.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleOpenLogin()}
                  className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-staff-portal-login"
                >
                  <KeyRound className="w-4 h-4 text-rose-600" />
                  <span>Iniciar Sesión Institucional</span>
                </button>
                <button
                  onClick={() => handleOpenRegister('personal_salud')}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-staff-portal-register"
                >
                  <UserPlus className="w-4 h-4 text-rose-400" />
                  <span>+ Solicitar Acreditación de Personal</span>
                </button>
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
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onRefreshAuditLogs={fetchAuditLogs}
            isLoadingAudit={isLoadingAudit}
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
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
                onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
        onUpdatePassword={handleUpdateUserPassword}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        session={session}
        onPasswordChanged={handleChangePassword}
      />

      {currentDonorUser && (
        <DigitalCardModal
          isOpen={isDigitalCardOpen}
          onClose={() => setIsDigitalCardOpen(false)}
          user={currentDonorUser}
        />
      )}

      {scannedDonor && (
        <DigitalCardModal
          isOpen={isScannedDonorModalOpen}
          onClose={() => {
            setIsScannedDonorModalOpen(false);
            if (window.history.pushState) {
              const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.pushState({ path: cleanUrl }, '', cleanUrl);
            }
          }}
          user={scannedDonor}
          isPublicVerification={true}
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
