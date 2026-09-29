import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Send, 
  ShieldCheck 
} from 'lucide-react';
import { UserSession } from '../types';
import { evaluatePassword, getPasswordMissingAlerts } from '../utils/security';
import { PasswordSecurityIndicator } from './PasswordSecurityIndicator';
import { apiService } from '../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  onPasswordChanged: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  session,
  onPasswordChanged
}) => {
  // Method: 'current_password' | 'email_token'
  const [method, setMethod] = useState<'current_password' | 'email_token'>('current_password');

  // Fields for Method 1: Current Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Fields for Method 2: Email Token
  const [tokenSent, setTokenSent] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenCode, setTokenCode] = useState('');
  const [tokenGeneratedPreview, setTokenGeneratedPreview] = useState<string | null>(null);

  // Common New Password Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const userEmail = session.role === 'donante' ? session.user.email : session.staff.email;
  const userName = session.role === 'donante' ? `${session.user.nombres} ${session.user.apellidos}` : session.staff.nombre;
  const userRole = session.role === 'donante' ? 'Donante de Sangre' : session.staff.cargo;

  // Real-time password rules evaluation
  const passwordRules = evaluatePassword(newPassword, confirmNewPassword);

  const handleRequestToken = async () => {
    setErrorMsg(null);
    setTokenLoading(true);
    try {
      const res = await apiService.requestPasswordReset(userEmail);
      setTokenSent(true);
      if (res.token) {
        setTokenGeneratedPreview(res.token);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar código al correo.');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validar políticas de seguridad
    if (!passwordRules.isValid) {
      const missing = getPasswordMissingAlerts(newPassword, confirmNewPassword);
      setErrorMsg(`La nueva contraseña debe cumplir con todos los requisitos de seguridad: ${missing.join(', ')}`);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (method === 'current_password') {
        if (!currentPassword) {
          setErrorMsg('Por favor ingrese su contraseña actual.');
          setIsSubmitting(false);
          return;
        }

        // Comprobación local de contraseña actual si existe en sesión
        const storedPwd = session.role === 'donante' ? session.user.password : session.staff.password;
        if (storedPwd && storedPwd !== currentPassword) {
          setErrorMsg('La contraseña actual ingresada es incorrecta.');
          setIsSubmitting(false);
          return;
        }

        await apiService.changePassword(userEmail, currentPassword, null, newPassword);
      } else {
        if (!tokenCode.trim()) {
          setErrorMsg('Debe ingresar el código de verificación recibido por correo.');
          setIsSubmitting(false);
          return;
        }

        await apiService.changePassword(userEmail, null, tokenCode.trim(), newPassword);
      }

      onPasswordChanged(newPassword);
      setSuccessMsg('¡Contraseña actualizada exitosamente! Se ha registrado el cambio en la bitácora de seguridad.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setTokenCode('');
    setTokenSent(false);
    setTokenGeneratedPreview(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fadeIn">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-rose-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif]">
                  Modificar Contraseña de Acceso
                </h3>
                <p className="text-xs text-rose-200/90 font-medium">
                  {userName} • <span className="font-semibold">{userRole}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => { handleResetForm(); onClose(); }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account email badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1 rounded-full text-[11px] text-slate-200">
            <Mail className="w-3.5 h-3.5 text-rose-300" />
            <span>Cuenta vinculada: <strong className="text-white">{userEmail}</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {successMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-950 text-base">¡Contraseña Modificada!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {successMsg}
              </p>
              <button
                type="button"
                onClick={() => { handleResetForm(); onClose(); }}
                className="mt-3 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Aceptar y Continuar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Method Selector Tabs */}
              <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setMethod('current_password'); setErrorMsg(null); }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    method === 'current_password'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                  <span>Con Contraseña Actual</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMethod('email_token'); setErrorMsg(null); }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    method === 'email_token'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-rose-600" />
                  <span>Con Token al Correo</span>
                </button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* METHOD 1: CON CONTRASEÑA ACTUAL */}
              {method === 'current_password' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Contraseña Actual *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      placeholder="Ingrese su contraseña actual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 2: CON TOKEN AL CORREO */}
              {method === 'email_token' && (
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Código de Verificación por Correo
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Se enviará a: <strong>{userEmail}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestToken}
                      disabled={tokenLoading}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{tokenLoading ? 'Enviando...' : (tokenSent ? 'Reenviar Código' : 'Solicitar Código')}</span>
                    </button>
                  </div>

                  {tokenSent && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Código de 6 dígitos enviado a su correo!</span>
                      </div>
                      {tokenGeneratedPreview && (
                        <p className="text-[10px] text-slate-600">
                          Código de verificación generado: <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-emerald-700 border border-emerald-200">{tokenGeneratedPreview}</code>
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Ingresar Código de 6 Dígitos *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Ej. 849201"
                      value={tokenCode}
                      onChange={(e) => setTokenCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono text-center tracking-widest font-bold"
                    />
                  </div>
                </div>
              )}

              {/* COMMON: NUEVA CONTRASEÑA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nueva Contraseña Segura *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres (mayúscula, minúscula, número y especial)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* COMMON: CONFIRMAR NUEVA CONTRASEÑA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita exactamente la nueva contraseña"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real-time Password Security Rules Indicator */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <PasswordSecurityIndicator rules={passwordRules} />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !passwordRules.isValid}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleResetForm(); onClose(); }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
