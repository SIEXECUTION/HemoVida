import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  DollarSign, 
  FileText, 
  Building2, 
  UserCheck, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { BloodDispatchRecord } from '../../types';

interface DispatchHistorySectionProps {
  dispatches: BloodDispatchRecord[];
  onOpenNewDispatchModal: () => void;
}

export const DispatchHistorySection: React.FC<DispatchHistorySectionProps> = ({
  dispatches,
  onOpenNewDispatchModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedDispatchForTicket, setSelectedDispatchForTicket] = useState<BloodDispatchRecord | null>(null);

  // Stats calculation
  const totalDispatches = dispatches.length;
  const totalBagsDispatched = dispatches.reduce((acc, d) => acc + d.unidadesDespachadas.length, 0);
  const totalRevenueBs = dispatches.reduce((acc, d) => acc + d.cobroServicio.montoTotalBs, 0);
  const totalExoneratedSus = dispatches.filter(d => d.cobroServicio.estadoPago === 'Exonerado SUS').length;

  // Filtered dispatches
  const filteredDispatches = dispatches.filter(d => {
    const matchesSearch = 
      d.idDespacho.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.hospitalDestino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.pacienteReceptor.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.pacienteReceptor.ci.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.personaQueRetira.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.codigoSolicitudHospital.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment = filterPayment === 'all' || d.cobroServicio.estadoPago === filterPayment;

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Control y Trazabilidad Transfusional
              </span>
              <span className="text-[11px] text-slate-400">• Aranceles y Solicitudes</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Historial de Despachos & Cobro del Servicio
            </h2>
            <p className="text-xs text-slate-500">
              Registro auditado de salidas de sangre a centros de salud, orden médica solicitante, paciente receptor, persona que retiró y recaudación de aranceles.
            </p>
          </div>

          <button
            onClick={onOpenNewDispatchModal}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 transition-all shrink-0"
          >
            <Truck className="w-4 h-4" />
            + Registrar Nuevo Despacho
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Despachos Totales
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {totalDispatches}
              </span>
              <span className="text-xs text-slate-500">entregas</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Bolsas Distribuidas
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-700 font-mono">
                {totalBagsDispatched}
              </span>
              <span className="text-xs text-slate-500">unidades</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Recaudación por Servicios
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                Bs. {totalRevenueBs}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Exonerados SUS (Ley 475)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-sky-700 font-mono">
                {totalExoneratedSus}
              </span>
              <span className="text-xs text-slate-500">casos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por hospital, paciente, quien retira o código..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto text-xs">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Todos los Estados de Cobro</option>
              <option value="Pagado">Pagados (Particular)</option>
              <option value="Exonerado SUS">Exonerados SUS (Ley 475)</option>
              <option value="Convenio Institucional">Convenio Institucional</option>
              <option value="Pendiente">Pendientes</option>
            </select>
          </div>
        </div>

        {/* Dispatch Cards / List */}
        <div className="divide-y divide-slate-100">
          {filteredDispatches.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No se encontraron registros de despacho con los filtros seleccionados.
            </div>
          ) : (
            filteredDispatches.map((dispatch) => (
              <div key={dispatch.idDespacho} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  
                  {/* Left Column: ID, Center, Patient, Person who picked it up */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {dispatch.idDespacho}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(dispatch.fechaHora).toLocaleString('es-BO')}
                      </span>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        Solicitud: {dispatch.codigoSolicitudHospital}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Destination hospital & Patient Receptor */}
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Centro Destino & Paciente Receptor
                        </p>
                        <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                          {dispatch.hospitalDestino}
                        </p>
                        <p className="text-slate-800">
                          Paciente: <strong>{dispatch.pacienteReceptor.nombres}</strong> (C.I.: {dispatch.pacienteReceptor.ci})
                        </p>
                        <p className="text-slate-600">
                          Grupo/Rh: <strong className="text-rose-700 font-mono">{dispatch.pacienteReceptor.grupoSanguineo}{dispatch.pacienteReceptor.factorRh === 'Positivo' ? '+' : '-'}</strong> • Ubicación: {dispatch.pacienteReceptor.salaCama}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Médico Solicitante: {dispatch.medicoSolicitante}
                        </p>
                      </div>

                      {/* Authorized Person who picked it up */}
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Persona que Retiró la Sangre (Con Orden Médica)
                        </p>
                        <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          {dispatch.personaQueRetira.nombres}
                        </p>
                        <p className="text-slate-700">
                          C.I.: <span className="font-mono font-bold">{dispatch.personaQueRetira.ci}</span> • Tel: {dispatch.personaQueRetira.telefono}
                        </p>
                        <p className="text-slate-600">
                          Parentesco/Cargo: <span className="font-semibold text-slate-800">{dispatch.personaQueRetira.parentescoOInstitucion}</span>
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Responsable Entrega: {dispatch.responsableDespacho}
                        </p>
                      </div>
                    </div>

                    {/* Dispatched units pills */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Bolsas Entregadas ({dispatch.unidadesDespachadas.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {dispatch.unidadesDespachadas.map((unit, idx) => (
                          <div 
                            key={idx}
                            className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-2 shadow-2xs"
                          >
                            <span className="font-mono font-bold text-slate-900">{unit.codigoBolsa}</span>
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 rounded">
                              {unit.grupoSanguineo}{unit.factorRh === 'Positivo' ? '+' : '-'}
                            </span>
                            <span className="text-slate-600">{unit.componente}</span>
                            <span className="text-slate-400 font-mono">({unit.volumenMl}ml)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Billing & Actions */}
                  <div className="lg:w-64 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shrink-0 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Cobro del Servicio
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xl font-black text-slate-900 font-mono">
                          Bs. {dispatch.cobroServicio.montoTotalBs}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dispatch.cobroServicio.estadoPago === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dispatch.cobroServicio.estadoPago === 'Exonerado SUS'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dispatch.cobroServicio.estadoPago}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Método: <strong>{dispatch.cobroServicio.metodoPago}</strong>
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        N° Comprobante: {dispatch.cobroServicio.numeroReciboFactura}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedDispatchForTicket(dispatch)}
                      className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      Ver Guía de Despacho
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Modal */}
      {selectedDispatchForTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 font-['Outfit',sans-serif]">
                  GUÍA TRANSFUSIONAL & RECIBO DE DESPACHO
                </h3>
                <p className="text-xs text-slate-500">
                  Banco de Sangre Central HemoVida • Despacho Oficial
                </p>
              </div>
              <button 
                onClick={() => setSelectedDispatchForTicket(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Código de Despacho:</span>
                <strong className="font-mono text-rose-700">{selectedDispatchForTicket.idDespacho}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y Hora:</span>
                <span>{new Date(selectedDispatchForTicket.fechaHora).toLocaleString('es-BO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Centro Solicitante:</span>
                <strong className="text-slate-900">{selectedDispatchForTicket.hospitalDestino}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Solicitud Médica N°:</span>
                <strong className="font-mono">{selectedDispatchForTicket.codigoSolicitudHospital}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paciente Receptor:</span>
                <strong className="text-slate-900">{selectedDispatchForTicket.pacienteReceptor.nombres} ({selectedDispatchForTicket.pacienteReceptor.ci})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Retirado Por:</span>
                <span>{selectedDispatchForTicket.personaQueRetira.nombres} ({selectedDispatchForTicket.personaQueRetira.parentescoOInstitucion})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Cobro Total del Servicio:</span>
                <strong className="text-emerald-700 font-mono text-sm">Bs. {selectedDispatchForTicket.cobroServicio.montoTotalBs} ({selectedDispatchForTicket.cobroServicio.estadoPago})</strong>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                Imprimir Guía
              </button>
              <button
                onClick={() => setSelectedDispatchForTicket(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer text-xs"
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
