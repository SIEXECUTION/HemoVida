import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ImageIcon,
  Clock
} from 'lucide-react';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const eligibility = calculateBiologicalEligibility(user);

  const carnetCodeToUse = (user.ci && user.ci.trim()) 
    ? user.ci.trim() 
    : (user.carnetDigitalCodigo || '0000000');

  const carnetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?carnet=${encodeURIComponent(carnetCodeToUse)}`
    : `https://hemovida.pages.dev/?carnet=${encodeURIComponent(carnetCodeToUse)}`;

  // Generar código QR como Base64 Data URL puro sin dependencias de red externas
  useEffect(() => {
    if (carnetUrl) {
      QRCode.toDataURL(carnetUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.warn('Error al generar QR data URL:', err);
      });
    }
  }, [carnetUrl]);

  const qrCodeImageUrl = qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(carnetUrl)}&bgcolor=ffffff&color=0f172a&margin=1`;

  // DESCARGAR EL CARNET DIGITAL COMO IMAGEN REAL (.PNG) CON EL QR
  const handleDownloadImage = async () => {
    const cardEl = document.getElementById('printable-donor-card');
    if (!cardEl) return;

    try {
      setIsDownloading(true);
      const dataUrl = await toPng(cardEl, {
        cacheBust: true,
        pixelRatio: 2, // Calidad Retina de alta resolución
      });
      const link = document.createElement('a');
      link.download = `Carnet-HemoVida-${(user.carnetDigitalCodigo || user.ci).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();

      setSaveNotification(`Imagen PNG del carnet con código QR descargada con éxito.`);
      setTimeout(() => {
        setSaveNotification(null);
      }, 3500);
    } catch (err) {
      console.error('Error al generar imagen PNG del carnet:', err);
      setSaveNotification('No se pudo generar la imagen. Intente nuevamente.');
      setTimeout(() => setSaveNotification(null), 3500);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const getInitials = (nombres: string, apellidos: string) => {
    const n = nombres?.trim().charAt(0) || 'D';
    const a = apellidos?.trim().charAt(0) || 'S';
    return `${n}${a}`.toUpperCase();
  };

  const isPostulante = Boolean(
    user.totalDonaciones === 0 || 
    (user.carnetDigitalCodigo && user.carnetDigitalCodigo.startsWith('HV-POST')) ||
    user.ocupacion?.includes('Postulante')
  );

  const estimatedLivesSaved = Math.max(0, (user.totalDonaciones || 0) * 3);
  const totalVolumeMl = user.volumenHistoricoMl || (user.totalDonaciones || 0) * 450;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="font-bold text-sm font-['Outfit',sans-serif] truncate">
              {isPublicVerification 
                ? (isPostulante ? 'Validación Oficial: Postulante Registrado' : 'Validación Oficial: Donante Acreditado') 
                : (isPostulante ? 'Carnet Provisional de Postulante' : 'Carnet Digital del Donante')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Public Verification Medical Status Banner */}
        {isPublicVerification && (
          <div className={`${isPostulante ? 'bg-amber-600' : (eligibility.habilitado ? 'bg-emerald-600' : 'bg-amber-600')} text-white px-5 sm:px-6 py-3 flex items-start gap-2.5 text-xs shadow-inner`}>
            {isPostulante ? (
              <Clock className="w-5 h-5 shrink-0 text-white mt-0.5" />
            ) : eligibility.habilitado ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-white mt-0.5" />
            ) : (
              <Calendar className="w-5 h-5 shrink-0 text-white mt-0.5" />
            )}
            <div>
              <p className="font-bold tracking-tight text-xs sm:text-sm">
                {isPostulante
                  ? '📋 POSTULANTE REGISTRADO EN HEMOVIDA (EN EVALUACIÓN)'
                  : eligibility.habilitado 
                    ? '✓ CERTIFICACIÓN OFICIAL: HABILITADO PARA DONAR' 
                    : '⏳ EN PERÍODO DE RECUPERACIÓN BIOLÓGICA'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                {isPostulante
                  ? 'Usuario registrado en la base de datos de HemoVida. Habilitado para triaje clínico presencial y primera colecta (tamizaje serológico pendiente tras extracción).'
                  : eligibility.habilitado
                    ? `Donante apto y verificado en la base de datos central de HemoVida Santa Cruz (${user.sexo === 'M' ? '90 días' : '120 días'} de intervalo biológico reglamentario).`
                    : `Reposo celular en curso. Próxima fecha autorizada: ${eligibility.fechaProximaHabilitada.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} (${eligibility.diasRestantes} días restantes).`
                }
              </p>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* THE DIGITAL CREDENTIAL CARD (SIN FOTO DE PERSONA) */}
          <div 
            id="printable-donor-card"
            className={`bg-gradient-to-br ${isPostulante ? 'from-amber-700 via-orange-600 to-amber-900 border-amber-400/40' : 'from-rose-700 via-rose-600 to-red-800 border-rose-400/40'} text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border select-none`}
          >
            {/* Background Pattern */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-36 h-36 bg-black/15 rounded-full blur-lg pointer-events-none" />

            {/* Card Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/20 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white text-rose-700 flex items-center justify-center shadow-xs shrink-0">
                  <Droplet className="w-5 h-5 fill-rose-700" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm tracking-tight font-['Outfit',sans-serif]">
                    HEMOVIDA • SANTA CRUZ
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-rose-200 uppercase tracking-wider font-semibold">
                    Banco de Sangre & Transfusión
                  </p>
                </div>
              </div>

              <span className="bg-white/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/30 truncate max-w-[120px]">
                {user.carnetDigitalCodigo}
              </span>
            </div>

            {/* Card Main Body: EMBLEMA BIOMÉTRICO INSTITUCIONAL */}
            <div className="relative z-10 grid grid-cols-12 gap-3 sm:gap-4 items-center">
              <div className="col-span-4 text-center flex flex-col items-center">
                {/* Emblema Vectorial Biométrico de Seguridad Institucional */}
                <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-white/25 via-white/10 to-rose-950/40 border-2 border-white/70 shadow-lg flex flex-col items-center justify-center overflow-hidden p-1 backdrop-blur-xs">
                  {/* Patrón de seguridad de fondo */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/25 pointer-events-none" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border border-white/25 pointer-events-none" />
                  <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full border border-white/25 pointer-events-none" />

                  {/* Escudo Vectorial Oficial */}
                  <div className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white text-rose-700 shadow-md flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 fill-rose-100" />
                  </div>

                  {/* Monograma y chip biométrico */}
                  <div className="relative z-10 mt-1 flex items-center gap-1">
                    <span className="font-mono font-black text-[9px] sm:text-[10px] text-white tracking-widest bg-black/30 px-1 py-0.2 rounded border border-white/20">
                      {getInitials(user.nombres, user.apellidos)}
                    </span>
                    <span className="text-[6px] sm:text-[7px] font-mono text-rose-200 uppercase font-extrabold tracking-tight">
                      BIO-ID
                    </span>
                  </div>
                </div>

                <span className="inline-block mt-1.5 text-[8px] sm:text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white border border-white/20 truncate">
                  {user.sexo === 'M' ? 'Varón (90d)' : 'Mujer (120d)'}
                </span>
              </div>

              <div className="col-span-8 space-y-1">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-white/80 uppercase tracking-wider font-semibold">
                    {isPostulante ? 'Postulante Registrado (En Evaluación)' : 'Donante Acreditado'}
                  </p>
                  <p className="font-black text-sm sm:text-base leading-tight tracking-tight">
                    {user.nombres} {user.apellidos}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-rose-200 block">C.I.:</span>
                    <strong className="font-mono text-xs sm:text-sm">{user.ci}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-200 block">Nacionalidad:</span>
                    <strong className="text-xs truncate block">{user.nacionalidad || 'Boliviana'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-rose-200 block">Modalidad:</span>
                    <strong className="text-xs truncate block">{user.tipoDonante}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Type Big Badge & Real Scannable QR */}
            <div className="relative z-10 mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-white/80 uppercase tracking-wider block">
                  {isPostulante ? 'Tipificación Sanguínea' : 'Grupo & Factor'}
                </span>
                {isPostulante ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-extrabold bg-white/25 text-white px-2 py-0.5 rounded border border-white/30">
                      En Evaluación (Triaje)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {user.grupoSanguineo}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold bg-white text-rose-800 px-1.5 py-0.5 rounded">
                      {user.factorRh === 'Positivo' ? 'Rh+' : 'Rh-'}
                    </span>
                  </div>
                )}
              </div>

              {/* Código QR Real y Escaneable */}
              <div className="bg-white p-1.5 rounded-xl text-slate-900 flex items-center gap-2 shadow-md">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center p-0.5 border border-slate-200 shrink-0">
                  <img 
                    src={qrCodeImageUrl} 
                    alt={`QR de Verificación ${user.carnetDigitalCodigo}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left pr-1">
                  <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-500 font-bold block">
                    Código QR
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Oficial
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="relative z-10 mt-3 flex items-center justify-between text-[9px] sm:text-[10px] text-rose-200">
              <span>Santa Cruz de la Sierra, Bolivia</span>
              <span>{user.totalDonaciones} donación(es)</span>
            </div>
          </div>

          {/* Feedback banner when saved */}
          {saveNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveNotification}</span>
            </div>
          )}

          {/* Solidarity Impact Statistics */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
            <div className="p-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Donaciones</span>
              <strong className="text-base sm:text-lg font-black text-rose-700">{user.totalDonaciones || 0}</strong>
            </div>
            <div className="p-1 border-x border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Volumen</span>
              <strong className="text-base sm:text-lg font-black text-rose-700">{isPostulante ? 0 : totalVolumeMl} <span className="text-[10px] font-medium">ml</span></strong>
            </div>
            <div className="p-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Vidas Salvadas</span>
              <strong className="text-base sm:text-lg font-black text-emerald-600">~{isPostulante ? 0 : estimatedLivesSaved}</strong>
            </div>
          </div>

          {/* Additional Donor Clinical Status Note */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Estado de Habilitación:</span>
              <strong className={`px-2 py-0.5 rounded font-bold ${
                isPostulante 
                  ? 'text-amber-800 bg-amber-100' 
                  : (eligibility.habilitado ? 'text-emerald-700 bg-emerald-100' : 'text-amber-800 bg-amber-100')
              }`}>
                {isPostulante ? 'En Evaluación (Pre-filtro)' : (eligibility.habilitado ? 'Habilitado' : 'Diferido Temporal')}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isPostulante ? 'Primera colecta:' : 'Última donación registrada:'}</span>
              <span className="font-semibold text-slate-800">{isPostulante ? 'Pendiente de agendamiento' : (user.fechaUltimaDonacion || 'Sin donación previa')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isPostulante ? 'Tamizaje serológico:' : 'Próxima fecha autorizada:'}</span>
              <span className={`font-bold ${isPostulante ? 'text-amber-700' : 'text-rose-700'}`}>
                {isPostulante 
                  ? '6 marcadores tras primera extracción' 
                  : eligibility.fechaProximaHabilitada.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                }
              </span>
            </div>
          </div>

          {/* Enlace Oficial de Verificación del Carnet (Al escanear el QR) */}
          <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Enlace Oficial de Verificación
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

          {/* Action Buttons: Descargar como Imagen PNG (Sin botón imprimir) */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className={`w-full py-2.5 sm:py-3 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${
                isDownloading 
                  ? 'bg-rose-400 cursor-wait' 
                  : 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-600/25 active:scale-[0.99]'
              }`}
              id="btn-download-carnet-digital"
            >
              {isDownloading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Generando imagen PNG de alta resolución...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Descargar Credencial como Imagen (.PNG)</span>
                </>
              )}
            </button>

            {isPublicVerification && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors border border-slate-200"
              >
                <span>Cerrar Verificación</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
