export type BloodGroup = 'O' | 'A' | 'B' | 'AB';
export type RhFactor = 'Positivo' | 'Negativo';

export type AppRole = 'donante' | 'recepcion' | 'despacho' | 'administrador' | 'medico' | 'bioquimico';

export type StaffRole = 'recepcion' | 'despacho' | 'administrador' | 'medico' | 'bioquimico';

export type UserSession = 
  | { role: 'donante'; user: UserDonor }
  | { role: 'recepcion'; staff: StaffAccount }
  | { role: 'despacho'; staff: StaffAccount }
  | { role: 'administrador'; staff: StaffAccount }
  | { role: 'medico'; staff: StaffAccount }
  | { role: 'bioquimico'; staff: StaffAccount };

export interface StaffAccount {
  id: string;
  rol: StaffRole;
  nombre: string;
  cargo: string;
  ci: string;
  email: string;
  turno: string;
  credencial: string;
  password?: string;
  matriculaProfesional?: string;
  matricula?: string;
  especialidad?: string;
  telefono?: string;
  sede?: string;
  fechaSolicitud?: string;
  estadoAprobacion?: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface UserDonor {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  email: string;
  celular: string;
  sexo: 'M' | 'F' | 'Otro';
  fechaNacimiento: string;
  nacionalidad: string;
  direccion: string;
  ocupacion: string;
  tipoDonante: 'Voluntario Altruista' | 'Reposicion Familiar' | 'Autologo' | 'Brigada Movil';
  carnetDigitalCodigo: string;
  grupoSanguineo: BloodGroup;
  factorRh: RhFactor;
  fechaUltimaDonacion: string | null;
  estadoHabilitacion: 'Apto' | 'Diferido Temporal' | 'Diferido Definitivo';
  motivoDiferimiento?: string;
  fechaReactivacion?: string;
  totalDonaciones: number;
  volumenHistoricoMl: number;
  password?: string;
}

export interface SerologyResult {
  vih: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  chagas: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  hepatitisB: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  hepatitisC: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  sifilis: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  htlv: 'No Reactivo' | 'Reactivo' | 'Indeterminado';
  dictamenFinal: 'Apto' | 'No Apto';
}

export interface ImmunohematologyResult {
  tipificacionDirectaABO: BloodGroup;
  tipificacionInversaABO: BloodGroup;
  factorRh: RhFactor;
  coombsIndirecto: 'Negativo' | 'Positivo';
  concordanciaDirectaInversa: boolean;
  dictamenInmuno: 'Apto' | 'No Apto';
}

export interface BloodInventoryItem {
  id: string;
  codigoBolsa: string;
  codigoBolsaMadre?: string;
  codigoExtraccion?: string;
  componente: 'Concentrado de Globulos Rojos' | 'Plasma Fresco Congelado' | 'Concentrado Plaquetario' | 'Crioprecipitado' | 'Sangre Total';
  grupoSanguineo: BloodGroup;
  factorRh: RhFactor;
  volumenMl: number;
  fechaExtraccion: string;
  fechaCaducidad: string;
  diasRestantes: number;
  estado: 'Disponible' | 'Despachada' | 'En Cuarentena' | 'Baja / Descarte' | 'Reservada';
  ubicacionCamara: string;
  temperaturaCamara?: string;
}

export interface BloodDispatchRecord {
  idDespacho: string;
  fechaHora: string;
  codigoSolicitudHospital: string;
  hospitalDestino: string;
  medicoSolicitante: string;
  prioridad?: 'Ordinaria' | 'Urgente' | 'Código Rojo';
  pacienteReceptor: {
    nombres: string;
    ci: string;
    salaCama: string;
    diagnostico: string;
    grupoSanguineo: BloodGroup;
    factorRh: RhFactor;
  };
  personaQueRetira: {
    nombres: string;
    ci: string;
    telefono: string;
    parentescoOInstitucion: string;
  };
  unidadesDespachadas: Array<{
    codigoBolsa: string;
    componente: string;
    grupoSanguineo: BloodGroup;
    factorRh: RhFactor;
    volumenMl: number;
    precioUnitarioBs: number;
  }>;
  cobroServicio: {
    concepto?: string; // 'Cobro de aranceles por concepto de procesamiento y servicios analíticos' (NUNCA venta de sangre)
    montoTotalBs: number;
    estadoPago: 'Pagado' | 'Exonerado SUS' | 'Convenio Institucional' | 'Pendiente';
    metodoPago: 'Efectivo' | 'QR / Transferencia' | 'Tarjeta de Débito' | 'SUS / Gratuito Ley 475';
    numeroReciboFactura: string;
  };
  cadenaFrio?: {
    temperaturaSalida: number; // e.g. 3.8 °C
    temperaturaLlegadaEstimada: number; // e.g. 4.2 °C
    conservadoraTipo: string;
    precintoSeguridad: string;
  };
  actaUrgenciaId?: string;
  responsableDespacho: string;
  observaciones?: string;
}

export interface PatientReplacementRecord {
  id: string;
  pacienteNombre: string;
  pacienteCi: string;
  hospital: string;
  fechaSolicitudInicial: string;
  unidadesRecibidas: number;
  donantesRequeridos: number; // 1 unidad recibida = 1 donante efectivo (CU20)
  grupoReceptor?: string; // ej. O+
  donantesRepuestos: Array<{
    idDonacion: number;
    donanteNombre: string;
    donanteCi: string;
    fechaDonacion: string;
    codigoExtraccion: string;
    grupoSanguineo: string;
  }>;
  estado: 'Pendiente' | 'Completado' | 'Parcial';
  // Si el paciente está incapacitado o inconsciente: Tutor o familiar
  tutorResponsable?: {
    nombres: string;
    ci: string;
    parentesco: string;
    telefono: string;
    asistioActa: boolean;
  };
  // Sustitución autorizada por Bioquímico si el stock crítico lo amerita
  sustitucionAutorizada?: {
    autorizadaPorBioquimico: string;
    grupoSolicitado: string;
    grupoSustitutoAceptado: string;
    justificacion: string;
    fechaAutorizacion: string;
  };
  observacionEtica?: string; // Garantía de que nunca condiciona transfusión de emergencia
}

export interface DonationRecord {
  idExtraccion: number;
  codigoExtraccion: string;
  codigoBolsaMadre: string;
  donanteId?: number;
  donanteNombre?: string;
  donanteCi?: string;
  fechaHora: string;
  centroId: string;
  centroNombre: string;
  modalidad: 'Sangre Total' | 'Aferesis Plaquetaria' | 'Autologa' | 'Brigada Movil';
  tipoDonante: 'Voluntario Altruista' | 'Reposicion Familiar' | 'Autologo' | 'Brigada Movil';
  pacienteReceptorReposicion?: {
    nombre: string;
    ci: string;
    hospital: string;
  };
  volumenExtraidoMl: number;
  brazo: 'Izquierdo' | 'Derecho';
  personalSalud: string;
  grupoSanguineo: BloodGroup;
  factorRh: RhFactor;
  tubosPilotoCodigos?: string[]; // [Tubos EDTA e inmuno]
  serologia: SerologyResult;
  inmunohematologia?: ImmunohematologyResult;
  incentivo: {
    articulo: string;
    refrigerioEntregado: boolean;
    entregadoPostExtraccion?: boolean;
    tipoIncentivoVoluntario?: 'Vaso Conmemorativo' | 'Llavero Oficial' | 'Ninguno';
    fechaHoraEntrega?: string;
  };
  estadoLiberacion: 'Liberada Apta' | 'En Cuarentena' | 'Rechazada / Descarte';
  componentesDerivados: Array<{
    codigoK: string;
    tipo: 'Concentrado de Globulos Rojos' | 'Plasma Fresco Congelado' | 'Concentrado Plaquetario' | 'Crioprecipitado';
    volumenMl: number;
    estado: 'Disponible' | 'Despachada' | 'En Cuarentena' | 'Baja / Descarte';
    ubicacionCamara?: string;
  }>;
}

export interface Appointment {
  idCita: number;
  codigoCita: string;
  idDonante: number;
  donanteNombre?: string;
  donanteCi?: string;
  centroId: string;
  centroNombre: string;
  centroDireccion: string;
  fechaHoraProgramada: string;
  modalidad: 'Sangre Total' | 'Aferesis Plaquetaria' | 'Reposicion Familiar' | 'Brigada Movil';
  pacienteReceptor?: string;
  hospitalDestino?: string;
  prefiltroAprobado: boolean;
  prefiltroDetalle?: {
    respuestas: Record<number, boolean>;
    criteriosExclusionDefinitiva: string[];
    criteriosExclusionTemporal: string[];
  };
  asistenciaConfirmada: boolean;
  horaLlegadaConfirmada?: string;
  numeroTurnoTriaje?: string;
  estadoCita: 'Programada' | 'En Espera Triaje' | 'Triaje Completado' | 'Atendida' | 'Cancelada' | 'Inasistencia';
  indicacionesPrevias: string[];
}

export interface DonationCenter {
  id: string;
  nombre: string;
  tipo: 'Central' | 'Hospitalario' | 'Punto Movil' | 'Clinica';
  direccion: string;
  referencia: string;
  zona: string;
  ciudad: string;
  telefono: string;
  whatsapp: string;
  horarioAtencion: string;
  diasAtencion: string;
  coordenadas: {
    lat: number;
    lng: number;
    xPercent: number;
    yPercent: number;
  };
  servicios: string[];
  stockCritico: string[];
  capacidadDiaria: number;
  turnosDisponiblesHoy: number;
  badge?: string;
}

// ==========================================
// NUEVAS ESTRUCTURAS CASOS DE USO CU01 - CU20
// ==========================================

// CU03: Bitácora de Auditoría Forense
export interface BitacoraAuditoria {
  idEvento: string;
  timestamp: string;
  actorNombre: string;
  actorRol: StaffRole | 'donante' | 'sistema';
  actorCi: string;
  ipSimulada: string;
  tipoEvento: 'LOGIN' | 'LOGOUT' | 'FLEBOTOMIA_REGISTRADA' | 'FRACCIONAMIENTO' | 'DESCARTE_SEROLOGICO' | 'DESPACHO_AUTORIZADO' | 'CODIGO_ROJO_EMERGENCIA' | 'PRUEBA_CRUZADA_INCOMPATIBLE' | 'CAMBIO_UMBRAL_STOCK' | 'ASISTENCIA_CONFIRMADA' | 'CREACION_USUARIO' | 'SOLICITUD_PERSONAL' | 'APROBACION_PERSONAL' | 'RECHAZO_PERSONAL';
  accion: string;
  detalles: string;
  entidadId?: string;
}

// CU04: Parametrización de Umbrales de Stock
export interface StockThresholdConfig {
  grupo: BloodGroup;
  factorRh: RhFactor;
  stockMinimoSeguridad: number; // Alerta Amarilla
  stockAlertaCritica: number;   // Alerta Roja
  diasCaducidadAlerta: number;
}

// CU10 / CU11: Triaje Clínico Médico
export interface ClinicalTriageRecord {
  idTriaje: string;
  idCita?: number;
  idDonante: number;
  donanteNombre: string;
  donanteCi: string;
  fechaHora: string;
  doctorNombre: string;
  doctorMatricula: string;
  signosVitales: {
    presionSistolica: number; // 90 - 140 mmHg
    presionDiastolica: number; // 60 - 90 mmHg
    pulso: number; // 50 - 100 lpm
    temperatura: number; // < 37.5 °C
    pesoKg: number; // > 50 kg
    hemoglobinaGdl: number; // F >= 12.5, M >= 13.5
    viaVenosa: 'Brazo Izquierdo Apto' | 'Brazo Derecho Apto' | 'Ambos Aptos' | 'Dificultosa';
  };
  dictamen: 'Apto' | 'Diferido Temporal' | 'Diferido Definitivo';
  motivoDiferimiento?: string;
  fechaReactivacion?: string;
  observacionesClinicas?: string;
}

// CU12: Bolsa Madre de Sangre Total
export interface MotherBagRecord {
  codigoBolsaMadre: string;
  codigoExtraccion: string;
  donanteId: number;
  donanteNombre: string;
  donanteCi: string;
  fechaExtraccion: string;
  volumenMl: number; // 450 ml
  tubosPiloto: string[];
  anticoagulante: string; // CPDA-1
  estado: 'En Cuarentena' | 'Fraccionada' | 'Descartada';
  ubicacionCamara: string;
  fraccionadaEnComponentes: boolean;
}

// CU13 / CU14: Análisis de Laboratorio
export interface LaboratoryAnalysisRecord {
  idAnalisis: string;
  codigoExtraccion: string;
  codigoBolsaMadre: string;
  donanteCi: string;
  donanteNombre: string;
  fechaProcesamiento: string;
  bioquimicoResponsable: string;
  serologia: SerologyResult;
  inmunohematologia: ImmunohematologyResult;
  estadoLiberacion: 'Pendiente' | 'Apto' | 'Reactivo Descarte';
  fechaLiberacion?: string;
  observacionesTecnicas?: string;
}

// CU14: Baja e Incineración por Descarte
export interface BajaInventarioRecord {
  idBaja: string;
  codigoExtraccion: string;
  codigoBolsaMadre: string;
  codigosBolsasHijas: string[];
  fechaBaja: string;
  motivoDescarte: string;
  marcadorReactivo?: string;
  responsableBioquimico: string;
  metodoDestruccion: 'Autoclave a Presión & Incineración Biosegura' | 'Desnaturalización Química';
  actaBajaNumero: string;
}

// CU16: Solicitud Pretransfusional y Cirugía Programada
export interface PretransfusionOrder {
  idSolicitud: string;
  codigoSolicitud: string;
  hospital: string;
  medicoSolicitante: string;
  pacienteNombre: string;
  pacienteCi: string;
  pacienteGrupoRh: string;
  tipoCirugia: string;
  fechaCirugiaProgramada: string; // 48 - 72h antes
  fechaCitaMuestra: string;
  componentesRequeridos: Array<{
    componente: string;
    unidades: number;
  }>;
  estado: 'Muestra Pendiente' | 'Muestra Recibida' | 'Pruebas Compatibilidad en Proceso' | 'Listo para Despacho';
}

// CU17: Acta de Responsabilidad de Extrema Urgencia (Código Rojo)
export interface EmergencyActRecord {
  idActa: string;
  codigoSolicitud: string;
  fechaHora: string;
  medicoSolicitante: string;
  matriculaMedica: string;
  hospital: string;
  pacienteNombre: string;
  pacienteCi: string;
  diagnosticoShock: string;
  unidadesUniversalORhNegativo: string[];
  omisionPruebasCruzadasPreviasJustificada: boolean;
  firmaDigitalConfirmada: boolean;
  responsableBancoSangre: string;
}

// CU18: Pruebas Cruzadas de Compatibilidad in vitro
export interface CompatibilityTestRecord {
  idPrueba: string;
  codigoSolicitud: string;
  pacienteNombre: string;
  pacienteCi: string;
  pacienteGrupoRh: string;
  codigoBolsa: string;
  componente: string;
  bolsaGrupoRh: string;
  resultado: 'Compatible' | 'Incompatible';
  pruebaMayor: 'Sin aglutinación (Negativo)' | 'Aglutinación detectada (Positivo)';
  pruebaMenor: 'Sin aglutinación (Negativo)' | 'Aglutinación detectada (Positivo)';
  autotestigo: 'Negativo' | 'Positivo';
  coombsCruzado: 'Negativo' | 'Positivo';
  observaciones: string;
  fechaHora: string;
  bioquimico: string;
  retroactivaCodigoRojo: boolean;
  reintentoUnidadId?: string;
}

// CU09: Entrega de Incentivo y Refrigerio
export interface IncentivoEntregaRecord {
  idEntrega: string;
  idDonacion: number;
  codigoExtraccion: string;
  donanteNombre: string;
  donanteCi: string;
  tipoDonante: string;
  tipoIncentivo: 'Vaso Conmemorativo HemoVida' | 'Llavero Oficial HemoVida' | 'Refrigerio Clínico de Recuperación' | 'Ninguno';
  refrigerioEntregado: boolean;
  flebotomiaConfirmadaPreviamente: boolean;
  fechaHora: string;
  responsableEntrega: string;
}
