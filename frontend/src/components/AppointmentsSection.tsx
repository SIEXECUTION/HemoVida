import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  FileText, 
  ShieldCheck,
  UserCheck,
  Trash2,
  Download,
  Building
} from 'lucide-react';
import { Appointment, DonationCenter, UserDonor } from '../types';
import { formatDateTime } from '../utils/donationCalculator';

interface AppointmentsSectionProps {
  appointments: Appointment[];
  centers: DonationCenter[];
  currentUser: UserDonor;
  onAddAppointment: (newApp: Appointment) => void;
  onCancelAppointment: (idCita: number) => void;
  preselectedCenterId?: string | null;
}

export const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({
  appointments,
  centers,
  currentUser,
  onAddAppointment,
  onCancelAppointment,
  preselectedCenterId
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<string>(
    preselectedCenterId || centers[0]?.id || 'center-1'
  );
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-28');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [modalidad, setModalidad] = useState<'Sangre Total' | 'Aferesis Plaquetaria' | 'Reposicion Familiar'>('Sangre Total');
  const [pacienteReceptor, setPacienteReceptor] = useState('');
  const [hospitalDestino, setHospitalDestino] = useState('');
  
  // Prefiltro Checklist
  const [checkEdad, setCheckEdad] = useState(true);
  const [checkPeso, setCheckPeso] = useState(true);
  const [checkTatuaje, setCheckTatuaje] = useState(true);
  const [checkSintomas, setCheckSintomas] = useState(true);
  
  const [voucherModal, setVoucherModal] = useState<Appointment | null>(null);

  const activeAppointments = appointments.filter(a => a.estadoCita === 'Programada');
  const pastAppointments = appointments.filter(a => a.estadoCita !== 'Programada');

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const center = centers.find(c => c.id === selectedCenterId) || centers[0];
    const prefiltroOk = checkEdad && checkPeso && checkTatuaje && checkSintomas;

    const newAppointment: Appointment = {
      idCita: Date.now(),
      codigoCita: `CITA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      idDonante: currentUser.id,
      centroId: center.id,
      centroNombre: center.nombre,
      centroDireccion: center.direccion,
      fechaHoraProgramada: `${selectedDate}T${selectedTime}:00`,
      modalidad,
      pacienteReceptor: modalidad === 'Reposicion Familiar' ? pacienteReceptor : undefined,
      hospitalDestino: modalidad === 'Reposicion Familiar' ? hospitalDestino : undefined,
      prefiltroAprobado: prefiltroOk,
      asistenciaConfirmada: false,
      estadoCita: 'Programada',
      indicacionesPrevias: [
        'Descansar al menos 6 horas la noche previa.',
        'Tomar abundante agua (mínimo 500 ml antes de la extracción).',
        'Desayuno liviano (frutas, té, tostadas; no grasas ni leche).',
        'Llevar Cédula de Identidad original vigente.'
      ]
    };

    onAddAppointment(newAppointment);
    setModalOpen(false);
    setVoucherModal(newAppointment);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
              Gestión de Citas de Donación
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Agenda tu turno en el Banco Central o centros satélites de Santa Cruz para una atención ágil y sin demoras.
          </p>
        </div>

        <button
          id="btn-open-agendar-cita"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agendar Nueva Cita
        </button>
      </div>

      {/* Active Appointments List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>Citas Programadas Próximas</span>
            <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {activeAppointments.length}
            </span>
          </h3>
        </div>

        {activeAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">
              No tienes citas activas en este momento
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              La donación de sangre salva hasta 3 vidas. Agenda un turno en tu centro de preferencia y sé parte de la red de donantes de HemoVida.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Agendar turno ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAppointments.map((cita) => (
              <div
                key={cita.idCita}
                id={`cita-card-${cita.idCita}`}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full mb-1">
                        <Clock className="w-3 h-3" /> {cita.modalidad}
                      </span>
                      <h4 className="font-bold text-base text-slate-900">
                        {cita.centroNombre}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {cita.centroDireccion}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 border border-slate-200">
                      {cita.codigoCita}
                    </span>
                  </div>

                  {cita.pacienteReceptor && (
                    <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-lg mb-3 border border-amber-200">
                      <strong>Reposición para paciente:</strong> {cita.pacienteReceptor} (Hosp: {cita.hospitalDestino || 'No especificado'})
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Fecha y Hora:</span>
                      <strong className="text-rose-700 text-sm">
                        {formatDateTime(cita.fechaHoraProgramada)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Prefiltro Clínico:</span>
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Estado:</span>
                      <span className="text-rose-600 font-bold">
                        Confirmada (En Espera)
                      </span>
                    </div>
                  </div>

                  {/* Indications list */}
                  <div className="text-[11px] text-slate-500 space-y-0.5 mb-3 bg-white p-2.5 rounded-lg border border-slate-100">
                    <p className="font-bold text-slate-700 mb-1">Indicaciones previas recomendadas:</p>
                    {cita.indicacionesPrevias.slice(0, 2).map((ind, i) => (
                      <p key={i} className="flex items-center gap-1 text-slate-600">
                        • {ind}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setVoucherModal(cita)}
                    className="text-xs font-bold text-slate-700 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver Comprobante
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('¿Deseas cancelar esta cita de donación?')) {
                        onCancelAppointment(cita.idCita);
                      }
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancelar Turno
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical / Attended Citas */}
      {pastAppointments.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Historial de Citas Pasadas
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Centro</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Modalidad</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pastAppointments.map((cita) => (
                    <tr key={cita.idCita} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {cita.codigoCita}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {cita.centroNombre}
                      </td>
                      <td className="p-3">
                        {formatDateTime(cita.fechaHoraProgramada)}
                      </td>
                      <td className="p-3">{cita.modalidad}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          cita.estadoCita === 'Atendida'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cita.estadoCita}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR NUEVA CITA */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-lg font-['Outfit',sans-serif]">
                    Agendar Cita de Donación
                  </h3>
                  <p className="text-xs text-rose-100">
                    Banco de Sangre HemoVida • Prefiltro Web Automatizado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              {/* Step 1: Select Center */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Selecciona el Centro de Colecta o Banco
                </label>
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — {c.zona} ({c.horarioAtencion})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Fecha Deseada
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora del Turno
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    <option value="07:30">07:30 AM</option>
                    <option value="08:00">08:00 AM</option>
                    <option value="08:30">08:30 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="09:30">09:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:30">05:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Modality */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Modalidad de Donación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalidad('Sangre Total')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                      modalidad === 'Sangre Total'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    Sangre Total (450 ml)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalidad('Aferesis Plaquetaria')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                      modalidad === 'Aferesis Plaquetaria'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    Aféresis (Plaquetas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalidad('Reposicion Familiar')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                      modalidad === 'Reposicion Familiar'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    Reposición Familiar
                  </button>
                </div>
              </div>

              {modalidad === 'Reposicion Familiar' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                      Nombre Completo del Paciente Receptor
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Roberto Meneses Peña"
                      value={pacienteReceptor}
                      onChange={(e) => setPacienteReceptor(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                      Clínica u Hospital Solicitante
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Hospital Japonés / Clínica Foianini"
                      value={hospitalDestino}
                      onChange={(e) => setHospitalDestino(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Prefiltro de Aptitud (Seguridad Clínica) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Prefiltro Clínico Obligatorio:</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkEdad}
                    onChange={(e) => setCheckEdad(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Tengo entre 18 y 65 años de edad cumplidos.</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkPeso}
                    onChange={(e) => setCheckPeso(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Mi peso corporal es superior a 50 kg (seguridad de extracción).</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkTatuaje}
                    onChange={(e) => setCheckTatuaje(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>No me he realizado tatuajes ni perforaciones en los últimos 6 meses.</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSintomas}
                    onChange={(e) => setCheckSintomas(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>No presento fiebre, síntomas gripales ni consumo antibióticos hoy.</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!checkEdad || !checkPeso || !checkTatuaje || !checkSintomas}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar y Generar Turno Digital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOUCHER MODAL */}
      {voucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 text-center">
            <button
              onClick={() => setVoucherModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
              ¡Cita Agendada con Éxito!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tu turno ha sido registrado en el sistema de HemoVida.
            </p>

            {/* Voucher Card */}
            <div className="bg-slate-50 rounded-xl p-4 my-4 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Código de Cita:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {voucherModal.codigoCita}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Donante:</span>
                <p className="font-bold text-slate-900">
                  {currentUser.nombres} {currentUser.apellidos} (CI: {currentUser.ci})
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Lugar:</span>
                <p className="font-bold text-slate-900">{voucherModal.centroNombre}</p>
                <p className="text-[11px] text-slate-500">{voucherModal.centroDireccion}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Fecha y Hora:</span>
                <p className="font-bold text-rose-700">
                  {formatDateTime(voucherModal.fechaHoraProgramada)}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-4">
              Por favor presenta tu C.I. al llegar a recepción para pasar directamente a sala de triaje.
            </p>

            <button
              onClick={() => setVoucherModal(null)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
