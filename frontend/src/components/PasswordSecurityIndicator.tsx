import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { PasswordValidationRules } from '../utils/security';

interface PasswordSecurityIndicatorProps {
  rules: PasswordValidationRules;
  showMatchRule?: boolean;
  isCreationMode?: boolean;
}

export const PasswordSecurityIndicator: React.FC<PasswordSecurityIndicatorProps> = ({
  rules,
  showMatchRule = false,
  isCreationMode = true
}) => {
  const criteria = [
    { id: 'len', label: 'Mínimo 8 caracteres', detail: '8 caracteres o más', met: rules.minLength },
    { id: 'min', label: '1 minúscula (a-z)', detail: 'Al menos 1 minúscula', met: rules.hasLowercase },
    { id: 'may', label: '1 mayúscula (A-Z)', detail: 'Al menos 1 mayúscula', met: rules.hasUppercase },
    { id: 'num', label: '1 número (0-9)', detail: 'Al menos 1 dígito', met: rules.hasNumber },
    { id: 'esp', label: '1 carácter especial (!@#$...)', detail: 'Símbolo: !@#$%^&*()_+-=[]{};\':"|,.<>/?', met: rules.hasSpecialChar }
  ];

  if (showMatchRule && rules.passwordsMatch !== undefined) {
    criteria.push({
      id: 'match',
      label: 'Coincidencia exacta',
      detail: 'Las dos contraseñas deben ser idénticas',
      met: rules.passwordsMatch
    });
  }

  const metCount = criteria.filter(c => c.met).length;
  const totalCount = criteria.length;
  const percent = Math.round((metCount / totalCount) * 100);

  let strengthColor = 'bg-rose-500';
  let strengthLabel = 'Insegura';
  let strengthBg = 'bg-rose-50 border-rose-200 text-rose-800';

  if (percent >= 100) {
    strengthColor = 'bg-emerald-500';
    strengthLabel = 'Fuerte & Conforme';
    strengthBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  } else if (percent >= 60) {
    strengthColor = 'bg-amber-500';
    strengthLabel = 'Requisitos pendientes';
    strengthBg = 'bg-amber-50 border-amber-200 text-amber-800';
  }

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-700 shadow-2xs">
      {/* Alert Header for Account Creation */}
      {isCreationMode && !rules.isValid && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 flex items-start gap-2 text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-extrabold uppercase tracking-wide block text-amber-800">
              Alerta de Seguridad Obligatoria al Crear Cuenta
            </span>
            <span>
              Para proteger su carnet digital y datos biológicos, la contraseña debe cumplir con: <strong>8 caracteres mín., 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial</strong>.
            </span>
          </div>
        </div>
      )}

      {isCreationMode && rules.isValid && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-800">
            ✓ Contraseña segura y verificada. Cumple con los 5 requisitos del Banco de Sangre.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-rose-600" />
          <span>Políticas de Seguridad HemoVida</span>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${strengthBg}`}>
          {strengthLabel} ({metCount}/{totalCount})
        </span>
      </div>

      {/* Progress meter */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${strengthColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {criteria.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${
              item.met 
                ? 'bg-emerald-50/70 text-emerald-800 font-semibold border border-emerald-200/60' 
                : 'bg-white text-slate-500 border border-slate-200/60'
            }`}
            title={item.detail}
          >
            {item.met ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
