-- ============================================================================
-- BANCO DE SANGRE "HEMOVIDA" - DDL COMPLETO ACTUALIZADO (PostgreSQL 14+)
-- ============================================================================

DROP TABLE IF EXISTS BitacoraAuditoria CASCADE;
DROP TABLE IF EXISTS DetalleDespacho CASCADE;
DROP TABLE IF EXISTS ComprobanteDespacho CASCADE;
DROP TABLE IF EXISTS ComprobantePago CASCADE;
DROP TABLE IF EXISTS CompromisoDonacion CASCADE;
DROP TABLE IF EXISTS ReposicionPendiente CASCADE;
DROP TABLE IF EXISTS PruebaCompatibilidad CASCADE;
DROP TABLE IF EXISTS SolicitudHospitalaria CASCADE;
DROP TABLE IF EXISTS CitaLaboratorio CASCADE;
DROP TABLE IF EXISTS BajaInventario CASCADE;
DROP TABLE IF EXISTS EjemplarBolsa CASCADE;
DROP TABLE IF EXISTS AnalisisInmunoSerologico CASCADE;
DROP TABLE IF EXISTS PruebaInmunohematologica CASCADE;
DROP TABLE IF EXISTS UnidadSangreTotal CASCADE;
DROP TABLE IF EXISTS IncentivoEntrega CASCADE;
DROP TABLE IF EXISTS ExtraccionDonacion CASCADE;
DROP TABLE IF EXISTS Diferimiento CASCADE;
DROP TABLE IF EXISTS TriajeClinico CASCADE;
DROP TABLE IF EXISTS DetalleCitaRequisito CASCADE;
DROP TABLE IF EXISTS CitaDonacion CASCADE;
DROP TABLE IF EXISTS ParametroStockMinimo CASCADE;
DROP TABLE IF EXISTS UbicacionAlmacen CASCADE;
DROP TABLE IF EXISTS RequisitoDonacion CASCADE;
DROP TABLE IF EXISTS InstitucionSalud CASCADE;
DROP TABLE IF EXISTS Donante CASCADE;
DROP TABLE IF EXISTS Receptor CASCADE;
DROP TABLE IF EXISTS PosibleDonador CASCADE;
DROP TABLE IF EXISTS PersonalSalud CASCADE;
DROP TABLE IF EXISTS UsuarioRol CASCADE;
DROP TABLE IF EXISTS Usuario CASCADE;
DROP TABLE IF EXISTS Rol CASCADE;
DROP TABLE IF EXISTS Persona CASCADE;
DROP TABLE IF EXISTS GrupoSanguineo CASCADE;

-- Catálogo Grupo Sanguíneo
CREATE TABLE GrupoSanguineo (
    idGrupo SERIAL PRIMARY KEY,
    grupoABO VARCHAR(5) NOT NULL CHECK (grupoABO IN ('O', 'A', 'B', 'AB')),
    factorRh VARCHAR(10) NOT NULL CHECK (factorRh IN ('Positivo', 'Negativo')),
    CONSTRAINT uq_grupo_rh UNIQUE (grupoABO, factorRh)
);

-- Catálogo de Roles Oficiales
CREATE TABLE Rol (
    idRol SERIAL PRIMARY KEY,
    nombreRol VARCHAR(60) NOT NULL UNIQUE,
    codigoRol VARCHAR(30) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO Rol (nombreRol, codigoRol, descripcion) VALUES
('Administrador', 'ADMIN', 'Gestión integral y administración de usuarios del sistema'),
('Posible Donador', 'POSIBLE_DONADOR', 'Postulante en fase de cuestionario y evaluación médica preliminar'),
('Donante', 'DONANTE', 'Donante calificado y validado con historial de extracciones'),
('Receptor / Tutor Familiar', 'RECEPTOR', 'Paciente o tutor legal solicitante de hemocomponentes'),
('Doctor(a) de Triaje', 'DOC_TRIAJE', 'Evaluación clínica previa y diferimiento de postulantes'),
('Personal de Colecta', 'PERS_COLECTA', 'Flebotomistas y extracción de sangre'),
('Bioquímico(a) Integral', 'BIOQ_INTEGRAL', 'Ensayos serológicos, inmunohematología y liberación biológica'),
('Técnico(a) de Logística', 'TEC_LOGISTICA', 'Almacén, cadena de frío y despacho de hemocomponentes'),
('Médico(a) Solicitante / Clínica', 'MED_SOLICITANTE', 'Prescripción y solicitud hospitalaria externa/interna');

-- Entidad Base Persona (incluye nacionalidad)
CREATE TABLE Persona (
    idPersona SERIAL PRIMARY KEY,
    ci VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F', 'O')),
    fechaNacimiento DATE NOT NULL,
    direccion VARCHAR(150),
    celular VARCHAR(20),
    ocupacion VARCHAR(80),
    nacionalidad VARCHAR(50) DEFAULT 'Boliviana'
);

-- Cuentas de Acceso (Sin idRol directo: 1 login por persona)
CREATE TABLE Usuario (
    idUsuario SERIAL PRIMARY KEY,
    idPersona INT NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Bloqueado')),
    fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

-- Tabla Intermedia para RBAC Múltiple
CREATE TABLE UsuarioRol (
    idUsuario INT NOT NULL,
    idRol INT NOT NULL,
    fechaAsignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_usuariorol PRIMARY KEY (idUsuario, idRol),
    CONSTRAINT fk_usuariorol_usuario FOREIGN KEY (idUsuario)
        REFERENCES Usuario (idUsuario) ON DELETE CASCADE,
    CONSTRAINT fk_usuariorol_rol FOREIGN KEY (idRol)
        REFERENCES Rol (idRol) ON DELETE CASCADE
);

-- Bitácora con soporte para Rol Activo de sesión
CREATE TABLE BitacoraAuditoria (
    idAuditoria SERIAL PRIMARY KEY,
    idUsuario INT,
    rolActivo VARCHAR(60),
    accionRealizada VARCHAR(255) NOT NULL,
    tablaAfectada VARCHAR(60) NOT NULL,
    idRegistroAfectado INT,
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ipOrigen VARCHAR(45),
    CONSTRAINT fk_bitacora_usuario FOREIGN KEY (idUsuario)
        REFERENCES Usuario (idUsuario) ON DELETE SET NULL
);

-- Personal de Salud (Vinculado a Persona)
CREATE TABLE PersonalSalud (
    idPersona INT PRIMARY KEY,
    cargo VARCHAR(80) NOT NULL,
    registroProfesional VARCHAR(40) NOT NULL UNIQUE,
    CONSTRAINT fk_personalsalud_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

-- Posible Donador (Nace No Apto y Sin Análisis)
CREATE TABLE PosibleDonador (
    idPersona INT PRIMARY KEY,
    estadoAptitud VARCHAR(30) NOT NULL DEFAULT 'No Apto' CHECK (estadoAptitud IN ('No Apto', 'En Evaluacion', 'Apto')),
    tieneAnalisis BOOLEAN NOT NULL DEFAULT FALSE,
    fechaRegistroPostulante DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT fk_posibledonador_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

-- Donante Calificado (Solo quienes superan la Inmunoserología)
CREATE TABLE Donante (
    idPersona INT PRIMARY KEY,
    carnetDigitalCodigo VARCHAR(30) NOT NULL UNIQUE,
    tipoDonante VARCHAR(30) NOT NULL CHECK (tipoDonante IN ('Voluntario Altruista', 'Reposicion Familiar', 'Autologo')),
    estadoHabilitacion VARCHAR(30) NOT NULL DEFAULT 'Apto' CHECK (estadoHabilitacion IN ('Apto', 'Diferido Temporal', 'Diferido Definitivo')),
    fechaUltimaDonacion DATE,
    CONSTRAINT fk_donante_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

-- Receptores
CREATE TABLE Receptor (
    idPersona INT PRIMARY KEY,
    codigoHistorialClinico VARCHAR(40) NOT NULL UNIQUE,
    grupoSanguineoReceptor VARCHAR(20) NOT NULL,
    CONSTRAINT fk_receptor_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

-- Resto de tablas operativas
CREATE TABLE RequisitoDonacion (
    idRequisito SERIAL PRIMARY KEY,
    nombreRequisito VARCHAR(120) NOT NULL,
    tipoRequisito VARCHAR(40) NOT NULL,
    esExcluyenteDefinitivo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE CitaDonacion (
    idCita SERIAL PRIMARY KEY,
    idPersona INT NOT NULL,
    fechaHoraProgramada TIMESTAMP NOT NULL,
    prefiltroAprobado BOOLEAN NOT NULL DEFAULT FALSE,
    asistenciaConfirmada BOOLEAN NOT NULL DEFAULT FALSE,
    estadoCita VARCHAR(25) NOT NULL DEFAULT 'Programada' CHECK (estadoCita IN ('Programada', 'Atendida', 'Cancelada', 'Inasistencia')),
    CONSTRAINT fk_cita_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona) ON DELETE CASCADE
);

CREATE TABLE DetalleCitaRequisito (
    idDetalleCita SERIAL PRIMARY KEY,
    idCita INT NOT NULL,
    idRequisito INT NOT NULL,
    cumpleRequisito BOOLEAN NOT NULL,
    observacionRespuesta VARCHAR(200),
    CONSTRAINT fk_detalle_cita FOREIGN KEY (idCita)
        REFERENCES CitaDonacion (idCita) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_requisito FOREIGN KEY (idRequisito)
        REFERENCES RequisitoDonacion (idRequisito)
);

CREATE TABLE TriajeClinico (
    idTriaje SERIAL PRIMARY KEY,
    idPosibleDonador INT NOT NULL,
    idPersonalSalud INT NOT NULL,
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pesoKg NUMERIC(5,2) NOT NULL,
    presionSistolicaMmHg INT NOT NULL,
    presionDiastolicaMmHg INT NOT NULL,
    nivelHemoglobina NUMERIC(4,1) NOT NULL,
    temperatura NUMERIC(4,1) NOT NULL,
    resultadoAptitud VARCHAR(20) NOT NULL CHECK (resultadoAptitud IN ('Apto', 'Rechazado')),
    CONSTRAINT fk_triaje_posible FOREIGN KEY (idPosibleDonador)
        REFERENCES PosibleDonador (idPersona),
    CONSTRAINT fk_triaje_medico FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE Diferimiento (
    idDiferimiento SERIAL PRIMARY KEY,
    idTriaje INT UNIQUE,
    idPosibleDonador INT NOT NULL,
    motivoDetallado VARCHAR(255) NOT NULL,
    diasInhabilitacion INT NOT NULL DEFAULT 0,
    fechaInicioDiferimiento DATE NOT NULL,
    fechaFinDiferimiento DATE,
    CONSTRAINT fk_diferimiento_triaje FOREIGN KEY (idTriaje)
        REFERENCES TriajeClinico (idTriaje) ON DELETE SET NULL,
    CONSTRAINT fk_diferimiento_posible FOREIGN KEY (idPosibleDonador)
        REFERENCES PosibleDonador (idPersona)
);

CREATE TABLE ExtraccionDonacion (
    idExtraccion SERIAL PRIMARY KEY,
    idPersonaDonante INT NOT NULL,
    idPersonalSalud INT NOT NULL,
    codigoExtraccion VARCHAR(30) NOT NULL UNIQUE,
    fechaHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    volumenExtraidoMl INT NOT NULL CHECK (volumenExtraidoMl > 0),
    brazoExtraccion VARCHAR(15) NOT NULL CHECK (brazoExtraccion IN ('Izquierdo', 'Derecho')),
    CONSTRAINT fk_extraccion_persona FOREIGN KEY (idPersonaDonante)
        REFERENCES Persona (idPersona),
    CONSTRAINT fk_extraccion_enfermero FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE IncentivoEntrega (
    idIncentivo SERIAL PRIMARY KEY,
    idExtraccion INT NOT NULL UNIQUE,
    tipoArticulo VARCHAR(80) NOT NULL,
    refrigerioEntregado BOOLEAN NOT NULL DEFAULT TRUE,
    fechaHoraEntrega TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incentivo_extraccion FOREIGN KEY (idExtraccion)
        REFERENCES ExtraccionDonacion (idExtraccion) ON DELETE CASCADE
);

CREATE TABLE UnidadSangreTotal (
    idUnidadMadre SERIAL PRIMARY KEY,
    idExtraccion INT NOT NULL UNIQUE,
    idGrupo INT NOT NULL,
    codigoBolsaMadre VARCHAR(40) NOT NULL UNIQUE,
    tipoBolsa VARCHAR(40) NOT NULL,
    estadoLiberacion VARCHAR(30) NOT NULL DEFAULT 'En Cuarentena' CHECK (estadoLiberacion IN ('En Cuarentena', 'Liberada Apta', 'Rechazada')),
    CONSTRAINT fk_madre_extraccion FOREIGN KEY (idExtraccion)
        REFERENCES ExtraccionDonacion (idExtraccion) ON DELETE CASCADE,
    CONSTRAINT fk_madre_grupo FOREIGN KEY (idGrupo)
        REFERENCES GrupoSanguineo (idGrupo)
);

CREATE TABLE AnalisisInmunoSerologico (
    idAnalisis SERIAL PRIMARY KEY,
    idUnidadMadre INT NOT NULL UNIQUE,
    idPersonalSalud INT NOT NULL,
    codigoAnalisis VARCHAR(30) NOT NULL UNIQUE,
    fechaAnalisis TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultadoVIH VARCHAR(20) NOT NULL CHECK (resultadoVIH IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoChagas VARCHAR(20) NOT NULL CHECK (resultadoChagas IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHepatitisB VARCHAR(20) NOT NULL CHECK (resultadoHepatitisB IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHepatitisC VARCHAR(20) NOT NULL CHECK (resultadoHepatitisC IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoSifilis VARCHAR(20) NOT NULL CHECK (resultadoSifilis IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    resultadoHTLV VARCHAR(20) NOT NULL CHECK (resultadoHTLV IN ('No Reactivo', 'Reactivo', 'Indeterminado')),
    dictamenFinal VARCHAR(20) NOT NULL CHECK (dictamenFinal IN ('Apto', 'No Apto')),
    habilitaExtraccion BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_serologia_madre FOREIGN KEY (idUnidadMadre)
        REFERENCES UnidadSangreTotal (idUnidadMadre) ON DELETE CASCADE,
    CONSTRAINT fk_serologia_bioquimico FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE PruebaInmunohematologica (
    idPruebaInmuno SERIAL PRIMARY KEY,
    idUnidadMadre INT,
    idPersona INT NOT NULL,
    idGrupo INT NOT NULL,
    idPersonalSalud INT NOT NULL,
    fechaHoraPrueba TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    faseSalina VARCHAR(30),
    faseTermica VARCHAR(30),
    coombsDirecto VARCHAR(30),
    rastreoAnticuerposIrregulares VARCHAR(30),
    dictamenInmunohematologico VARCHAR(100) NOT NULL,
    CONSTRAINT fk_inmuno_madre FOREIGN KEY (idUnidadMadre)
        REFERENCES UnidadSangreTotal (idUnidadMadre) ON DELETE SET NULL,
    CONSTRAINT fk_inmuno_persona FOREIGN KEY (idPersona)
        REFERENCES Persona (idPersona),
    CONSTRAINT fk_inmuno_grupo FOREIGN KEY (idGrupo)
        REFERENCES GrupoSanguineo (idGrupo),
    CONSTRAINT fk_inmuno_bioquimico FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE UbicacionAlmacen (
    idUbicacion SERIAL PRIMARY KEY,
    identificadorCompartimento VARCHAR(30) NOT NULL UNIQUE,
    tipoEquipo VARCHAR(80) NOT NULL,
    temperaturaRegistro NUMERIC(4,1) NOT NULL,
    capacidadMaxima INT NOT NULL,
    capacidadOcupada INT NOT NULL DEFAULT 0
);

CREATE TABLE ParametroStockMinimo (
    idParametro SERIAL PRIMARY KEY,
    idGrupo INT NOT NULL,
    tipoComponente VARCHAR(50) NOT NULL,
    stockMinimoSeguridad INT NOT NULL,
    stockCriticoAlerta INT NOT NULL,
    CONSTRAINT fk_parametro_grupo FOREIGN KEY (idGrupo)
        REFERENCES GrupoSanguineo (idGrupo),
    CONSTRAINT uq_parametro_grupo_componente UNIQUE (idGrupo, tipoComponente)
);

CREATE TABLE EjemplarBolsa (
    idEjemplarBolsa SERIAL PRIMARY KEY,
    idUnidadMadre INT,
    idGrupo INT NOT NULL,
    idUbicacion INT,
    codigoEjemplarK VARCHAR(40) NOT NULL UNIQUE,
    tipoComponente VARCHAR(50) NOT NULL CHECK (tipoComponente IN (
        'Concentrado de Globulos Rojos', 'Plasma Fresco Congelado',
        'Concentrado Plaquetario', 'Crioprecipitado', 'Sangre Total'
    )),
    volumenMl INT NOT NULL,
    fechaExtraccion DATE NOT NULL,
    fechaCaducidad DATE NOT NULL,
    estadoBolsaK VARCHAR(25) NOT NULL DEFAULT 'En Cuarentena' CHECK (estadoBolsaK IN (
        'Disponible', 'En Cuarentena', 'Reservada', 'Despachada', 'Baja'
    )),
    CONSTRAINT fk_ejemplar_madre FOREIGN KEY (idUnidadMadre)
        REFERENCES UnidadSangreTotal (idUnidadMadre) ON DELETE SET NULL,
    CONSTRAINT fk_ejemplar_grupo FOREIGN KEY (idGrupo)
        REFERENCES GrupoSanguineo (idGrupo),
    CONSTRAINT fk_ejemplar_ubicacion FOREIGN KEY (idUbicacion)
        REFERENCES UbicacionAlmacen (idUbicacion)
);

CREATE TABLE BajaInventario (
    idBaja SERIAL PRIMARY KEY,
    idUnidadMadre INT,
    idEjemplarBolsa INT,
    idPersonalSalud INT NOT NULL,
    fechaHoraBaja TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivoBaja VARCHAR(100) NOT NULL,
    observaciones TEXT,
    CONSTRAINT fk_baja_madre FOREIGN KEY (idUnidadMadre)
        REFERENCES UnidadSangreTotal (idUnidadMadre) ON DELETE SET NULL,
    CONSTRAINT fk_baja_ejemplar FOREIGN KEY (idEjemplarBolsa)
        REFERENCES EjemplarBolsa (idEjemplarBolsa) ON DELETE SET NULL,
    CONSTRAINT fk_baja_responsable FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE InstitucionSalud (
    idInstitucion SERIAL PRIMARY KEY,
    nombreInstitucion VARCHAR(100) NOT NULL UNIQUE,
    tipoInstitucion VARCHAR(50) NOT NULL,
    direccion VARCHAR(150),
    telefonoContacto VARCHAR(25)
);

CREATE TABLE CitaLaboratorio (
    idCitaLab SERIAL PRIMARY KEY,
    idReceptor INT NOT NULL,
    idInstitucion INT,
    fechaHoraCita TIMESTAMP NOT NULL,
    fechaCirugiaProgramada DATE NOT NULL,
    tipoAnalisisRequerido VARCHAR(100) NOT NULL,
    muestraRecolectada BOOLEAN NOT NULL DEFAULT FALSE,
    estadoCita VARCHAR(25) NOT NULL DEFAULT 'Programada' CHECK (estadoCita IN ('Programada', 'Completada', 'Cancelada')),
    CONSTRAINT fk_citalab_receptor FOREIGN KEY (idReceptor)
        REFERENCES Receptor (idPersona),
    CONSTRAINT fk_citalab_institucion FOREIGN KEY (idInstitucion)
        REFERENCES InstitucionSalud (idInstitucion)
);

CREATE TABLE SolicitudHospitalaria (
    idSolicitud SERIAL PRIMARY KEY,
    idInstitucion INT NOT NULL,
    idReceptor INT NOT NULL,
    numeroSolicitud VARCHAR(35) NOT NULL UNIQUE,
    fechaHoraRequerimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prioridadSolicitud VARCHAR(25) NOT NULL CHECK (prioridadSolicitud IN ('Programada', 'Urgente', 'Código Rojo')),
    motivoTransfusion VARCHAR(150),
    velocidadGoteo VARCHAR(50),
    horarioRequerido VARCHAR(50),
    cantidadBolsasSolicitadas INT NOT NULL CHECK (cantidadBolsasSolicitadas > 0),
    cantidadEntregadaReceptor INT NOT NULL DEFAULT 0,
    cantidadRetiradaStock INT NOT NULL DEFAULT 0,
    estadoSolicitud VARCHAR(25) NOT NULL DEFAULT 'Registrada' CHECK (estadoSolicitud IN (
        'Registrada', 'En Evaluacion', 'En Proceso', 'Despachada', 'Anulada'
    )),
    CONSTRAINT fk_solicitud_institucion FOREIGN KEY (idInstitucion)
        REFERENCES InstitucionSalud (idInstitucion),
    CONSTRAINT fk_solicitud_receptor FOREIGN KEY (idReceptor)
        REFERENCES Receptor (idPersona)
);

CREATE TABLE PruebaCompatibilidad (
    idPruebaCompatibilidad SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL,
    idEjemplarBolsa INT NOT NULL,
    idPersonalSalud INT NOT NULL,
    fechaHoraPrueba TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultadoCompatibilidad VARCHAR(25) NOT NULL CHECK (resultadoCompatibilidad IN ('Compatible', 'Incompatible', 'Dudoso')),
    faseAntiglobulina VARCHAR(50),
    reaccionObservada VARCHAR(150),
    aprobadoParaDespacho BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_cruce_solicitud FOREIGN KEY (idSolicitud)
        REFERENCES SolicitudHospitalaria (idSolicitud),
    CONSTRAINT fk_cruce_ejemplar FOREIGN KEY (idEjemplarBolsa)
        REFERENCES EjemplarBolsa (idEjemplarBolsa),
    CONSTRAINT fk_cruce_personal FOREIGN KEY (idPersonalSalud)
        REFERENCES PersonalSalud (idPersona)
);

CREATE TABLE ComprobanteDespacho (
    idDespacho SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL,
    codigoGuiaDespacho VARCHAR(35) NOT NULL UNIQUE,
    fechaHoraSalida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receptorEntrega VARCHAR(100) NOT NULL,
    temperaturaDespacho NUMERIC(4,1) NOT NULL,
    estadoEntrega VARCHAR(30) NOT NULL DEFAULT 'En Transito' CHECK (estadoEntrega IN ('En Transito', 'En Transito Urgente', 'Entregado en Destino')),
    CONSTRAINT fk_despacho_solicitud FOREIGN KEY (idSolicitud)
        REFERENCES SolicitudHospitalaria (idSolicitud)
);

CREATE TABLE DetalleDespacho (
    idDetalleDespacho SERIAL PRIMARY KEY,
    idDespacho INT NOT NULL,
    idEjemplarBolsa INT NOT NULL,
    CONSTRAINT fk_detalledespacho_despacho FOREIGN KEY (idDespacho)
        REFERENCES ComprobanteDespacho (idDespacho) ON DELETE CASCADE,
    CONSTRAINT fk_detalledespacho_ejemplar FOREIGN KEY (idEjemplarBolsa)
        REFERENCES EjemplarBolsa (idEjemplarBolsa)
);

CREATE TABLE ComprobantePago (
    idComprobante SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL UNIQUE,
    numeroReciboFactura VARCHAR(35) NOT NULL UNIQUE,
    conceptoServicio VARCHAR(150) NOT NULL,
    montoTotal NUMERIC(10,2) NOT NULL,
    estadoPago VARCHAR(30) NOT NULL CHECK (estadoPago IN ('Pagado', 'Exonerado SUS', 'Convenio Institucional', 'Pendiente')),
    metodoPago VARCHAR(50) NOT NULL,
    fechaHoraPago TIMESTAMP,
    CONSTRAINT fk_pago_solicitud FOREIGN KEY (idSolicitud)
        REFERENCES SolicitudHospitalaria (idSolicitud)
);

CREATE TABLE ReposicionPendiente (
    idReposicion SERIAL PRIMARY KEY,
    idSolicitud INT NOT NULL UNIQUE,
    cantidadBolsasAReponer INT NOT NULL CHECK (cantidadBolsasAReponer >= 0),
    cantidadRecuperada INT NOT NULL DEFAULT 0 CHECK (cantidadRecuperada >= 0),
    fechaLimiteReposicion DATE NOT NULL,
    estadoReposicion VARCHAR(25) NOT NULL DEFAULT 'Pendiente' CHECK (estadoReposicion IN ('Pendiente', 'Parcial', 'Liquidada', 'Incumplida')),
    CONSTRAINT fk_reposicion_solicitud FOREIGN KEY (idSolicitud)
        REFERENCES SolicitudHospitalaria (idSolicitud)
);

CREATE TABLE CompromisoDonacion (
    idCompromiso SERIAL PRIMARY KEY,
    idReposicion INT NOT NULL,
    idPersonaFirmante INT NOT NULL,
    idDonante INT,
    fechaCompromiso DATE NOT NULL DEFAULT CURRENT_DATE,
    donacionConcretada BOOLEAN NOT NULL DEFAULT FALSE,
    volumenDonadoEfectivoMl INT DEFAULT 0,
    estadoCompromiso VARCHAR(25) NOT NULL DEFAULT 'Vigente' CHECK (estadoCompromiso IN ('Vigente', 'Cumplido', 'Anulado')),
    CONSTRAINT fk_compromiso_reposicion FOREIGN KEY (idReposicion)
        REFERENCES ReposicionPendiente (idReposicion) ON DELETE CASCADE,
    CONSTRAINT fk_compromiso_firmante FOREIGN KEY (idPersonaFirmante)
        REFERENCES Persona (idPersona),
    CONSTRAINT fk_compromiso_donante FOREIGN KEY (idDonante)
        REFERENCES Donante (idPersona) ON DELETE SET NULL
);

-- Índices estratégicos
CREATE INDEX idx_usuario_persona ON Usuario(idPersona);
CREATE INDEX idx_usuariorol_usuario ON UsuarioRol(idUsuario);
CREATE INDEX idx_usuariorol_rol ON UsuarioRol(idRol);
CREATE INDEX idx_bitacora_usuario ON BitacoraAuditoria(idUsuario);
CREATE INDEX idx_bitacora_fechahora ON BitacoraAuditoria(fechaHora);
CREATE INDEX idx_extraccion_persona ON ExtraccionDonacion(idPersonaDonante);
CREATE INDEX idx_unidad_extraccion ON UnidadSangreTotal(idExtraccion);
CREATE INDEX idx_ejemplar_madre ON EjemplarBolsa(idUnidadMadre);
CREATE INDEX idx_ejemplar_estado ON EjemplarBolsa(estadoBolsaK);
CREATE INDEX idx_solicitud_estado ON SolicitudHospitalaria(estadoSolicitud);
-- ============================================================================
-- BANCO DE SANGRE "HEMOVIDA" - TRIGGERS DE NEGOCIO (PostgreSQL 14+)
-- ============================================================================

-- A. Exclusión Mutua entre Posible Donador y Donante
-- Impide que una misma cuenta tenga asignados ambos roles al mismo tiempo
CREATE OR REPLACE FUNCTION fn_trg_validar_exclusion_roles()
RETURNS TRIGGER AS $$
DECLARE
    v_codRolInsertado VARCHAR(30);
    v_tieneOpuesto BOOLEAN := FALSE;
BEGIN
    SELECT codigoRol INTO v_codRolInsertado FROM Rol WHERE idRol = NEW.idRol;
    
    IF v_codRolInsertado = 'POSIBLE_DONADOR' THEN
        SELECT EXISTS (
            SELECT 1 FROM UsuarioRol ur
            JOIN Rol r ON ur.idRol = r.idRol
            WHERE ur.idUsuario = NEW.idUsuario AND r.codigoRol = 'DONANTE'
        ) INTO v_tieneOpuesto;
        
        IF v_tieneOpuesto THEN
            RAISE EXCEPTION 'Inconsistencia de Negocio: Un usuario no puede ser Posible Donador y Donante simultáneamente.';
        END IF;
    ELSIF v_codRolInsertado = 'DONANTE' THEN
        SELECT EXISTS (
            SELECT 1 FROM UsuarioRol ur
            JOIN Rol r ON ur.idRol = r.idRol
            WHERE ur.idUsuario = NEW.idUsuario AND r.codigoRol = 'POSIBLE_DONADOR'
        ) INTO v_tieneOpuesto;
        
        IF v_tieneOpuesto THEN
            RAISE EXCEPTION 'Inconsistencia de Negocio: Un usuario no puede ser Donante y Posible Donador al mismo tiempo.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_exclusion_roles ON UsuarioRol;
CREATE TRIGGER trg_validar_exclusion_roles
BEFORE INSERT OR UPDATE ON UsuarioRol
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_exclusion_roles();


-- B. Ascenso a Donante Condicionado al Análisis Inmunoserológico
-- Cuando el bioquímico registra el dictamen Apto en AnalisisInmunoSerologico,
-- se actualiza la aptitud del postulante, se crea su carnet digital en Donante,
-- se le remueve de PosibleDonador y se migra su rol en el sistema.
CREATE OR REPLACE FUNCTION fn_trg_ascenso_donante_serologia()
RETURNS TRIGGER AS $$
DECLARE
    v_idPersona INT;
    v_idUsuario INT;
    v_idRolPosible INT;
    v_idRolDonante INT;
    v_carnet VARCHAR(30);
BEGIN
    -- Obtener la persona a partir de la extracción vinculada a la bolsa madre
    SELECT ed.idPersonaDonante INTO v_idPersona
    FROM UnidadSangreTotal ust
    JOIN ExtraccionDonacion ed ON ust.idExtraccion = ed.idExtraccion
    WHERE ust.idUnidadMadre = NEW.idUnidadMadre;

    SELECT idRol INTO v_idRolPosible FROM Rol WHERE codigoRol = 'POSIBLE_DONADOR';
    SELECT idRol INTO v_idRolDonante FROM Rol WHERE codigoRol = 'DONANTE';
    SELECT idUsuario INTO v_idUsuario FROM Usuario WHERE idPersona = v_idPersona;

    -- Marcar que la persona ya cuenta con análisis serológico
    UPDATE PosibleDonador
    SET tieneAnalisis = TRUE
    WHERE idPersona = v_idPersona;

    IF NEW.dictamenFinal = 'Apto' THEN
        -- 1. Actualizar estado en PosibleDonador
        UPDATE PosibleDonador
        SET estadoAptitud = 'Apto'
        WHERE idPersona = v_idPersona;

        -- 2. Insertar en Donante si aún no existe
        v_carnet := CONCAT('HEMO-', TO_CHAR(CURRENT_DATE, 'YYYY'), '-', v_idPersona);
        IF NOT EXISTS (SELECT 1 FROM Donante WHERE idPersona = v_idPersona) THEN
            INSERT INTO Donante (idPersona, carnetDigitalCodigo, tipoDonante, estadoHabilitacion, fechaUltimaDonacion)
            VALUES (v_idPersona, v_carnet, 'Voluntario Altruista', 'Apto', CURRENT_DATE);
        ELSE
            UPDATE Donante
            SET estadoHabilitacion = 'Apto', fechaUltimaDonacion = CURRENT_DATE
            WHERE idPersona = v_idPersona;
        END IF;

        -- 3. Transición de Roles: Remover Posible Donador y Asignar Donante
        IF v_idUsuario IS NOT NULL THEN
            DELETE FROM UsuarioRol WHERE idUsuario = v_idUsuario AND idRol = v_idRolPosible;
            INSERT INTO UsuarioRol (idUsuario, idRol)
            VALUES (v_idUsuario, v_idRolDonante)
            ON CONFLICT DO NOTHING;
        END IF;

        -- 4. Retirar de PosibleDonador
        DELETE FROM PosibleDonador WHERE idPersona = v_idPersona;

    ELSIF NEW.dictamenFinal = 'No Apto' THEN
        UPDATE PosibleDonador
        SET estadoAptitud = 'No Apto'
        WHERE idPersona = v_idPersona;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ascenso_donante_serologia ON AnalisisInmunoSerologico;
CREATE TRIGGER trg_ascenso_donante_serologia
AFTER INSERT OR UPDATE OF dictamenFinal ON AnalisisInmunoSerologico
FOR EACH ROW
EXECUTE FUNCTION fn_trg_ascenso_donante_serologia();


-- C. Barrera de liberación y descarte automático de bolsas en laboratorio
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
-- ============================================================================
-- BANCO DE SANGRE "HEMOVIDA" - PROCEDIMIENTOS ALMACENADOS (PostgreSQL 14+)
-- ============================================================================

-- Procedimiento 1: Auto-Registro Público de Posible Donador (Sin Admin)
-- Crea la persona física, su cuenta de acceso, su registro inicial con estado No Apto,
-- tieneAnalisis = FALSE, y le asigna el rol Posible Donador.
CREATE OR REPLACE PROCEDURE sp_autoregistro_posible_donador(
    p_ci VARCHAR,
    p_nombres VARCHAR,
    p_apellidos VARCHAR,
    p_sexo CHAR,
    p_fechaNacimiento DATE,
    p_direccion VARCHAR,
    p_celular VARCHAR,
    p_ocupacion VARCHAR,
    p_username VARCHAR,
    p_email VARCHAR,
    p_passwordTextoPlano VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_idPersona INT;
    v_idUsuario INT;
    v_idRolPosible INT;
BEGIN
    -- Validación de contraseña segura
    IF p_passwordTextoPlano !~ '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?`~]).{8,}$' THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial.';
    END IF;

    -- 1. Crear Persona
    INSERT INTO Persona (ci, nombres, apellidos, sexo, fechaNacimiento, direccion, celular, ocupacion, nacionalidad)
    VALUES (p_ci, p_nombres, p_apellidos, p_sexo, p_fechaNacimiento, p_direccion, p_celular, p_ocupacion, 'Boliviana')
    RETURNING idPersona INTO v_idPersona;

    -- 2. Crear Cuenta de Usuario
    INSERT INTO Usuario (idPersona, username, email, passwordHash, estado)
    VALUES (v_idPersona, p_username, p_email, p_passwordTextoPlano, 'Activo')
    RETURNING idUsuario INTO v_idUsuario;

    -- 3. Crear Registro de Posible Donador (No Apto y sin análisis por defecto)
    INSERT INTO PosibleDonador (idPersona, estadoAptitud, tieneAnalisis, fechaRegistroPostulante)
    VALUES (v_idPersona, 'No Apto', FALSE, CURRENT_DATE);

    -- 4. Asignar Rol Posible Donador
    SELECT idRol INTO v_idRolPosible FROM Rol WHERE codigoRol = 'POSIBLE_DONADOR';
    INSERT INTO UsuarioRol (idUsuario, idRol) VALUES (v_idUsuario, v_idRolPosible);

    -- 5. Bitácora
    INSERT INTO BitacoraAuditoria (idUsuario, rolActivo, accionRealizada, tablaAfectada, idRegistroAfectado, ipOrigen)
    VALUES (v_idUsuario, 'Posible Donador', 'Auto-registro de postulante web', 'Usuario', v_idUsuario, '0.0.0.0');
END;
$$;


-- Procedimiento 2: Alta de Personal de Salud (Solo Ejecutable por Administrador)
-- Valida que quien ejecuta tenga el rol Administrador antes de crear el usuario y vincularlo a PersonalSalud.
CREATE OR REPLACE PROCEDURE sp_crear_usuario_personal_salud(
    p_idUsuarioAdmin INT,
    p_ci VARCHAR,
    p_nombres VARCHAR,
    p_apellidos VARCHAR,
    p_sexo CHAR,
    p_fechaNacimiento DATE,
    p_celular VARCHAR,
    p_cargo VARCHAR,
    p_registroProfesional VARCHAR,
    p_username VARCHAR,
    p_email VARCHAR,
    p_passwordTextoPlano VARCHAR,
    p_codigoRolAsignar VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_esAdmin BOOLEAN := FALSE;
    v_idPersona INT;
    v_idUsuarioNuevo INT;
    v_idRol INT;
BEGIN
    -- 1. Validar privilegios del solicitante
    SELECT EXISTS (
        SELECT 1 FROM UsuarioRol ur
        JOIN Rol r ON ur.idRol = r.idRol
        WHERE ur.idUsuario = p_idUsuarioAdmin AND r.codigoRol = 'ADMIN'
    ) INTO v_esAdmin;

    IF NOT v_esAdmin THEN
        RAISE EXCEPTION 'Acceso Denegado: Solo un usuario con rol Administrador puede crear personal de salud.';
    END IF;

    -- 2. Validar que el rol a asignar sea operativo/sanitario válido
    SELECT idRol INTO v_idRol FROM Rol WHERE codigoRol = p_codigoRolAsignar;
    IF v_idRol IS NULL OR p_codigoRolAsignar IN ('POSIBLE_DONADOR', 'DONANTE') THEN
        RAISE EXCEPTION 'El rol especificado (%) no es un rol de personal operativo/salud válido.', p_codigoRolAsignar;
    END IF;

    -- 3. Crear Persona
    INSERT INTO Persona (ci, nombres, apellidos, sexo, fechaNacimiento, celular, ocupacion, nacionalidad)
    VALUES (p_ci, p_nombres, p_apellidos, p_sexo, p_fechaNacimiento, p_celular, p_cargo, 'Boliviana')
    RETURNING idPersona INTO v_idPersona;

    -- 4. Registrar en PersonalSalud
    INSERT INTO PersonalSalud (idPersona, cargo, registroProfesional)
    VALUES (v_idPersona, p_cargo, p_registroProfesional);

    -- 5. Crear Usuario
    INSERT INTO Usuario (idPersona, username, email, passwordHash, estado)
    VALUES (v_idPersona, p_username, p_email, p_passwordTextoPlano, 'Activo')
    RETURNING idUsuario INTO v_idUsuarioNuevo;

    -- 6. Asignar Rol Sanitario
    INSERT INTO UsuarioRol (idUsuario, idRol) VALUES (v_idUsuarioNuevo, v_idRol);

    -- 7. Registrar Auditoría
    INSERT INTO BitacoraAuditoria (idUsuario, rolActivo, accionRealizada, tablaAfectada, idRegistroAfectado, ipOrigen)
    VALUES (p_idUsuarioAdmin, 'Administrador', CONCAT('Alta de personal de salud: ', p_username, ' con rol ', p_codigoRolAsignar), 'Usuario', v_idUsuarioNuevo, '127.0.0.1');
END;
$$;
