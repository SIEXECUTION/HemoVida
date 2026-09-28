export interface PasswordValidationRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch?: boolean;
  isValid: boolean;
}

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;

export function evaluatePassword(pwd: string, confirmPwd?: string): PasswordValidationRules {
  const minLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(pwd);
  const passwordsMatch = confirmPwd !== undefined ? (pwd.length > 0 && pwd === confirmPwd) : true;

  const isValid = minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && (confirmPwd !== undefined ? passwordsMatch : true);

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    passwordsMatch,
    isValid
  };
}

export function getPasswordMissingAlerts(pwd: string, confirmPwd?: string): string[] {
  const alerts: string[] = [];
  if (pwd.length < 8) {
    alerts.push(`Mínimo 8 caracteres (actual: ${pwd.length} caracteres)`);
  }
  if (!/[a-z]/.test(pwd)) {
    alerts.push('Al menos 1 letra minúscula (a-z)');
  }
  if (!/[A-Z]/.test(pwd)) {
    alerts.push('Al menos 1 letra mayúscula (A-Z)');
  }
  if (!/[0-9]/.test(pwd)) {
    alerts.push('Al menos 1 número (0-9)');
  }
  if (!SPECIAL_CHAR_REGEX.test(pwd)) {
    alerts.push('Al menos 1 carácter especial (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }
  if (confirmPwd !== undefined && confirmPwd.length > 0 && pwd !== confirmPwd) {
    alerts.push('La confirmación de contraseña no coincide con la contraseña original');
  } else if (confirmPwd !== undefined && confirmPwd.length === 0 && pwd.length > 0) {
    alerts.push('Debe confirmar la contraseña');
  }
  return alerts;
}

export function generateForensicIp(): string {
  const subnets = ['181.188', '190.181', '200.87', '192.168.10'];
  const subnet = subnets[Math.floor(Math.random() * subnets.length)];
  const host = Math.floor(2 + Math.random() * 250);
  return `${subnet}.${host}`;
}
