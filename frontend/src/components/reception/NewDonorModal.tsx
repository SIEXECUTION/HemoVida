import React, { useState } from 'react';
import { UserPlus, X, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { UserDonor, BloodGroup, RhFactor } from '../../types';

interface NewDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDonorRegistered: (newDonor: UserDonor) => void;
}

export const NewDonorModal: React.FC<NewDonorModalProps> = ({
  isOpen,
  onClose,
  onDonorRegistered
}) => {
  const [ci, setCi] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'Otro'>('M');
  const [fechaNacimiento, setFechaNacimiento] = useState('1998-05-15');
  const [celular, setCelular] = useState('+591 ');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [grupoSanguineo, setGrupoSanguineo] = useState<BloodGroup>('O');
  const [factorRh, setFactorRh] = useState<RhFactor>('Positivo');
  const [tipoDonante, setTipoDonante] = useState<'Voluntario Altruista' | 'Reposicion Familiar'>('Voluntario Altruista');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ci.trim()) {
      alert('Por favor ingrese el número de Cédula de Identidad.');
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      alert('Por favor ingrese nombres y apellidos completos.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('El correo electrónico es obligatorio y no se puede dejar en blanco.');
      return;
    }

    const createdDonor: UserDonor = {
      id: Date.now(),
      ci: ci.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      email: email.trim().toLowerCase(),
      celular: celular.trim() || '+591 700-00000',
      sexo,
      fechaNacimiento,
      nacionalidad: 'Boliviana',
      direccion: direccion.trim() || 'Santa Cruz de la Sierra',
      ocupacion: ocupacion.trim() || 'Particular',
      tipoDonante,
      carnetDigitalCodigo: `HV-DON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      grupoSanguineo,
      factorRh,
      fechaUltimaDonacion: null, // New donor has no previous donation
      estadoHabilitacion: 'Apto',
      totalDonaciones: 0,
      volumenHistoricoMl: 0
    };

    onDonorRegistered(createdDonor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 to-red-600 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-['Outfit',sans-serif]">
                Registrar Nueva Persona / Donante
              </h3>
              <p className="text-xs text-rose-100">
                Inscripción oficial en el padrón del Banco de Sangre Central HemoVida
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Cédula de Identidad (C.I.) *
              </label>
              <input
                type="text"
                required
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                placeholder="Ej. 8923411 SC"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Sexo Biológico *
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="M">Masculino (Intervalo biológico: 90 días)</option>
                <option value="F">Femenino (Intervalo biológico: 120 días)</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Nombres *
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Ej. Mario Fernando"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej. Céspedes Barbery"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                required
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@hemovida.org"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Celular / WhatsApp *
              </label>
              <input
                type="text"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="+591 760-12345"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Grupo Sanguíneo Conocido
              </label>
              <select
                value={grupoSanguineo}
                onChange={(e) => setGrupoSanguineo(e.target.value as BloodGroup)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="O">Grupo O (Universal)</option>
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
                <option value="AB">Grupo AB</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Factor Rh
              </label>
              <select
                value={factorRh}
                onChange={(e) => setFactorRh(e.target.value as RhFactor)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Positivo">Positivo (+)</option>
                <option value="Negativo">Negativo (-)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">
                Dirección / Barrio en Santa Cruz
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Plan 3000, Barrio Guapilo #44"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Ocupación
              </label>
              <input
                type="text"
                value={ocupacion}
                onChange={(e) => setOcupacion(e.target.value)}
                placeholder="Ej. Estudiante, Comerciante, Docente"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Modalidad Predilecta
              </label>
              <select
                value={tipoDonante}
                onChange={(e) => setTipoDonante(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Voluntario Altruista">Donante Voluntario Altruista</option>
                <option value="Reposicion Familiar">Reposición Familiar / Dirigida</option>
              </select>
            </div>
          </div>

          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2 text-[11px] text-rose-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Al registrar a la persona se le generará automáticamente su código de Carnet Digital HemoVida y estará habilitada para donar y verificar su viabilidad clínica.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Guardar y Registrar Persona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
