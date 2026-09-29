import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Droplet, 
  QrCode, 
  ShieldCheck, 
  Download, 
  Calendar, 
  Heart,
  CheckCircle2,
  Fingerprint,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { UserDonor } from '../types';
import { calculateBiologicalEligibility } from '../utils/donationCalculator';

interface DigitalCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDonor;
  isPublicVerification?: boolean;
}

export const DigitalCardModal: React.FC<DigitalCardModalProps> = ({
  isOpen,
  onClose,
  user,
  isPublicVerification = false
}) => {
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const eligibility = calculateBiologicalEligibility(user);

  const carnetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?carnet=${encodeURIComponent(user.carnetDigitalCodigo || user.ci)}`
    : `https://hemovida.pages.dev/?carnet=${encodeURIComponent(user.carnetDigitalCodigo || user.ci)}`;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(carnetUrl)}&bgcolor=ffffff&color=0f172a&margin=1`;

  const handleDownloadDigital = () => {
    const cardHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnet Digital - ${user.nombres} ${user.apellidos} - HemoVida</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: linear-gradient(135deg, #be123c, #9f1239, #881337); border-radius: 24px; padding: 24px; max-width: 420px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.2); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-weight: 900; font-size: 15px; letter-spacing: 0.5px; }
    .code { font-family: monospace; font-size: 12px; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; font-weight: bold; }
    .details { margin: 16px 0; }
    .name { font-size: 20px; font-weight: 800; margin: 0 0 8px 0; }
    .meta { font-size: 12px; opacity: 0.9; margin-bottom: 4px; }
    .blood { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); }
    .blood-type { font-size: 38px; font-weight: 900; }
    .qr { background: white; padding: 8px; border-radius: 12px; text-align: center; color: #0f172a; }
    .qr img { width: 110px; height: 110px; display: block; border-radius: 4px; }
    .status { font-size: 10px; color: #047857; font-weight: bold; margin-top: 4px; }
    .footer { font-size: 11px; opacity: 0.8; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">BANCO DE SANGRE HEMOVIDA</div>
      <div class="code">${user.carnetDigitalCodigo}</div>
    </div>
    <div class="details">
      <div class="meta">DONANTE ACREDITADO</div>
      <div class="name">${user.nombres} ${user.apellidos}</div>
      <div class="meta">C.I.: <strong>${user.ci}</strong></div>
      <div class="meta">Modalidad: <strong>${user.tipoDonante}</strong></div>
      <div class="meta">Donaciones registradas: <strong>${user.totalDonaciones}</strong></div>
      <div class="meta">Enlace de verificación: <a href="${carnetUrl}" style="color:#fecdd3;">${carnetUrl}</a></div>
    </div>
    <div class="blood">
      <div>
        <div class="meta">GRUPO & FACTOR</div>
        <div class="blood-type">${user.grupoSanguineo} ${user.factorRh === 'Positivo' ? 'Rh+' : 'Rh-'}</div>
      </div>
      <div class="qr">
        <img src="${qrCodeImageUrl}" alt="Código QR de Verificación" />
        <div class="status">✓ HABILITADO</div>
      </div>
    </div>
    <div class="footer">Calle Warnes N° 271, Santa Cruz de la Sierra, Bolivia</div>
  </div>
</body>
</html>`;

    const blob = new Blob([cardHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carnet-Digital-${user.carnetDigitalCodigo || user.ci}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSaveNotification(`Carnet ${user.carnetDigitalCodigo} descargado exitosamente.`);
    setTimeout(() => {
      setSaveNotification(null);
    }, 3500);
  };

  const getInitials = (nombres: string, apellidos: string) => {
    const n = nombres?.trim().charAt(0) || 'D';
    const a = apellidos?.trim().charAt(0) || 'S';
    return `${n}${a}`.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-sm font-['Outfit',sans-serif]">
              {isPublicVerification ? 'Verificación Oficial de Carnet Digital' : 'Carnet Digital del Donante'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPublicVerification && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center gap-2.5 text-xs font-semibold shadow-inner">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span>Documento oficial validado y registrado en el Banco de Sangre HemoVida.</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* THE DIGITAL CREDENTIAL CARD (SIN FOTO DE PERSONA) */}
          <div 
            id="printable-donor-card"
            className="bg-gradient-to-br from-rose-700 via-rose-600 to-red-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-rose-400/40 select-none"
          >
            {/* Background Pattern */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-36 h-36 bg-black/15 rounded-full blur-lg pointer-events-none" />

            {/* Card Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white text-rose-700 flex items-center justify-center shadow-xs">
                  <Droplet className="w-5 h-5 fill-rose-700" />
                </div>
                <div>
                  <h4 className="font-black text-sm tracking-tight font-['Outfit',sans-serif]">
                    HEMOVIDA • SANTA CRUZ
                  </h4>
                  <p className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">
                    Banco de Sangre & Transfusión
                  </p>
                </div>
              </div>

              <span className="bg-white/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/30">
                {user.carnetDigitalCodigo}
              </span>
            </div>

            {/* Card Main Body: EMBLEMA BIOMÉTRICO INSTITUCIONAL */}
            <div className="relative z-10 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 text-center flex flex-col items-center">
                {/* Emblema Vectorial Biométrico de Seguridad Institucional */}
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-white/25 via-white/10 to-rose-950/40 border-2 border-white/70 shadow-lg flex flex-col items-center justify-center overflow-hidden p-1 backdrop-blur-xs">
                  {/* Patrón de seguridad de fondo */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/25 pointer-events-none" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border border-white/25 pointer-events-none" />
                  <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full border border-white/25 pointer-events-none" />

                  {/* Escudo Vectorial Oficial */}
                  <div className="relative z-10 w-9 h-9 rounded-xl bg-white text-rose-700 shadow-md flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-rose-600 fill-rose-100" />
                  </div>

                  {/* Monograma y chip biométrico */}
                  <div className="relative z-10 mt-1 flex items-center gap-1">
                    <span className="font-mono font-black text-[10px] text-white tracking-widest bg-black/30 px-1.5 py-0.2 rounded border border-white/20">
                      {getInitials(user.nombres, user.apellidos)}
                    </span>
                    <span className="text-[7px] font-mono text-rose-200 uppercase font-extrabold tracking-tight">
                      BIO-ID
                    </span>
                  </div>
                </div>

                <span className="inline-block mt-1.5 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white border border-white/20">
                  {user.sexo === 'M' ? 'Varón (90d)' : 'Mujer (120d)'}
                </span>
              </div>

              <div className="col-span-8 space-y-1.5">
                <div>
                  <p className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">
                    Donante Acreditado
                  </p>
                  <p className="font-black text-base leading-tight tracking-tight">
                    {user.nombres} {user.apellidos}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-rose-200 block">C.I.:</span>
                    <strong className="font-mono text-sm">{user.ci}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-200 block">Modalidad:</span>
                    <strong className="text-[11px] truncate block">{user.tipoDonante.split(' ')[0]}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Type Big Badge & Real Scannable QR */}
            <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-200 uppercase tracking-wider block">Grupo & Factor</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-white">
                    {user.grupoSanguineo}
                  </span>
                  <span className="text-sm font-extrabold bg-white text-rose-800 px-1.5 py-0.5 rounded">
                    {user.factorRh === 'Positivo' ? 'Rh+' : 'Rh-'}
                  </span>
                </div>
              </div>

              {/* Código QR Real y Escaneable */}
              <div className="bg-white p-1.5 rounded-xl text-slate-900 flex items-center gap-2 shadow-md">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-0.5 border border-slate-200 shrink-0">
                  <img 
                    src={qrCodeImageUrl} 
                    alt={`QR de Verificación ${user.carnetDigitalCodigo}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left pr-1">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">
                    Escanear QR
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Habilitado
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="relative z-10 mt-3 flex items-center justify-between text-[10px] text-rose-200">
              <span>Santa Cruz de la Sierra, Bolivia</span>
              <span>{user.totalDonaciones} donaciones registradas</span>
            </div>
          </div>

          {/* Feedback banner when saved */}
          {saveNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveNotification}</span>
            </div>
          )}

          {/* Additional Donor Status Note */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Estado Clínico de Habilitación:</span>
              <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                {user.estadoHabilitacion}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Última donación registrada:</span>
              <span className="font-semibold text-slate-800">{user.fechaUltimaDonacion || 'Sin donación previa'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Próxima fecha biológica:</span>
              <span className="font-bold text-rose-700">
                {eligibility.fechaProximaHabilitada.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Enlace Oficial de Verificación del Carnet (Al escanear el QR) */}
          <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Enlace de Verificación del QR
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(carnetUrl);
                  setSaveNotification('Enlace copiado al portapapeles.');
                  setTimeout(() => setSaveNotification(null), 2500);
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs"
              >
                <Copy className="w-3 h-3" /> Copiar Link
              </button>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-700 truncate select-all flex items-center justify-between">
              <span className="truncate">{carnetUrl}</span>
              <a 
                href={carnetUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-slate-400 hover:text-rose-600 ml-2 shrink-0"
                title="Abrir enlace en pestaña nueva"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Download button ONLY (Opción de imprimir removida) */}
          <div>
            <button
              onClick={handleDownloadDigital}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-rose-600/20"
              id="btn-download-carnet-digital"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Carnet Digital</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
