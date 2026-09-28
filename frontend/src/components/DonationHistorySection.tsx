import React, { useState } from 'react';
import { 
  History, 
  Droplet, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Search, 
  Calendar, 
  Award, 
  X, 
  Download, 
  Printer, 
  Clock,
  Sparkles,
  Heart
} from 'lucide-react';
import { DonationRecord, UserDonor } from '../types';
import { formatDateTime } from '../utils/donationCalculator';

interface DonationHistorySectionProps {
  donations: DonationRecord[];
  currentUser: UserDonor;
}

export const DonationHistorySection: React.FC<DonationHistorySectionProps> = ({
  donations,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DonationRecord | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<DonationRecord | null>(null);

  const filteredDonations = donations.filter(d => 
    d.codigoExtraccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.centroNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.modalidad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
              Historial Clínico de Donaciones
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro de extracciones, trazabilidad de bolsas madre K, panel serológico y derivados sanguíneos.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código o centro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary Mini Bar */}
      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <Droplet className="w-6 h-6 fill-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">
              Aporte Total Histórico: <strong className="text-rose-700">{currentUser.totalDonaciones} donaciones</strong>
            </p>
            <p className="text-[11px] text-slate-500">
              Total de sangre recolectada: <strong>{currentUser.volumenHistoricoMl} ml</strong> (~{(currentUser.volumenHistoricoMl / 1000).toFixed(1)} Litros)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% de donaciones con serología aprobada</span>
        </div>
      </div>

      {/* Donation Cards List */}
      <div className="space-y-4">
        {filteredDonations.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No se encontraron donaciones registradas</p>
            <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda.</p>
          </div>
        ) : (
          filteredDonations.map((donacion) => (
            <div
              key={donacion.idExtraccion}
              id={`donation-card-${donacion.idExtraccion}`}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-rose-300 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm shrink-0">
                    {donacion.grupoSanguineo}{donacion.factorRh === 'Positivo' ? '+' : '-'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {donacion.modalidad}
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {donacion.estadoLiberacion}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateTime(donacion.fechaHora)} • {donacion.centroNombre}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-700 border border-slate-200">
                    {donacion.codigoExtraccion}
                  </span>
                  <button
                    onClick={() => setShowCertificateModal(donacion)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Ver Certificado de Donación"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Extraction Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Bolsa Madre</span>
                  <span className="font-mono font-bold text-slate-800">{donacion.codigoBolsaMadre}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Volumen Extraído</span>
                  <span className="font-bold text-slate-900">{donacion.volumenExtraidoMl} ml (Brazo {donacion.brazo})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Bioquímico / Flebotomía</span>
                  <span className="font-medium text-slate-800 truncate block">{donacion.personalSalud.split('(')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Incentivo Entregado</span>
                  <span className="font-semibold text-rose-700 truncate block">{donacion.incentivo.articulo}</span>
                </div>
              </div>

              {/* Serology Panel Preview */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Panel Serológico (6 Marcadores):
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                    VIH: No Reactivo
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                    Chagas: No Reactivo
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                    Hepatitis B & C: Negativo
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRecord(donacion)}
                    className="text-xs font-bold text-slate-700 hover:text-rose-600 underline cursor-pointer"
                  >
                    Ver detalles del análisis &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL: Serology & Fractionation */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg font-['Outfit',sans-serif]">
                  Expediente de Donación {selectedRecord.codigoExtraccion}
                </h3>
                <p className="text-xs text-slate-300">
                  Laboratorio de Inmuno-Serología e Inmuno-Hematología
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Serological table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  1. Tamizaje Inmuno-Serológico Normativo
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">VIH 1/2 Ac/Ag:</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.vih}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Chagas (T. cruzi):</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.chagas}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Hepatitis B (HBsAg):</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.hepatitisB}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Hepatitis C (VHC):</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.hepatitisC}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Sífilis (VDRL/RPR):</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.sifilis}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">HTLV I/II:</span>
                    <strong className="text-emerald-700">{selectedRecord.serologia.htlv}</strong>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs text-slate-600">Dictamen Final: </span>
                  <strong className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    APTO PARA TRANSFUSIÓN CLÍNICA
                  </strong>
                </div>
              </div>

              {/* Fractionated components */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  2. Hemocomponentes Derivados Fraccionados
                </h4>
                <div className="space-y-2 text-xs">
                  {selectedRecord.componentesDerivados.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{comp.tipo}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          Código K: {comp.codigoK} • {comp.volumenMl} ml
                        </p>
                      </div>
                      <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded">
                        {comp.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentives */}
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                <p className="font-bold text-rose-900">Incentivo de Agradecimiento:</p>
                <p className="text-rose-800 mt-0.5">{selectedRecord.incentivo.articulo}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6">
            <button
              onClick={() => setShowCertificateModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-4 border-double border-rose-600/30 p-6 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                <Award className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif] uppercase tracking-wide">
                  Certificado de Donación Altruista
                </h3>
                <p className="text-xs text-rose-700 font-bold">
                  Banco de Sangre y Servicio de Transfusión HemoVida
                </p>
                <p className="text-[11px] text-slate-400">
                  Santa Cruz de la Sierra, Bolivia
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Se certifica con gratitud que el ciudadano/a:
              </p>

              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200">
                <p className="text-base font-extrabold text-slate-900">
                  {currentUser.nombres} {currentUser.apellidos}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  C.I.: <strong>{currentUser.ci}</strong> • Grupo Sanguíneo: <strong className="text-rose-700">{currentUser.grupoSanguineo} {currentUser.factorRh}</strong>
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Ha realizado con éxito la extracción de sangre bajo el código <strong>{showCertificateModal.codigoExtraccion}</strong> por un volumen de <strong>{showCertificateModal.volumenExtraidoMl} ml</strong>, contribuyendo a la preservación de la vida humana.
              </p>

              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Fecha: {formatDateTime(showCertificateModal.fechaHora)}</span>
                <span className="font-mono text-[10px] text-slate-400">Firma Digital Validada</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => setShowCertificateModal(null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
