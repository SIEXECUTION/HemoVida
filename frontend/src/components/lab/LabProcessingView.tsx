import React, { useState } from 'react';
import { 
  FlaskConical, 
  Droplet, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Thermometer, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Flame,
  FileText
} from 'lucide-react';
import { 
  BloodInventoryItem, 
  DonationRecord, 
  LaboratoryAnalysisRecord, 
  BajaInventarioRecord, 
  StaffAccount,
  SerologyResult,
  ImmunohematologyResult,
  BloodGroup,
  RhFactor
} from '../../types';

interface LabProcessingViewProps {
  staffAccount?: StaffAccount;
  allDonations: DonationRecord[];
  setAllDonations: React.Dispatch<React.SetStateAction<DonationRecord[]>>;
  inventory: BloodInventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<BloodInventoryItem[]>>;
  labAnalyses: LaboratoryAnalysisRecord[];
  setLabAnalyses: React.Dispatch<React.SetStateAction<LaboratoryAnalysisRecord[]>>;
  bajasInventario: BajaInventarioRecord[];
  setBajasInventario: React.Dispatch<React.SetStateAction<BajaInventarioRecord[]>>;
}

export const LabProcessingView: React.FC<LabProcessingViewProps> = ({
  staffAccount,
  allDonations,
  setAllDonations,
  inventory,
  setInventory,
  labAnalyses,
  setLabAnalyses,
  bajasInventario,
  setBajasInventario
}) => {
  const [activeTab, setActiveTab] = useState<'fraccionamiento' | 'serologia' | 'bajas'>('fraccionamiento');

  // Quarantine mother bags or recent donations awaiting fractioning or testing
  const quarantineBags = inventory.filter(i => i.estado === 'En Cuarentena');
  const availableBags = inventory.filter(i => i.estado === 'Disponible');

  // Selected donation to test in parallel laboratory
  const [selectedDonationId, setSelectedDonationId] = useState<number>(
    allDonations[0]?.idExtraccion || 0
  );
  const selectedDonation = allDonations.find(d => d.idExtraccion === selectedDonationId) || allDonations[0];

  // Parallel Lab Serology State (6 markers)
  const [vih, setVih] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');
  const [chagas, setChagas] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');
  const [hepatitisB, setHepatitisB] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');
  const [hepatitisC, setHepatitisC] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');
  const [sifilis, setSifilis] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');
  const [htlv, setHtlv] = useState<'No Reactivo' | 'Reactivo'>('No Reactivo');

  // Immunohematology State
  const [tipDirecta, setTipDirecta] = useState<BloodGroup>(selectedDonation?.grupoSanguineo || 'O');
  const [tipInversa, setTipInversa] = useState<BloodGroup>(selectedDonation?.grupoSanguineo || 'O');
  const [factorRh, setFactorRh] = useState<RhFactor>(selectedDonation?.factorRh || 'Positivo');
  const [coombs, setCoombs] = useState<'Negativo' | 'Positivo'>('Negativo');

  // Fractioning state for quick batch fractioning
  const [fraccionarCgr, setFraccionarCgr] = useState(true);
  const [fraccionarPfc, setFraccionarPfc] = useState(true);
  const [fraccionarCp, setFraccionarCp] = useState(true);

  // Biological Release Barrier Handler
  const handleReleaseBarrierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonation) return;

    const isSerologyClean = vih === 'No Reactivo' && chagas === 'No Reactivo' && 
      hepatitisB === 'No Reactivo' && hepatitisC === 'No Reactivo' && 
      sifilis === 'No Reactivo' && htlv === 'No Reactivo';
    
    const isImmunoConcordant = tipDirecta === tipInversa && coombs === 'Negativo';
    const finalDictamen = isSerologyClean && isImmunoConcordant ? 'Apto' : 'No Apto';

    const serologyObj: SerologyResult = {
      vih,
      chagas,
      hepatitisB,
      hepatitisC,
      sifilis,
      htlv,
      dictamenFinal: isSerologyClean ? 'Apto' : 'No Apto'
    };

    const immunoObj: ImmunohematologyResult = {
      tipificacionDirectaABO: tipDirecta,
      tipificacionInversaABO: tipInversa,
      factorRh,
      coombsIndirecto: coombs,
      concordanciaDirectaInversa: tipDirecta === tipInversa,
      dictamenInmuno: isImmunoConcordant ? 'Apto' : 'No Apto'
    };

    const labRecord: LaboratoryAnalysisRecord = {
      idAnalisis: `LAB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      codigoExtraccion: selectedDonation.codigoExtraccion,
      codigoBolsaMadre: selectedDonation.codigoBolsaMadre,
      donanteCi: selectedDonation.donanteCi || '7894561 SC',
      donanteNombre: selectedDonation.donanteNombre || 'Donante Evaluado',
      fechaProcesamiento: new Date().toISOString(),
      bioquimicoResponsable: staffAccount?.nombre || 'Lic. Bioq. Marcela Arteaga',
      serologia: serologyObj,
      inmunohematologia: immunoObj,
      estadoLiberacion: finalDictamen === 'Apto' ? 'Apto' : 'Reactivo Descarte',
      fechaLiberacion: new Date().toISOString(),
      observacionesTecnicas: finalDictamen === 'Apto' 
        ? 'Serología 6 marcadores no reactivos. Concordancia ABO 100%. Lote liberado a DISPONIBLE.' 
        : `Lote RECHAZADO por reactividad o discrepancia inmunológica (${vih === 'Reactivo' ? 'VIH ' : ''}${chagas === 'Reactivo' ? 'Chagas ' : ''}${hepatitisB === 'Reactivo' ? 'VHB ' : ''}${hepatitisC === 'Reactivo' ? 'VHC ' : ''}${sifilis === 'Reactivo' ? 'Sífilis ' : ''}${htlv === 'Reactivo' ? 'HTLV' : ''}). Enviado a Baja.`
    };

    setLabAnalyses(prev => [labRecord, ...prev]);

    // Apply the Barrera de Liberación to Inventory
    if (finalDictamen === 'Apto') {
      // 1. Set derived bags in inventory from 'En Cuarentena' to 'Disponible'
      setInventory(prev => prev.map(item => {
        if (item.codigoBolsa.startsWith(selectedDonation.codigoBolsaMadre)) {
          return { ...item, estado: 'Disponible' as const };
        }
        return item;
      }));

      // Update donation record
      setAllDonations(prev => prev.map(d => {
        if (d.idExtraccion === selectedDonation.idExtraccion) {
          return {
            ...d,
            serologia: serologyObj,
            inmunohematologia: immunoObj,
            estadoLiberacion: 'Liberada Apta' as const
          };
        }
        return d;
      }));

      alert('¡BARRERA DE LIBERACIÓN APROBADA! Todas las bolsas fraccionadas pasaron a estado "Disponible" para despacho.');
    } else {
      // 2. Serology is reactive: Set ALL derived bags to 'Baja / Descarte' and create BajaInventario record
      const reactiveMarkers = [
        vih === 'Reactivo' ? 'VIH' : null,
        chagas === 'Reactivo' ? 'Chagas' : null,
        hepatitisB === 'Reactivo' ? 'Hepatitis B' : null,
        hepatitisC === 'Reactivo' ? 'Hepatitis C' : null,
        sifilis === 'Reactivo' ? 'Sífilis' : null,
        htlv === 'Reactivo' ? 'HTLV' : null
      ].filter(Boolean).join(', ') || 'Discrepancia Inmunohematológica';

      const affectedBags = inventory
        .filter(item => item.codigoBolsa.startsWith(selectedDonation.codigoBolsaMadre))
        .map(i => i.codigoBolsa);

      const bajaRecord: BajaInventarioRecord = {
        idBaja: `BAJA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        codigoExtraccion: selectedDonation.codigoExtraccion,
        codigoBolsaMadre: selectedDonation.codigoBolsaMadre,
        codigosBolsasHijas: affectedBags.length > 0 ? affectedBags : [`${selectedDonation.codigoBolsaMadre}-K1-GR`, `${selectedDonation.codigoBolsaMadre}-K2-PL`],
        fechaBaja: new Date().toISOString(),
        motivoDescarte: `Tamizaje Serológico Reactivo: ${reactiveMarkers}`,
        marcadorReactivo: reactiveMarkers,
        responsableBioquimico: staffAccount?.nombre || 'Lic. Bioq. Marcela Arteaga',
        metodoDestruccion: 'Autoclave a Presión & Incineración Biosegura',
        actaBajaNumero: `ACT-DESCARTE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      };

      setBajasInventario(prev => [bajaRecord, ...prev]);

      setInventory(prev => prev.map(item => {
        if (item.codigoBolsa.startsWith(selectedDonation.codigoBolsaMadre)) {
          return { ...item, estado: 'Baja / Descarte' as const };
        }
        return item;
      }));

      setAllDonations(prev => prev.map(d => {
        if (d.idExtraccion === selectedDonation.idExtraccion) {
          return {
            ...d,
            serologia: serologyObj,
            inmunohematologia: immunoObj,
            estadoLiberacion: 'Rechazada / Descarte' as const
          };
        }
        return d;
      }));

      alert(`ALERTA DE DESCARTE SEROLÓGICO: Muestra reactiva (${reactiveMarkers}). Todo el lote pasó a Baja de Inventario con acta de incineración.`);
      setActiveTab('bajas');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-teal-600 text-white font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <FlaskConical className="w-3.5 h-3.5" />
                Laboratorio Central, Inmunoserología & Fraccionamiento
              </span>
              <span className="bg-white/10 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-medium">
                {staffAccount?.nombre || 'Lic. Bioq. Marcela Arteaga'} • {staffAccount?.cargo || 'Jefa de Laboratorio'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Barrera de Liberación Activa
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit',sans-serif] tracking-tight">
              Control Serológico, Inmunohematología & Fraccionamiento (CU12 - CU15)
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Alta de bolsas madre y tubos piloto en cuarentena (CU12), fraccionamiento mecánico inmediato &lt;6-8h en cámaras frías (CU15), tamizaje paralelo de 6 marcadores infecciosos (CU13), tipificación directa/inversa con Coombs (CU14) y barrera estricta de liberación o baja por descarte.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('fraccionamiento')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'fraccionamiento' ? 'bg-teal-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Fraccionamiento (CU15)</span>
            </button>

            <button
              onClick={() => setActiveTab('serologia')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'serologia' ? 'bg-teal-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Paralelo & Barrera (CU13/14)</span>
            </button>

            <button
              onClick={() => setActiveTab('bajas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bajas' ? 'bg-teal-600 text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Bajas & Descartes ({bajasInventario.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: FRACCIONAMIENTO MECÁNICO INMEDIATO (CU15) */}
      {activeTab === 'fraccionamiento' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                Regla Biológica: Fraccionamiento Mecánico Inmediato (&lt;6-8 horas) (CU15)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                La bolsa madre de sangre total colectada (450 ml) debe centrifugarse y separarse en sus hemocomponentes derivados, todos naciendo en estado <strong>'En Cuarentena'</strong> en sus respectivas cámaras frías.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
                {quarantineBags.length} bolsas en cuarentena
              </span>
            </div>
          </div>

          {/* Explanation of cold chain rules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Glóbulos Rojos (CGR)</span>
                <span className="text-[10px] font-mono bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">2°C a 6°C</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Volumen: ~250 ml con CPDA-1. Caducidad: 35 a 42 días. Destinado a anemias severas y hemorragias.
              </p>
              <div className="text-[10px] text-blue-700 font-semibold">
                Ubicación: Cámara Fría A (Bandejas 1-4)
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900">Plasma Fresco (PFC)</span>
                <span className="text-[10px] font-mono bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded font-bold">-25°C a -30°C</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Volumen: ~150-200 ml. Caducidad: 1 año. Factores lábiles de coagulación V y VIII.
              </p>
              <div className="text-[10px] text-teal-700 font-semibold">
                Ubicación: Ultracongelador Vertical B
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Plaquetas (CP)</span>
                <span className="text-[10px] font-mono bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">20°C a 24°C</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Volumen: ~50-70 ml. Caducidad: 5 días en agitación constante. Trombocitopenias críticas.
              </p>
              <div className="text-[10px] text-amber-700 font-semibold">
                Ubicación: Agitador Plaquetario Incubado C
              </div>
            </div>
          </div>

          {/* Current Quarantine Inventory Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Lotes Hemáticos en Cuarentena (Esperando Dictamen de Laboratorio):
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Código Bolsa</th>
                    <th className="py-2.5 px-3">Componente</th>
                    <th className="py-2.5 px-3">Grupo & Rh</th>
                    <th className="py-2.5 px-3">Volumen</th>
                    <th className="py-2.5 px-3">Cámara Fría</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quarantineBags.map((bag) => (
                    <tr key={bag.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {bag.codigoBolsa}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {bag.componente}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                          {bag.grupoSanguineo} {bag.factorRh === 'Positivo' ? '+' : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {bag.volumenMl} ml
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {bag.ubicacionCamara}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          En Cuarentena
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            setActiveTab('serologia');
                          }}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                        >
                          Ir a Tamizaje &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LABORATORIO PARALELO & BARRERA DE LIBERACIÓN (CU13/14) */}
      {activeTab === 'serologia' && (
        <form onSubmit={handleReleaseBarrierSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                Laboratorio Paralelo: 6 Marcadores Serológicos & Inmunohematología (CU13/14)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Barrera de Liberación: Si los 6 marcadores serológicos son No Reactivos y la tipificación ABO concuerda, las bolsas pasan a 'Disponible'. Si alguno resulta Reactivo, todo el lote pasa a 'Baja / Descarte'.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Seleccione Lote / Donación a Procesar:
              </label>
              <select
                value={selectedDonationId}
                onChange={(e) => setSelectedDonationId(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-medium"
              >
                {allDonations.map((d) => (
                  <option key={d.idExtraccion} value={d.idExtraccion}>
                    {d.codigoExtraccion} • {d.donanteNombre} ({d.grupoSanguineo}{d.factorRh === 'Positivo' ? '+' : '-'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PARTE 1: INMUNOSEROLOGÍA (6 MARCADORES OBLIGATORIOS) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                1. Panel de Inmunoserología (6 Marcadores Obligatorios de Tamizaje)
              </h3>
              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                Método: ELISA 4ta Gen / Quimioluminiscencia (CLIA)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. VIH */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">VIH 1/2 Ag/Ac</span>
                <select
                  value={vih}
                  onChange={(e) => setVih(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    vih === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>

              {/* 2. Chagas */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">Chagas (T. cruzi)</span>
                <select
                  value={chagas}
                  onChange={(e) => setChagas(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    chagas === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>

              {/* 3. Hepatitis B */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">Hepatitis B (HBsAg)</span>
                <select
                  value={hepatitisB}
                  onChange={(e) => setHepatitisB(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    hepatitisB === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>

              {/* 4. Hepatitis C */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">Hepatitis C (Ac-VHC)</span>
                <select
                  value={hepatitisC}
                  onChange={(e) => setHepatitisC(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    hepatitisC === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>

              {/* 5. Sífilis */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">Sífilis (VDRL/Trepon)</span>
                <select
                  value={sifilis}
                  onChange={(e) => setSifilis(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    sifilis === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>

              {/* 6. HTLV I/II */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-center">
                <span className="font-bold text-xs text-slate-800 block">HTLV I / II</span>
                <select
                  value={htlv}
                  onChange={(e) => setHtlv(e.target.value as any)}
                  className={`w-full px-2 py-1 text-xs font-bold rounded-lg border text-center ${
                    htlv === 'No Reactivo' ? 'border-emerald-400 text-emerald-800 bg-emerald-50' : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (!)</option>
                </select>
              </div>
            </div>
          </div>

          {/* PARTE 2: INMUNOHEMATOLOGÍA (TIPIFICACIÓN DIRECTA/INVERSA & COOMBS) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-rose-600" />
              2. Panel Inmunohematológico (Tipificación Directa e Inversa & Coombs)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Tipificación Directa (Glóbulos)
                </label>
                <select
                  value={tipDirecta}
                  onChange={(e) => setTipDirecta(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-center"
                >
                  <option value="O">Grupo O</option>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                  <option value="AB">Grupo AB</option>
                </select>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Tipificación Inversa (Suero)
                </label>
                <select
                  value={tipInversa}
                  onChange={(e) => setTipInversa(e.target.value as any)}
                  className={`w-full px-2 py-1.5 text-xs font-bold border rounded-lg text-center ${
                    tipDirecta === tipInversa ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-800'
                  }`}
                >
                  <option value="O">Grupo O</option>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                  <option value="AB">Grupo AB</option>
                </select>
                {tipDirecta !== tipInversa && (
                  <span className="text-[10px] text-rose-600 font-bold block">
                    Discrepancia Directa/Inversa (!)
                  </span>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Factor Rh (Anti-D)
                </label>
                <select
                  value={factorRh}
                  onChange={(e) => setFactorRh(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-center"
                >
                  <option value="Positivo">Positivo (+)</option>
                  <option value="Negativo">Negativo (-)</option>
                </select>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Coombs Indirecto (RAI)
                </label>
                <select
                  value={coombs}
                  onChange={(e) => setCoombs(e.target.value as any)}
                  className={`w-full px-2 py-1.5 text-xs font-bold border rounded-lg text-center ${
                    coombs === 'Negativo' ? 'border-emerald-400 text-emerald-800' : 'border-rose-400 text-rose-800'
                  }`}
                >
                  <option value="Negativo">Negativo (Apto)</option>
                  <option value="Positivo">Positivo (Anticuerpos Irregulares)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Release Barrier */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Ejecutar Barrera de Liberación / Descarte de Lote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: REGISTRO DE BAJAS Y DESCARTES (CU14) */}
      {activeTab === 'bajas' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                Registro Oficial de Bajas e Incineración por Descarte Serológico (CU14)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Actas oficiales de destrucción biosegura para lotes hemáticos reactivos a marcadores infecciosos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {bajasInventario.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No hay bajas registradas. Todos los lotes procesados han sido conformes.
              </div>
            ) : (
              bajasInventario.map((baja) => (
                <div key={baja.idBaja} className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        {baja.actaBajaNumero}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Extracción: {baja.codigoExtraccion}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(baja.fechaBaja).toLocaleString('es-ES')}
                    </span>
                  </div>

                  <p className="text-xs text-rose-900 font-bold">
                    Causa: {baja.motivoDescarte}
                  </p>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p><strong>Bolsas Hijas Inutilizadas:</strong> {baja.codigosBolsasHijas.join(', ')}</p>
                    <p><strong>Método de Destrucción:</strong> {baja.metodoDestruccion}</p>
                    <p><strong>Bioquímico Responsable:</strong> {baja.responsableBioquimico}</p>
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
