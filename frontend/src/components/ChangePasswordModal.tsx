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
  ShieldCheck,
  ArrowLeft
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
  // Mode: 'standard' (contraseña actual + 2 veces la nueva) | 'forgot_password' (recuperar por código a correo)
  const [mode, setMode] = useState<'standard' | 'forgot_password'>('standard');

  // Standard Mode Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // New Password Fields (Common to both modes)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password Mode Fields (Email Token)
  const [tokenCode, setTokenCode] = useState('');
  const [tokenSent, setTokenSent] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  // Status & Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const userEmail = session.role === 'donante' ? session.user.email : session.staff.email;
  const userName = session.role === 'donante' ? `${session.user.nombres} ${session.user.apellidos}` : session.staff.nombre;
  const userRole = session.role === 'donante' ? 'Donante de Sangre' : session.staff.cargo;

  // Real-time password rules evaluation
  const passwordRules = evaluatePassword(newPassword, confirmNewPassword);

  // Real-time password match evaluation
  const hasTypedBoth = newPassword.length > 0 && confirmNewPassword.length > 0;
  const passwordsMatch = hasTypedBoth && newPassword === confirmNewPassword;
  const passwordsMismatch = hasTypedBoth && newPassword !== confirmNewPassword;

  const handleRequestToken = async () => {
    setErrorMsg(null);
    setTokenLoading(true);
    try {
      await apiService.requestPasswordReset(userEmail);
      setTokenSent(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar código de 6 dígitos al correo.');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'standard' && !currentPassword.trim()) {
      setErrorMsg('Por favor ingrese su contraseña actual para verificar su identidad.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Por favor ingrese la nueva contraseña.');
      return;
    }

    if (!confirmNewPassword) {
      setErrorMsg('Debe confirmar la nueva contraseña repitiéndola exactamente.');
      return;
    }

    // 1. Validar que ambas contraseñas nuevas sean idénticas
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las dos contraseñas nuevas no coinciden. Ambas deben ser exactamente iguales.');
      return;
    }

    // 2. Validar que cumpla con los 8 caracteres, mayúscula, minúscula, número y símbolo
    if (!passwordRules.isValid) {
      const missing = getPasswordMissingAlerts(newPassword, confirmNewPassword);
      setErrorMsg(`La nueva contraseña no cumple con los requisitos de seguridad: ${missing.join(', ')}`);
      return;
    }

    // 3. Validar que no sea igual a la actual
    if (mode === 'standard' && currentPassword && newPassword === currentPassword) {
      setErrorMsg('La nueva contraseña debe ser diferente a su contraseña actual.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'standard') {
        const storedPwd = session.role === 'donante' ? session.user.password : session.staff.password;
        
        // Si hay una contraseña registrada en la sesión local, comprobarla primero
        if (storedPwd && storedPwd !== currentPassword) {
          setErrorMsg('La contraseña actual ingresada es incorrecta.');
          setIsSubmitting(false);
          return;
        }

        try {
          await apiService.changePassword(userEmail, currentPassword, null, newPassword);
        } catch (apiErr: any) {
          // Si el servidor detectó que la contraseña actual es errónea:
          if (apiErr?.message && (apiErr.message.toLowerCase().includes('incorrecta') || apiErr.message.toLowerCase().includes('actual'))) {
            setErrorMsg('La contraseña actual ingresada es incorrecta.');
            setIsSubmitting(false);
            return;
          }

          // Si el usuario es un donante local verificado pero el backend no lo tiene o está offline
          if (storedPwd && storedPwd === currentPassword) {
            console.warn('Contraseña actualizada en sesión local:', apiErr?.message);
          } else {
            setErrorMsg(apiErr?.message || 'Error al verificar la contraseña actual con el servidor.');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        // Modo recuperación por correo
        if (!tokenCode.trim()) {
          setErrorMsg('Debe ingresar el código de 6 dígitos recibido por correo electrónico.');
          setIsSubmitting(false);
          return;
        }

        await apiService.changePassword(userEmail, null, tokenCode.trim(), newPassword);
      }

      onPasswordChanged(newPassword);
      setSuccessMsg('¡Contraseña modificada exitosamente! Se ha validado la seguridad y actualizado su clave de acceso.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al actualizar la contraseña. Verifique los datos ingresados.');
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
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode('standard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fadeIn">
        
        {/* Header Institucional */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-rose-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif]">
                  {mode === 'standard' ? 'Cambiar Contraseña' : 'Recuperar Contraseña por Correo'}
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
                className="mt-3 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
              >
                Aceptar y Continuar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              
              {/* Alerta de Error */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* MODO ESTÁNDAR: CONTRASEÑA ACTUAL */}
              {mode === 'standard' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Contraseña Actual *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="Ingrese su contraseña actual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      id="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showCurrentPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Opción destacada: ¿Has olvidado tu contraseña? */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg(null);
                        setTokenSent(false);
                        setTokenCode('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      id="btn-forgot-password-in-modal"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>¿Has olvidado tu contraseña actual? Recuperar con código a mi correo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODO RECUPERACIÓN: TOKEN DE 6 DÍGITOS AL CORREO */}
              {mode === 'forgot_password' && (
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-fadeIn">
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
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>¡Código de 6 dígitos enviado exitosamente!</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Revise su bandeja de entrada (y la carpeta de spam). Copie el código de 6 dígitos e ingréselo aquí:
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Código de 6 Dígitos Recibido *
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

                  {/* Volver al modo estándar */}
                  <div className="pt-1 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('standard');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Volver a cambiar con mi contraseña actual</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CAMPO 2: NUEVA CONTRASEÑA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    placeholder="Mínimo 8 caracteres (mayúscula, minúscula, número y especial)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    id="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CAMPO 3: CONFIRMAR NUEVA CONTRASEÑA (DOS VECES LA NUEVA PARA CONFIRMAR) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Confirmar Nueva Contraseña *
                  </label>
                  <span className="text-[11px] text-slate-400">Repita la nueva contraseña</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    placeholder="Repita exactamente la nueva contraseña"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 bg-white font-medium ${
                      passwordsMismatch 
                        ? 'border-rose-400 focus:ring-rose-500 text-rose-900 bg-rose-50/20' 
                        : (passwordsMatch ? 'border-emerald-400 focus:ring-emerald-500' : 'border-slate-300 focus:ring-rose-500')
                    }`}
                    id="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* INDICADOR VISUAL DESTACADO EN EL FORMULARIO DE QUE AMBAS COINCIDEN */}
                {passwordsMatch && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ Las dos contraseñas coinciden perfectamente.</span>
                  </div>
                )}

                {passwordsMismatch && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-bold animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>✗ Las contraseñas no coinciden. Ambas deben ser exactamente iguales.</span>
                  </div>
                )}
              </div>

              {/* Indicador de Complejidad de Contraseña en Tiempo Real */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <PasswordSecurityIndicator rules={passwordRules} showMatchRule={true} isCreationMode={false} />
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  id="btn-submit-change-password"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? 'Actualizando...' 
                      : (mode === 'standard' ? 'Actualizar Contraseña' : 'Validar Código y Actualizar Contraseña')}
                  </span>
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
