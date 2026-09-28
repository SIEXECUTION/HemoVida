import React, { useState } from 'react';
import { 
  Droplet, 
  Calendar, 
  History, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  LogOut, 
  AlertTriangle,
  Menu,
  X,
  ShieldCheck,
  Heart,
  Truck,
  LogIn,
  UserCheck,
  Stethoscope,
  FlaskConical,
  User
} from 'lucide-react';
import { UserSession } from '../types';

interface NavbarProps {
  session: UserSession | null;
  activeTab: 'inicio' | 'citas' | 'historial' | 'mapa' | 'carnet' | 'autoevaluacion';
  onSelectTab: (tab: 'inicio' | 'citas' | 'historial' | 'mapa' | 'carnet' | 'autoevaluacion') => void;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
  onLogout: () => void;
  onOpenPrecheck: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  activeTab,
  onSelectTab,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenPrecheck
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      {/* Alerta de Urgencia en Stock Hemático */}
      <div className="bg-rose-950 text-rose-100 text-xs py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px] animate-pulse">
              <AlertTriangle className="w-3 h-3" /> URGENCIA
            </span>
            <span>
              Reserva crítica en Santa Cruz de la Sierra: <strong>Grupos O- Negativo y A- Negativo</strong> se requieren con urgencia.
            </span>
          </div>
          {session?.role === 'donante' && (
            <button 
              onClick={() => onSelectTab('citas')}
              className="text-rose-200 hover:text-white underline text-[11px] font-semibold whitespace-nowrap cursor-pointer ml-4"
            >
              Agendar donación &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div 
              onClick={() => {
                if (session?.role === 'donante') {
                  onSelectTab('inicio');
                }
              }}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              id="brand-logo-btn"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform">
                <Droplet className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900 font-['Outfit',sans-serif]">
                    Hemo<span className="text-rose-600">Vida</span>
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                    Santa Cruz
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-none">
                  Banco de Sangre & Transfusión
                </p>
              </div>
            </div>

            {/* Institutional Badge based on role */}
            {session?.role === 'recepcion' && (
              <div className="hidden md:flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl text-xs font-bold text-rose-800">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Estación de Recepción & Admisión</span>
              </div>
            )}

            {session?.role === 'despacho' && (
              <div className="hidden md:flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-xl text-xs font-bold text-red-800">
                <Truck className="w-4 h-4 text-red-600" />
                <span>Estación de Despacho Transfusional</span>
              </div>
            )}

            {session?.role === 'administrador' && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl text-xs font-bold text-rose-300">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Auditoría Forense & RBAC</span>
              </div>
            )}

            {session?.role === 'medico' && (
              <div className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-xs font-bold text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Estación Médica de Triaje Clínico</span>
              </div>
            )}

            {session?.role === 'bioquimico' && (
              <div className="hidden md:flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1 rounded-xl text-xs font-bold text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Laboratorio Central & Inmunoserología</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation for Donor Mode ONLY */}
          {session?.role === 'donante' && (
            <nav className="hidden lg:flex items-center gap-1">
              <button
                id="nav-tab-inicio"
                onClick={() => onSelectTab('inicio')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'inicio'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Inicio
              </button>

              <button
                id="nav-tab-citas"
                onClick={() => onSelectTab('citas')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'citas'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Citas Próximas
              </button>

              <button
                id="nav-tab-historial"
                onClick={() => onSelectTab('historial')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'historial'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                Historial
              </button>

              <button
                id="nav-tab-mapa"
                onClick={() => onSelectTab('mapa')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'mapa'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Centros
              </button>

              <button
                id="nav-tab-carnet"
                onClick={() => onSelectTab('carnet')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'carnet'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Carnet Digital
              </button>

              <button
                id="nav-tab-autoevaluacion"
                onClick={onOpenPrecheck}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ¿Puedo Donar?
              </button>
            </nav>
          )}

          {/* Active Account Identity & Logout (No switching without logging out) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                {/* Account 1: Donante Info */}
                {session.role === 'donante' && (
                  <div 
                    onClick={() => onSelectTab('carnet')}
                    className="hidden sm:flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-full cursor-pointer transition-colors border border-slate-200"
                    title="Ver mi Carnet Digital"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-600 to-red-800 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-rose-400">
                        <span className="font-mono text-[11px] font-black tracking-tighter">
                          {session.user.nombres[0]}{session.user.apellidos[0]}
                        </span>
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-rose-600 text-[9px] text-white font-bold px-1 rounded-full leading-tight border border-white">
                        {session.user.grupoSanguineo}{session.user.factorRh === 'Positivo' ? '+' : '-'}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                        {session.user.nombres.split(' ')[0]} {session.user.apellidos.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-rose-700 font-semibold leading-tight">
                        Cuenta Donador
                      </p>
                    </div>
                  </div>
                )}

                {/* Account 2: Recepción Info */}
                {session.role === 'recepcion' && (
                  <div className="hidden sm:flex items-center gap-2.5 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200">
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs border border-rose-500 shrink-0">
                      <UserCheck className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-rose-950 leading-tight">
                        {session.staff.nombre}
                      </p>
                      <p className="text-[10px] text-rose-700 font-semibold leading-tight">
                        Personal de Admisión & Recepción
                      </p>
                    </div>
                  </div>
                )}

                {/* Account 3: Despacho Info */}
                {session.role === 'despacho' && (
                  <div className="hidden sm:flex items-center gap-2.5 bg-red-50 px-3.5 py-1.5 rounded-full border border-red-200">
                    <div className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center shadow-xs border border-red-600 shrink-0">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-red-950 leading-tight">
                        {session.staff.nombre}
                      </p>
                      <p className="text-[10px] text-red-700 font-semibold leading-tight">
                        Personal de Despacho Transfusional
                      </p>
                    </div>
                  </div>
                )}

                {/* Account 4: Admin Info */}
                {session.role === 'administrador' && (
                  <div className="hidden sm:flex items-center gap-2.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-full border border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center shadow-xs border border-slate-700 shrink-0">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white leading-tight">
                        {session.staff.nombre}
                      </p>
                      <p className="text-[10px] text-rose-300 font-semibold leading-tight">
                        Auditoría Forense & RBAC
                      </p>
                    </div>
                  </div>
                )}

                {/* Account 5: Médico Info */}
                {session.role === 'medico' && (
                  <div className="hidden sm:flex items-center gap-2.5 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-xs border border-blue-600 shrink-0">
                      <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-950 leading-tight">
                        {session.staff.nombre}
                      </p>
                      <p className="text-[10px] text-blue-700 font-semibold leading-tight">
                        Médico Hemoterapeuta (Triaje)
                      </p>
                    </div>
                  </div>
                )}

                {/* Account 6: Bioquímico Info */}
                {session.role === 'bioquimico' && (
                  <div className="hidden sm:flex items-center gap-2.5 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200">
                    <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-xs border border-teal-600 shrink-0">
                      <FlaskConical className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-teal-950 leading-tight">
                        {session.staff.nombre}
                      </p>
                      <p className="text-[10px] text-teal-700 font-semibold leading-tight">
                        Bioquímica de Laboratorio
                      </p>
                    </div>
                  </div>
                )}

                {/* Cerrar Sesión Button (Single session termination) */}
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Cerrar la sesión actual para salir del sistema o cambiar de usuario"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                  <span className="sm:hidden">Salir</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {onOpenRegister && (
                  <button
                    id="btn-register-trigger"
                    onClick={onOpenRegister}
                    className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer items-center gap-1.5"
                  >
                    <span>Registrarme</span>
                  </button>
                )}
                <button
                  id="btn-login-trigger"
                  onClick={onOpenLogin}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/30"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2">
          {session ? (
            <>
              {/* User / Staff badge in mobile */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3 mb-2 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    {session.role === 'donante' ? 'D' : session.role === 'recepcion' ? 'R' : 'T'}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">
                      {session.role === 'donante' 
                        ? `${session.user.nombres} ${session.user.apellidos}` 
                        : session.staff.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium capitalize">
                      Rol: {session.role === 'donante' ? 'Donador de Sangre' : session.role === 'recepcion' ? 'Recepción y Admisión' : 'Despacho Transfusional'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>

              {/* Navigation links if donor */}
              {session.role === 'donante' && (
                <>
                  <button
                    onClick={() => { onSelectTab('inicio'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2"
                  >
                    Inicio
                  </button>
                  <button
                    onClick={() => { onSelectTab('citas'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-rose-600" />
                    Citas Próximas
                  </button>
                  <button
                    onClick={() => { onSelectTab('historial'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <History className="w-4 h-4 text-rose-600" />
                    Historial de Donaciones
                  </button>
                  <button
                    onClick={() => { onSelectTab('mapa'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-rose-600" />
                    Mapa de Centros de Colecta
                  </button>
                  <button
                    onClick={() => { onSelectTab('carnet'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-rose-600" />
                    Mi Carnet Digital
                  </button>
                  <button
                    onClick={() => { onOpenPrecheck(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Autoevaluación de Aptitud (Test Rápido)
                  </button>
                </>
              )}

              {session.role === 'recepcion' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
                  <strong>Cuenta exclusiva de Recepción:</strong> Empadronamiento de donantes, viabilidad por C.I., reposición de pacientes y estadísticas.
                </div>
              )}

              {session.role === 'despacho' && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900">
                  <strong>Cuenta exclusiva de Despacho:</strong> Inventario en cámaras frías, solicitudes médicas y cobro de servicios transfusionales.
                </div>
              )}
            </>
          ) : (
            <div className="p-3 text-center">
              <button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs"
              >
                Iniciar Sesión en HemoVida
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
