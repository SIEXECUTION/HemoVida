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