-- ============================================================================
-- SCRIPT MAESTRO DE INICIALIZACIÓN: BANCO DE SANGRE 'HEMOVIDA'
-- Base de Datos PostgreSQL 18
-- Incluye: Tablas, Relaciones, Índices, Triggers, Procedimientos y Datos Semilla
-- ============================================================================

-- PARTE 1: ESTRUCTURA, TABLAS E ÍNDICES
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

-- PARTE 2: TRIGGERS AUTOMATIZADOS DE REGLAS DE NEGOCIO
-- SECCIÓN 4: TRIGGERS AUTOMATIZADOS DE NEGOCIO (REGLAS OPERATIVAS Y CLÍNICAS)
-- ============================================================================

-- Trigger T1 [CU01 / CU02]: Política de contraseña segura en la creación o actualización de cuentas.
-- Regla: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial.
CREATE OR REPLACE FUNCTION fn_trg_validar_password_seguro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passwordHash !~ '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?`~]).{8,}$' THEN
        RAISE EXCEPTION 'La contraseña no cumple la política de seguridad: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_password_seguro ON Usuario;
CREATE TRIGGER trg_validar_password_seguro
BEFORE INSERT OR UPDATE OF passwordHash ON Usuario
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_password_seguro();


-- Trigger T2 [CU13 / CU14 / CU15]: Barrera de liberación y descarte automático de hemocomponentes.
-- Regla: Si el tamizaje serológico resulta 'Apto', libera las bolsas derivadas en cuarentena a 'Disponible'.
-- Si resulta 'No Apto' (Reactivo), bloquea el lote a 'Baja' y genera automáticamente la orden en BajaInventario.
CREATE OR REPLACE FUNCTION fn_trg_barrera_liberacion_serologica()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dictamenFinal = 'Apto' THEN
        UPDATE EjemplarBolsa
        SET estadoBolsaK = 'Disponible'
        WHERE idUnidadMadre = NEW.idUnidadMadre
          AND estadoBolsaK = 'En Cuarentena';
          
        UPDATE UnidadSangreTotal
        SET estadoLiberacion = 'Liberada Apta'
        WHERE idUnidadMadre = NEW.idUnidadMadre;
        
    ELSIF NEW.dictamenFinal = 'No Apto' THEN
        UPDATE EjemplarBolsa
        SET estadoBolsaK = 'Baja'
        WHERE idUnidadMadre = NEW.idUnidadMadre;
        
        UPDATE UnidadSangreTotal
        SET estadoLiberacion = 'Rechazada'
        WHERE idUnidadMadre = NEW.idUnidadMadre;
        
        INSERT INTO BajaInventario (
            idUnidadMadre,
            idPersonalSalud,
            fechaHoraBaja,
            motivoBaja,
            observaciones
        ) VALUES (
            NEW.idUnidadMadre,
            NEW.idPersonalSalud,
            CURRENT_TIMESTAMP,
            'Reactividad Serológica',
            'Descarte preventivo por positividad viral en tamizaje inmunoserológico.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_barrera_liberacion_serologica ON AnalisisInmunoSerologico;
CREATE TRIGGER trg_barrera_liberacion_serologica
AFTER INSERT OR UPDATE OF dictamenFinal ON AnalisisInmunoSerologico
FOR EACH ROW
EXECUTE FUNCTION fn_trg_barrera_liberacion_serologica();


-- Trigger T3 [CU18]: Retorno automático de unidad a stock disponible tras incompatibilidad cruzada.
-- Regla: Si una prueba cruzada resulta 'Incompatible', la bolsa no se descarta; se desbloquea a 'Disponible'.
CREATE OR REPLACE FUNCTION fn_trg_liberar_bolsa_incompatible()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.resultadoCompatibilidad = 'Incompatible' THEN
        UPDATE EjemplarBolsa
        SET estadoBolsaK = 'Disponible'
        WHERE idEjemplarBolsa = NEW.idEjemplarBolsa
          AND estadoBolsaK = 'Reservada';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_liberar_bolsa_incompatible ON PruebaCompatibilidad;
CREATE TRIGGER trg_liberar_bolsa_incompatible
AFTER INSERT ON PruebaCompatibilidad
FOR EACH ROW
EXECUTE FUNCTION fn_trg_liberar_bolsa_incompatible();


-- Trigger T4 [CU17 / CU19]: Apertura automática de reposición pendiente al despachar sangre.
-- Regla: Al despacharse una solicitud clínica, genera automáticamente el registro de deuda biológica.
CREATE OR REPLACE FUNCTION fn_trg_apertura_deuda_biologica()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estadoSolicitud = 'Despachada' AND (OLD IS NULL OR OLD.estadoSolicitud != 'Despachada') THEN
        IF NOT EXISTS (SELECT 1 FROM ReposicionPendiente WHERE idSolicitud = NEW.idSolicitud) THEN
            INSERT INTO ReposicionPendiente (
                idSolicitud,
                cantidadBolsasAReponer,
                cantidadRecuperada,
                fechaLimiteReposicion,
                estadoReposicion
            ) VALUES (
                NEW.idSolicitud,
                NEW.cantidadBolsasSolicitadas,
                0,
                CURRENT_DATE + INTERVAL '7 days',
                'Pendiente'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apertura_deuda_biologica ON SolicitudHospitalaria;
CREATE TRIGGER trg_apertura_deuda_biologica
AFTER UPDATE OF estadoSolicitud ON SolicitudHospitalaria
FOR EACH ROW
EXECUTE FUNCTION fn_trg_apertura_deuda_biologica();


-- Trigger T5 [CU20]: Amortización cuantitativa (1 a 1) y liquidación de deuda biológica.
-- Regla: Cada donación efectiva de reposición incrementa el saldo recuperado y liquida al completar la cuota.
CREATE OR REPLACE FUNCTION fn_trg_amortizar_reposicion_familiar()
RETURNS TRIGGER AS $$
DECLARE
    v_requeridas INT;
    v_recuperadas INT;
BEGIN
    IF NEW.donacionConcretada = TRUE AND (OLD IS NULL OR OLD.donacionConcretada = FALSE) THEN
        UPDATE ReposicionPendiente
        SET cantidadRecuperada = cantidadRecuperada + 1
        WHERE idReposicion = NEW.idReposicion;
        
        SELECT cantidadBolsasAReponer, cantidadRecuperada 
        INTO v_requeridas, v_recuperadas
        FROM ReposicionPendiente
        WHERE idReposicion = NEW.idReposicion;
        
        IF v_recuperadas >= v_requeridas THEN
            UPDATE ReposicionPendiente
            SET estadoReposicion = 'Liquidada'
            WHERE idReposicion = NEW.idReposicion;
        ELSE
            UPDATE ReposicionPendiente
            SET estadoReposicion = 'Parcial'
            WHERE idReposicion = NEW.idReposicion;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_amortizar_reposicion_familiar ON CompromisoDonacion;
CREATE TRIGGER trg_amortizar_reposicion_familiar
AFTER INSERT OR UPDATE OF donacionConcretada ON CompromisoDonacion
FOR EACH ROW
EXECUTE FUNCTION fn_trg_amortizar_reposicion_familiar();

-- PARTE 3: PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- ============================================================================
-- BANCO DE SANGRE "HEMOVIDA" - PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- ORQUESTACIÓN TRANSACCIONAL DE CASOS DE USO CRÍTICOS (PostgreSQL / PLpgSQL)
-- ============================================================================

-- ============================================================================
-- PROCEDIMIENTO 1: [CU01 / CU02] Registrar Nuevo Usuario con Validación de Contraseña Segura
-- ============================================================================
-- Propósito: Crea la cuenta validando la regla de complejidad: mínimo 8 caracteres,
-- al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
CREATE OR REPLACE PROCEDURE sp_registrar_usuario_seguro(
    p_idPersona INT,
    p_idRol INT,
    p_username VARCHAR,
    p_email VARCHAR,
    p_passwordTextoPlano VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validación estricta mediante expresión regular
    IF p_passwordTextoPlano !~ '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?`~]).{8,}$' THEN
        RAISE EXCEPTION 'La contraseña no cumple la política de seguridad: Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial.';
    END IF;

    -- Inserción con hash simulado (en producción se aplica crypt/argon2/sha256)
    INSERT INTO Usuario (
        idPersona,
        idRol,
        username,
        email,
        passwordHash,
        estado,
        fechaCreacion
    ) VALUES (
        p_idPersona,
        p_idRol,
        p_username,
        p_email,
        p_passwordTextoPlano,
        'Activo',
        CURRENT_TIMESTAMP
    );

    -- Registro en bitácora de auditoría
    INSERT INTO BitacoraAuditoria (
        idUsuario,
        accionRealizada,
        tablaAfectada,
        idRegistroAfectado,
        fechaHora,
        ipOrigen
    ) VALUES (
        NULL,
        CONCAT('Alta de usuario: ', p_username),
        'Usuario',
        currval(pg_get_serial_sequence('Usuario', 'idUsuario')),
        CURRENT_TIMESTAMP,
        '127.0.0.1'
    );
END;
$$;


-- ============================================================================
-- PROCEDIMIENTO 2: [CU10 / CU11] Procesar Triaje Clínico y Gestionar Diferimiento
-- ============================================================================
-- Propósito: Evalúa signos vitales (peso > 50 kg, hemoglobina, presión) y si no es apto,
-- registra automáticamente el diferimiento clínico con los días de inhabilitación médica.
CREATE OR REPLACE PROCEDURE sp_procesar_triaje_clinico(
    p_idPosibleDonador INT,
    p_idPersonalSalud INT,
    p_pesoKg NUMERIC,
    p_presionSistolica INT,
    p_presionDiastolica INT,
    p_hemoglobina NUMERIC,
    p_temperatura NUMERIC,
    p_motivoDiferimiento VARCHAR DEFAULT NULL,
    p_diasInhabilitacion INT DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_idTriaje INT;
    v_resultadoAptitud VARCHAR(20);
BEGIN
    -- Regla clínica de aptitud básica
    IF p_pesoKg < 50.0 OR p_temperatura > 37.5 OR p_hemoglobina < 12.5 OR p_motivoDiferimiento IS NOT NULL THEN
        v_resultadoAptitud := 'Rechazado';
    ELSE
        v_resultadoAptitud := 'Apto';
    END IF;

    -- Inserción de la evaluación médica
    INSERT INTO TriajeClinico (
        idPosibleDonador,
        idPersonalSalud,
        fechaHora,
        pesoKg,
        presionSistolicaMmHg,
        presionDiastolicaMmHg,
        nivelHemoglobina,
        temperatura,
        resultadoAptitud
    ) VALUES (
        p_idPosibleDonador,
        p_idPersonalSalud,
        CURRENT_TIMESTAMP,
        p_pesoKg,
        p_presionSistolica,
        p_presionDiastolica,
        p_hemoglobina,
        p_temperatura,
        v_resultadoAptitud
    ) RETURNING idTriaje INTO v_idTriaje;

    -- Si no es apto, formalizar diferimiento médico (CU11)
    IF v_resultadoAptitud = 'Rechazado' THEN
        INSERT INTO Diferimiento (
            idTriaje,
            idPosibleDonador,
            motivoDetallado,
            diasInhabilitacion,
            fechaInicioDiferimiento,
            fechaFinDiferimiento
        ) VALUES (
            v_idTriaje,
            p_idPosibleDonador,
            COALESCE(p_motivoDiferimiento, 'No cumple parámetros de biometría en triaje (peso/hemoglobina/temperatura)'),
            p_diasInhabilitacion,
            CURRENT_DATE,
            CURRENT_DATE + (p_diasInhabilitacion || ' days')::INTERVAL
        );

        -- Actualización del estado del donante
        UPDATE Donante
        SET estadoHabilitacion = CASE WHEN p_diasInhabilitacion > 365 THEN 'Diferido Definitivo' ELSE 'Diferido Temporal' END
        WHERE idPersona = p_idPosibleDonador;
    ELSE
        UPDATE Donante
        SET estadoHabilitacion = 'Apto'
        WHERE idPersona = p_idPosibleDonador;
    END IF;
END;
$$;


-- ============================================================================
-- PROCEDIMIENTO 3: [CU12 / CU15] Registrar Flebotomía y Fraccionamiento Mecánico Inmediato
-- ============================================================================
-- Propósito: Registra la extracción de 450 ml, crea la Bolsa Madre e inmediatamente
-- fracciona en componentes hijos (Glóbulos Rojos y Plasma) naciendo en 'En Cuarentena'.
CREATE OR REPLACE PROCEDURE sp_registrar_flebotomia_y_fraccionar(
    p_idDonante INT,
    p_idPersonalSalud INT,
    p_idGrupo INT,
    p_idUbicacionCamara INT,
    p_brazo VARCHAR,
    p_volumenMl NUMERIC DEFAULT 450
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_idExtraccion INT;
    v_idUnidadMadre INT;
    v_codigoExtraccion VARCHAR(30);
    v_codigoMadre VARCHAR(40);
BEGIN
    v_codigoExtraccion := CONCAT('EXT-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', FLOOR(RANDOM() * 9000 + 1000));
    v_codigoMadre := CONCAT('MAD-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', FLOOR(RANDOM() * 9000 + 1000));

    -- 1. Registro de la punción física (CU12)
    INSERT INTO ExtraccionDonacion (
        idDonante,
        idPersonalSalud,
        codigoExtraccion,
        fechaHora,
        volumenExtraidoMl,
        brazoExtraccion
    ) VALUES (
        p_idDonante,
        p_idPersonalSalud,
        v_codigoExtraccion,
        CURRENT_TIMESTAMP,
        p_volumenMl,
        p_brazo
    ) RETURNING idExtraccion INTO v_idExtraccion;

    -- 2. Alta de la bolsa madre en cuarentena
    INSERT INTO UnidadSangreTotal (
        idExtraccion,
        idGrupo,
        codigoBolsaMadre,
        tipoBolsa,
        estadoLiberacion
    ) VALUES (
        v_idExtraccion,
        p_idGrupo,
        v_codigoMadre,
        'Bolsa Cuadruple CPD-SAGM',
        'En Cuarentena'
    ) RETURNING idUnidadMadre INTO v_idUnidadMadre;

    -- 3. Fraccionamiento mecánico inmediato (<6-8 horas) (CU15)
    -- Concentrado de Glóbulos Rojos (Caducidad 35 días)
    INSERT INTO EjemplarBolsa (
        idUnidadMadre,
        idGrupo,
        idUbicacion,
        codigoEjemplarK,
        tipoComponente,
        volumenMl,
        fechaExtraccion,
        fechaCaducidad,
        estadoBolsaK
    ) VALUES (
        v_idUnidadMadre,
        p_idGrupo,
        p_idUbicacionCamara,
        CONCAT(v_codigoMadre, '-K1-GR'),
        'Concentrado de Globulos Rojos',
        250,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '35 days',
        'En Cuarentena'
    );

    -- Plasma Fresco Congelado (Caducidad 365 días)
    INSERT INTO EjemplarBolsa (
        idUnidadMadre,
        idGrupo,
        idUbicacion,
        codigoEjemplarK,
        tipoComponente,
        volumenMl,
        fechaExtraccion,
        fechaCaducidad,
        estadoBolsaK
    ) VALUES (
        v_idUnidadMadre,
        p_idGrupo,
        p_idUbicacionCamara,
        CONCAT(v_codigoMadre, '-K2-PL'),
        'Plasma Fresco Congelado',
        150,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '365 days',
        'En Cuarentena'
    );

    -- Actualización de la fecha de última donación del donante
    UPDATE Donante
    SET fechaUltimaDonacion = CURRENT_DATE
    WHERE idPersona = p_idDonante;
END;
$$;


-- ============================================================================
-- PROCEDIMIENTO 4: [CU17 / CU18 / CU19] Despacho Inmediato por Código Rojo (Extrema Urgencia)
-- ============================================================================
-- Propósito: Despacha unidades universales (O Rh-) sin esperar la prueba cruzada previa,
-- registrando la cadena de frío, la solicitud clínica y el acta de responsabilidad médica.
CREATE OR REPLACE PROCEDURE sp_despachar_codigo_rojo(
    p_idSolicitud INT,
    p_idPersonalSalud INT,
    p_funcionarioHospitalReceptor VARCHAR,
    p_temperaturaTransporte NUMERIC,
    p_idEjemplarBolsa INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_idDespacho INT;
    v_guia VARCHAR(30);
BEGIN
    v_guia := CONCAT('GUIA-EMERG-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-', FLOOR(RANDOM() * 900 + 100));

    -- 1. Actualizar estado de la solicitud
    UPDATE SolicitudHospitalaria
    SET estadoSolicitud = 'Despachada',
        prioridadSolicitud = 'Código Rojo'
    WHERE idSolicitud = p_idSolicitud;

    -- 2. Emitir la guía de despacho
    INSERT INTO ComprobanteDespacho (
        idSolicitud,
        codigoGuiaDespacho,
        fechaHoraSalida,
        receptorEntrega,
        temperaturaDespacho,
        estadoEntrega
    ) VALUES (
        p_idSolicitud,
        v_guia,
        CURRENT_TIMESTAMP,
        p_funcionarioHospitalReceptor,
        p_temperaturaTransporte,
        'En Transito Urgente'
    ) RETURNING idDespacho INTO v_idDespacho;

    -- 3. Asignar la bolsa y cambiarla a 'Despachada'
    INSERT INTO DetalleDespacho (
        idDespacho,
        idEjemplarBolsa
    ) VALUES (
        v_idDespacho,
        p_idEjemplarBolsa
    );

    UPDATE EjemplarBolsa
    SET estadoBolsaK = 'Despachada'
    WHERE idEjemplarBolsa = p_idEjemplarBolsa;

    -- 4. Registro retrospectivo de compatibilidad (CU18)
    INSERT INTO PruebaCompatibilidad (
        idSolicitud,
        idEjemplarBolsa,
        idPersonalSalud,
        fechaHoraPrueba,
        resultadoCompatibilidad,
        faseAntiglobulina,
        reaccionObservada,
        aprobadoParaDespacho
    ) VALUES (
        p_idSolicitud,
        p_idEjemplarBolsa,
        p_idPersonalSalud,
        CURRENT_TIMESTAMP,
        'Compatible',
        'Liberacion Emergencia',
        'Despacho inmediato de sangre universal bajo protocolo Código Rojo con cruce retrospectivo.',
        TRUE
    );
END;
$$;


-- ============================================================================
-- PROCEDIMIENTO 5: [CU20] Registrar Compromiso de Reposición y Amortizar Deuda (1 a 1)
-- ============================================================================
-- Propósito: Vincula a un familiar donante a la reposición pendiente de un paciente,
-- descuenta 1 unidad del saldo biológico y liquida a 'Completada' si llega a cero.
CREATE OR REPLACE PROCEDURE sp_amortizar_reposicion_familiar(
    p_idReposicion INT,
    p_idPersonaFirmante INT,
    p_idDonante INT,
    p_volumenDonado NUMERIC DEFAULT 450
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Registrar el compromiso concretado
    INSERT INTO CompromisoDonacion (
        idReposicion,
        idPersonaFirmante,
        idDonante,
        fechaCompromiso,
        donacionConcretada,
        volumenDonadoEfectivoMl,
        estadoCompromiso
    ) VALUES (
        p_idReposicion,
        p_idPersonaFirmante,
        p_idDonante,
        CURRENT_DATE,
        TRUE,
        p_volumenDonado,
        'Cumplido'
    );

    -- El trigger 'trg_amortizar_reposicion_familiar' incrementa automáticamente
    -- cantidadRecuperada en 1 y cambia el estado de ReposicionPendiente a 'Liquidada' si salda la deuda.
END;
$$;

-- PARTE 4: INSERCIÓN DE DATOS SEMILLA DE PRUEBA
-- ============================================================================
-- BANCO DE SANGRE "HEMOVIDA" - POBLADO COMPLETO DE DATOS (DATA SEEDING)
-- Datos listos para ejecutar y alimentar las 25+ consultas de presentación
-- Cubre los 20 Casos de Uso y reglas de negocio relacionales
-- ============================================================================

-- Limpieza preventiva en cascada para recarga limpia
TRUNCATE TABLE 
    BitacoraAuditoria,
    DetalleDespacho,
    ComprobanteDespacho,
    ComprobantePago,
    CompromisoDonacion,
    ReposicionPendiente,
    PruebaCompatibilidad,
    SolicitudHospitalaria,
    CitaLaboratorio,
    BajaInventario,
    EjemplarBolsa,
    AnalisisInmunoSerologico,
    PruebaInmunohematologica,
    UnidadSangreTotal,
    IncentivoEntrega,
    ExtraccionDonacion,
    Diferimiento,
    TriajeClinico,
    DetalleCitaRequisito,
    CitaDonacion,
    ParametroStockMinimo,
    UbicacionAlmacen,
    RequisitoDonacion,
    InstitucionSalud,
    Donante,
    Receptor,
    PosibleDonador,
    PersonalSalud,
    Usuario,
    Rol,
    Persona,
    GrupoSanguineo
RESTART IDENTITY CASCADE;

-- ============================================================================
-- 1. TABLA MAESTRA: GrupoSanguineo (8 combinaciones biológicas)
-- ============================================================================
INSERT INTO GrupoSanguineo (idGrupo, grupoABO, factorRh) VALUES
(1, 'O', 'Positivo'),
(2, 'O', 'Negativo'),
(3, 'A', 'Positivo'),
(4, 'A', 'Negativo'),
(5, 'B', 'Positivo'),
(6, 'B', 'Negativo'),
(7, 'AB', 'Positivo'),
(8, 'AB', 'Negativo');

-- ============================================================================
-- 2. TABLA MAESTRA: Rol (RBAC Institucional)
-- ============================================================================
INSERT INTO Rol (idRol, nombreRol, descripcion) VALUES
(1, 'Administrador del Sistema', 'Control total, configuración de parámetros y auditoría forense'),
(2, 'Secretaría y Admisión', 'Ventanilla, registro de postulantes, carnet digital y cobro de aranceles'),
(3, 'Médico Evaluador de Triaje', 'Anamnesis clínica, signos vitales y emisión de diferimientos médicos'),
(4, 'Bioquímico Serólogo', 'Tamizaje de 6 marcadores infecciosos automatizado'),
(5, 'Bioquímico Inmunohematólogo', 'Tipificación globular/sérica, Coombs y pruebas cruzadas'),
(6, 'Técnico de Fraccionamiento y Almacén', 'Centrifugación mecánica precoz y custodia de cámaras frías');

-- ============================================================================
-- 3. TABLA MAESTRA: Persona (Donantes, Pacientes, Personal y Tutores)
-- ============================================================================
INSERT INTO Persona (idPersona, ci, nombres, apellidos, sexo, fechaNacimiento, direccion, celular, ocupacion) VALUES
-- Personal Institucional (1 al 7)
(1, '4729103 SC', 'Patricia', 'Arteaga Vaca', 'F', '1988-06-12', 'Barrio Las Palmas, C. 3 #120', '76044912', 'Lic. en Enfermería'),
(2, '3948201 SC', 'Carlos', 'Mendoza Cuéllar', 'M', '1984-03-22', 'Av. Busch, Calle 8 #45', '77088120', 'Bioquímico Farmacéutico'),
(3, '5012391 SC', 'Cristhian', 'Gandarillas Paz', 'M', '1990-11-15', 'Av. San Martín, Cond. El Bosque', '70911223', 'Bioquímico Serólogo'),
(4, '3108920 SC', 'Trinidad', 'Álvarez Pinto', 'F', '1979-08-30', 'Calle Warnes #280', '72166778', 'Médico Hemoterapeuta'),
(5, '4421902 SC', 'Silvia', 'Guerrero Roca', 'F', '1992-01-25', 'Av. Cristo Redentor #550', '78190234', 'Lic. en Bioquímica'),
(6, '2940182 SC', 'Fernando', 'Aguilera Justiniano', 'M', '1975-09-18', 'Urb. Sirari, Calle Los Claveles #12', '76399120', 'Médico Cirujano'),
(7, '5819201 SC', 'Ernesto', 'Zabala Melgar', 'M', '1987-04-05', 'Barrio Equipetrol Norte #304', '71655441', 'Ingeniero de Sistemas'),

-- Donantes Voluntarios y de Reposición (8 al 15)
(8, '7894561 SC', 'Carlos Andrés', 'Pimentel Guarena', 'M', '1995-04-18', 'Barrio Sirari, Calle Los Claveles #145', '76044912', 'Ingeniero de Sistemas'),
(9, '8934120 SC', 'Sofía Elena', 'Mendoza Vaca', 'F', '1998-09-12', 'Av. Las Américas, Edif. Panorama #4B', '78190234', 'Bioquímica'),
(10, '6512399 SC', 'Rodrigo', 'Justiniano Paz', 'M', '1990-11-04', 'Av. Cristo Redentor, Calle 5 #88', '70911223', 'Arquitecto'),
(11, '5421980 SC', 'Claudia', 'Vaca Hurtado', 'F', '1993-07-21', 'Barrio Hamacas, Calle 4 #19', '75033441', 'Contadora Pública'),
(12, '9120394 SC', 'Mateo', 'Banegas Justiniano', 'M', '2001-02-14', 'Plan 3000, Barrio Guapilo #44', '71399440', 'Estudiante Universitario'),
(13, '4019283 SC', 'Jorge', 'Salvatierra Méndez', 'M', '1986-10-09', 'Villa 1ro de Mayo, Calle 3 #10', '76322119', 'Comerciante'),
(14, '6928172 SC', 'Luciana', 'Mercado Suárez', 'F', '1997-03-16', 'Av. Santos Dumont, Calle 9 #202', '70822340', 'Docente'),
(15, '8192031 SC', 'Gustavo Adolfo', 'Ribera Céspedes', 'M', '1994-12-01', 'Barrio Urbarí, Calle Los Pinos #5', '77291029', 'Abogado'),

-- Receptores / Pacientes Hospitalizados (16 al 20)
(16, '4521992 SC', 'Juan Carlos', 'Roca Méndez', 'M', '1968-05-10', 'Av. Centenario #400', '76399120', 'Jubilado'),
(17, '3829102 SC', 'Martha', 'Suárez Vaca', 'F', '1972-08-25', 'Calle Ballivián #310', '70822340', 'Ama de Casa'),
(18, '6721094 SC', 'Elena', 'Rivero Justiniano', 'F', '1991-01-14', 'Av. Grigotá #88', '71655441', 'Comerciante'),
(19, '10934120 SC', 'Mateo', 'Justiniano Morales', 'M', '2016-11-03', 'Av. Japón #100', '77088120', 'Menor de Edad'),
(20, '2910293 SC', 'Mariana', 'Camacho Terrazas', 'F', '1983-09-07', 'Calle Murillo #62', '78912300', 'Administradora'),

-- Tutores Legales / Familiares que suscriben o retiran (21 al 23)
(21, '6821940 SC', 'María Angélica', 'Roca Hurtado', 'F', '1996-03-29', 'Av. Centenario #400', '76399120', 'Hija Garante'),
(22, '3310492 SC', 'Roberto', 'Suárez Mercado', 'M', '1970-12-11', 'Calle Ballivián #310', '70822340', 'Hermano Garante'),
(23, '5190283 SC', 'Gladys', 'Pardo Antelo', 'F', '1985-06-18', 'Av. Cañoto #220', '71655441', 'Enfermera de Transporte');

-- ============================================================================
-- 4. SUBTIPOS DE PERSONA: PersonalSalud, Donante, Receptor, PosibleDonador
-- ============================================================================
INSERT INTO PersonalSalud (idPersona, cargo, registroProfesional) VALUES
(1, 'Encargada de Recepción y Registro', 'REC-2026-4729'),
(2, 'Responsable de Despacho Transfusional', 'DESP-2026-3948'),
(3, 'Bioquímico Serólogo Principal', 'SER-2026-5012'),
(4, 'Médico Hemoterapeuta de Triaje', 'MED-2026-3108'),
(5, 'Bioquímica de Flebotomía', 'FLE-2026-4421'),
(6, 'Cirujano de Trauma Quirúrgico', 'CIR-2026-2940'),
(7, 'Administrador de Servidores e Infraestructura', 'SIS-2026-5819');

INSERT INTO Donante (idPersona, carnetDigitalCodigo, tipoDonante, estadoHabilitacion, fechaUltimaDonacion) VALUES
(8, 'HV-DON-2024-0491', 'Voluntario Altruista', 'Apto', '2026-05-10'),
(9, 'HV-DON-2025-1102', 'Reposicion Familiar', 'Diferido Temporal', '2026-08-01'),
(10, 'HV-DON-2023-0189', 'Voluntario Altruista', 'Apto', '2026-04-12'),
(11, 'HV-DON-2026-5421', 'Reposicion Familiar', 'Apto', '2026-09-19'),
(12, 'HV-DON-2026-9120', 'Voluntario Altruista', 'Apto', NULL),
(13, 'HV-DON-2026-4019', 'Reposicion Familiar', 'Apto', '2026-01-10'),
(14, 'HV-DON-2026-6928', 'Voluntario Altruista', 'Apto', NULL),
(15, 'HV-DON-2026-8192', 'Voluntario Altruista', 'Apto', '2026-02-20');

INSERT INTO Receptor (idPersona, codigoHistorialClinico, grupoSanguineoReceptor) VALUES
(16, 'HC-HJ-452199', 'O Positivo'),
(17, 'HC-HSJD-382910', 'A Negativo'),
(18, 'HC-HPB-672109', 'O Positivo'),
(19, 'HC-HNMO-109341', 'B Positivo'),
(20, 'HC-FOI-291029', 'AB Positivo');

INSERT INTO PosibleDonador (idPersona, fechaRegistroPostulante) VALUES
(8, '2024-01-10'),
(9, '2025-05-15'),
(10, '2023-08-20'),
(11, '2026-09-18'),
(12, '2026-09-22'),
(13, '2026-01-05'),
(14, '2026-09-24'),
(15, '2026-02-15');

-- ============================================================================
-- 5. TABLA: Usuario (Seguridad, Roles y Política de Contraseña Segura)
-- ============================================================================
-- Todas las contraseñas cumplen: >=8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
INSERT INTO Usuario (idUsuario, idPersona, idRol, username, email, passwordHash, estado, fechaCreacion) VALUES
(1, 7, 1, 'admin.ezabala', 'admin@hemovida.org', 'HemoVida#2026!', 'Activo', '2026-01-01 08:00:00'),
(2, 1, 2, 'recepcion.patricia', 'recepcion@hemovida.org', 'Patricia@Pass123', 'Activo', '2026-01-01 08:00:00'),
(3, 2, 6, 'despacho.carlos', 'despacho@hemovida.org', 'Carlos*Mendoza2026', 'Activo', '2026-01-01 08:00:00'),
(4, 3, 4, 'serologia.cristhian', 'cristhian.serologia@hemovida.org', 'Cristhian$Vero88', 'Activo', '2026-01-01 08:00:00'),
(5, 4, 3, 'triaje.trinidad', 'trinidad.triaje@hemovida.org', 'Doctora!Triaje99', 'Activo', '2026-01-01 08:00:00'),
(6, 5, 5, 'inmuno.silvia', 'silvia.inmuno@hemovida.org', 'Silvia#Lab2026', 'Activo', '2026-01-01 08:00:00'),
(7, 8, 2, 'carlos.pimentel', 'carlos.pimentel@hemovida.org', 'Pimentel$Dev12', 'Activo', '2026-02-01 09:30:00');

-- ============================================================================
-- 6. TABLAS: InstitucionSalud y UbicacionAlmacen (Cámaras Frías)
-- ============================================================================
INSERT INTO InstitucionSalud (idInstitucion, nombreInstitucion, tipoInstitucion, direccion, telefonoContacto) VALUES
(1, 'Hospital Japonés (Sede Tercer Nivel)', 'Público Tercer Nivel', '3er Anillo Externo y Av. Japón', '3462031'),
(2, 'Hospital San Juan de Dios', 'Público Tercer Nivel', 'Calle Cuéllar N° 400 esq. España', '3340011'),
(3, 'Hospital de Niños Mario Ortiz', 'Pediátrico Especializado', 'Calle La Paz #120', '3332211'),
(4, 'Hospital de la Mujer Percy Boland', 'Maternidad Tercer Nivel', 'Calle Rafael Peña #80', '3345511'),
(5, 'Clínica Foianini', 'Privado Alta Complejidad', 'Calle Izozog N° 465', '3362211');

INSERT INTO UbicacionAlmacen (idUbicacion, identificadorCompartimento, tipoEquipo, temperaturaRegistro, capacidadMaxima, capacidadOcupada) VALUES
(1, 'CAM-01-A', 'Cámara Refrigerada de Glóbulos Rojos (4°C)', 4.1, 100, 45),
(2, 'CAM-02-B', 'Cámara Refrigerada de Hemocomponentes B (4°C)', 3.8, 80, 32),
(3, 'FREEZER-01', 'Ultra-Freezer de Plasma Fresco Congelado (-30°C)', -31.5, 120, 60),
(4, 'AGITADOR-01', 'Agitador Plaquetario Continuo (22°C)', 22.0, 30, 8),
(5, 'CRITICA-01', 'Cámara de Reserva Crítica O- / A- (4°C)', 3.9, 40, 12);

-- ============================================================================
-- 7. TABLAS: ParametroStockMinimo y RequisitoDonacion
-- ============================================================================
INSERT INTO ParametroStockMinimo (idParametro, idGrupo, tipoComponente, stockMinimoSeguridad, stockCriticoAlerta) VALUES
(1, 1, 'Concentrado de Globulos Rojos', 20, 8),
(2, 2, 'Concentrado de Globulos Rojos', 15, 6), -- O Negativo Crítico
(3, 3, 'Concentrado de Globulos Rojos', 12, 5),
(4, 4, 'Concentrado de Globulos Rojos', 10, 4), -- A Negativo Crítico
(5, 5, 'Concentrado de Globulos Rojos', 10, 4),
(6, 7, 'Plasma Fresco Congelado', 15, 5),        -- AB Positivo Plasma Universal
(7, 1, 'Concentrado Plaquetario', 8, 3);

INSERT INTO RequisitoDonacion (idRequisito, nombreRequisito, tipoRequisito, esExcluyenteDefinitivo) VALUES
(1, 'Mayoría de edad (18 a 65 años) con C.I. vigente', 'Legal', TRUE),
(2, 'Peso corporal mayor a 50 kilogramos', 'Biométrico', FALSE),
(3, 'Descanso de 6 meses post-tatuaje o perforación', 'Inmunológico', FALSE),
(4, 'Ausencia de síntomas gripales o consumo de antibióticos', 'Clínico', FALSE),
(5, 'Ayuno de grasas / excelente hidratación previa', 'Fisiológico', FALSE),
(6, 'Prueba de tamizaje infeccioso no reactivo', 'Serológico', TRUE);

-- ============================================================================
-- 8. TABLAS: CitaDonacion y DetalleCitaRequisito (Prefiltro Web)
-- ============================================================================
INSERT INTO CitaDonacion (idCita, idDonante, fechaHoraProgramada, prefiltroAprobado, asistenciaConfirmada, estadoCita) VALUES
(101, 8, '2026-09-28 08:30:00', TRUE, TRUE, 'Programada'),
(102, 10, '2026-09-28 09:30:00', TRUE, FALSE, 'Programada'),
(103, 11, '2026-09-25 10:00:00', TRUE, TRUE, 'Atendida'),
(104, 12, '2026-09-26 11:30:00', FALSE, FALSE, 'Inasistencia'),
(105, 14, '2026-09-29 08:00:00', TRUE, FALSE, 'Programada');

INSERT INTO DetalleCitaRequisito (idDetalleCita, idCita, idRequisito, cumpleRequisito, observacionRespuesta) VALUES
(1, 101, 1, TRUE, 'C.I. 7894561 SC vigente'),
(2, 101, 2, TRUE, 'Peso reportado: 74 kg'),
(3, 101, 3, TRUE, 'Sin tatuajes en los últimos 2 años'),
(4, 104, 3, FALSE, 'Tatuaje realizado hace 2 meses (en período de ventana)'),
(5, 104, 4, FALSE, 'Presenta dolor de garganta y amoxicilina');

-- ============================================================================
-- 9. TABLAS: TriajeClinico y Diferimiento (Evaluación Médica)
-- ============================================================================
INSERT INTO TriajeClinico (idTriaje, idPosibleDonador, idPersonalSalud, fechaHora, pesoKg, presionSistolicaMmHg, presionDiastolicaMmHg, nivelHemoglobina, temperatura, resultadoAptitud) VALUES
(1, 8, 4, '2026-05-10 08:45:00', 74.5, 120, 80, 15.2, 36.6, 'Apto'),
(2, 9, 4, '2026-08-01 10:30:00', 58.0, 110, 70, 11.8, 36.8, 'Rechazado'),
(3, 10, 4, '2026-04-12 09:15:00', 82.0, 125, 82, 16.0, 36.5, 'Apto'),
(4, 11, 4, '2026-09-19 09:40:00', 63.0, 118, 76, 13.9, 36.7, 'Apto'),
(5, 13, 4, '2026-01-10 11:00:00', 70.0, 150, 95, 14.5, 38.2, 'Rechazado');

INSERT INTO Diferimiento (idDiferimiento, idTriaje, idPosibleDonador, motivoDetallado, diasInhabilitacion, fechaInicioDiferimiento, fechaFinDiferimiento) VALUES
(1, 2, 9, 'Anemia leve transitoria (Hemoglobina 11.8 g/dL menor al mínimo de 12.5 g/dL)', 30, '2026-08-01', '2026-08-31'),
(2, 5, 13, 'Cuadro febril activo (38.2 °C) e hipertensión reactiva', 15, '2026-01-10', '2026-01-25');

-- ============================================================================
-- 10. TABLAS: ExtraccionDonacion, IncentivoEntrega y UnidadSangreTotal
-- ============================================================================
INSERT INTO ExtraccionDonacion (idExtraccion, idDonante, idPersonalSalud, codigoExtraccion, fechaHora, volumenExtraidoMl, brazoExtraccion) VALUES
(1001, 8, 5, 'EXT-2026-0920', '2026-09-20 08:30:00', 450, 'Izquierdo'),
(1002, 11, 5, 'EXT-2026-0919', '2026-09-19 10:15:00', 450, 'Derecho'),
(1003, 10, 5, 'EXT-2026-0915', '2026-09-15 09:00:00', 450, 'Derecho'),
(1004, 15, 5, 'EXT-2026-0818', '2026-08-18 11:20:00', 450, 'Izquierdo');

-- Incentivos entregados POST-EXTRACCIÓN (Vaso o Llavero para Voluntarios, Refrigerio para todos)
INSERT INTO IncentivoEntrega (idIncentivo, idExtraccion, tipoArticulo, refrigerioEntregado, fechaHoraEntrega) VALUES
(1, 1001, 'Vaso Conmemorativo HemoVida', TRUE, '2026-09-20 09:10:00'),
(2, 1002, 'Refrigerio Nutricional (Reposición)', TRUE, '2026-09-19 10:55:00'),
(3, 1003, 'Llavero Oficial Gota HemoVida', TRUE, '2026-09-15 09:40:00'),
(4, 1004, 'Vaso Conmemorativo HemoVida', TRUE, '2026-08-18 12:00:00');

INSERT INTO UnidadSangreTotal (idUnidadMadre, idExtraccion, idGrupo, codigoBolsaMadre, tipoBolsa, estadoLiberacion) VALUES
(501, 1001, 1, 'MAD-2026-0920-O+', 'Bolsa Cuadruple CPD-SAGM', 'Liberada Apta'),
(502, 1002, 3, 'MAD-2026-0919-A+', 'Bolsa Cuadruple CPD-SAGM', 'Liberada Apta'),
(503, 1003, 5, 'MAD-2026-0915-B+', 'Bolsa Cuadruple CPD-SAGM', 'Liberada Apta'),
(504, 1004, 2, 'MAD-2026-0818-O-', 'Bolsa Cuadruple CPD-SAGM', 'Rechazada'); -- Bolsa que dio reactiva en serología

-- ============================================================================
-- 11. TABLAS: AnalisisInmunoSerologico y PruebaInmunohematologica (Paralelo)
-- ============================================================================
INSERT INTO AnalisisInmunoSerologico (idAnalisis, idUnidadMadre, idPersonalSalud, codigoAnalisis, fechaAnalisis, resultadoVIH, resultadoChagas, resultadoHepatitisB, resultadoHepatitisC, resultadoSifilis, resultadoHTLV, dictamenFinal, habilitaExtraccion) VALUES
(1, 501, 3, 'SER-2026-901', '2026-09-20 13:00:00', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'Apto', TRUE),
(2, 502, 3, 'SER-2026-902', '2026-09-19 14:15:00', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'Apto', TRUE),
(3, 503, 3, 'SER-2026-903', '2026-09-15 13:30:00', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'Apto', TRUE),
(4, 504, 3, 'SER-2026-880', '2026-08-18 15:00:00', 'No Reactivo', 'Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Reactivo', 'No Apto', FALSE); -- Reactivo a Chagas

INSERT INTO PruebaInmunohematologica (idPruebaInmuno, idUnidadMadre, idPersona, idGrupo, idPersonalSalud, fechaHoraPrueba, faseSalina, faseTermica, coombsDirecto, rastreoAnticuerposIrregulares, dictamenInmunohematologico) VALUES
(1, 501, 8, 1, 6, '2026-09-20 12:30:00', 'Positivo 4+', 'Positivo 4+', 'Negativo', 'Negativo', 'Grupo O Positivo Confirmado'),
(2, 502, 11, 3, 6, '2026-09-19 13:45:00', 'Positivo 4+', 'Positivo 4+', 'Negativo', 'Negativo', 'Grupo A Positivo Confirmado'),
(3, 503, 10, 5, 6, '2026-09-15 12:50:00', 'Positivo 4+', 'Positivo 4+', 'Negativo', 'Negativo', 'Grupo B Positivo Confirmado'),
(4, NULL, 16, 1, 6, '2026-09-19 11:00:00', 'Positivo 4+', 'Positivo 4+', 'Negativo', 'Negativo', 'Receptor O+ Tipificado para Transfusión');

-- ============================================================================
-- 12. TABLAS: EjemplarBolsa (Fraccionamiento) y BajaInventario
-- ============================================================================
INSERT INTO EjemplarBolsa (idEjemplarBolsa, idUnidadMadre, idGrupo, idUbicacion, codigoEjemplarK, tipoComponente, volumenMl, fechaExtraccion, fechaCaducidad, estadoBolsaK) VALUES
-- Derivados de Bolsa Madre 501 (O+)
(1, 501, 1, 1, 'MAD-2026-0920-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-09-20', '2026-10-25', 'Disponible'),
(2, 501, 1, 3, 'MAD-2026-0920-K2-PL', 'Plasma Fresco Congelado', 150, '2026-09-20', '2027-09-20', 'Disponible'),
(3, 501, 1, 4, 'MAD-2026-0920-K3-PQ', 'Concentrado Plaquetario', 50, '2026-09-20', '2026-09-25', 'Disponible'),

-- Derivados de Bolsa Madre 502 (A+)
(4, 502, 3, 1, 'MAD-2026-0919-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-09-19', '2026-10-24', 'Disponible'),
(5, 502, 3, 3, 'MAD-2026-0919-K2-PL', 'Plasma Fresco Congelado', 150, '2026-09-19', '2027-09-19', 'Disponible'),

-- Unidades de Reserva Crítica O Negativo
(6, NULL, 2, 5, 'MAD-2026-0918-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-09-18', '2026-10-23', 'Disponible'),
(7, NULL, 2, 5, 'MAD-2026-0917-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-09-17', '2026-10-22', 'Disponible'),

-- Unidad por Caducar (dentro de <= 7 días para consulta 19)
(8, NULL, 1, 1, 'MAD-2026-0820-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-08-20', CURRENT_DATE + INTERVAL '3 days', 'Disponible'),

-- Unidad derivada de bolsa reactiva 504 (dada de baja por serología)
(9, 504, 2, 1, 'MAD-2026-0818-K1-GR', 'Concentrado de Globulos Rojos', 250, '2026-08-18', '2026-09-22', 'Baja');

INSERT INTO BajaInventario (idBaja, idUnidadMadre, idEjemplarBolsa, idPersonalSalud, fechaHoraBaja, motivoBaja, observaciones) VALUES
(1, 504, 9, 3, '2026-08-18 16:30:00', 'Reactividad Serológica', 'Descarte inmediato por reactividad a Trypanosoma cruzi (Chagas)');

-- ============================================================================
-- 13. TABLAS: CitaLaboratorio, SolicitudHospitalaria y PruebaCompatibilidad
-- ============================================================================
INSERT INTO CitaLaboratorio (idCitaLab, idReceptor, idInstitucion, fechaHoraCita, fechaCirugiaProgramada, tipoAnalisisRequerido, muestraRecolectada, estadoCita) VALUES
(1, 16, 1, '2026-09-22 08:00:00', '2026-09-25', 'Tipificación y Pruebas Cruzadas Electivas', TRUE, 'Programada'),
(2, 20, 5, '2026-09-24 09:30:00', '2026-09-27', 'Compatibilidad Plasma y Glóbulos', FALSE, 'Programada');

INSERT INTO SolicitudHospitalaria (idSolicitud, idInstitucion, idReceptor, numeroSolicitud, fechaHoraRequerimiento, prioridadSolicitud, motivoTransfusion, velocidadGoteo, horarioRequerido, cantidadBolsasSolicitadas, cantidadEntregadaReceptor, cantidadRetiradaStock, estadoSolicitud) VALUES
(1, 1, 16, 'SOL-HJ-2026-891', '2026-09-19 14:00:00', 'Urgente', 'Shock hipovolémico por politraumatismo severo', '40 gotas/min', 'Inmediato', 2, 2, 2, 'Despachada'),
(2, 2, 17, 'SOL-HSJD-2026-443', '2026-09-18 10:30:00', 'Programada', 'Coagulopatía de consumo y anemia aguda', '30 gotas/min', '14:00', 2, 2, 2, 'Despachada'),
(3, 3, 19, 'SOL-HNMO-2026-102', '2026-09-16 15:20:00', 'Código Rojo', 'Trombocitopenia secundaria a quimioterapia pediátrica', 'Bomba 50 ml/h', 'Extrema Urgencia', 1, 1, 1, 'Despachada'),
(4, 4, 18, 'SOL-HPB-2026-701', '2026-09-21 07:45:00', 'Código Rojo', 'Hemorragia postparto masiva (Atonía uterina)', 'Flujo Libre', 'Inmediato', 3, 0, 0, 'En Proceso');

INSERT INTO PruebaCompatibilidad (idPruebaCompatibilidad, idSolicitud, idEjemplarBolsa, idPersonalSalud, fechaHoraPrueba, resultadoCompatibilidad, faseAntiglobulina, reaccionObservada, aprobadoParaDespacho) VALUES
(1, 1, 1, 6, '2026-09-19 14:10:00', 'Compatible', 'Negativa (Sin aglutinación)', 'Compatibilidad total in vitro', TRUE),
(2, 2, 4, 6, '2026-09-18 11:00:00', 'Compatible', 'Negativa (Coombs conforme)', 'Compatibilidad sin anticuerpos atípicos', TRUE),
(3, 4, 6, 6, '2026-09-21 07:55:00', 'Compatible', 'Prueba Rápida Salina', 'Despacho Código Rojo O Negativo de Extrema Urgencia', TRUE);

-- ============================================================================
-- 14. TABLAS: ComprobanteDespacho, DetalleDespacho y ComprobantePago (Aranceles)
-- ============================================================================
INSERT INTO ComprobanteDespacho (idDespacho, idSolicitud, codigoGuiaDespacho, fechaHoraSalida, receptorEntrega, temperaturaDespacho, estadoEntrega) VALUES
(1, 1, 'GUIA-2026-0812', '2026-09-19 14:30:00', 'María Angélica Roca Hurtado (Hija)', 4.2, 'Entregado en Destino'),
(2, 2, 'GUIA-2026-0808', '2026-09-18 11:15:00', 'Roberto Suárez Mercado (Hermano)', 4.0, 'Entregado en Destino'),
(3, 3, 'GUIA-2026-0795', '2026-09-16 16:00:00', 'Lic. Gladys Pardo (Enfermera de Transporte)', 4.5, 'Entregado en Destino');

INSERT INTO DetalleDespacho (idDetalleDespacho, idDespacho, idEjemplarBolsa) VALUES
(1, 1, 1),
(2, 2, 4),
(3, 3, 3);

-- Aranceles por servicios de procesamiento, tamizaje y cadena de frío (Ley N° 1687)
INSERT INTO ComprobantePago (idComprobante, idSolicitud, numeroReciboFactura, conceptoServicio, montoTotal, estadoPago, metodoPago, fechaHoraPago) VALUES
(1, 1, 'REC-2026-1180', 'Arancel de procesamiento, tamizaje viral automatizado y pruebas cruzadas', 360.00, 'Pagado', 'QR / Transferencia', '2026-09-19 14:25:00'),
(2, 2, 'SUS-EX-2026-0941', 'Exoneración de aranceles bajo cobertura Ley 475 / SUS Bolivia', 330.00, 'Exonerado SUS', 'SUS / Gratuito Ley 475', '2026-09-18 11:10:00'),
(3, 3, 'SUS-PED-2026-102', 'Cobertura Gratuita Transfusional Oncológica Pediátrica', 200.00, 'Exonerado SUS', 'SUS / Gratuito Ley 475', '2026-09-16 15:50:00'),
(4, 4, 'REC-2026-1195', 'Arancel de recuperación de insumos y prueba de compatibilidad Código Rojo', 540.00, 'Pendiente', 'Pendiente de Regularización', NULL);

-- ============================================================================
-- 15. TABLAS: ReposicionPendiente y CompromisoDonacion (Deuda Biológica 1 a 1)
-- ============================================================================
INSERT INTO ReposicionPendiente (idReposicion, idSolicitud, cantidadBolsasAReponer, cantidadRecuperada, fechaLimiteReposicion, estadoReposicion) VALUES
(1, 1, 2, 1, '2026-09-26', 'Parcial'),     -- Recibió 2, repuso 1 (Claudia Vaca)
(2, 2, 2, 2, '2026-09-25', 'Liquidada'),   -- Recibió 2, repuso 2 (Sofía Mendoza y Roberto Suárez)
(3, 4, 3, 0, '2026-09-28', 'Pendiente');   -- Recibió 3, pendiente 3

INSERT INTO CompromisoDonacion (idCompromiso, idReposicion, idPersonaFirmante, idDonante, fechaCompromiso, donacionConcretada, volumenDonadoEfectivoMl, estadoCompromiso) VALUES
-- Paciente 16 (Juan Carlos Roca) tutelado por su hija María Angélica Roca
(1, 1, 21, 11, '2026-09-19', TRUE, 450, 'Cumplido'),

-- Paciente 17 (Martha Suárez) tutelado por su hermano Roberto Suárez
(2, 2, 22, 9, '2026-08-01', TRUE, 450, 'Cumplido'),
(3, 2, 22, 8, '2026-08-02', TRUE, 450, 'Cumplido');

-- ============================================================================
-- 16. TABLA: BitacoraAuditoria (Registro Forense y Turnos Nocturnos)
-- ============================================================================
INSERT INTO BitacoraAuditoria (idAuditoria, idUsuario, accionRealizada, tablaAfectada, idRegistroAfectado, fechaHora, ipOrigen) VALUES
(1, 1, 'Inicio de sesión exitoso administrador', 'Usuario', 1, '2026-09-20 07:05:00', '192.168.1.10'),
(2, 2, 'Admisión y verificación de viabilidad donante C.I. 7894561 SC', 'Donante', 8, '2026-09-20 08:15:00', '192.168.1.20'),
(3, 5, 'Registro de flebotomía conforme 450 ml brazo izquierdo', 'ExtraccionDonacion', 1001, '2026-09-20 08:35:00', '192.168.1.22'),
(4, 4, 'Registro de dictamen serológico Apto para bolsa MAD-2026-0920-O+', 'AnalisisInmunoSerologico', 1, '2026-09-20 13:05:00', '192.168.1.25'),
(5, 3, 'Liberación biológica y traspaso a Disponible de bolsas K1, K2 y K3', 'EjemplarBolsa', 1, '2026-09-20 13:10:00', '192.168.1.30'),
(6, 4, 'Emisión de baja sanitaria por reactividad infecciosa Chagas', 'BajaInventario', 1, '2026-08-18 16:35:00', '192.168.1.25'),
-- Registro fuera de turno central (21:45 horas para alimentar la Consulta 8 / Subconsulta B2)
(7, 4, 'Auditoría nocturna de validación de reactivos de quimioluminiscencia', 'AnalisisInmunoSerologico', 4, '2026-09-20 21:45:00', '192.168.1.25');

-- ============================================================================
-- VERIFICACIÓN INMEDIATA DE INTEGRIDAD DE DATOS POBLADOS
-- ============================================================================
SELECT 'Personas Registradas' AS entidad, COUNT(*) AS total FROM Persona
UNION ALL
SELECT 'Donantes Habilitados', COUNT(*) FROM Donante
UNION ALL
SELECT 'Bolsas en Inventario', COUNT(*) FROM EjemplarBolsa
UNION ALL
SELECT 'Solicitudes Hospitalarias', COUNT(*) FROM SolicitudHospitalaria
UNION ALL
SELECT 'Trazas de Auditoría Forense', COUNT(*) FROM BitacoraAuditoria;
