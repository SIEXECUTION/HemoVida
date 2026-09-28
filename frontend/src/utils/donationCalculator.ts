import { UserDonor } from '../types';

export interface EligibilityResult {
  isEligible: boolean;
  diasRestantes: number;
  fechaProximaHabilitada: Date;
  diasRequeridosPorSexo: number;
  diasTranscurridos: number;
  mensaje: string;
}

/**
 * Calculates biological eligibility based on sex and last donation date.
 * Regla médica y SQL de HemoVida:
 * - Varones (M): Mínimo 90 días entre donaciones.
 * - Mujeres (F): Mínimo 120 días entre donaciones.
 */
export function calculateBiologicalEligibility(donor: UserDonor): EligibilityResult {
  const diasRequeridos = donor.sexo === 'M' ? 90 : 120;
  
  if (!donor.fechaUltimaDonacion) {
    return {
      isEligible: true,
      diasRestantes: 0,
      fechaProximaHabilitada: new Date(),
      diasRequeridosPorSexo: diasRequeridos,
      diasTranscurridos: 999,
      mensaje: '¡Eres apto para donar sangre por primera vez!'
    };
  }

  const ultimaFecha = new Date(donor.fechaUltimaDonacion);
  const hoy = new Date();
  
  // Proxima fecha habilitada
  const proximaFecha = new Date(ultimaFecha);
  proximaFecha.setDate(proximaFecha.getDate() + diasRequeridos);

  const diffTime = hoy.getTime() - ultimaFecha.getTime();
  const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, diasRequeridos - diasTranscurridos);

  const isEligible = diasRestantes === 0 && donor.estadoHabilitacion !== 'Diferido Definitivo';

  let mensaje = '';
  if (isEligible) {
    mensaje = '¡Cumpliste el tiempo biológico de espera! Ya puedes donar y salvar vidas.';
  } else if (donor.estadoHabilitacion === 'Diferido Definitivo') {
    mensaje = 'Inhabilitado de forma definitiva según evaluación serológica previa.';
  } else {
    mensaje = `Tu organismo está regenerando glóbulos rojos. Podrás donar a partir del ${proximaFecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  }

  return {
    isEligible,
    diasRestantes,
    fechaProximaHabilitada: proximaFecha,
    diasRequeridosPorSexo: diasRequeridos,
    diasTranscurridos,
    mensaje
  };
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
