import React, { useState } from 'react';
import { 
  Layers, 
  Droplet, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Thermometer, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { BloodInventoryItem, BloodGroup, RhFactor } from '../../types';

interface BloodInventorySectionProps {
  inventory: BloodInventoryItem[];
  onOpenDispatchModal: () => void;
}

const BLOOD_GROUPS: { group: BloodGroup; rh: RhFactor; critical?: boolean }[] = [
  { group: 'O', rh: 'Positivo' },
  { group: 'O', rh: 'Negativo', critical: true },
  { group: 'A', rh: 'Positivo' },
  { group: 'A', rh: 'Negativo', critical: true },
  { group: 'B', rh: 'Positivo' },
  { group: 'B', rh: 'Negativo' },
  { group: 'AB', rh: 'Positivo' },
  { group: 'AB', rh: 'Negativo' },
];

export const BloodInventorySection: React.FC<BloodInventorySectionProps> = ({
  inventory,
  onOpenDispatchModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');

  const availableBags = inventory.filter(i => i.estado === 'Disponible');

  // Filtered items
  const filteredBags = availableBags.filter(bag => {
    const matchesSearch = 
      bag.codigoBolsa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bag.componente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bag.ubicacionCamara.toLowerCase().includes(searchTerm.toLowerCase());

    const groupRhKey = `${bag.grupoSanguineo}${bag.factorRh === 'Positivo' ? '+' : '-'}`;
    const matchesGroup = selectedGroup === 'all' || groupRhKey === selectedGroup;
    const matchesComponent = selectedComponent === 'all' || bag.componente === selectedComponent;

    return matchesSearch && matchesGroup && matchesComponent;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Dispatch CTA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Reserva Hemática Activa
              </span>
              <span className="text-[11px] text-slate-400">• Cadena de Frío Monitoreada</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Inventario de Sangre Disponible para Centros de Salud
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              Stock de hemocomponentes tamizados, serológicamente no reactivos y listos para despacho transfusional bajo solicitud médica autorizada.
            </p>
          </div>

          <button
            onClick={onOpenDispatchModal}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-800 hover:to-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 transition-all shrink-0"
          >
            <Truck className="w-4 h-4" />
            + Nuevo Despacho a Centro de Salud
          </button>
        </div>

        {/* Blood Groups Stock Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-5">
          {BLOOD_GROUPS.map(({ group, rh, critical }) => {
            const count = availableBags.filter(
              b => b.grupoSanguineo === group && b.factorRh === rh
            ).length;
            const rhSymbol = rh === 'Positivo' ? '+' : '-';
            const groupKey = `${group}${rhSymbol}`;
            const isSelected = selectedGroup === groupKey;

            return (
              <div
                key={groupKey}
                onClick={() => setSelectedGroup(isSelected ? 'all' : groupKey)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none relative ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-102'
                    : count === 0
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : critical
                    ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {critical && count < 3 && (
                  <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-amber-400 text-slate-950' : 'bg-red-600 text-white'
                  }`}>
                    Crítico
                  </span>
                )}
                <div className="flex items-center justify-center gap-0.5 font-mono font-black text-lg">
                  <span>{group}</span>
                  <span className="text-sm font-bold">{rhSymbol}</span>
                </div>
                <div className="mt-1">
                  <span className={`text-base font-black font-mono block leading-none ${
                    isSelected ? 'text-white' : count === 0 ? 'text-slate-400' : 'text-slate-800'
                  }`}>
                    {count}
                  </span>
                  <span className={`text-[10px] font-medium block mt-0.5 ${
                    isSelected ? 'text-rose-100' : 'text-slate-500'
                  }`}>
                    {count === 1 ? 'unidad' : 'unidades'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código de bolsa, componente..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          {/* Component and Group Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Todos los Componentes</option>
              <option value="Concentrado de Globulos Rojos">Glóbulos Rojos (CGR)</option>
              <option value="Plasma Fresco Congelado">Plasma Fresco (PFC)</option>
              <option value="Concentrado Plaquetario">Plaquetas (CP)</option>
              <option value="Crioprecipitado">Crioprecipitado</option>
            </select>

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Todos los Grupos/Rh</option>
              {BLOOD_GROUPS.map(({ group, rh }) => (
                <option key={`${group}${rh}`} value={`${group}${rh === 'Positivo' ? '+' : '-'}`}>
                  Grupo {group}{rh === 'Positivo' ? '+' : '-'}
                </option>
              ))}
            </select>

            {(selectedGroup !== 'all' || selectedComponent !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedGroup('all');
                  setSelectedComponent('all');
                  setSearchTerm('');
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold whitespace-nowrap cursor-pointer px-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Table of Available Units */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código de Bolsa</th>
                <th className="py-3 px-4">Grupo & Factor</th>
                <th className="py-3 px-4">Hemocomponente</th>
                <th className="py-3 px-4">Volumen</th>
                <th className="py-3 px-4">Caducidad / Estado</th>
                <th className="py-3 px-4">Ubicación Física</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron bolsas disponibles con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredBags.map((bag) => (
                  <tr key={bag.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {bag.codigoBolsa}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-mono font-extrabold px-2 py-0.5 rounded text-xs ${
                        bag.factorRh === 'Positivo' 
                          ? 'bg-rose-100 text-rose-800' 
                          : 'bg-red-200 text-red-950'
                      }`}>
                        <Droplet className="w-3 h-3 fill-current" />
                        {bag.grupoSanguineo}{bag.factorRh === 'Positivo' ? '+' : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {bag.componente}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {bag.volumenMl} ml
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{bag.fechaCaducidad}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          bag.diasRestantes <= 5 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {bag.diasRestantes}d rest.
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                        <Thermometer className="w-3 h-3 text-sky-600" />
                        {bag.ubicacionCamara}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={onOpenDispatchModal}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                      >
                        <Truck className="w-3 h-3" />
                        Despachar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong>{filteredBags.length}</strong> de <strong>{availableBags.length}</strong> bolsas disponibles
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Tamizaje serológico negativo certificado
          </span>
        </div>
      </div>
    </div>
  );
};
