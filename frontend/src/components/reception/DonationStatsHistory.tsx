import React, { useState } from 'react';
import { 
  Calendar, 
  Droplet, 
  Gift, 
  Heart, 
  UserCheck, 
  Search, 
  Sparkles, 
  BarChart3, 
  Download, 
  Printer,
  ChevronRight,
  Filter
} from 'lucide-react';
import { DonationRecord } from '../../types';

interface DonationStatsHistoryProps {
  donations: DonationRecord[];
  onOpenDonationModal: () => void;
}

export const DonationStatsHistory: React.FC<DonationStatsHistoryProps> = ({
  donations,
  onOpenDonationModal
}) => {
  const [viewMode, setViewMode] = useState<'dia' | 'mes' | 'anio'>('dia');

  // Selected date for "Por Día" (defaults to most recent donation date or today)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-20');

  // Selected month for "Por Mes" (format YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Selected year for "Por Año"
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // 1. DATA FOR "POR DÍA"
  const donationsOnDay = donations.filter(d => {
    const dDate = d.fechaHora.split('T')[0];
    const matchesDate = dDate === selectedDate;
    const matchesSearch = 
      d.codigoExtraccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.donanteNombre && d.donanteNombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.donanteCi && d.donanteCi.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDate && matchesSearch;
  });

  const dayTotalDonations = donationsOnDay.length;
  const dayVoluntary = donationsOnDay.filter(d => d.tipoDonante === 'Voluntario Altruista').length;
  const dayReplacement = donationsOnDay.filter(d => d.tipoDonante === 'Reposicion Familiar').length;
  const dayVolumeMl = donationsOnDay.reduce((acc, d) => acc + d.volumenExtraidoMl, 0);
  const dayGlasses = donationsOnDay.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo').length;
  const dayKeychains = donationsOnDay.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Llavero Oficial').length;

  // 2. DATA FOR "POR MES"
  const donationsInMonth = donations.filter(d => {
    const dMonth = d.fechaHora.substring(0, 7);
    const matchesMonth = dMonth === selectedMonth;
    const matchesSearch = 
      d.codigoExtraccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.donanteNombre && d.donanteNombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.donanteCi && d.donanteCi.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMonth && matchesSearch;
  });

  const monthTotalDonations = donationsInMonth.length;
  const monthVoluntary = donationsInMonth.filter(d => d.tipoDonante === 'Voluntario Altruista').length;
  const monthReplacement = donationsInMonth.filter(d => d.tipoDonante === 'Reposicion Familiar').length;
  const monthVolumeMl = donationsInMonth.reduce((acc, d) => acc + d.volumenExtraidoMl, 0);
  const monthGlasses = donationsInMonth.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo').length;
  const monthKeychains = donationsInMonth.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Llavero Oficial').length;

  // 3. DATA FOR "POR AÑO"
  const donationsInYear = donations.filter(d => {
    const dYear = new Date(d.fechaHora).getFullYear();
    return dYear === selectedYear;
  });

  const MONTHS_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const yearlyBreakdown = MONTHS_NAMES.map((name, index) => {
    const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
    const items = donationsInYear.filter(d => d.fechaHora.startsWith(monthKey));
    const vol = items.filter(d => d.tipoDonante === 'Voluntario Altruista').length;
    const rep = items.filter(d => d.tipoDonante === 'Reposicion Familiar').length;
    const totalMl = items.reduce((acc, d) => acc + d.volumenExtraidoMl, 0);
    const vasos = items.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo').length;
    const llaveros = items.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Llavero Oficial').length;

    return {
      mesIndex: index,
      mesNombre: name,
      monthKey,
      total: items.length,
      voluntarios: vol,
      reposicion: rep,
      vasos,
      llaveros,
      totalLitros: (totalMl / 1000).toFixed(1)
    };
  });

  const yearTotalDonations = donationsInYear.length;
  const yearVoluntary = donationsInYear.filter(d => d.tipoDonante === 'Voluntario Altruista').length;
  const yearReplacement = donationsInYear.filter(d => d.tipoDonante === 'Reposicion Familiar').length;
  const yearVolumeLiters = (donationsInYear.reduce((acc, d) => acc + d.volumenExtraidoMl, 0) / 1000).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Banner and Time Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Padrón Estadístico de Colectas
              </span>
              <span className="text-[11px] text-slate-400">• Trazabilidad de Donaciones & Incentivos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Historial de Donaciones por Día, Mes y Año
            </h2>
            <p className="text-xs text-slate-500">
              Auditoría cronológica de extracciones hemáticas, distribución voluntaria vs reposición y control de incentivos (vasos y llaveros).
            </p>
          </div>

          {/* Time Granularity Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('dia')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'dia'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Por Día
            </button>

            <button
              onClick={() => setViewMode('mes')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'mes'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Por Mes
            </button>

            <button
              onClick={() => setViewMode('anio')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'anio'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Por Año
            </button>
          </div>
        </div>

        {/* Temporal Filters Bar based on active mode */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {viewMode === 'dia' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Seleccionar Día:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center gap-1.5">
                {['2026-09-20', '2026-09-19', '2026-08-01', '2026-05-10'].map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                      selectedDate === d
                        ? 'bg-rose-100 text-rose-800 font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'mes' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Seleccionar Mes:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center gap-1.5">
                {['2026-09', '2026-08', '2026-05'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                      selectedMonth === m
                        ? 'bg-rose-100 text-rose-800 font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'anio' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Seleccionar Año:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value={2026}>Año 2026</option>
                <option value={2025}>Año 2025</option>
                <option value={2024}>Año 2024</option>
              </select>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Reporte
          </button>
        </div>

        {/* 4 Stats Metric Cards depending on mode */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Total Extracciones ({viewMode === 'dia' ? 'Día' : viewMode === 'mes' ? 'Mes' : 'Año'})
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {viewMode === 'dia' ? dayTotalDonations : viewMode === 'mes' ? monthTotalDonations : yearTotalDonations}
              </span>
              <span className="text-xs text-slate-500">bolsas</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Voluntarios Altruistas
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-700 font-mono">
                {viewMode === 'dia' ? dayVoluntary : viewMode === 'mes' ? monthVoluntary : yearVoluntary}
              </span>
              <span className="text-xs text-rose-600 font-semibold">
                ({Math.round(((viewMode === 'dia' ? dayVoluntary : viewMode === 'mes' ? monthVoluntary : yearVoluntary) / ((viewMode === 'dia' ? dayTotalDonations : viewMode === 'mes' ? monthTotalDonations : yearTotalDonations) || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Reposición Familiar
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-blue-700 font-mono">
                {viewMode === 'dia' ? dayReplacement : viewMode === 'mes' ? monthReplacement : yearReplacement}
              </span>
              <span className="text-xs text-slate-500">donantes</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Incentivos Entregados
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                🥛 {viewMode === 'dia' ? dayGlasses : viewMode === 'mes' ? monthGlasses : donationsInYear.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo').length} Vasos
              </span>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                🔑 {viewMode === 'dia' ? dayKeychains : viewMode === 'mes' ? monthKeychains : donationsInYear.filter(d => d.incentivo.tipoIncentivoVoluntario === 'Llavero Oficial').length} Llaveros
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'anio' ? (
        /* YEARLY BREAKDOWN TABLE */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900 font-['Outfit',sans-serif]">
              Consolidado Mensual de Donaciones - Año {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Resumen mes a mes de captación hemática y entrega de incentivos altruistas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Mes</th>
                  <th className="py-3 px-4">Total Donaciones</th>
                  <th className="py-3 px-4">Voluntarios Altruistas</th>
                  <th className="py-3 px-4">Reposición Familiar</th>
                  <th className="py-3 px-4">Incentivos Entregados (Vaso / Llavero)</th>
                  <th className="py-3 px-4">Litros Recolectados</th>
                  <th className="py-3 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {yearlyBreakdown.map((row) => (
                  <tr key={row.mesNombre} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.mesNombre}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {row.total}
                    </td>
                    <td className="py-3 px-4 text-rose-700 font-semibold">
                      {row.voluntarios}
                    </td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">
                      {row.reposicion}
                    </td>
                    <td className="py-3 px-4">
                      {row.vasos > 0 || row.llaveros > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {row.vasos > 0 && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">🥛 {row.vasos} vasos</span>}
                          {row.llaveros > 0 && <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">🔑 {row.llaveros} llaveros</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {row.totalLitros} L
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedMonth(row.monthKey);
                          setViewMode('mes');
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        Ver Mes <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DAILY OR MONTHLY DONATIONS LIST */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-['Outfit',sans-serif]">
                {viewMode === 'dia' ? `Donaciones del Día: ${selectedDate}` : `Donaciones del Mes: ${selectedMonth}`}
              </h3>
              <p className="text-xs text-slate-500">
                Lista nominal de extracciones, donantes, verificación serológica y destino de la bolsa.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar donante, C.I. o código..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>
          </div>

          {/* List of Donations */}
          <div className="divide-y divide-slate-100">
            {(viewMode === 'dia' ? donationsOnDay : donationsInMonth).length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No se registraron donaciones en {viewMode === 'dia' ? `la fecha ${selectedDate}` : `el mes ${selectedMonth}`}.
              </div>
            ) : (
              (viewMode === 'dia' ? donationsOnDay : donationsInMonth).map((donation) => (
                <div key={donation.idExtraccion} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Donor and extraction summary */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-rose-700 text-xs">
                          {donation.codigoExtraccion}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-extrabold text-sm text-slate-900">
                          {donation.donanteNombre}
                        </span>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                          C.I.: {donation.donanteCi}
                        </span>
                        <span className="text-xs font-mono font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                          {donation.grupoSanguineo}{donation.factorRh === 'Positivo' ? '+' : '-'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Hora: <strong>{new Date(donation.fechaHora).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        <span>•</span>
                        <span>Modalidad: <strong>{donation.modalidad} ({donation.volumenExtraidoMl} ml)</strong></span>
                        <span>•</span>
                        <span>{donation.centroNombre}</span>
                      </div>

                      {/* Reposition recipient or Voluntary note */}
                      {donation.tipoDonante === 'Reposicion Familiar' && donation.pacienteReceptorReposicion && (
                        <div className="text-[11px] text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/70 inline-flex items-center gap-1.5 mt-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Reposición para paciente: <strong>{donation.pacienteReceptorReposicion.nombre}</strong> ({donation.pacienteReceptorReposicion.hospital})</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Donation type badge & Incentive */}
                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                        donation.tipoDonante === 'Voluntario Altruista'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {donation.tipoDonante}
                      </span>

                      {/* Exclusive incentive pill */}
                      {donation.tipoDonante === 'Voluntario Altruista' && donation.incentivo.tipoIncentivoVoluntario && (
                        <div className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          {donation.incentivo.tipoIncentivoVoluntario === 'Vaso Conmemorativo' ? (
                            <>🥛 <span>Vaso Entregado</span></>
                          ) : (
                            <>🔑 <span>Llavero Entregado</span></>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Serología: No Reactivo (Apto)
                      </span>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
