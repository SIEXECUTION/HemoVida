import React, { useState } from 'react';
import { 
  Truck, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Building2, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Thermometer,
  Calendar,
  Sparkles,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { 
  BloodInventoryItem, 
  BloodDispatchRecord, 
  PatientReplacementRecord, 
  StaffAccount 
} from '../../types';
import { BloodInventorySection } from '../reception/BloodInventorySection';
import { DispatchHistorySection } from '../reception/DispatchHistorySection';
import { NewDispatchModal } from '../reception/NewDispatchModal';

interface DispatchDeskViewProps {
  inventory: BloodInventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<BloodInventoryItem[]>>;
  dispatches: BloodDispatchRecord[];
  setDispatches: React.Dispatch<React.SetStateAction<BloodDispatchRecord[]>>;
  replacements: PatientReplacementRecord[];
  setReplacements: React.Dispatch<React.SetStateAction<PatientReplacementRecord[]>>;
  staffAccount?: StaffAccount;
  onOpenChangePassword?: () => void;
}

export type DispatchTab = 'inventario' | 'despachos' | 'distribucion';

export const DispatchDeskView: React.FC<DispatchDeskViewProps> = ({
  inventory,
  setInventory,
  dispatches,
  setDispatches,
  replacements,
  setReplacements,
  staffAccount,
  onOpenChangePassword
}) => {
  const [activeTab, setActiveTab] = useState<DispatchTab>('inventario');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // Stats calculation
  const availableBags = inventory.filter(i => i.estado === 'Disponible');
  const criticalBags = availableBags.filter(i => 
    (i.grupoSanguineo === 'O' && i.factorRh === 'Negativo') || 
    (i.grupoSanguineo === 'A' && i.factorRh === 'Negativo')
  );

  const totalBagsDispatched = dispatches.reduce(
    (acc, curr) => acc + curr.unidadesDespachadas.length, 0
  );

  const totalRecaudadoBs = dispatches.reduce(
    (acc, curr) => curr.cobroServicio.estadoPago === 'Pagado' ? acc + curr.cobroServicio.montoTotalBs : acc, 0
  );

  const totalSusExonerado = dispatches.filter(
    d => d.cobroServicio.estadoPago === 'Exonerado SUS'
  ).length;

  const handleConfirmDispatch = (
    dispatchRecord: BloodDispatchRecord,
    updatedInventory: BloodInventoryItem[],
    updatedReplacements: PatientReplacementRecord[]
  ) => {
    setDispatches(prev => [dispatchRecord, ...prev]);
    setInventory(updatedInventory);
    setReplacements(updatedReplacements);
  };

  // Hospital distribution stats
  const hospitalStats = dispatches.reduce((acc, d) => {
    const hosp = d.hospitalDestino;
    const count = d.unidadesDespachadas.length;
    acc[hosp] = (acc[hosp] || 0) + count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Dispatch Account Workstation Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-red-900/50 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-red-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Truck className="w-3.5 h-3.5" />
                Cuenta de Despacho Transfusional
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium">
                {staffAccount?.nombre || 'Lic. Bioq. Carlos Mendoza'} • {staffAccount?.cargo || 'Responsable de Despacho & Stock'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Guardia 24h Activa
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Control de Cámaras Frías, Solicitudes Hospitalarias & Despachos
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Atención de órdenes transfusionales para hospitales y clínicas de Santa Cruz: verificación de solicitud médica oficial, validación de quien retira la sangre, liquidación de cobro de servicios / SUS Ley 475 y entrega segura de hemocomponentes.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="w-full sm:w-auto px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                title="Cambiar contraseña de acceso a la cuenta"
              >
                <KeyRound className="w-4 h-4 text-red-300" />
                <span>Cambiar Contraseña</span>
              </button>
            )}
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-lg shadow-red-950/50 hover:scale-[1.02]"
              id="btn-dispatch-new-order"
            >
              <Truck className="w-4 h-4" />
              <span>+ Nuevo Despacho con Solicitud Médica</span>
            </button>
          </div>
        </div>

        {/* Quick metric highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-blue-400" /> Stock Disponible en Frío:
            </span>
            <strong className="text-lg font-mono font-bold text-white">
              {availableBags.length} unidades
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Grupos Críticos (O-, A-):
            </span>
            <strong className="text-lg font-mono font-bold text-amber-300">
              {criticalBags.length} bolsas
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-rose-400" /> Despachadas a Hospitales:
            </span>
            <strong className="text-lg font-mono font-bold text-rose-300">
              {totalBagsDispatched} unidades ({dispatches.length} envíos)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Recaudación Servicios:
            </span>
            <strong className="text-lg font-mono font-bold text-emerald-300">
              {totalRecaudadoBs} Bs. <span className="text-[10px] text-slate-300">({totalSusExonerado} SUS)</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Main Tabs for Dispatch Workstation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-1.5 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventario')}
          id="dispatch-tab-inventario"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'inventario'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventario Hemático & Cámaras Frías</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'inventario' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {availableBags.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('despachos')}
          id="dispatch-tab-despachos"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'despachos'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Historial de Despachos & Cobro</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'despachos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {dispatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('distribucion')}
          id="dispatch-tab-distribucion"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'distribucion'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Centros de Salud & Distribución</span>
        </button>
      </div>

      {/* Tab 1: Blood Inventory */}
      {activeTab === 'inventario' && (
        <BloodInventorySection
          inventory={inventory}
          onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
        />
      )}

      {/* Tab 2: Dispatch History & Receipts */}
      {activeTab === 'despachos' && (
        <DispatchHistorySection
          dispatches={dispatches}
          onOpenNewDispatchModal={() => setIsDispatchModalOpen(true)}
        />
      )}

      {/* Tab 3: Distribution Stats to Hospitals */}
      {activeTab === 'distribucion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                  Distribución Hospitalaria de Hemocomponentes
                </h3>
                <p className="text-xs text-slate-500">
                  Resumen de unidades despachadas a la red hospitalaria pública y privada de Santa Cruz
                </p>
              </div>
              <span className="text-xs font-bold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                {Object.keys(hospitalStats).length} Centros Atendidos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(hospitalStats).map(([hospital, count]) => (
                <div 
                  key={hospital}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-red-300 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {hospital}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Red de Salud Santa Cruz
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-base font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                      {count} ud.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown and SUS explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Régimen de Cobro Transfusional
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Servicios Facturados / Particulares:</span>
                  <strong className="font-bold text-slate-900">{totalRecaudadoBs} Bs.</strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Despachos Gratuitos SUS / Ley 475:</span>
                  <strong className="font-bold text-emerald-600">{totalSusExonerado} órdenes</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Total Despachos Auditados:</span>
                  <strong className="font-bold text-slate-900">{dispatches.length} despachos</strong>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200/80 p-5">
              <h4 className="text-sm font-bold text-red-950 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-700" />
                Protocolo de Despacho Seguro
              </h4>
              <p className="text-xs text-red-900 leading-relaxed">
                Toda entrega requiere la presentación física de la <strong>Orden Transfusional oficial</strong> con firma y sello del médico especialista, además del registro de la cédula de identidad de la persona autorizada para su traslado con cadena de frío garantizada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Dispatch Modal */}
      <NewDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        inventory={inventory}
        replacements={replacements}
        onConfirmDispatch={handleConfirmDispatch}
      />
    </div>
  );
};
