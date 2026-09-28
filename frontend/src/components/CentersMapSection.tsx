import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Calendar, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Search, 
  Filter,
  MessageCircle,
  Building2,
  Bus,
  Sparkles
} from 'lucide-react';
import { DonationCenter } from '../types';

interface CentersMapSectionProps {
  centers: DonationCenter[];
  onSelectCenterToBook: (centerId: string) => void;
}

export const CentersMapSection: React.FC<CentersMapSectionProps> = ({
  centers,
  onSelectCenterToBook
}) => {
  const [selectedCenter, setSelectedCenter] = useState<DonationCenter>(centers[0]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapZoom, setMapZoom] = useState(1);

  const filteredCenters = centers.filter(c => {
    const matchesType = filterType === 'all' || c.tipo === filterType;
    const matchesSearch = c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.direccion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.zona.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
              Mapa de Centros de Colecta y Transfusión
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Encuentra el punto de donación más cercano en Santa Cruz de la Sierra: Sede Central Calle Warnes, hospitales asociados y brigadas móviles.
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por zona o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-1.5 px-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
          >
            <option value="all">Todos los centros ({centers.length})</option>
            <option value="Central">Sede Central</option>
            <option value="Hospitalario">Hospitales</option>
            <option value="Clinica">Clínicas Privadas</option>
            <option value="Punto Movil">Unidades Móviles</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Map view + Center Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Vector Map (Santa Cruz de la Sierra) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl overflow-hidden relative">
          {/* Map Title & Legend Overlay */}
          <div className="flex items-center justify-between mb-3 text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Red Hemática Santa Cruz • En Tiempo Real
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Sede Central
              <span className="w-2 h-2 rounded-full bg-sky-500 ml-2" /> Hospitales
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" /> Móviles
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden select-none">
            {/* City Grid & Rings Background (Santa Cruz radial ring layout) */}
            <svg className="absolute inset-0 w-full h-full text-slate-800/80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ringGrad" cx="50%" cy="48%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#ringGrad)" />

              {/* Santa Cruz Anillos concéntricos */}
              {/* 1er Anillo */}
              <ellipse cx="48%" cy="46%" rx="18%" ry="18%" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
              {/* 2do Anillo */}
              <ellipse cx="48%" cy="46%" rx="32%" ry="32%" fill="none" stroke="#334155" strokeWidth="1.5" />
              {/* 3er Anillo */}
              <ellipse cx="48%" cy="46%" rx="44%" ry="44%" fill="none" stroke="#1e293b" strokeWidth="2" />
              
              {/* Avenidas radiales principales */}
              <line x1="48%" y1="46%" x2="48%" y2="2%" stroke="#334155" strokeWidth="1.5" /> {/* Av. Cristo Redentor (Norte) */}
              <line x1="48%" y1="46%" x2="48%" y2="95%" stroke="#334155" strokeWidth="1.5" /> {/* Av. Santos Dumont (Sur) */}
              <line x1="48%" y1="46%" x2="95%" y2="46%" stroke="#334155" strokeWidth="1.5" /> {/* Av. Virgen de Cotoca (Este) */}
              <line x1="48%" y1="46%" x2="5%" y2="46%" stroke="#334155" strokeWidth="1.5" /> {/* Doble Vía La Guardia (Oeste) */}

              {/* Río Piraí (Oeste) */}
              <path d="M 12% 0% Q 8% 50% 15% 100%" fill="none" stroke="#0284c7" strokeWidth="2" strokeOpacity="0.4" />
              <text x="14%" y="15%" fill="#38bdf8" opacity="0.4" fontSize="9" fontWeight="bold">Río Piraí</text>

              {/* Landmark Labels */}
              <text x="49%" y="42%" fill="#94a3b8" fontSize="10" fontWeight="bold">Centro Histórico</text>
              <text x="60%" y="24%" fill="#64748b" fontSize="9">3er Anillo Norte</text>
              <text x="76%" y="72%" fill="#64748b" fontSize="9">Pampa de la Isla</text>
            </svg>

            {/* Interactive Pins */}
            {filteredCenters.map((center) => {
              const isSelected = selectedCenter?.id === center.id;
              const isCentral = center.tipo === 'Central';
              const isMovil = center.tipo === 'Punto Movil';

              let pinBg = 'bg-sky-600 border-sky-300';
              if (isCentral) pinBg = 'bg-rose-600 border-rose-300';
              if (isMovil) pinBg = 'bg-amber-600 border-amber-300';

              return (
                <div
                  key={center.id}
                  onClick={() => setSelectedCenter(center)}
                  style={{
                    left: `${center.coordenadas.xPercent}%`,
                    top: `${center.coordenadas.yPercent}%`
                  }}
                  id={`map-pin-${center.id}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  {/* Pulse effect for selected or urgent */}
                  {isSelected && (
                    <span className="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping" />
                  )}

                  <div className={`relative flex items-center justify-center p-2 rounded-full text-white shadow-lg transition-transform ${pinBg} ${
                    isSelected ? 'scale-125 ring-4 ring-rose-400/40' : 'group-hover:scale-115'
                  }`}>
                    <MapPin className="w-4 h-4 fill-white" />
                  </div>

                  {/* Hover or selected tooltip badge */}
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-md transition-all pointer-events-none ${
                    isSelected 
                      ? 'bg-rose-600 text-white opacity-100 scale-100' 
                      : 'bg-slate-900/90 text-slate-200 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                  }`}>
                    {center.nombre.replace('Banco de Sangre ', '')}
                    <div className="text-[9px] font-normal opacity-80">{center.horarioAtencion}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>📍 Santa Cruz de la Sierra: 1er, 2do y 3er Anillo</span>
            <span className="text-slate-300">Haz clic en un marcador para ver datos y agendar</span>
          </div>
        </div>

        {/* Center Details Card (Selected) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1 ${
                  selectedCenter.tipo === 'Central'
                    ? 'bg-rose-100 text-rose-800'
                    : selectedCenter.tipo === 'Punto Movil'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-sky-100 text-sky-800'
                }`}>
                  {selectedCenter.badge || selectedCenter.tipo}
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif]">
                  {selectedCenter.nombre}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>{selectedCenter.direccion}</strong>
                <br />
                <span className="text-slate-400 text-[11px]">Ref: {selectedCenter.referencia}</span>
              </span>
            </p>

            {/* Info Grid */}
            <div className="space-y-2.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Horario:
                </span>
                <strong className="text-slate-800 font-semibold">{selectedCenter.horarioAtencion}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Días:
                </span>
                <span className="font-semibold text-slate-800">{selectedCenter.diasAtencion}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Teléfono:
                </span>
                <a href={`tel:${selectedCenter.telefono}`} className="font-semibold text-rose-700 hover:underline">
                  {selectedCenter.telefono}
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cupos libres hoy:</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  {selectedCenter.turnosDisponiblesHoy} turnos disponibles
                </span>
              </div>
            </div>

            {/* Urgent Blood Stock Needed at this Center */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Grupos en reserva crítica en este punto:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCenter.stockCritico.map((grupo, idx) => (
                  <span
                    key={idx}
                    className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-lg text-xs font-black animate-pulse"
                  >
                    {grupo}
                  </span>
                ))}
              </div>
            </div>

            {/* Services provided */}
            <div className="mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Servicios Disponibles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCenter.servicios.map((serv, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md"
                  >
                    ✓ {serv}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                id={`btn-agendar-en-${selectedCenter.id}`}
                onClick={() => onSelectCenterToBook(selectedCenter.id)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-101 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Agendar Cita en este Centro
              </button>

              <a
                href={`https://wa.me/${selectedCenter.whatsapp.replace(/\D/g, '')}?text=Hola,%20quisiera%20consultar%20sobre%20la%20donaci%C3%B3n%20en%20${encodeURIComponent(selectedCenter.nombre)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Consultar por WhatsApp ({selectedCenter.whatsapp})
              </a>
            </div>
          </div>

          {/* Quick Info Callout */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">
              ¿Vas a donar por reposición familiar?
            </p>
            <p>
              Recuerda solicitar el nombre completo del paciente receptor y el número de cama antes de tu cita para imputar la reposición al hospital correspondiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
