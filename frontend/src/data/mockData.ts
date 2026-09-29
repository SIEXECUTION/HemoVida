import { 
  UserDonor, 
  DonationRecord, 
  Appointment, 
  DonationCenter,
  BloodInventoryItem,
  BloodDispatchRecord,
  PatientReplacementRecord,
  StaffAccount,
  BitacoraAuditoria,
  StockThresholdConfig,
  ClinicalTriageRecord,
  MotherBagRecord,
  LaboratoryAnalysisRecord,
  BajaInventarioRecord,
  PretransfusionOrder,
  EmergencyActRecord,
  CompatibilityTestRecord,
  IncentivoEntregaRecord
} from '../types';

export const MOCK_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'staff-rec',
    rol: 'recepcion',
    nombre: 'Lic. Patricia Arteaga',
    cargo: 'Encargada de Recepción y Registro de Donantes',
    ci: '4729103 SC',
    email: 'recepcion@hemovida.org',
    turno: 'Turno Mañana (07:00 - 15:00)',
    credencial: 'REC-2026-4729',
    password: 'HemoVida#2026'
  },
  {
    id: 'staff-desp',
    rol: 'despacho',
    nombre: 'Lic. Bioq. Carlos Mendoza',
    cargo: 'Responsable de Despacho Transfusional & Banco de Sangre',
    ci: '3948201 SC',
    email: 'despacho@hemovida.org',
    turno: 'Guardia Transfusional 24h',
    credencial: 'DESP-2026-3948',
    password: 'HemoVida#2026'
  },
  {
    id: 'staff-admin',
    rol: 'administrador',
    nombre: 'Lic. Gabriel Soliz P.',
    cargo: 'Administrador de Seguridad & Auditor RBAC',
    ci: '2981044 SC',
    email: 'admin@hemovida.org',
    turno: 'Dirección Central Continua',
    credencial: 'ADM-2026-001',
    password: 'HemoVida#2026'
  },
  {
    id: 'staff-med',
    rol: 'medico',
    nombre: 'Dr. Fernando Valverde',
    cargo: 'Médico Hemoterapeuta & Encargado de Triaje Clínico',
    ci: '5190422 SC',
    email: 'medico@hemovida.org',
    turno: 'Turno Mañana / Consulta',
    credencial: 'MED-COL-9481',
    password: 'HemoVida#2026'
  },
  {
    id: 'staff-bioq',
    rol: 'bioquimico',
    nombre: 'Lic. Bioq. Marcela Arteaga',
    cargo: 'Jefa de Inmunoserología e Inmunohematología',
    ci: '4820199 SC',
    email: 'laboratorio@hemovida.org',
    turno: 'Laboratorio Central 24h',
    credencial: 'BIOQ-2026-773',
    password: 'HemoVida#2026'
  }
];

export const MOCK_USERS: UserDonor[] = [
  {
    id: 1,
    ci: '7894561 SC',
    nombres: 'Carlos Andrés',
    apellidos: 'Pimentel Guarena',
    email: 'carlos.pimentel@hemovida.org',
    celular: '+591 760-44912',
    sexo: 'M',
    fechaNacimiento: '1995-04-18',
    nacionalidad: 'Boliviana',
    direccion: 'Barrio Sirari, Calle Los Claveles #145',
    ocupacion: 'Ingeniero de Sistemas',
    tipoDonante: 'Voluntario Altruista',
    carnetDigitalCodigo: 'HV-DON-2024-0491',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    fechaUltimaDonacion: '2026-05-10',
    estadoHabilitacion: 'Apto',
    totalDonaciones: 8,
    volumenHistoricoMl: 3600,
    password: 'HemoVida#2026'
  },
  {
    id: 2,
    ci: '8934120 SC',
    nombres: 'Sofía Elena',
    apellidos: 'Mendoza Vaca',
    email: 'sofia.mendoza@gmail.com',
    celular: '+591 781-90234',
    sexo: 'F',
    fechaNacimiento: '1998-09-12',
    nacionalidad: 'Boliviana',
    direccion: 'Av. Las Américas, Edificio Panorama #4B',
    ocupacion: 'Bioquímica Farmacéutica',
    tipoDonante: 'Reposicion Familiar',
    carnetDigitalCodigo: 'HV-DON-2025-1102',
    grupoSanguineo: 'A',
    factorRh: 'Negativo',
    fechaUltimaDonacion: '2026-08-01',
    estadoHabilitacion: 'Diferido Temporal',
    motivoDiferimiento: 'Descanso biológico femenino de 120 días en curso',
    fechaReactivacion: '2026-11-29',
    totalDonaciones: 3,
    volumenHistoricoMl: 1350,
    password: 'HemoVida#2026'
  },
  {
    id: 3,
    ci: '6512399 SC',
    nombres: 'Rodrigo',
    apellidos: 'Justiniano Paz',
    email: 'rodrigo.justiniano@outlook.com',
    celular: '+591 709-11223',
    sexo: 'M',
    fechaNacimiento: '1990-11-04',
    nacionalidad: 'Boliviana',
    direccion: 'Av. Cristo Redentor, Calle 5 #88',
    ocupacion: 'Arquitecto',
    tipoDonante: 'Voluntario Altruista',
    carnetDigitalCodigo: 'HV-DON-2023-0189',
    grupoSanguineo: 'B',
    factorRh: 'Positivo',
    fechaUltimaDonacion: '2026-04-12',
    estadoHabilitacion: 'Apto',
    totalDonaciones: 12,
    volumenHistoricoMl: 5400,
    password: 'HemoVida#2026'
  }
];

export const MOCK_CENTERS: DonationCenter[] = [
  {
    id: 'center-1',
    nombre: 'Banco de Sangre Central (Calle Warnes)',
    tipo: 'Central',
    direccion: 'Calle Warnes N° 271, entre René Moreno y Ballivián',
    referencia: 'A 2 cuadras de la Plaza 24 de Septiembre',
    zona: 'Centro Histórico',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 334-2150',
    whatsapp: '+591 760-44912',
    horarioAtencion: '07:00 - 20:00 continuo',
    diasAtencion: 'Lunes a Sábado',
    coordenadas: {
      lat: -17.7836,
      lng: -63.1812,
      xPercent: 48,
      yPercent: 46
    },
    servicios: ['Sangre Total', 'Aféresis Plaquetaria', 'Pruebas Serológicas Rápidas', 'Triaje Médico Integral'],
    stockCritico: ['O-', 'A-', 'B-'],
    capacidadDiaria: 80,
    turnosDisponiblesHoy: 18,
    badge: 'Sede Principal 24/7'
  },
  {
    id: 'center-2',
    nombre: 'Centro de Colecta Hospital Japonés',
    tipo: 'Hospitalario',
    direccion: '3er Anillo Externo y Av. Japón s/n',
    referencia: 'Ala Norte, Planta Baja, Frente a Urgencias',
    zona: 'Barrio Petrolero / Equipetrol Norte',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 346-2031',
    whatsapp: '+591 770-88120',
    horarioAtencion: '07:30 - 18:30 continuo',
    diasAtencion: 'Lunes a Viernes',
    coordenadas: {
      lat: -17.7621,
      lng: -63.1645,
      xPercent: 62,
      yPercent: 28
    },
    servicios: ['Sangre Total', 'Donación de Reposición Familiar', 'Triaje Clínico'],
    stockCritico: ['O+', 'O-'],
    capacidadDiaria: 45,
    turnosDisponiblesHoy: 9,
    badge: 'Atención Inmediata'
  },
  {
    id: 'center-3',
    nombre: 'Punto de Hemodonación Clínica Foianini',
    tipo: 'Clinica',
    direccion: 'Calle Izozog N° 465, esq. Warnes',
    referencia: 'Edificio de Especialidades Médicas, Nivel 1',
    zona: 'Zona Central',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 336-2211',
    whatsapp: '+591 750-33441',
    horarioAtencion: '08:00 - 19:00',
    diasAtencion: 'Lunes a Sábado',
    coordenadas: {
      lat: -17.7885,
      lng: -63.1782,
      xPercent: 52,
      yPercent: 54
    },
    servicios: ['Sangre Total', 'Aféresis Plaquetaria', 'Atención Premium'],
    stockCritico: ['AB-', 'A-'],
    capacidadDiaria: 30,
    turnosDisponiblesHoy: 6,
    badge: 'Convenio Quirúrgico'
  },
  {
    id: 'center-4',
    nombre: 'Unidad Móvil HemoVida - Plaza 24 de Septiembre',
    tipo: 'Punto Movil',
    direccion: 'Plaza Principal 24 de Septiembre, frente a la Catedral',
    referencia: 'Vehículo Móvil Climatizado de Extracción',
    zona: 'Casco Viejo',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 334-2150',
    whatsapp: '+591 760-44912',
    horarioAtencion: '09:00 - 17:00',
    diasAtencion: 'Miércoles a Domingo',
    coordenadas: {
      lat: -17.7831,
      lng: -63.1821,
      xPercent: 44,
      yPercent: 43
    },
    servicios: ['Sangre Total', 'Campañas Voluntarias', 'Chequeo Rápido de Hemoglobina'],
    stockCritico: ['O+', 'A+'],
    capacidadDiaria: 50,
    turnosDisponiblesHoy: 22,
    badge: 'Campaña Altruista'
  },
  {
    id: 'center-5',
    nombre: 'Centro Integral de Salud Pampa de la Isla',
    tipo: 'Hospitalario',
    direccion: 'Av. Montecristo y 6to Anillo Este',
    referencia: 'Módulo de Laboratorio y Banco de Sangre',
    zona: 'Pampa de la Isla',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 364-1188',
    whatsapp: '+591 713-99440',
    horarioAtencion: '08:00 - 16:00',
    diasAtencion: 'Lunes a Sábado',
    coordenadas: {
      lat: -17.7995,
      lng: -63.1310,
      xPercent: 82,
      yPercent: 68
    },
    servicios: ['Sangre Total', 'Reposición Familiar'],
    stockCritico: ['O-', 'B+'],
    capacidadDiaria: 35,
    turnosDisponiblesHoy: 14,
    badge: 'Zona Este'
  },
  {
    id: 'center-6',
    nombre: 'Hospital Regional San Juan de Dios',
    tipo: 'Hospitalario',
    direccion: 'Calle Cuéllar N° 400 esq. España',
    referencia: 'Servicio de Medicina Transfusional',
    zona: 'Centro',
    ciudad: 'Santa Cruz de la Sierra',
    telefono: '+591 (3) 334-0011',
    whatsapp: '+591 721-66778',
    horarioAtencion: '07:00 - 17:00',
    diasAtencion: 'Lunes a Viernes',
    coordenadas: {
      lat: -17.7770,
      lng: -63.1840,
      xPercent: 41,
      yPercent: 37
    },
    servicios: ['Sangre Total', 'Emergencias Transfusionales'],
    stockCritico: ['O-', 'A-', 'B-'],
    capacidadDiaria: 40,
    turnosDisponiblesHoy: 5,
    badge: 'Referencia Departamental'
  }
];

export const MOCK_DONATIONS: DonationRecord[] = [
  {
    idExtraccion: 1150,
    codigoExtraccion: 'EXT-2026-0920',
    codigoBolsaMadre: 'MAD-2026-0920-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2026-09-20T08:30:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Izquierdo',
    personalSalud: 'Lic. Silvia Guerrero (Bioquímica / Reg: 4421-SC)',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Vaso Conmemorativo HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Vaso Conmemorativo'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0920-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Disponible' },
      { codigoK: 'MAD-2026-0920-K2-PL', tipo: 'Plasma Fresco Congelado', volumenMl: 150, estado: 'Disponible' },
      { codigoK: 'MAD-2026-0920-K3-PQ', tipo: 'Concentrado Plaquetario', volumenMl: 50, estado: 'Disponible' }
    ]
  },
  {
    idExtraccion: 1148,
    codigoExtraccion: 'EXT-2026-0919',
    codigoBolsaMadre: 'MAD-2026-0919-A+',
    donanteId: 4,
    donanteNombre: 'Claudia Vaca Hurtado',
    donanteCi: '5421980 SC',
    fechaHora: '2026-09-19T10:15:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Reposicion Familiar',
    pacienteReceptorReposicion: {
      nombre: 'Juan Carlos Roca Méndez',
      ci: '4521992 SC',
      hospital: 'Hospital Japonés'
    },
    volumenExtraidoMl: 450,
    brazo: 'Derecho',
    personalSalud: 'Lic. Cristhian Gandarillas (Bioquímico)',
    grupoSanguineo: 'A',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Refrigerio de Recuperación Transfusional',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Ninguno'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0919-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Disponible' },
      { codigoK: 'MAD-2026-0919-K2-PL', tipo: 'Plasma Fresco Congelado', volumenMl: 150, estado: 'Disponible' }
    ]
  },
  {
    idExtraccion: 1145,
    codigoExtraccion: 'EXT-2026-0915',
    codigoBolsaMadre: 'MAD-2026-0915-B+',
    donanteId: 3,
    donanteNombre: 'Rodrigo Justiniano Paz',
    donanteCi: '6512399 SC',
    fechaHora: '2026-09-15T09:00:00',
    centroId: 'center-2',
    centroNombre: 'Centro de Colecta Hospital Japonés',
    modalidad: 'Aferesis Plaquetaria',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 300,
    brazo: 'Derecho',
    personalSalud: 'Dra. Trinidad Álvarez (Subdirectora)',
    grupoSanguineo: 'B',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Llavero Oficial Gota HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Llavero Oficial'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0915-K1-PQ', tipo: 'Concentrado Plaquetario', volumenMl: 250, estado: 'Disponible' }
    ]
  },
  {
    idExtraccion: 1102,
    codigoExtraccion: 'EXT-2026-0801',
    codigoBolsaMadre: 'MAD-2026-0801-A-',
    donanteId: 2,
    donanteNombre: 'Sofía Elena Mendoza Vaca',
    donanteCi: '8934120 SC',
    fechaHora: '2026-08-01T11:20:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Reposicion Familiar',
    pacienteReceptorReposicion: {
      nombre: 'Martha Suárez Vaca',
      ci: '3829102 SC',
      hospital: 'Hospital San Juan de Dios'
    },
    volumenExtraidoMl: 450,
    brazo: 'Izquierdo',
    personalSalud: 'Lic. Cristhian Gandarillas (Bioquímico)',
    grupoSanguineo: 'A',
    factorRh: 'Negativo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Refrigerio de Recuperación',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Ninguno'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0801-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' },
      { codigoK: 'MAD-2026-0801-K2-PL', tipo: 'Plasma Fresco Congelado', volumenMl: 150, estado: 'Despachada' }
    ]
  },
  {
    idExtraccion: 1084,
    codigoExtraccion: 'EXT-2026-0841',
    codigoBolsaMadre: 'MAD-2026-0841-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2026-05-10T09:30:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Izquierdo',
    personalSalud: 'Lic. Silvia Guerrero (Bioquímica / Reg: 4421-SC)',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Vaso Conmemorativo HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Vaso Conmemorativo'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0841-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' },
      { codigoK: 'MAD-2026-0841-K2-PL', tipo: 'Plasma Fresco Congelado', volumenMl: 150, estado: 'Despachada' },
      { codigoK: 'MAD-2026-0841-K3-PQ', tipo: 'Concentrado Plaquetario', volumenMl: 50, estado: 'Despachada' }
    ]
  },
  {
    idExtraccion: 1042,
    codigoExtraccion: 'EXT-2026-0219',
    codigoBolsaMadre: 'MAD-2026-0219-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2026-01-22T10:15:00',
    centroId: 'center-3',
    centroNombre: 'Punto de Hemodonación Clínica Foianini',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Derecho',
    personalSalud: 'Dra. Trinidad Álvarez (Subdirectora / Reg: 3108-SC)',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Llavero Oficial Gota HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Llavero Oficial'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2026-0219-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' }
    ]
  },
  {
    idExtraccion: 981,
    codigoExtraccion: 'EXT-2025-1104',
    codigoBolsaMadre: 'MAD-2025-1104-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2025-10-15T08:45:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Izquierdo',
    personalSalud: 'Lic. Cristhian Gandarillas (Bioquímico / Reg: 5012-SC)',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Vaso Conmemorativo HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Vaso Conmemorativo'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2025-1104-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' },
      { codigoK: 'MAD-2025-1104-K2-PL', tipo: 'Plasma Fresco Congelado', volumenMl: 150, estado: 'Despachada' },
      { codigoK: 'MAD-2025-1104-K3-PQ', tipo: 'Concentrado Plaquetario', volumenMl: 50, estado: 'Despachada' }
    ]
  },
  {
    idExtraccion: 890,
    codigoExtraccion: 'EXT-2025-0630',
    codigoBolsaMadre: 'MAD-2025-0630-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2025-06-28T11:00:00',
    centroId: 'center-4',
    centroNombre: 'Unidad Móvil HemoVida - Plaza 24 de Septiembre',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Derecho',
    personalSalud: 'Dra. Trinidad Álvarez (Subdirectora / Reg: 3108-SC)',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Llavero Oficial Gota HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Llavero Oficial'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2025-0630-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' }
    ]
  },
  {
    idExtraccion: 710,
    codigoExtraccion: 'EXT-2024-1110',
    codigoBolsaMadre: 'MAD-2024-1110-O+',
    donanteId: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2024-11-10T09:15:00',
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    modalidad: 'Sangre Total',
    tipoDonante: 'Voluntario Altruista',
    volumenExtraidoMl: 450,
    brazo: 'Izquierdo',
    personalSalud: 'Lic. Silvia Guerrero',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    incentivo: {
      articulo: 'Vaso Conmemorativo HemoVida + Refrigerio',
      refrigerioEntregado: true,
      tipoIncentivoVoluntario: 'Vaso Conmemorativo'
    },
    estadoLiberacion: 'Liberada Apta',
    componentesDerivados: [
      { codigoK: 'MAD-2024-1110-K1-GR', tipo: 'Concentrado de Globulos Rojos', volumenMl: 250, estado: 'Despachada' }
    ]
  }
];

export const MOCK_INVENTORY: BloodInventoryItem[] = [
  {
    id: 'inv-1',
    codigoBolsa: 'MAD-2026-0920-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-20',
    fechaCaducidad: '2026-10-25',
    diasRestantes: 35,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría A - Bandeja 1'
  },
  {
    id: 'inv-2',
    codigoBolsa: 'MAD-2026-0920-K2-PL',
    componente: 'Plasma Fresco Congelado',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    volumenMl: 150,
    fechaExtraccion: '2026-09-20',
    fechaCaducidad: '2027-09-20',
    diasRestantes: 365,
    estado: 'Disponible',
    ubicacionCamara: 'Ultra-Freezer -30°C B-2'
  },
  {
    id: 'inv-3',
    codigoBolsa: 'MAD-2026-0920-K3-PQ',
    componente: 'Concentrado Plaquetario',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    volumenMl: 50,
    fechaExtraccion: '2026-09-20',
    fechaCaducidad: '2026-09-25',
    diasRestantes: 5,
    estado: 'Disponible',
    ubicacionCamara: 'Agitador Plaquetario #1'
  },
  {
    id: 'inv-4',
    codigoBolsa: 'MAD-2026-0919-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'A',
    factorRh: 'Positivo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-19',
    fechaCaducidad: '2026-10-24',
    diasRestantes: 34,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría A - Bandeja 2'
  },
  {
    id: 'inv-5',
    codigoBolsa: 'MAD-2026-0919-K2-PL',
    componente: 'Plasma Fresco Congelado',
    grupoSanguineo: 'A',
    factorRh: 'Positivo',
    volumenMl: 150,
    fechaExtraccion: '2026-09-19',
    fechaCaducidad: '2027-09-19',
    diasRestantes: 364,
    estado: 'Disponible',
    ubicacionCamara: 'Ultra-Freezer -30°C B-1'
  },
  {
    id: 'inv-6',
    codigoBolsa: 'MAD-2026-0918-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'O',
    factorRh: 'Negativo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-18',
    fechaCaducidad: '2026-10-23',
    diasRestantes: 33,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría Reserva Crítica - C-1'
  },
  {
    id: 'inv-7',
    codigoBolsa: 'MAD-2026-0917-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'O',
    factorRh: 'Negativo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-17',
    fechaCaducidad: '2026-10-22',
    diasRestantes: 32,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría Reserva Crítica - C-2'
  },
  {
    id: 'inv-8',
    codigoBolsa: 'MAD-2026-0915-K1-PQ',
    componente: 'Concentrado Plaquetario',
    grupoSanguineo: 'B',
    factorRh: 'Positivo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-15',
    fechaCaducidad: '2026-09-20',
    diasRestantes: 1,
    estado: 'Disponible',
    ubicacionCamara: 'Agitador Plaquetario #2'
  },
  {
    id: 'inv-9',
    codigoBolsa: 'MAD-2026-0916-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'B',
    factorRh: 'Positivo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-16',
    fechaCaducidad: '2026-10-21',
    diasRestantes: 31,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría B - Bandeja 1'
  },
  {
    id: 'inv-10',
    codigoBolsa: 'MAD-2026-0916-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'A',
    factorRh: 'Negativo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-16',
    fechaCaducidad: '2026-10-21',
    diasRestantes: 31,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría Reserva Crítica - C-3'
  },
  {
    id: 'inv-11',
    codigoBolsa: 'MAD-2026-0914-K1-GR',
    componente: 'Concentrado de Globulos Rojos',
    grupoSanguineo: 'AB',
    factorRh: 'Positivo',
    volumenMl: 250,
    fechaExtraccion: '2026-09-14',
    fechaCaducidad: '2026-10-19',
    diasRestantes: 29,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría B - Bandeja 2'
  },
  {
    id: 'inv-12',
    codigoBolsa: 'MAD-2026-0915-K1-PL',
    componente: 'Plasma Fresco Congelado',
    grupoSanguineo: 'AB',
    factorRh: 'Positivo',
    volumenMl: 200,
    fechaExtraccion: '2026-09-15',
    fechaCaducidad: '2027-09-15',
    diasRestantes: 360,
    estado: 'Disponible',
    ubicacionCamara: 'Ultra-Freezer -30°C B-3'
  },
  {
    id: 'inv-13',
    codigoBolsa: 'MAD-2026-0912-K1-GR',
    componente: 'Sangre Total',
    grupoSanguineo: 'O',
    factorRh: 'Positivo',
    volumenMl: 450,
    fechaExtraccion: '2026-09-12',
    fechaCaducidad: '2026-10-03',
    diasRestantes: 13,
    estado: 'Disponible',
    ubicacionCamara: 'Cámara Fría A - Bandeja Especial'
  }
];

export const MOCK_DISPATCHES: BloodDispatchRecord[] = [
  {
    idDespacho: 'DSP-2026-0812',
    fechaHora: '2026-09-19T14:30:00',
    codigoSolicitudHospital: 'SOL-HJ-2026-891',
    hospitalDestino: 'Hospital Japonés (Sede Tercer Nivel)',
    medicoSolicitante: 'Dr. Fernando Aguilera (Cirugía de Trauma)',
    pacienteReceptor: {
      nombres: 'Juan Carlos Roca Méndez',
      ci: '4521992 SC',
      salaCama: 'Sala 3 - Cama 12 (Terapia Intermedia)',
      diagnostico: 'Shock hipovolémico por politraumatismo severo',
      grupoSanguineo: 'O',
      factorRh: 'Positivo'
    },
    personaQueRetira: {
      nombres: 'María Angélica Roca Hurtado',
      ci: '6821940 SC',
      telefono: '+591 763-99120',
      parentescoOInstitucion: 'Hija del Paciente'
    },
    unidadesDespachadas: [
      {
        codigoBolsa: 'MAD-2026-0910-K1-GR',
        componente: 'Concentrado de Globulos Rojos',
        grupoSanguineo: 'O',
        factorRh: 'Positivo',
        volumenMl: 250,
        precioUnitarioBs: 180
      },
      {
        codigoBolsa: 'MAD-2026-0910-K2-GR',
        componente: 'Concentrado de Globulos Rojos',
        grupoSanguineo: 'O',
        factorRh: 'Positivo',
        volumenMl: 250,
        precioUnitarioBs: 180
      }
    ],
    cobroServicio: {
      montoTotalBs: 360,
      estadoPago: 'Pagado',
      metodoPago: 'QR / Transferencia',
      numeroReciboFactura: 'REC-2026-1180'
    },
    responsableDespacho: 'Lic. Patricia Arteaga (Recepción & Despacho)',
    observaciones: 'Cadena de frío verificada a 4°C en conservadora térmica con termómetro digital.'
  },
  {
    idDespacho: 'DSP-2026-0808',
    fechaHora: '2026-09-18T11:15:00',
    codigoSolicitudHospital: 'SOL-HSJD-2026-443',
    hospitalDestino: 'Hospital San Juan de Dios',
    medicoSolicitante: 'Dra. Verónica Justiniano (Medicina Interna)',
    pacienteReceptor: {
      nombres: 'Martha Suárez Vaca',
      ci: '3829102 SC',
      salaCama: 'Pabellón Mujeres - Cama 08',
      diagnostico: 'Coagulopatía de consumo y anemia aguda',
      grupoSanguineo: 'A',
      factorRh: 'Negativo'
    },
    personaQueRetira: {
      nombres: 'Roberto Suárez Mercado',
      ci: '3310492 SC',
      telefono: '+591 708-22340',
      parentescoOInstitucion: 'Hermano'
    },
    unidadesDespachadas: [
      {
        codigoBolsa: 'MAD-2026-0801-K1-GR',
        componente: 'Concentrado de Globulos Rojos',
        grupoSanguineo: 'A',
        factorRh: 'Negativo',
        volumenMl: 250,
        precioUnitarioBs: 180
      },
      {
        codigoBolsa: 'MAD-2026-0801-K2-PL',
        componente: 'Plasma Fresco Congelado',
        grupoSanguineo: 'A',
        factorRh: 'Negativo',
        volumenMl: 150,
        precioUnitarioBs: 150
      }
    ],
    cobroServicio: {
      montoTotalBs: 330,
      estadoPago: 'Exonerado SUS',
      metodoPago: 'SUS / Gratuito Ley 475',
      numeroReciboFactura: 'SUS-EX-2026-0941'
    },
    responsableDespacho: 'Lic. Patricia Arteaga (Recepción & Despacho)',
    observaciones: 'Formulario SUS N° 0941 adjuntado con firma de trabajadora social.'
  },
  {
    idDespacho: 'DSP-2026-0795',
    fechaHora: '2026-09-16T16:00:00',
    codigoSolicitudHospital: 'SOL-HNMO-2026-102',
    hospitalDestino: 'Hospital de Niños Mario Ortiz',
    medicoSolicitante: 'Dr. Marcelo Cuéllar (Oncohematología Pediátrica)',
    pacienteReceptor: {
      nombres: 'Mateo Banegas Justiniano',
      ci: '10934120 SC',
      salaCama: 'Oncología Pediátrica - Cama 4',
      diagnostico: 'Trombocitopenia secundaria a quimioterapia',
      grupoSanguineo: 'O',
      factorRh: 'Positivo'
    },
    personaQueRetira: {
      nombres: 'Lic. Gladys Pardo (Enfermera de Transporte)',
      ci: '5190283 SC',
      telefono: '+591 716-55441',
      parentescoOInstitucion: 'Personal de Salud del Hospital de Niños'
    },
    unidadesDespachadas: [
      {
        codigoBolsa: 'MAD-2026-0914-K2-PQ',
        componente: 'Concentrado Plaquetario',
        grupoSanguineo: 'O',
        factorRh: 'Positivo',
        volumenMl: 50,
        precioUnitarioBs: 200
      }
    ],
    cobroServicio: {
      montoTotalBs: 200,
      estadoPago: 'Exonerado SUS',
      metodoPago: 'SUS / Gratuito Ley 475',
      numeroReciboFactura: 'SUS-PED-2026-102'
    },
    responsableDespacho: 'Lic. Cristhian Gandarillas (Bioquímico)',
    observaciones: 'Despacho prioritario pediátrico. Conservadora certificada con gel refrigerante.'
  }
];

export const MOCK_REPLACEMENTS: PatientReplacementRecord[] = [
  {
    id: 'rep-1',
    pacienteNombre: 'Juan Carlos Roca Méndez',
    pacienteCi: '4521992 SC',
    hospital: 'Hospital Japonés',
    fechaSolicitudInicial: '2026-09-19',
    unidadesRecibidas: 2,
    donantesRequeridos: 2,
    donantesRepuestos: [
      {
        idDonacion: 1148,
        donanteNombre: 'Claudia Vaca Hurtado',
        donanteCi: '5421980 SC',
        fechaDonacion: '2026-09-19',
        codigoExtraccion: 'EXT-2026-0919',
        grupoSanguineo: 'A+'
      }
    ],
    estado: 'Parcial'
  },
  {
    id: 'rep-2',
    pacienteNombre: 'Martha Suárez Vaca',
    pacienteCi: '3829102 SC',
    hospital: 'Hospital San Juan de Dios',
    fechaSolicitudInicial: '2026-09-18',
    unidadesRecibidas: 2,
    donantesRequeridos: 2,
    donantesRepuestos: [
      {
        idDonacion: 1102,
        donanteNombre: 'Sofía Elena Mendoza Vaca',
        donanteCi: '8934120 SC',
        fechaDonacion: '2026-08-01',
        codigoExtraccion: 'EXT-2026-0801',
        grupoSanguineo: 'A-'
      },
      {
        idDonacion: 1099,
        donanteNombre: 'Roberto Suárez Mercado',
        donanteCi: '3310492 SC',
        fechaDonacion: '2026-08-02',
        codigoExtraccion: 'EXT-2026-0802',
        grupoSanguineo: 'O+'
      }
    ],
    estado: 'Completado'
  },
  {
    id: 'rep-3',
    pacienteNombre: 'Elena Rivero Justiniano',
    pacienteCi: '6721094 SC',
    hospital: 'Hospital de la Mujer Percy Boland',
    fechaSolicitudInicial: '2026-09-17',
    unidadesRecibidas: 3,
    donantesRequeridos: 3,
    donantesRepuestos: [],
    estado: 'Pendiente'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    idCita: 301,
    codigoCita: 'CITA-2026-0925',
    idDonante: 1,
    centroId: 'center-1',
    centroNombre: 'Banco de Sangre Central (Calle Warnes)',
    centroDireccion: 'Calle Warnes N° 271, Centro Histórico',
    fechaHoraProgramada: '2026-09-25T08:30:00',
    modalidad: 'Sangre Total',
    prefiltroAprobado: true,
    asistenciaConfirmada: true,
    estadoCita: 'Programada',
    indicacionesPrevias: [
      'Descansar al menos 6 horas la noche anterior.',
      'Tomar abundante agua (mínimo 500 ml antes de acudir).',
      'Desayunar ligero (evitar grasas, lácteos y frituras).',
      'Portar Cédula de Identidad original vigente.'
    ]
  },
  {
    idCita: 302,
    codigoCita: 'CITA-2026-1014',
    idDonante: 1,
    centroId: 'center-2',
    centroNombre: 'Centro de Colecta Hospital Japonés',
    centroDireccion: '3er Anillo Externo y Av. Japón s/n',
    fechaHoraProgramada: '2026-10-14T10:00:00',
    modalidad: 'Aferesis Plaquetaria',
    prefiltroAprobado: true,
    asistenciaConfirmada: false,
    estadoCita: 'Programada',
    indicacionesPrevias: [
      'No haber consumido aspirinas ni antiinflamatorios en las últimas 72 horas.',
      'Excelente hidratación durante el día previo.',
      'Presentarse 15 minutos antes con documento de identidad.'
    ]
  }
];

export const MOCK_PATIENT_REPLACEMENTS = MOCK_REPLACEMENTS;

// ==========================================
// MOCK DATA PARA LOS 20 CASOS DE USO
// ==========================================

// CU03: Bitácora de Auditoría Forense
export const MOCK_BITACORA: BitacoraAuditoria[] = [
  {
    idEvento: 'EVT-2026-901',
    timestamp: '2026-09-27T08:15:22',
    actorNombre: 'Lic. Patricia Arteaga',
    actorRol: 'recepcion',
    actorCi: '4729103 SC',
    ipSimulada: '181.188.14.92',
    tipoEvento: 'LOGIN',
    accion: 'Inicio de Sesión Exclusiva en Estación de Recepción',
    detalles: 'Autenticación exitosa con credencial REC-2026-4729. Turno Mañana aperturado.'
  },
  {
    idEvento: 'EVT-2026-902',
    timestamp: '2026-09-27T08:42:10',
    actorNombre: 'Lic. Patricia Arteaga',
    actorRol: 'recepcion',
    actorCi: '4729103 SC',
    ipSimulada: '181.188.14.92',
    tipoEvento: 'ASISTENCIA_CONFIRMADA',
    accion: 'Confirmación de Asistencia Física',
    detalles: 'Donante Carlos Andrés Pimentel (C.I. 7894561 SC) presente en ventanilla. Asignado Turno Médico TURNO-MED-01.',
    entidadId: 'CITA-2026-0925'
  },
  {
    idEvento: 'EVT-2026-903',
    timestamp: '2026-09-27T09:12:05',
    actorNombre: 'Dr. Fernando Valverde',
    actorRol: 'medico',
    actorCi: '5190422 SC',
    ipSimulada: '192.168.10.45',
    tipoEvento: 'FLEBOTOMIA_REGISTRADA',
    accion: 'Triaje Clínico y Extracción de 450 ml Aprobada',
    detalles: 'Signos vitales normales (PA: 120/80, Pulso: 72, Peso: 74 kg, Hb: 15.2 g/dL). Bolsa madre MAD-20260927-4421-O+ dada de alta en CUARENTENA con 2 tubos piloto.',
    entidadId: 'MAD-20260927-4421-O+'
  },
  {
    idEvento: 'EVT-2026-904',
    timestamp: '2026-09-27T09:35:18',
    actorNombre: 'Lic. Bioq. Marcela Arteaga',
    actorRol: 'bioquimico',
    actorCi: '4820199 SC',
    ipSimulada: '192.168.10.88',
    tipoEvento: 'FRACCIONAMIENTO',
    accion: 'Fraccionamiento Mecánico Inmediato < 6h',
    detalles: 'Centrifugación de bolsa madre en CGR (250 ml, cámara fría 4°C) y PFC (150 ml, congelador -25°C). Nacen en CUARENTENA.',
    entidadId: 'MAD-20260927-4421-O+'
  },
  {
    idEvento: 'EVT-2026-905',
    timestamp: '2026-09-26T16:20:44',
    actorNombre: 'Lic. Bioq. Marcela Arteaga',
    actorRol: 'bioquimico',
    actorCi: '4820199 SC',
    ipSimulada: '192.168.10.88',
    tipoEvento: 'DESCARTE_SEROLOGICO',
    accion: 'Baja y Descarte por Reactividad Serológica',
    detalles: 'Muestra reactiva para Chagas (ELISA positivo). Todo el lote derivado EXT-2026-8812 pasó a BAJA / DESCARTE para autoclave e incineración.',
    entidadId: 'EXT-2026-8812'
  },
  {
    idEvento: 'EVT-2026-906',
    timestamp: '2026-09-26T21:10:00',
    actorNombre: 'Lic. Bioq. Carlos Mendoza',
    actorRol: 'despacho',
    actorCi: '3948201 SC',
    ipSimulada: '181.188.14.95',
    tipoEvento: 'CODIGO_ROJO_EMERGENCIA',
    accion: 'Despacho Inmediato Código Rojo',
    detalles: 'Paciente shock hemorrágico obstétrico. 2 unidades O Rh- despachadas sin prueba cruzada previa bajo Acta de Responsabilidad Médica ACT-URG-0926.',
    entidadId: 'DSP-2026-8819'
  },
  {
    idEvento: 'EVT-2026-907',
    timestamp: '2026-09-25T11:45:30',
    actorNombre: 'Lic. Bioq. Carlos Mendoza',
    actorRol: 'despacho',
    actorCi: '3948201 SC',
    ipSimulada: '181.188.14.95',
    tipoEvento: 'PRUEBA_CRUZADA_INCOMPATIBLE',
    accion: 'Prueba Cruzada Incompatible Auditada',
    detalles: 'Aglutinación en prueba mayor con unidad CGR-2026-0810-A+. LA BOLSA NO FUE DESCARTADA: desbloqueada a Disponible. Seleccionada unidad alterna.',
    entidadId: 'CGR-2026-0810-A+'
  },
  {
    idEvento: 'EVT-2026-908',
    timestamp: '2026-09-24T14:05:12',
    actorNombre: 'Lic. Gabriel Soliz P.',
    actorRol: 'administrador',
    actorCi: '2981044 SC',
    ipSimulada: '190.181.25.10',
    tipoEvento: 'CAMBIO_UMBRAL_STOCK',
    accion: 'Actualización de Umbrales de Stock de Seguridad',
    detalles: 'Ajustado umbral crítico de O- Negativo de 3 a 5 unidades por alta demanda traumatológica departamental.'
  }
];

// CU04: Parametrización de Umbrales de Stock de Seguridad
export const MOCK_STOCK_THRESHOLDS: StockThresholdConfig[] = [
  { grupo: 'O', factorRh: 'Negativo', stockMinimoSeguridad: 6, stockAlertaCritica: 3, diasCaducidadAlerta: 7 },
  { grupo: 'O', factorRh: 'Positivo', stockMinimoSeguridad: 12, stockAlertaCritica: 5, diasCaducidadAlerta: 5 },
  { grupo: 'A', factorRh: 'Negativo', stockMinimoSeguridad: 4, stockAlertaCritica: 2, diasCaducidadAlerta: 7 },
  { grupo: 'A', factorRh: 'Positivo', stockMinimoSeguridad: 8, stockAlertaCritica: 4, diasCaducidadAlerta: 5 },
  { grupo: 'B', factorRh: 'Negativo', stockMinimoSeguridad: 3, stockAlertaCritica: 1, diasCaducidadAlerta: 7 },
  { grupo: 'B', factorRh: 'Positivo', stockMinimoSeguridad: 5, stockAlertaCritica: 2, diasCaducidadAlerta: 5 },
  { grupo: 'AB', factorRh: 'Negativo', stockMinimoSeguridad: 2, stockAlertaCritica: 1, diasCaducidadAlerta: 7 },
  { grupo: 'AB', factorRh: 'Positivo', stockMinimoSeguridad: 3, stockAlertaCritica: 1, diasCaducidadAlerta: 5 }
];

// CU10 / CU11: Triajes Clínicos
export const MOCK_CLINICAL_TRIAJES: ClinicalTriageRecord[] = [
  {
    idTriaje: 'TRJ-2026-101',
    idCita: 301,
    idDonante: 1,
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    fechaHora: '2026-09-25T08:50:00',
    doctorNombre: 'Dr. Fernando Valverde',
    doctorMatricula: 'MED-COL-9481',
    signosVitales: {
      presionSistolica: 118,
      presionDiastolica: 76,
      pulso: 68,
      temperatura: 36.4,
      pesoKg: 74.5,
      hemoglobinaGdl: 15.4,
      viaVenosa: 'Ambos Aptos'
    },
    dictamen: 'Apto',
    observacionesClinicas: 'Donante en excelente condición hemodinámica. Tolerancia adecuada para 450 ml de sangre total.'
  },
  {
    idTriaje: 'TRJ-2026-102',
    idDonante: 2,
    donanteNombre: 'Sofía Elena Mendoza Vaca',
    donanteCi: '8934120 SC',
    fechaHora: '2026-08-01T10:15:00',
    doctorNombre: 'Dr. Fernando Valverde',
    doctorMatricula: 'MED-COL-9481',
    signosVitales: {
      presionSistolica: 105,
      presionDiastolica: 68,
      pulso: 74,
      temperatura: 36.6,
      pesoKg: 53.0,
      hemoglobinaGdl: 12.8,
      viaVenosa: 'Brazo Derecho Apto'
    },
    dictamen: 'Diferido Temporal',
    motivoDiferimiento: 'Descanso biológico femenino de 120 días requerido posdonación previa',
    fechaReactivacion: '2026-11-29',
    observacionesClinicas: 'Se prescribe suplementación con hierro dietario preventivo.'
  }
];

// CU13 / CU14: Análisis de Laboratorio en Paralelo
export const MOCK_LAB_ANALYSES: LaboratoryAnalysisRecord[] = [
  {
    idAnalisis: 'LAB-2026-441',
    codigoExtraccion: 'EXT-2026-4421',
    codigoBolsaMadre: 'MAD-20260927-4421-O+',
    donanteCi: '7894561 SC',
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    fechaProcesamiento: '2026-09-27T10:30:00',
    bioquimicoResponsable: 'Lic. Bioq. Marcela Arteaga',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'No Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'Apto'
    },
    inmunohematologia: {
      tipificacionDirectaABO: 'O',
      tipificacionInversaABO: 'O',
      factorRh: 'Positivo',
      coombsIndirecto: 'Negativo',
      concordanciaDirectaInversa: true,
      dictamenInmuno: 'Apto'
    },
    estadoLiberacion: 'Apto',
    fechaLiberacion: '2026-09-27T11:45:00',
    observacionesTecnicas: 'Serología 6 marcadores no reactivos. Concordancia directa/inversa ABO 100%. Lote liberado a Disponible.'
  },
  {
    idAnalisis: 'LAB-2026-440',
    codigoExtraccion: 'EXT-2026-8812',
    codigoBolsaMadre: 'MAD-20260926-8812-B+',
    donanteCi: '4399120 SC',
    donanteNombre: 'Mario Arancibia Soliz',
    fechaProcesamiento: '2026-09-26T15:10:00',
    bioquimicoResponsable: 'Lic. Bioq. Marcela Arteaga',
    serologia: {
      vih: 'No Reactivo',
      chagas: 'Reactivo',
      hepatitisB: 'No Reactivo',
      hepatitisC: 'No Reactivo',
      sifilis: 'No Reactivo',
      htlv: 'No Reactivo',
      dictamenFinal: 'No Apto'
    },
    inmunohematologia: {
      tipificacionDirectaABO: 'B',
      tipificacionInversaABO: 'B',
      factorRh: 'Positivo',
      coombsIndirecto: 'Negativo',
      concordanciaDirectaInversa: true,
      dictamenInmuno: 'Apto'
    },
    estadoLiberacion: 'Reactivo Descarte',
    fechaLiberacion: '2026-09-26T16:00:00',
    observacionesTecnicas: 'Serología Reactiva para Chagas (ELISA confirmatoria reactiva). Lote derivado pasado a Baja de Inventario.'
  }
];

// CU14: Bajas e Incineración por Descarte
export const MOCK_BAJAS_INVENTARIO: BajaInventarioRecord[] = [
  {
    idBaja: 'BAJA-2026-081',
    codigoExtraccion: 'EXT-2026-8812',
    codigoBolsaMadre: 'MAD-20260926-8812-B+',
    codigosBolsasHijas: ['MAD-20260926-8812-B+-K1-GR', 'MAD-20260926-8812-B+-K2-PL'],
    fechaBaja: '2026-09-26T16:20:00',
    motivoDescarte: 'Tamizaje Inmunoserológico Reactivo: Chagas (T. cruzi ELISA)',
    marcadorReactivo: 'Chagas',
    responsableBioquimico: 'Lic. Bioq. Marcela Arteaga',
    metodoDestruccion: 'Autoclave a Presión & Incineración Biosegura',
    actaBajaNumero: 'ACT-DESCARTE-2026-081'
  }
];

// CU16: Solicitudes Pretransfusionales para Cirugía Electiva (48-72h antes)
export const MOCK_PRETRANSFUSION_ORDERS: PretransfusionOrder[] = [
  {
    idSolicitud: 'PRE-2026-301',
    codigoSolicitud: 'SOL-CIR-2026-301',
    hospital: 'Hospital Japonés (Sede Tercer Nivel)',
    medicoSolicitante: 'Dr. Alejandro Justiniano (Cirugía Cardiovascular)',
    pacienteNombre: 'Roberto Vaca Morales',
    pacienteCi: '3819200 SC',
    pacienteGrupoRh: 'O Positivo',
    tipoCirugia: 'Bypass Coronario Electivo',
    fechaCirugiaProgramada: '2026-09-30T07:30:00', // Programada con 72h
    fechaCitaMuestra: '2026-09-28T09:00:00',
    componentesRequeridos: [
      { componente: 'Concentrado de Globulos Rojos', unidades: 2 },
      { componente: 'Plasma Fresco Congelado', unidades: 2 }
    ],
    estado: 'Muestra Recibida'
  },
  {
    idSolicitud: 'PRE-2026-302',
    codigoSolicitud: 'SOL-CIR-2026-302',
    hospital: 'Clínica Foianini',
    medicoSolicitante: 'Dra. Claudia Barba (Traumatología)',
    pacienteNombre: 'Mariana Hurtado Paz',
    pacienteCi: '5920112 SC',
    pacienteGrupoRh: 'A Positivo',
    tipoCirugia: 'Reemplazo Total de Cadera',
    fechaCirugiaProgramada: '2026-10-01T10:00:00',
    fechaCitaMuestra: '2026-09-29T11:00:00',
    componentesRequeridos: [
      { componente: 'Concentrado de Globulos Rojos', unidades: 1 }
    ],
    estado: 'Pruebas Compatibilidad en Proceso'
  }
];

// CU18: Pruebas Cruzadas de Compatibilidad in vitro
export const MOCK_COMPATIBILITY_TESTS: CompatibilityTestRecord[] = [
  {
    idPrueba: 'CRX-2026-501',
    codigoSolicitud: 'SOL-CIR-2026-301',
    pacienteNombre: 'Roberto Vaca Morales',
    pacienteCi: '3819200 SC',
    pacienteGrupoRh: 'O Positivo',
    codigoBolsa: 'BOL-2026-0915-01',
    componente: 'Concentrado de Globulos Rojos',
    bolsaGrupoRh: 'O Positivo',
    resultado: 'Compatible',
    pruebaMayor: 'Sin aglutinación (Negativo)',
    pruebaMenor: 'Sin aglutinación (Negativo)',
    autotestigo: 'Negativo',
    coombsCruzado: 'Negativo',
    observaciones: 'Total compatibilidad in vitro a 37°C y fase antiglobulina. Unidad reservada para cirugía.',
    fechaHora: '2026-09-27T08:30:00',
    bioquimico: 'Lic. Bioq. Marcela Arteaga',
    retroactivaCodigoRojo: false
  },
  {
    idPrueba: 'CRX-2026-500',
    codigoSolicitud: 'SOL-HOSP-2026-145',
    pacienteNombre: 'Carlos Durán Roca',
    pacienteCi: '2849102 SC',
    pacienteGrupoRh: 'A Positivo',
    codigoBolsa: 'BOL-2026-0914-04',
    componente: 'Concentrado de Globulos Rojos',
    bolsaGrupoRh: 'A Positivo',
    resultado: 'Incompatible',
    pruebaMayor: 'Aglutinación detectada (Positivo)',
    pruebaMenor: 'Sin aglutinación (Negativo)',
    autotestigo: 'Negativo',
    coombsCruzado: 'Positivo',
    observaciones: 'Incompatibilidad por anticuerpo irregular anti-E. UNIDAD NO DESCARTADA: Desbloqueada de vuelta a Disponible para otro paciente. Se reintentó con unidad BOL-2026-0914-05.',
    fechaHora: '2026-09-25T11:20:00',
    bioquimico: 'Lic. Bioq. Marcela Arteaga',
    retroactivaCodigoRojo: false,
    reintentoUnidadId: 'BOL-2026-0914-05'
  }
];

// CU17: Actas de Extrema Urgencia Código Rojo
export const MOCK_EMERGENCY_ACTS: EmergencyActRecord[] = [
  {
    idActa: 'ACT-URG-0926',
    codigoSolicitud: 'SOL-EMERG-2026-99',
    fechaHora: '2026-09-26T21:05:00',
    medicoSolicitante: 'Dr. Marcelo Antelo Suárez',
    matriculaMedica: 'MED-COL-3199',
    hospital: 'Hospital de la Mujer Percy Boland',
    pacienteNombre: 'Lorena Méndez Cuéllar',
    pacienteCi: '7829104 SC',
    diagnosticoShock: 'Shock hipovolémico Grado IV por hemorragia posparto inmediata masiva',
    unidadesUniversalORhNegativo: ['BOL-2026-0914-02 (CGR O-)', 'BOL-2026-0915-04 (CGR O-)'],
    omisionPruebasCruzadasPreviasJustificada: true,
    firmaDigitalConfirmada: true,
    responsableBancoSangre: 'Lic. Bioq. Carlos Mendoza'
  }
];

// CU09: Registro de Entrega de Incentivos post-extracción
export const MOCK_INCENTIVOS_ENTREGA: IncentivoEntregaRecord[] = [
  {
    idEntrega: 'INC-2026-101',
    idDonacion: 1,
    codigoExtraccion: 'EXT-2026-0510',
    donanteNombre: 'Carlos Andrés Pimentel Guarena',
    donanteCi: '7894561 SC',
    tipoDonante: 'Voluntario Altruista',
    tipoIncentivo: 'Vaso Conmemorativo HemoVida',
    refrigerioEntregado: true,
    flebotomiaConfirmadaPreviamente: true,
    fechaHora: '2026-05-10T10:15:00',
    responsableEntrega: 'Lic. Patricia Arteaga'
  }
];


