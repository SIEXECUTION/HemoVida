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
  Heart,
  ShieldCheck,
  Stethoscope,
  Info
} from 'lucide-react';

interface PrecheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToAppointments: (modalidad?: 'Voluntario Altruista' | 'Reposicion Familiar' | 'Brigada Movil' | 'Autologo') => void;
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
  // Modal assessment type: 'alogena' (para terceros) or 'autologa' (para cirugía propia CU21)
  const [assessmentType, setAssessmentType] = useState<'alogena' | 'autologa'>('alogena');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<'Voluntario Altruista' | 'Reposicion Familiar' | 'Brigada Movil' | 'Autologo'>('Voluntario Altruista');

  if (!isOpen) return null;

  // Cuestionario 1: Donación Alogénica Tradicional (Para Terceros)
  const questionsAlogena: Question[] = [
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
      explanation: 'Por seguridad transfusional estricta y protección del receptor, estas condiciones constituyen exclusión médica definitiva.'
    }
  ];

  // Cuestionario 2: Donación Autóloga Programada (CU21 - Para Cirugía Propia)
  const questionsAutologa: Question[] = [
    {
      id: 101,
      tipo: 'general',
      title: 'Prescripción Médica de Cirugía Electiva ',
      text: '¿Cuentas con orden médica o indicación formal de tu médico cirujano tratante autorizando la donación autóloga preoperatoria?',
      cumpleEsSi: true,
      explanation: 'La donación autóloga es un procedimiento coordinado con el cirujano y requiere su prescripción escrita en la orden quirúrgica.'
    },
    {
      id: 102,
      tipo: 'temporal',
      title: 'Margen de Seguridad Preoperatorio (Mínimo 72 Horas)',
      text: '¿La fecha de tu intervención quirúrgica se realizará en al menos 72 horas (o de 7 a 30 días) posteriores a la fecha de extracción?',
      cumpleEsSi: true,
      explanation: 'El intervalo mínimo de 72 horas permite que tu organismo reponga el volumen plasmático y mantenga la estabilidad hemodinámica antes de ingresar a quirófano.'
    },
    {
      id: 103,
      tipo: 'general',
      title: 'Nivel Basal de Hemoglobina (≥ 11.0 g/dL)',
      text: '¿Tu nivel más reciente de hemoglobina es igual o superior a 11.0 g/dL y te encuentras sin fiebre ni infecciones bacterianas activas?',
      cumpleEsSi: true,
      explanation: 'A diferencia de la donación a terceros (que exige ≥ 12.5 o 13.5 g/dL), la norma de autotransfusión permite donar con hemoglobina desde 11.0 g/dL.'
    },
    {
      id: 104,
      tipo: 'general',
      title: 'Custodia Exclusiva y Prohibición a Terceros',
      text: '¿Comprendes que tu sangre será rotulada exclusivamente para ti y que bajo ninguna circunstancia se donará ni transferirá a otros pacientes?',
      cumpleEsSi: true,
      explanation: 'Si la cirugía se cancela o no requieres la transfusión, la sangre será sometida a descarte sanitario controlado, jamás reasignada.'
    }
  ];

  const currentQuestions = assessmentType === 'autologa' ? questionsAutologa : questionsAlogena;

  const handleSwitchType = (type: 'alogena' | 'autologa') => {
    setAssessmentType(type);
    setAnswers({});
    setStep(0);
    setCompleted(false);
    setModalidadSeleccionada(type === 'autologa' ? 'Autologo' : 'Voluntario Altruista');
  };

  const handleAnswer = (val: boolean) => {
    const newAnswers = { ...answers, [currentQuestions[step].id]: val };
    setAnswers(newAnswers);

    if (step < currentQuestions.length - 1) {
      setStep(step + 1);
    } else {
      setCompleted(true);
    }
  };

  // Evaluation logic
  const failedGenerals = currentQuestions.filter(q => q.tipo === 'general' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));
  const failedTemporals = currentQuestions.filter(q => q.tipo === 'temporal' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));
  const failedDefinitives = currentQuestions.filter(q => q.tipo === 'definitiva' && (q.cumpleEsSi ? answers[q.id] === false : answers[q.id] === true));

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
        <div className={`p-5 text-white flex items-center justify-between ${
          assessmentType === 'autologa'
            ? 'bg-gradient-to-r from-purple-800 to-indigo-700'
            : 'bg-gradient-to-r from-rose-700 to-red-600'
        }`}>
          <div className="flex items-center gap-2.5">
            {assessmentType === 'autologa' ? (
              <Sparkles className="w-6 h-6 text-purple-200" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
            <div>
              <h3 className="font-bold text-lg font-['Outfit',sans-serif]">
                {assessmentType === 'autologa'
                  ? 'Prefiltro: Donación Autóloga '
                  : 'Prefiltro Web de Autoexclusión Médica'}
              </h3>
              <p className="text-xs text-white/80">
                {assessmentType === 'autologa'
                  ? 'Requisitos preoperatorios para cirugía electiva programada'
                  : 'Diferenciación de Exclusión Temporal vs. Definitiva • HemoVida'}
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

        {/* Assessment Type Tabs */}
        <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchType('alogena')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              assessmentType === 'alogena'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Donación Habitual (Para Terceros)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchType('autologa')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              assessmentType === 'autologa'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Autóloga (Cirugía Propia)</span>
          </button>
        </div>

        <div className="p-6">
          {!completed ? (
            <div className="space-y-4">
              {/* Type Switcher Callout Banner (when in alogena mode) */}
              {assessmentType === 'alogena' && (
                <div
                  onClick={() => handleSwitchType('autologa')}
                  className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900 cursor-pointer hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-[11px] leading-tight">
                      ¿Tienes una cirugía programada? <strong>En Donación Autóloga los requisitos son diferentes.</strong>
                    </span>
                  </div>
                  <span className="text-purple-700 font-bold underline text-[11px] shrink-0 ml-2">
                    Ver donación autóloga &rarr;
                  </span>
                </div>
              )}

              {/* Progress Bar & Type indicator */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  {currentQuestions[step].tipo === 'general' && (
                    <span className={assessmentType === 'autologa' ? 'text-purple-700' : 'text-blue-600'}>
                      {assessmentType === 'autologa' ? 'Requisito Clínico ' : 'Requisito General'}
                    </span>
                  )}
                  {currentQuestions[step].tipo === 'temporal' && <span className="text-amber-600">Margen Temporal</span>}
                  {currentQuestions[step].tipo === 'definitiva' && <span className="text-rose-600">Criterio Definitivo</span>}
                </span>
                <span>Pregunta {step + 1} de {currentQuestions.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    assessmentType === 'autologa' ? 'bg-purple-600' : 'bg-rose-600'
                  }`}
                  style={{ width: `${((step + 1) / currentQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              <div className={`p-5 rounded-2xl border space-y-2 mt-4 ${
                assessmentType === 'autologa' ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                  assessmentType === 'autologa' ? 'text-purple-700' : 'text-rose-600'
                }`}>
                  {currentQuestions[step].title}
                </span>
                <p className="text-base font-bold text-slate-900 leading-snug">
                  {currentQuestions[step].text}
                </p>
                <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                  💡 {currentQuestions[step].explanation}
                </p>
              </div>

              {/* Answer Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleAnswer(true)}
                  className={`py-3 px-4 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    assessmentType === 'autologa'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
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
                  <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${
                    assessmentType === 'autologa' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {assessmentType === 'autologa' ? (
                      <Sparkles className="w-10 h-10" />
                    ) : (
                      <CheckCircle2 className="w-10 h-10" />
                    )}
                  </div>

                  <h4 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                    {assessmentType === 'autologa'
                      ? '¡Apto Preliminar para Donación Autóloga !'
                      : '¡Apto en Prefiltro Web Preliminar!'}
                  </h4>

                  <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                    {assessmentType === 'autologa'
                      ? 'Cumples con los requisitos preoperatorios de orden médica, margen de tiempo y hemoglobina. Tu sangre será almacenada con custodia exclusiva para tu cirugía electiva.'
                      : 'No presentas criterios de exclusión temporal ni definitiva. Ahora selecciona la modalidad para agendar tu cita oficial de donación.'}
                  </p>

                  {/* Modalidad Selection */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Modalidad de Donación Confirmada:
                    </label>
                    <select
                      value={modalidadSeleccionada}
                      onChange={(e) => setModalidadSeleccionada(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-800"
                    >
                      <option value="Voluntario Altruista">Voluntario Altruista (Con incentivo oficial)</option>
                      <option value="Reposicion Familiar">Reposición Familiar (Para paciente hospitalizado)</option>
                      <option value="Brigada Movil">Brigada Móvil / Colecta Externa</option>
                      <option value="Autologo">Autóloga Programada (Para mi propia cirugía)</option>
                    </select>

                    {modalidadSeleccionada === 'Autologo' && (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] space-y-1">
                        <strong className="block font-bold">Nota Protocolo:</strong>
                        Presenta tu orden quirúrgica física emitida por tu médico cirujano tratante al momento de acudir a ventanilla.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => {
                        onClose();
                        onGoToAppointments(modalidadSeleccionada);
                      }}
                      className={`py-2.5 px-5 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                        modalidadSeleccionada === 'Autologo'
                          ? 'bg-purple-700 hover:bg-purple-800'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Agendar Cita {modalidadSeleccionada === 'Autologo' ? 'Autóloga ' : `en Modalidad "${modalidadSeleccionada.split(' ')[0]}"`}
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
                        Por normas bioéticas de la OMS y el Ministerio de Salud, tu salud es prioridad y no es recomendable donar a terceros.
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

                  {/* Clarification for Autologous Donation in case of deferral */}
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-left text-xs text-purple-950 space-y-2">
                    <div className="flex items-center gap-2 text-purple-800 font-bold">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>¿Tu consulta es para una cirugía propia programada? </span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Estas exclusiones aplican a donaciones dirigidas a terceras personas. Para <strong>Donación Autóloga</strong> (autotransfusión previa a tu cirugía electiva), los criterios son más flexibles y dependen de la prescripción escrita de tu médico cirujano tratante.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSwitchType('autologa')}
                      className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Evaluar Requisitos de Donación Autóloga </span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

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
