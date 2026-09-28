import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  RotateCcw, 
  Calendar,
  Sparkles,
  ShieldAlert,
  Clock,
  Heart
} from 'lucide-react';

interface PrecheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToAppointments: (modalidad?: 'Voluntario Altruista' | 'Reposicion Familiar' | 'Brigada Movil') => void;
}

interface Question {
  id: number;
  tipo: 'general' | 'temporal' | 'definitiva';
  title: string;
  text: string;
  cumpleEsSi: boolean; // Si responder "Sí" significa que CUMPLE el criterio de aptitud
  explanation: string;
}

export const PrecheckModal: React.FC<PrecheckModalProps> = ({
  isOpen,
  onClose,
  onGoToAppointments
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<'Voluntario Altruista' | 'Reposicion Familiar' | 'Brigada Movil'>('Voluntario Altruista');

  if (!isOpen) return null;

  const questions: Question[] = [
    {
      id: 1,
      tipo: 'general',
      title: 'Edad y Documento Oficial',
      text: '¿Tienes entre 18 y 65 años de edad y portas tu Cédula de Identidad original vigente?',
      cumpleEsSi: true,
      explanation: 'Requisito legal indispensable para el consentimiento informado de donación.'
    },
    {
      id: 2,
      tipo: 'general',
      title: 'Peso Corporal Mínimo',
      text: '¿Tu peso corporal actual es superior a 50 kg (110 libras)?',
      cumpleEsSi: true,
      explanation: 'El volumen estándar de extracción (450 ml) requiere al menos 50 kg de masa corporal para evitar síncopes o mareos.'
    },
    {
      id: 3,
      tipo: 'temporal',
      title: 'Exclusión Temporal: Tatuajes o Piercings',
      text: '¿Te has realizado algún tatuaje, piercing, perforación o microblading en los últimos 6 meses?',
      cumpleEsSi: false, // Responder "Sí" significa que tiene exclusión temporal
      explanation: 'Periodo de ventana inmunológica necesario para descartar virus de transmisión hemática.'
    },
    {
      id: 4,
      tipo: 'temporal',
      title: 'Exclusión Temporal: Medicamentos y Salud Actual',
      text: '¿Has tomado antibióticos en los últimos 7 días o presentas fiebre, tos intensa o diarrea hoy?',
      cumpleEsSi: false,
      explanation: 'Diferimiento temporal hasta que el cuadro infeccioso y la medicación hayan cesado completamente.'
    },
    {
      id: 5,
      tipo: 'definitiva',
      title: 'Exclusión Definitiva: Enfermedades Transmisibles o Cardíacas',
      text: '¿Has sido diagnosticado con VIH, Chagas, Hepatitis B o C posterior a los 11 años, o afecciones cardíacas graves?',
      cumpleEsSi: false,
      explanation: 'Por seguridad transfusional estricta y protección de la salud del donante, estas condiciones constituyen exclusión médica definitiva.'
    }
  ];

  const handleAnswer = (val: boolean) => {
    const newAnswers = { ...answers, [questions[step].id]: val };
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setCompleted(true);
    }
  };

  // Evaluation logic
  const failedGenerals = questions.filter(q => q.tipo === 'general' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));
  const failedTemporals = questions.filter(q => q.tipo === 'temporal' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));
  const failedDefinitives = questions.filter(q => q.tipo === 'definitiva' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));

  const isEligible = failedGenerals.length === 0 && failedTemporals.length === 0 && failedDefinitives.length === 0;

  const handleReset = () => {
    setAnswers({});
    setStep(0);
    setCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 to-red-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg font-['Outfit',sans-serif]">
                Prefiltro Web de Autoexclusión (CU06)
              </h3>
              <p className="text-xs text-rose-100">
                Diferenciación de Exclusión Temporal vs. Definitiva • HemoVida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!completed ? (
            <div className="space-y-4">
              {/* Progress Bar & Type indicator */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  {questions[step].tipo === 'general' && <span className="text-blue-600">Requisito General</span>}
                  {questions[step].tipo === 'temporal' && <span className="text-amber-600">Criterio Temporal</span>}
                  {questions[step].tipo === 'definitiva' && <span className="text-rose-600">Criterio Definitivo</span>}
                </span>
                <span>Pregunta {step + 1} de {questions.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 mt-4">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  {questions[step].title}
                </span>
                <p className="text-base font-bold text-slate-900 leading-snug">
                  {questions[step].text}
                </p>
                <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                  💡 {questions[step].explanation}
                </p>
              </div>

              {/* Answer Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleAnswer(true)}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Sí
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(false)}
                  className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-slate-500" /> No
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-2">
              {isEligible ? (
                <div>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                    ¡Apto en Prefiltro Web Preliminar!
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                    No presentas criterios de exclusión temporal ni definitiva. Ahora selecciona la modalidad para agendar tu cita oficial de donación (CU07).
                  </p>

                  {/* Modalidad Selection */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Modalidad de Donación (CU07):
                    </label>
                    <select
                      value={modalidadSeleccionada}
                      onChange={(e) => setModalidadSeleccionada(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-800"
                    >
                      <option value="Voluntario Altruista">Voluntario Altruista (Con incentivo oficial)</option>
                      <option value="Reposicion Familiar">Reposición Familiar (Para paciente hospitalizado)</option>
                      <option value="Brigada Movil">Brigada Móvil / Colecta Externa</option>
                    </select>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => {
                        onClose();
                        onGoToAppointments(modalidadSeleccionada);
                      }}
                      className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Agendar Cita en Modalidad "{modalidadSeleccionada.split(' ')[0]}"
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Repetir test
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                    {failedDefinitives.length > 0 ? 'Criterio de Exclusión Definitiva' : 'Diferimiento Temporal'}
                  </h4>

                  {failedDefinitives.length > 0 && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left text-xs text-rose-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        Exclusión Médica Permanente Identificada:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                        {failedDefinitives.map(d => (
                          <li key={d.id}>{d.title}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-500 pt-1">
                        Por normas bioéticas de la OMS y el Ministerio de Salud, tu salud es prioridad y no es recomendable donar.
                      </p>
                    </div>
                  )}

                  {failedTemporals.length > 0 && failedDefinitives.length === 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        Diferimiento Temporal:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                        {failedTemporals.map(d => (
                          <li key={d.id}>{d.title}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-500 pt-1">
                        Podrás donar una vez transcurrido el tiempo biológico de espera.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex gap-2 justify-center">
                    <button
                      onClick={handleReset}
                      className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Volver a Evaluar
                    </button>
                    <button
                      onClick={onClose}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
