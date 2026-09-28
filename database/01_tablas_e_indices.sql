DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ============================================================================
-- MÓDULO 1: SEGURIDAD, ACTORES Y ROLES (HERENCIA TABLE-PER-TYPE)
-- ============================================================================

CREATE TABLE Persona (
    idPersona SERIAL PRIMARY KEY,
    ci VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fechaNacimiento DATE NOT NULL,
    sexo VARCHAR(10) NOT NULL CHECK (sexo IN ('M', 'F', 'Otro')),
    nacionalidad VARCHAR(50) DEFAULT 'Boliviana',
    direccion VARCHAR(255),
    celular VARCHAR(20),
    ocupacion VARCHAR(100)
);

CREATE TABLE Rol (
    idRol SERIAL PRIMARY KEY,
    nombreRol VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE Usuario (
    idUsuario SERIAL PRIMARY KEY,
    idPersona INT UNIQUE REFERENCES Persona(idPersona) ON DELETE RESTRICT,
    idRol INT NOT NULL REFERENCES Rol(idRol) ON DELETE RESTRICT,
    username VARCHAR(50) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Bloqueado'))
);

CREATE TABLE BitacoraAuditoria (
    idAuditoria SERIAL PRIMARY KEY,
    idUsuario INT NOT NULL REFERENCES Usuario(idUsuario) ON DELETE RESTRICT,
    accionRealizada VARCHAR(100) NOT NULL,
    tablaAfectada VARCHAR(100) NOT NULL,
    idRegistroAfectado INT NOT NULL,
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ipOrigen VARCHAR(45) NOT NULL
);

CREATE TABLE PersonalSalud (
    idPersona INT PRIMARY KEY REFERENCES Persona(idPersona) ON DELETE CASCADE,
    idSupervisor INT REFERENCES PersonalSalud(idPersona) ON DELETE SET NULL,
    cargo VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100),
    registroProfesional VARCHAR(50) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Licencia'))
);

CREATE TABLE PosibleDonador (
    idPersona INT PRIMARY KEY REFERENCES Persona(idPersona) ON DELETE CASCADE,
    estadoCandidato VARCHAR(30) NOT NULL DEFAULT 'Postulante' CHECK (estadoCandidato IN ('Postulante', 'En Evaluacion', 'Acreditado', 'Rechazado')),
    fechaPrimerContacto DATE NOT NULL DEFAULT CURRENT_DATE,
    observacionesPreliminares TEXT
);

CREATE TABLE Donante (
    idPersona INT PRIMARY KEY REFERENCES Persona(idPersona) ON DELETE CASCADE,
    tipoDonante VARCHAR(50) NOT NULL CHECK (tipoDonante IN ('Voluntario Altruista', 'Reposicion Familiar', 'Autologo')),
    carnetDigitalCodigo VARCHAR(50) NOT NULL UNIQUE,
    estadoHabilitacion VARCHAR(30) NOT NULL DEFAULT 'Apto' CHECK (estadoHabilitacion IN ('Apto', 'Diferido Temporal', 'Diferido Definitivo')),
    fechaUltimaDonacion DATE
);

-- ============================================================================
-- MÓDULO 2: GESTIÓN DE CITAS Y REQUISITOS (PORTAL WEB)
-- ============================================================================

CREATE TABLE RequisitoDonacion (
    idRequisito SERIAL PRIMARY KEY,
    nombreRequisito VARCHAR(150) NOT NULL,
    tipoRequisito VARCHAR(50) NOT NULL CHECK (tipoRequisito IN ('Clinico', 'Legal', 'Habito', 'Epidemiologico')),
    esExcluyenteDefinitivo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE CitaDonacion (
    idCita SERIAL PRIMARY KEY,
    idDonante INT NOT NULL REFERENCES Donante(idPersona) ON DELETE RESTRICT,
    fechaHoraProgramada TIMESTAMP NOT NULL,
    prefiltroAprobado BOOLEAN NOT NULL DEFAULT FALSE,
    asistenciaConfirmada BOOLEAN NOT NULL DEFAULT FALSE,
    estadoCita VARCHAR(30) NOT NULL DEFAULT 'Programada' CHECK (estadoCita IN ('Programada', 'Atendida', 'Cancelada', 'Inasistencia'))
);

CREATE TABLE DetalleCitaRequisito (
    idDetalleCita SERIAL PRIMARY KEY,
    idCita INT NOT NULL REFERENCES CitaDonacion(idCita) ON DELETE CASCADE,
    idRequisito INT NOT NULL REFERENCES RequisitoDonacion(idRequisito) ON DELETE RESTRICT,
    cumpleRequisito BOOLEAN NOT NULL,
    observacionRespuesta TEXT,
    CONSTRAINT uk_cita_requisito UNIQUE (idCita, idRequisito)
);

-- ============================================================================
-- MÓDULO 3: EVALUACIÓN CLÍNICA, EXTRACCIÓN E INCENTIVOS
-- ============================================================================

CREATE TABLE TriajeClinico (
    idTriaje SERIAL PRIMARY KEY,
    idPosibleDonador INT NOT NULL REFERENCES PosibleDonador(idPersona) ON DELETE RESTRICT,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pesoKg NUMERIC(5,2) NOT NULL CHECK (pesoKg > 0),
    tallaCm NUMERIC(5,2) NOT NULL CHECK (tallaCm > 0),
    presionSistolicaMmHg INT NOT NULL CHECK (presionSistolicaMmHg BETWEEN 50 AND 250),
    presionDiastolicaMmHg INT NOT NULL CHECK (presionDiastolicaMmHg BETWEEN 30 AND 150),
    temperatura NUMERIC(4,2) NOT NULL CHECK (temperatura BETWEEN 35.0 AND 42.0),
    nivelHemoglobina NUMERIC(4,2) NOT NULL CHECK (nivelHemoglobina > 0),
    frecuenciaCardiaca INT NOT NULL CHECK (frecuenciaCardiaca BETWEEN 40 AND 200),
    consumeMedicamentos BOOLEAN NOT NULL DEFAULT FALSE,
    detalleMedicamentos TEXT,
    enfermedadBase VARCHAR(255),
    resultadoAptitud VARCHAR(30) NOT NULL CHECK (resultadoAptitud IN ('Apto', 'Diferido'))
);

CREATE TABLE ExtraccionDonacion (
    idExtraccion SERIAL PRIMARY KEY,
    idDonante INT NOT NULL REFERENCES Donante(idPersona) ON DELETE RESTRICT,
    idTriaje INT UNIQUE REFERENCES TriajeClinico(idTriaje) ON DELETE RESTRICT,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    codigoExtraccion VARCHAR(50) NOT NULL UNIQUE,
    modalidadDonacion VARCHAR(50) NOT NULL CHECK (modalidadDonacion IN ('Sangre Total', 'Aferesis Plaquetaria', 'Autologa')),
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    brazoExtraccion VARCHAR(20) NOT NULL CHECK (brazoExtraccion IN ('Izquierdo', 'Derecho')),
    volumenExtraidoMl INT NOT NULL CHECK (volumenExtraidoMl > 0)
);

CREATE TABLE ConsentimientoInformado (
    idConsentimiento SERIAL PRIMARY KEY,
    idExtraccion INT NOT NULL UNIQUE REFERENCES ExtraccionDonacion(idExtraccion) ON DELETE CASCADE,
    fechaFirma TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    declaracionJuradaAceptada BOOLEAN NOT NULL CHECK (declaracionJuradaAceptada = TRUE),
    firmaDigital TEXT NOT NULL
);

CREATE TABLE IncentivoEntrega (
    idIncentivo SERIAL PRIMARY KEY,
    idExtraccion INT NOT NULL UNIQUE REFERENCES ExtraccionDonacion(idExtraccion) ON DELETE CASCADE,
    tipoArticulo VARCHAR(100) NOT NULL,
    refrigerioEntregado BOOLEAN NOT NULL DEFAULT TRUE,
    fechaHoraEntrega TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MÓDULO 4: LABORATORIO E INVENTARIO DE BOLSAS K
-- ============================================================================

CREATE TABLE GrupoSanguineo (
    idGrupo SERIAL PRIMARY KEY,
    grupoABO VARCHAR(5) NOT NULL CHECK (grupoABO IN ('A', 'B', 'AB', 'O')),
    factorRh VARCHAR(10) NOT NULL CHECK (factorRh IN ('Positivo', 'Negativo')),
    CONSTRAINT uk_grupo_rh UNIQUE (grupoABO, factorRh)
);

CREATE TABLE Receptor (
    idPersona INT PRIMARY KEY REFERENCES Persona(idPersona) ON DELETE CASCADE,
    idGrupo INT REFERENCES GrupoSanguineo(idGrupo) ON DELETE RESTRICT,
    codigoExpedienteClinico VARCHAR(50) NOT NULL UNIQUE,
    historialTransfusional TEXT,
    requiereDonantesReposicion BOOLEAN NOT NULL DEFAULT FALSE,
    tipoRequisito VARCHAR(50), -- Sincronizado con el modelo UML
    fechaCirugiaProgramada DATE
);

CREATE TABLE ParametroStockMinimo (
    idParametro SERIAL PRIMARY KEY,
    idGrupo INT NOT NULL REFERENCES GrupoSanguineo(idGrupo) ON DELETE RESTRICT,
    tipoComponente VARCHAR(50) NOT NULL CHECK (tipoComponente IN ('Concentrado de Globulos Rojos', 'Plasma Fresco Congelado', 'Concentrado Plaquetario', 'Crioprecipitado')),
    stockMinimoSeguridad INT NOT NULL CHECK (stockMinimoSeguridad >= 0),
    stockCriticoAlerta INT NOT NULL CHECK (stockCriticoAlerta >= 0),
    stockOptimo INT NOT NULL CHECK (stockOptimo >= stockMinimoSeguridad),
    CONSTRAINT uk_parametro_stock UNIQUE (idGrupo, tipoComponente)
);

CREATE TABLE UnidadSangreTotal (
    idUnidadMadre SERIAL PRIMARY KEY,
    idExtraccion INT NOT NULL UNIQUE REFERENCES ExtraccionDonacion(idExtraccion) ON DELETE RESTRICT,
    idGrupo INT REFERENCES GrupoSanguineo(idGrupo) ON DELETE RESTRICT,
    codigoBolsaMadre VARCHAR(50) NOT NULL UNIQUE,
    tipoBolsa VARCHAR(50) NOT NULL,
    fechaExtraccion TIMESTAMP NOT NULL,
    fechaVencimiento DATE NOT NULL,
    estadoLiberacion VARCHAR(30) NOT NULL DEFAULT 'En Cuarentena' CHECK (estadoLiberacion IN ('En Cuarentena', 'Liberada Apta', 'Rechazada'))
);

CREATE TABLE UbicacionAlmacen (
    idUbicacion SERIAL PRIMARY KEY,
    tipoEquipo VARCHAR(50) NOT NULL CHECK (tipoEquipo IN ('Heladera Conservacion', 'Ultrafreezer', 'Agitador Plaquetas')),
    identificadorCompartimento VARCHAR(50) NOT NULL UNIQUE,
    temperaturaRegistro NUMERIC(4,2) NOT NULL,
    capacidadMaxima INT NOT NULL CHECK (capacidadMaxima > 0),
    capacidadOcupada INT NOT NULL DEFAULT 0 CHECK (capacidadOcupada <= capacidadMaxima)
);

CREATE TABLE EjemplarBolsa (
    idEjemplarBolsa SERIAL PRIMARY KEY,
    idUnidadMadre INT NOT NULL REFERENCES UnidadSangreTotal(idUnidadMadre) ON DELETE RESTRICT,
    idGrupo INT NOT NULL REFERENCES GrupoSanguineo(idGrupo) ON DELETE RESTRICT,
    idUbicacion INT REFERENCES UbicacionAlmacen(idUbicacion) ON DELETE SET NULL,
    codigoEjemplarK VARCHAR(50) NOT NULL UNIQUE,
    tipoComponente VARCHAR(50) NOT NULL CHECK (tipoComponente IN ('Concentrado de Globulos Rojos', 'Plasma Fresco Congelado', 'Concentrado Plaquetario', 'Crioprecipitado')),
    volumenMl INT NOT NULL CHECK (volumenMl > 0),
    fechaFraccionamiento TIMESTAMP NOT NULL,
    fechaCaducidad DATE NOT NULL,
    esExclusivoAutologo BOOLEAN NOT NULL DEFAULT FALSE,
    estadoBolsaK VARCHAR(30) NOT NULL DEFAULT 'En Cuarentena' CHECK (estadoBolsaK IN ('En Cuarentena', 'Disponible', 'Reservada', 'Despachada', 'Baja'))
);

CREATE TABLE BajaInventario (
    idBaja SERIAL PRIMARY KEY,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    idEjemplarBolsa INT UNIQUE REFERENCES EjemplarBolsa(idEjemplarBolsa) ON DELETE RESTRICT,
    idUnidadMadre INT UNIQUE REFERENCES UnidadSangreTotal(idUnidadMadre) ON DELETE RESTRICT,
    fechaHoraBaja TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivoBaja VARCHAR(100) NOT NULL,
    observaciones TEXT,
    CONSTRAINT chk_baja_origen_xor CHECK (
        (idEjemplarBolsa IS NOT NULL AND idUnidadMadre IS NULL) OR
        (idEjemplarBolsa IS NULL AND idUnidadMadre IS NOT NULL)
    )
);

-- ============================================================================
-- MÓDULO 5: CITAS DE LABORATORIO, TAMIZAJE Y DIFERIMIENTO
-- ============================================================================

CREATE TABLE CitaLaboratorio (
    idCitaLab SERIAL PRIMARY KEY,
    idPersona INT NOT NULL REFERENCES Persona(idPersona) ON DELETE RESTRICT,
    idExtraccion INT REFERENCES ExtraccionDonacion(idExtraccion) ON DELETE SET NULL,
    codigoCita VARCHAR(50) NOT NULL UNIQUE,
    fechaHoraProgramada TIMESTAMP NOT NULL,
    tipoAnalisisRequerido VARCHAR(50) NOT NULL CHECK (tipoAnalisisRequerido IN ('InmunoSerologico', 'InmunoHematologico', 'Panel Completo')),
    momentoRespectoExtraccion VARCHAR(30) NOT NULL CHECK (momentoRespectoExtraccion IN ('Pre-Extraccion', 'Post-Extraccion')),
    motivoEstudio TEXT,
    asistenciaConfirmada BOOLEAN NOT NULL DEFAULT FALSE,
    estadoCita VARCHAR(30) NOT NULL DEFAULT 'Programada' CHECK (estadoCita IN ('Programada', 'Completada', 'Cancelada'))
);

CREATE TABLE AnalisisInmunoSerologico (
    idTamizaje SERIAL PRIMARY KEY,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    idPosibleDonador INT REFERENCES PosibleDonador(idPersona) ON DELETE RESTRICT,
    idUnidadMadre INT REFERENCES UnidadSangreTotal(idUnidadMadre) ON DELETE RESTRICT,
    idCitaLab INT REFERENCES CitaLaboratorio(idCitaLab) ON DELETE SET NULL,
    codigoAnalisis VARCHAR(50) NOT NULL UNIQUE,
    etapaAnalisis VARCHAR(50) NOT NULL CHECK (etapaAnalisis IN ('Pre-Extraccion', 'Post-Extraccion')),
    fechaAnalisis TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultadoVIH VARCHAR(30) NOT NULL CHECK (resultadoVIH IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoChagas VARCHAR(30) NOT NULL CHECK (resultadoChagas IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHepatitisB VARCHAR(30) NOT NULL CHECK (resultadoHepatitisB IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHepatitisC VARCHAR(30) NOT NULL CHECK (resultadoHepatitisC IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoSifilis VARCHAR(30) NOT NULL CHECK (resultadoSifilis IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHTLV VARCHAR(30) NOT NULL CHECK (resultadoHTLV IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    dictamenFinal VARCHAR(30) NOT NULL CHECK (dictamenFinal IN ('Apto', 'No Apto')),
    habilitaExtraccion BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE AnalisisInmunoHematologico (
    idAnalisisHematologico SERIAL PRIMARY KEY,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    idPosibleDonador INT REFERENCES PosibleDonador(idPersona) ON DELETE RESTRICT,
    idReceptor INT REFERENCES Receptor(idPersona) ON DELETE RESTRICT,
    idUnidadMadre INT REFERENCES UnidadSangreTotal(idUnidadMadre) ON DELETE RESTRICT,
    idCitaLab INT REFERENCES CitaLaboratorio(idCitaLab) ON DELETE SET NULL,
    etapaAnalisis VARCHAR(50) NOT NULL CHECK (etapaAnalisis IN ('Pre-Extraccion', 'Post-Extraccion', 'Pre-Transfusional')),
    fechaAnalisis TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    grupoABOConfirmado VARCHAR(5) NOT NULL CHECK (grupoABOConfirmado IN ('A', 'B', 'AB', 'O')),
    factorRhConfirmado VARCHAR(10) NOT NULL CHECK (factorRhConfirmado IN ('Positivo', 'Negativo')),
    pruebaCoombsDirecta VARCHAR(30) NOT NULL,
    pruebaCoombsIndirecta VARCHAR(30) NOT NULL,
    rastreoAnticuerposIrregulares VARCHAR(100) NOT NULL,
    observaciones TEXT
);

CREATE TABLE Diferimiento (
    idDiferimiento SERIAL PRIMARY KEY,
    idTriaje INT UNIQUE REFERENCES TriajeClinico(idTriaje) ON DELETE RESTRICT,
    idTamizaje INT UNIQUE REFERENCES AnalisisInmunoSerologico(idTamizaje) ON DELETE RESTRICT,
    fechaInicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipoRechazo VARCHAR(50) NOT NULL CHECK (tipoRechazo IN ('Temporal', 'Definitivo')),
    motivoDetallado TEXT NOT NULL,
    diasInhabilitacion INT NOT NULL CHECK (diasInhabilitacion >= 0),
    fechaReactivacionProyectada DATE,
    CONSTRAINT chk_diferimiento_origen_xor CHECK (
        (idTriaje IS NOT NULL AND idTamizaje IS NULL) OR
        (idTriaje IS NULL AND idTamizaje IS NOT NULL)
    )
);

-- ============================================================================
-- MÓDULO 6: SOLICITUDES, RESERVAS, COMPROMISOS Y DESPACHO
-- ============================================================================

CREATE TABLE InstitucionSalud (
    idInstitucion SERIAL PRIMARY KEY,
    nombreInstitucion VARCHAR(150) NOT NULL,
    tipoInstitucion VARCHAR(50) NOT NULL CHECK (tipoInstitucion IN ('Hospital Publico', 'Clinica Privada', 'Seguro Social')),
    nit VARCHAR(30),
    direccion VARCHAR(255),
    telefonoContacto VARCHAR(30)
);

CREATE TABLE SolicitudHospitalaria (
    idSolicitud SERIAL PRIMARY KEY,
    idInstitucion INT NOT NULL REFERENCES InstitucionSalud(idInstitucion) ON DELETE RESTRICT,
    idReceptor INT NOT NULL REFERENCES Receptor(idPersona) ON DELETE RESTRICT,
    numeroSolicitud VARCHAR(50) NOT NULL UNIQUE,
    fechaHoraRequerimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prioridadSolicitud VARCHAR(30) NOT NULL CHECK (prioridadSolicitud IN ('Emergencia (Roja)', 'Urgencia (Amarilla)', 'Programada (Verde)')),
    motivoTransfusion TEXT,
    horarioRequerido TIME,
    velocidadGoteo VARCHAR(50),
    cantidadBolsasSolicitadas INT NOT NULL DEFAULT 0 CHECK (cantidadBolsasSolicitadas >= 0),
    cantidadDonadaEfectiva INT NOT NULL DEFAULT 0 CHECK (cantidadDonadaEfectiva >= 0),
    cantidadEntregadaReceptor INT NOT NULL DEFAULT 0 CHECK (cantidadEntregadaReceptor >= 0),
    cantidadRetiradaStock INT NOT NULL DEFAULT 0 CHECK (cantidadRetiradaStock >= 0),
    estadoSolicitud VARCHAR(30) NOT NULL DEFAULT 'Registrada' CHECK (estadoSolicitud IN ('Registrada', 'En Evaluacion', 'En Proceso', 'Despachada', 'Cancelada'))
);

CREATE TABLE DetalleSolicitud (
    idDetalle SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL REFERENCES SolicitudHospitalaria(idSolicitud) ON DELETE CASCADE,
    idGrupo INT NOT NULL REFERENCES GrupoSanguineo(idGrupo) ON DELETE RESTRICT,
    tipoComponenteRequerido VARCHAR(50) NOT NULL CHECK (tipoComponenteRequerido IN ('Concentrado de Globulos Rojos', 'Plasma Fresco Congelado', 'Concentrado Plaquetario', 'Crioprecipitado')),
    cantidadSolicitada INT NOT NULL CHECK (cantidadSolicitada > 0),
    cantidadAsignada INT NOT NULL DEFAULT 0 CHECK (cantidadAsignada >= 0)
);

CREATE TABLE ReposicionPendiente (
    idReposicion SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL UNIQUE REFERENCES SolicitudHospitalaria(idSolicitud) ON DELETE RESTRICT,
    fechaGeneracion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cantidadBolsasAReponer INT NOT NULL CHECK (cantidadBolsasAReponer > 0),
    cantidadRecuperada INT NOT NULL DEFAULT 0 CHECK (cantidadRecuperada >= 0),
    estadoReposicion VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estadoReposicion IN ('Pendiente', 'Parcialmente Cubierta', 'Liquidada', 'Vencida')),
    fechaLimiteReposicion DATE NOT NULL
);

CREATE TABLE CompromisoDonacion (
    idCompromiso SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL REFERENCES SolicitudHospitalaria(idSolicitud) ON DELETE RESTRICT,
    idDonante INT NOT NULL REFERENCES Donante(idPersona) ON DELETE RESTRICT,
    idReposicion INT REFERENCES ReposicionPendiente(idReposicion) ON DELETE SET NULL,
    idExtraccion INT UNIQUE REFERENCES ExtraccionDonacion(idExtraccion) ON DELETE SET NULL,
    fechaCompromiso DATE NOT NULL DEFAULT CURRENT_DATE,
    asistioACita BOOLEAN NOT NULL DEFAULT FALSE,
    donacionConcretada BOOLEAN NOT NULL DEFAULT FALSE,
    volumenDonadoEfectivoMl INT NOT NULL DEFAULT 0 CHECK (volumenDonadoEfectivoMl >= 0),
    estadoCompromiso VARCHAR(30) NOT NULL DEFAULT 'Asignado' CHECK (estadoCompromiso IN ('Asignado', 'Cumplido', 'Incumplido', 'Rechazado en Triaje')),
    observacionesIncumplimiento TEXT
);

CREATE TABLE ReservaSangre (
    idReserva SERIAL PRIMARY KEY,
    idReceptor INT NOT NULL REFERENCES Receptor(idPersona) ON DELETE RESTRICT,
    idEjemplarBolsa INT NOT NULL UNIQUE REFERENCES EjemplarBolsa(idEjemplarBolsa) ON DELETE RESTRICT,
    idDetalleSolicitud INT REFERENCES DetalleSolicitud(idDetalle) ON DELETE SET NULL,
    fechaReserva TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    esAutologa BOOLEAN NOT NULL DEFAULT FALSE,
    motivoReserva VARCHAR(100),
    fechaVencimientoReserva DATE NOT NULL,
    estadoReserva VARCHAR(30) NOT NULL DEFAULT 'Activa' CHECK (estadoReserva IN ('Activa', 'Consumida', 'Vencida', 'Cancelada'))
);

CREATE TABLE PruebaCompatibilidad (
    idCompatibilidad SERIAL PRIMARY KEY,
    idDetalleSolicitud INT NOT NULL REFERENCES DetalleSolicitud(idDetalle) ON DELETE RESTRICT,
    idEjemplarBolsa INT NOT NULL REFERENCES EjemplarBolsa(idEjemplarBolsa) ON DELETE RESTRICT,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    fechaHoraPrueba TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultadoCompatibilidad VARCHAR(30) NOT NULL CHECK (resultadoCompatibilidad IN ('Compatible', 'Incompatible', 'Dudoso')),
    observaciones TEXT
);

CREATE TABLE ComprobanteDespacho (
    idDespacho SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL UNIQUE REFERENCES SolicitudHospitalaria(idSolicitud) ON DELETE RESTRICT,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    codigoGuiaDespacho VARCHAR(50) NOT NULL UNIQUE,
    fechaHoraSalida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receptorEntrega VARCHAR(100) NOT NULL,
    temperaturaDespacho NUMERIC(4,2) NOT NULL,
    estadoEntrega VARCHAR(30) NOT NULL DEFAULT 'En Transito' CHECK (estadoEntrega IN ('En Transito', 'Entregado Conforme', 'Rechazado Cadena Frio'))
);

CREATE TABLE DetalleDespacho (
    idDetalleDespacho SERIAL PRIMARY KEY,
    idDespacho INT NOT NULL REFERENCES ComprobanteDespacho(idDespacho) ON DELETE CASCADE,
    idEjemplarBolsa INT NOT NULL UNIQUE REFERENCES EjemplarBolsa(idEjemplarBolsa) ON DELETE RESTRICT,
    temperaturaEntrega NUMERIC(4,2) NOT NULL,
    observacionesEntrega TEXT
);

CREATE TABLE ComprobantePago (
    idComprobante SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL UNIQUE REFERENCES SolicitudHospitalaria(idSolicitud) ON DELETE RESTRICT,
    idPersonalSalud INT NOT NULL REFERENCES PersonalSalud(idPersona) ON DELETE RESTRICT,
    numeroReciboFactura VARCHAR(50) NOT NULL UNIQUE,
    fechaEmision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    conceptoServicio VARCHAR(150) NOT NULL,
    montoTotal NUMERIC(10,2) NOT NULL CHECK (montoTotal >= 0),
    metodoPago VARCHAR(50) NOT NULL CHECK (metodoPago IN ('Efectivo', 'Transferencia QR', 'Tarjeta Debito/Credito', 'Convenio Institucional')),
    estadoPago VARCHAR(30) NOT NULL DEFAULT 'Pagado' CHECK (estadoPago IN ('Pendiente', 'Pagado', 'Exonerado'))
);

-- ============================================================================
-- ÍNDICES ESTRATÉGICOS
-- ============================================================================

CREATE INDEX idx_persona_ci ON Persona(ci);
CREATE INDEX idx_ejemplar_estado ON EjemplarBolsa(estadoBolsaK);
CREATE INDEX idx_ejemplar_componente_caducidad ON EjemplarBolsa(tipoComponente, fechaCaducidad);
CREATE INDEX idx_solicitud_estado_prioridad ON SolicitudHospitalaria(estadoSolicitud, prioridadSolicitud);
CREATE INDEX idx_reposicion_estado ON ReposicionPendiente(estadoReposicion);
CREATE INDEX idx_unidad_madre_codigo ON UnidadSangreTotal(codigoBolsaMadre);
CREATE INDEX idx_compromiso_solicitud ON CompromisoDonacion(idSolicitud);
CREATE INDEX idx_bitacora_usuario_fecha ON BitacoraAuditoria(idUsuario, fechaHora);