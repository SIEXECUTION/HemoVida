import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Droplet, 
  QrCode, 
  ShieldCheck, 
  Printer, 
  Download, 
  Calendar, 
  Heart,
  CheckCircle2,
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { UserDonor } from '../types';
import { calculateBiologicalEligibility } from '../utils/donationCalculator';

interface DigitalCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDonor;
}

export const DigitalCardModal: React.FC<DigitalCardModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const eligibility = calculateBiologicalEligibility(user);

  const getInitials = (nombres: string, apellidos: string) => {
    const n = nombres?.trim().charAt(0) || 'D';
    const a = apellidos?.trim().charAt(0) || 'S';
    return `${n}${a}`.toUpperCase();
  };

  const handleSaveDigital = () => {
    setSaveNotification(`Carnet ${user.carnetDigitalCodigo} verificado y preparado para presentación en centros de colecta.`);
    setTimeout(() => {
      setSaveNotification(null);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-sm font-['Outfit',sans-serif]">
              Carnet Digital del Donante
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
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

            {/* Card Main Body: EMBLEMA BIOMÉTRICO INSTITUCIONAL (SIN IMÁGENES DE PERSONA) */}
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

            {/* Blood Type Big Badge & QR Stamp */}
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

              <div className="bg-white p-2 rounded-xl text-slate-900 flex items-center gap-2 shadow-md">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center p-1 font-mono text-[9px] text-center leading-tight">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">
                    Validación
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Habilitado
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

          {/* Print & Download buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir Carnet
            </button>
            <button
              onClick={handleSaveDigital}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" /> Guardar Digital
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
