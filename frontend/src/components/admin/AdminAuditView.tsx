import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Search, 
  Filter, 
  AlertTriangle, 
  Clock, 
  Users, 
  Server, 
  Lock, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  Printer, 
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  UserCheck,
  X,
  Stethoscope,
  FlaskConical,
  Truck,
  Database,
  RefreshCw,
  Moon,
  Globe
} from 'lucide-react';
import { 
  StaffAccount, 
  BitacoraAuditoria, 
  StockThresholdConfig, 
  BloodInventoryItem, 
  BloodGroup, 
  RhFactor 
} from '../../types';

interface AdminAuditViewProps {
  staffAccount?: StaffAccount;
  allStaff: StaffAccount[];
  auditLogs: BitacoraAuditoria[];
  stockThresholds: StockThresholdConfig[];
  onUpdateStockThresholds: (newThresholds: StockThresholdConfig[]) => void;
  inventory: BloodInventoryItem[];
  pendingStaffRequests?: StaffAccount[];
  onApproveStaff?: (staffId: string) => void;
  onRejectStaff?: (staffId: string) => void;
  onOpenChangePassword?: () => void;
  onRefreshAuditLogs?: () => Promise<void>;
  isLoadingAudit?: boolean;
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({
  staffAccount,
  allStaff,
  auditLogs,
  stockThresholds,
  onUpdateStockThresholds,
  inventory,
  pendingStaffRequests = [],
  onApproveStaff,
  onRejectStaff,
  onOpenChangePassword,
  onRefreshAuditLogs,
  isLoadingAudit = false
}) => {
  const [activeTab, setActiveTab] = useState<'bitacora' | 'umbrales' | 'solicitudes' | 'rbac'>('bitacora');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [nightShiftOnly, setNightShiftOnly] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter audit logs according to real database schema
  const filteredLogs = auditLogs.filter(log => {
    const actor = (log.funcionario || log.actorNombre || '').toLowerCase();
    const username = (log.username || '').toLowerCase();
    const ci = (log.ci || log.actorCi || '').toLowerCase();
    const nacionalidad = (log.nacionalidad || '').toLowerCase();
    const tabla = (log.tablaAfectada || '').toLowerCase();
    const accion = (log.accionRealizada || log.accion || '').toLowerCase();
    const detalles = (log.detalles || '').toLowerCase();
    const ip = (log.ipOrigen || log.ipSimulada || '');
    const term = searchTerm.toLowerCase();

    const matchesSearch = !term ||
      actor.includes(term) ||
      username.includes(term) ||
      ci.includes(term) ||
      nacionalidad.includes(term) ||
      tabla.includes(term) ||
      accion.includes(term) ||
      detalles.includes(term) ||
      ip.includes(term);

    const matchesTable = selectedTable === 'all' || 
      (log.tablaAfectada && log.tablaAfectada.toLowerCase() === selectedTable.toLowerCase());

    const matchesNightShift = !nightShiftOnly || (() => {
      const dateStr = log.fechaHora || log.timestamp;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const hour = d.getHours();
      return hour >= 19 || hour < 7;
    })();

    return matchesSearch && matchesTable && matchesNightShift;
  });

  // Calculate live inventory count per group to compare against thresholds
  const availableBags = inventory.filter(i => i.estado === 'Disponible');

  const handleThresholdChange = (
    grupo: BloodGroup, 
    factorRh: RhFactor, 
    field: 'stockMinimoSeguridad' | 'stockAlertaCritica', 
    value: number
  ) => {
    const updated = stockThresholds.map(t => {
      if (t.grupo === grupo && t.factorRh === factorRh) {
        return { ...t, [field]: Math.max(0, value) };
      }
      return t;
    });
    onUpdateStockThresholds(updated);
  };

  return (
    <div className="space-y-6">
      {/* Admin Workstation Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <KeyRound className="w-3.5 h-3.5" />
                Seguridad & Administración Central
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium">
                {staffAccount?.nombre || 'Lic. Gabriel Soliz P.'} • {staffAccount?.cargo || 'Auditor RBAC'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Auditoría Activa 24/7
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Bitácora de Auditoría Forense & Parametrización de Stock
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Supervisión de control de acceso basado en roles (RBAC), bitácora inmutable de eventos sensibles con registro de IPs, validación de solicitudes de personal y calibración de umbrales mínimos de stock de seguridad.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
                title="Cambiar contraseña de acceso a la cuenta"
              >
                <KeyRound className="w-3.5 h-3.5 text-rose-300" />
                <span>Cambiar Contraseña</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('bitacora')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bitacora' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Bitácora Forense</span>
            </button>

            <button
              onClick={() => setActiveTab('umbrales')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'umbrales' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Umbrales de Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'solicitudes' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Solicitudes de Personal</span>
              {pendingStaffRequests.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                  {pendingStaffRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rbac' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cuentas RBAC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta Destacada para el Administrador: Solicitudes de Personal de Salud Pendientes */}
      {pendingStaffRequests.length > 0 && activeTab !== 'solicitudes' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950 shadow-sm animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>Solicitudes de Personal de Salud Pendientes ({pendingStaffRequests.length})</span>
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  Acción requerida
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Profesionales de salud han solicitado registrarse. Solo usted como Administrador puede habilitar sus credenciales institucionales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('solicitudes')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-md shadow-amber-600/20 flex items-center gap-1.5"
          >
            <span>Revisar y Validar</span>
            <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px]">{pendingStaffRequests.length}</span>
          </button>
        </div>
      )}

      {/* TAB 1: BITÁCORA FORENSE - MAPEO EXACTO CON TABLA BitacoraAuditoria EN POSTGRESQL / SUPABASE */}
      {activeTab === 'bitacora' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  <span>PostgreSQL / Supabase Cloud</span>
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-200">
                  Tabla: BitacoraAuditoria
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2 mt-1">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                Bitácora de Auditoría Forense
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro inmutable de transacciones sobre tablas relacionales, usuarios, IPs y registros afectados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onRefreshAuditLogs && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefreshAuditLogs();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing || isLoadingAudit}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 disabled:opacity-50"
                  title="Sincronizar y recargar registros desde la base de datos Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoadingAudit ? 'animate-spin text-rose-600' : ''}`} />
                  <span>{isRefreshing || isLoadingAudit ? 'Sincronizando...' : 'Recargar BD'}</span>
                </button>
              )}

              <span className="text-xs bg-slate-100 text-slate-700 font-mono px-3 py-2 rounded-xl border border-slate-200">
                {filteredLogs.length} / {auditLogs.length} registros
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por usuario, funcionario, C.I., nacionalidad, tabla afectada, acción o IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Filter by Tabla Afectada */}
            <div className="w-full sm:w-64">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="all">Todas las Tablas de la BD</option>
                <option value="Usuario">Tabla: Usuario</option>
                <option value="Persona">Tabla: Persona</option>
                <option value="Donante">Tabla: Donante</option>
                <option value="PosibleDonador">Tabla: PosibleDonador</option>
                <option value="TriajeClinico">Tabla: TriajeClinico</option>
                <option value="Diferimiento">Tabla: Diferimiento</option>
                <option value="ExtraccionDonacion">Tabla: ExtraccionDonacion</option>
                <option value="IncentivoEntrega">Tabla: IncentivoEntrega</option>
                <option value="UnidadSangreTotal">Tabla: UnidadSangreTotal</option>
                <option value="AnalisisInmunoSerologico">Tabla: AnalisisInmunoSerologico</option>
                <option value="PruebaInmunohematologica">Tabla: PruebaInmunohematologica</option>
                <option value="EjemplarBolsa">Tabla: EjemplarBolsa</option>
                <option value="BajaInventario">Tabla: BajaInventario</option>
                <option value="SolicitudHospitalaria">Tabla: SolicitudHospitalaria</option>
                <option value="PruebaCompatibilidad">Tabla: PruebaCompatibilidad</option>
                <option value="ComprobanteDespacho">Tabla: ComprobanteDespacho</option>
                <option value="ComprobantePago">Tabla: ComprobantePago</option>
                <option value="ReposicionPendiente">Tabla: ReposicionPendiente</option>
                <option value="CompromisoDonacion">Tabla: CompromisoDonacion</option>
                <option value="ParametroStockMinimo">Tabla: ParametroStockMinimo</option>
              </select>
            </div>

            {/* Filter Fuera de Turno Nocturno (19:00 - 07:00 / Subconsulta B2) */}
            <button
              type="button"
              onClick={() => setNightShiftOnly(!nightShiftOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border shrink-0 ${
                nightShiftOnly 
                  ? 'bg-indigo-900 text-indigo-100 border-indigo-700 shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
              }`}
              title="Filtro B2: Operaciones fuera del turno central (19:00 a 07:00)"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Turno Nocturno (19:00 - 07:00)</span>
              {nightShiftOnly && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse ml-0.5" />}
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 font-bold">ID / Fecha y Hora</th>
                  <th className="py-3 px-3.5 font-bold">Usuario & Rol</th>
                  <th className="py-3 px-3.5 font-bold">Funcionario & Nacionalidad</th>
                  <th className="py-3 px-3.5 font-bold">Tabla Afectada</th>
                  <th className="py-3 px-3.5 font-bold text-center">ID Reg. Afectado</th>
                  <th className="py-3 px-3.5 font-bold">Acción Realizada</th>
                  <th className="py-3 px-3.5 font-bold">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Database className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-sm text-slate-600">No se encontraron registros de auditoría</span>
                        <span className="text-xs text-slate-400">Pruebe ajustando los filtros de búsqueda o tabla afectada.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const idDisplay = log.idAuditoria ? `#${log.idAuditoria}` : (log.idEvento || `#${idx + 1}`);
                    const dateRaw = log.fechaHora || log.timestamp;
                    const dateDisplay = dateRaw 
                      ? new Date(dateRaw).toLocaleString('es-BO', { 
                          dateStyle: 'short', 
                          timeStyle: 'medium' 
                        }) 
                      : '-';

                    const usernameDisplay = log.username || 'Sistema';
                    const rolDisplay = log.nombreRol || log.actorRol || 'N/A';
                    const funcionarioDisplay = log.funcionario || log.actorNombre || 'Usuario del Sistema';
                    const ciDisplay = log.ci || log.actorCi || 'N/A';
                    const nacionalidadDisplay = log.nacionalidad || 'Boliviana';
                    const tablaDisplay = log.tablaAfectada || 'Usuario';
                    const idRegDisplay = log.idRegistroAfectado !== undefined && log.idRegistroAfectado !== null 
                      ? log.idRegistroAfectado 
                      : (log.entidadId || '-');
                    const accionDisplay = log.accionRealizada || log.accion;
                    const ipDisplay = log.ipOrigen || log.ipSimulada || '127.0.0.1';

                    // Table badge coloring
                    let tableBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                    if (tablaDisplay === 'Usuario') tableBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    else if (tablaDisplay === 'Persona') tableBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    else if (tablaDisplay === 'Donante') tableBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    else if (tablaDisplay === 'ExtraccionDonacion') tableBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (tablaDisplay === 'AnalisisInmunoSerologico') tableBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                    else if (tablaDisplay === 'PruebaInmunohematologica') tableBadgeClass = 'bg-violet-50 text-violet-700 border-violet-200';
                    else if (tablaDisplay === 'EjemplarBolsa') tableBadgeClass = 'bg-teal-50 text-teal-700 border-teal-200';
                    else if (tablaDisplay === 'BajaInventario') tableBadgeClass = 'bg-red-50 text-red-700 border-red-200 font-bold';
                    else if (tablaDisplay === 'SolicitudHospitalaria') tableBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    else if (tablaDisplay === 'ComprobanteDespacho') tableBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';

                    return (
                      <tr key={log.idAuditoria || log.idEvento || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. ID Auditoría / Timestamp */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-black text-rose-700 block text-xs">
                            {idDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {dateDisplay}
                          </span>
                        </td>

                        {/* 2. Usuario & Rol */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 block text-[11px]">
                            {usernameDisplay}
                          </span>
                          <span className="inline-block text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                            {rolDisplay}
                          </span>
                        </td>

                        {/* 3. Funcionario & Nacionalidad */}
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-900 block text-xs">
                            {funcionarioDisplay}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span>C.I. {ciDisplay}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5 font-medium text-slate-600 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                              <Globe className="w-2.5 h-2.5 text-slate-400" />
                              {nacionalidadDisplay}
                            </span>
                          </div>
                        </td>

                        {/* 4. Tabla Afectada */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border font-mono ${tableBadgeClass}`}>
                            <Database className="w-3 h-3 shrink-0" />
                            {tablaDisplay}
                          </span>
                        </td>

                        {/* 5. ID Registro Afectado */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-center">
                          <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {typeof idRegDisplay === 'number' ? `#${idRegDisplay}` : idRegDisplay}
                          </span>
                        </td>

                        {/* 6. Acción Realizada */}
                        <td className="py-3 px-3.5 font-medium text-slate-800 max-w-sm">
                          <span className="block text-xs text-slate-900 font-semibold leading-snug">
                            {accionDisplay}
                          </span>
                          {log.detalles && log.detalles !== accionDisplay && (
                            <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {log.detalles}
                            </span>
                          )}
                        </td>

                        {/* 7. IP Origen */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                            {ipDisplay}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PARAMETRIZACIÓN DE UMBRALES DE STOCK */}
      {activeTab === 'umbrales' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-600" />
                Parametrización de Umbrales Mínimos de Stock y Alerta Crítica
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina los límites de seguridad por grupo ABO/Rh. Si el inventario disponible cae por debajo de la alerta crítica, el sistema emite señales de urgencia hospitalaria.
              </p>
            </div>
          </div>

          {/* Grid of Threshold Configurations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stockThresholds.map((threshold) => {
              const rhSymbol = threshold.factorRh === 'Positivo' ? '+' : '-';
              const currentStock = availableBags.filter(
                b => b.grupoSanguineo === threshold.grupo && b.factorRh === threshold.factorRh
              ).length;

              const isCritical = currentStock <= threshold.stockAlertaCritica;
              const isWarning = currentStock <= threshold.stockMinimoSeguridad && !isCritical;

              let cardBorder = 'border-slate-200';
              let statusBadge = (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Stock Normal
                </span>
              );

              if (isCritical) {
                cardBorder = 'border-rose-400 bg-rose-50/30';
                statusBadge = (
                  <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Alerta Crítica Roja
                  </span>
                );
              } else if (isWarning) {
                cardBorder = 'border-amber-300 bg-amber-50/30';
                statusBadge = (
                  <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alerta Amarilla
                  </span>
                );
              }

              return (
                <div key={`${threshold.grupo}${rhSymbol}`} className={`rounded-2xl border ${cardBorder} p-4.5 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-['Outfit',sans-serif] text-slate-900">
                        {threshold.grupo}{rhSymbol}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {threshold.factorRh}
                      </span>
                    </div>
                    {statusBadge}
                  </div>

                  {/* Stock Actual vs Requerido */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Stock Disponible:</span>
                      <strong className={`text-lg font-mono font-bold ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                        {currentStock} unidades
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Mínimo / Crítico:</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {threshold.stockMinimoSeguridad} / {threshold.stockAlertaCritica}
                      </span>
                    </div>
                  </div>

                  {/* Inputs to adjust */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Stock Mínimo (Seguridad):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={threshold.stockMinimoSeguridad}
                        onChange={(e) => handleThresholdChange(threshold.grupo, threshold.factorRh, 'stockMinimoSeguridad', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Alerta Crítica (&lt;=):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={threshold.stockAlertaCritica}
                        onChange={(e) => handleThresholdChange(threshold.grupo, threshold.factorRh, 'stockAlertaCritica', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold text-rose-700"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SOLICITUDES DE APROBACIÓN DE CUENTAS DE PERSONAL DE SALUD */}
      {activeTab === 'solicitudes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-rose-600" />
                Aprobación de Solicitudes de Personal de Salud
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Revise y valide las solicitudes de registro institucional para habilitar credenciales de acceso a médicos, bioquímicos y personal hospitalario.
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-xl border border-amber-200 self-start sm:self-auto flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              {pendingStaffRequests.length} solicitudes pendientes
            </span>
          </div>

          {pendingStaffRequests.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No hay solicitudes pendientes de validación</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas las cuentas de médicos, bioquímicos y personal de soporte han sido debidamente procesadas o no existen solicitudes nuevas en cola.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingStaffRequests.map((req) => (
                <div 
                  key={req.id}
                  className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/20 hover:border-amber-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-sm shadow-xs">
                          {req.rol === 'medico' && <Stethoscope className="w-5 h-5 text-amber-300" />}
                          {req.rol === 'bioquimico' && <FlaskConical className="w-5 h-5 text-teal-300" />}
                          {req.rol === 'despacho' && <Truck className="w-5 h-5 text-rose-300" />}
                          {req.rol === 'recepcion' && <ShieldCheck className="w-5 h-5 text-blue-300" />}
                          {req.rol === 'administrador' && <KeyRound className="w-5 h-5 text-amber-400" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.nombre}</h4>
                          <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md inline-block">
                            {req.cargo || req.rol.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pendiente
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-xl border border-amber-100 text-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Cédula de Identidad</span>
                        <span className="font-semibold">{req.ci}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Matrícula / Registro</span>
                        <span className="font-semibold text-rose-700 font-mono">{req.matricula || 'En trámite SEDES'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Correo Electrónico</span>
                        <span className="font-medium truncate block" title={req.email}>{req.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Teléfono</span>
                        <span className="font-medium">{req.telefono || '+591 700-00000'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Sede Asignada</span>
                        <span className="font-medium truncate block">{req.sede || 'Banco Central'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Turno</span>
                        <span className="font-medium truncate block">{req.turno || 'Mañana'}</span>
                      </div>
                    </div>

                    {req.fechaSolicitud && (
                      <p className="text-[11px] text-slate-500">
                        <strong>Fecha de Registro:</strong> {req.fechaSolicitud}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => onApproveStaff && onApproveStaff(req.id)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprobar y Habilitar Acceso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectStaff && onRejectStaff(req.id)}
                      className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ROLES RBAC & SEGURIDAD DE CUENTAS */}
      {activeTab === 'rbac' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Auditoría de Roles RBAC y Cuentas de Personal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de privilegios y separación estricta: ninguna cuenta puede cambiar de rol sin autenticación formal con credenciales vigentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allStaff.map((staff) => (
              <div key={staff.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-bold text-xs shadow-2xs shrink-0 border border-slate-700">
                  <span className="font-mono text-xs font-bold text-rose-300">
                    {staff.nombre.split(' ').filter(p => !p.startsWith('Lic.') && !p.startsWith('Dr.') && !p.startsWith('Bioq.')).slice(0, 2).map(n => n[0]).join('') || 'ST'}
                  </span>
                  <span className="text-[7px] font-mono text-slate-400 uppercase tracking-tighter">
                    {staff.rol.slice(0, 4)}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{staff.nombre}</h4>
                    <span className="text-[10px] uppercase font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                      {staff.rol}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">{staff.cargo}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                    <span><strong>C.I.:</strong> {staff.ci}</span>
                    <span><strong>Credencial:</strong> {staff.credencial}</span>
                    <span><strong>Email:</strong> {staff.email}</span>
                    <span><strong>Seguridad:</strong> Clave Hash Conforme</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
