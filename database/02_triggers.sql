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
-- y se migra su rol en el sistema (preservando el historial de PosibleDonador).
CREATE OR REPLACE FUNCTION fn_trg_ascenso_donante_serologia()
RETURNS TRIGGER AS $$
DECLARE
    v_idPersona INT;
    v_idUsuario INT;
    v_idRolPosible INT;
    v_idRolDonante INT;
    v_carnet VARCHAR(30);
BEGIN
    -- 1. Obtener la persona donante a partir de la extracción vinculada a la bolsa
    SELECT ed.idPersonaDonante INTO v_idPersona
    FROM UnidadSangreTotal ust
    JOIN ExtraccionDonacion ed ON ust.idExtraccion = ed.idExtraccion
    WHERE ust.idUnidadMadre = NEW.idUnidadMadre;

    SELECT idRol INTO v_idRolPosible FROM Rol WHERE codigoRol = 'POSIBLE_DONADOR';
    SELECT idRol INTO v_idRolDonante FROM Rol WHERE codigoRol = 'DONANTE';
    SELECT idUsuario INTO v_idUsuario FROM Usuario WHERE idPersona = v_idPersona;

    -- 2. Registrar que la persona ya cuenta con análisis de laboratorio
    UPDATE PosibleDonador 
    SET tieneAnalisis = TRUE 
    WHERE idPersona = v_idPersona;

    -- 3. Veredicto Serológico Apto: Habilitación y cambio de roles
    IF NEW.dictamenFinal = 'Apto' THEN
        -- Actualizar estado médico a Apto
        UPDATE PosibleDonador 
        SET estadoAptitud = 'Apto' 
        WHERE idPersona = v_idPersona;

        -- Generar carnet digital en Donante
        v_carnet := CONCAT('HEMO-', TO_CHAR(CURRENT_DATE, 'YYYY'), '-', v_idPersona);
        
        IF NOT EXISTS (SELECT 1 FROM Donante WHERE idPersona = v_idPersona) THEN
            INSERT INTO Donante (idPersona, carnetDigitalCodigo, tipoDonante, estadoHabilitacion, fechaUltimaDonacion)
            VALUES (v_idPersona, v_carnet, 'Voluntario Altruista', 'Apto', CURRENT_DATE);
        ELSE
            UPDATE Donante 
            SET estadoHabilitacion = 'Apto', fechaUltimaDonacion = CURRENT_DATE
            WHERE idPersona = v_idPersona;
        END IF;

        -- Transición de credenciales de acceso:
        -- Se retira el rol POSIBLE_DONADOR y se otorga el rol DONANTE
        IF v_idUsuario IS NOT NULL THEN
            DELETE FROM UsuarioRol WHERE idUsuario = v_idUsuario AND idRol = v_idRolPosible;
            
            INSERT INTO UsuarioRol (idUsuario, idRol)
            VALUES (v_idUsuario, v_idRolDonante)
            ON CONFLICT DO NOTHING;
        END IF;

    -- 4. Veredicto Serológico No Apto (Reactivo)
    ELSIF NEW.dictamenFinal = 'No Apto' THEN
        UPDATE PosibleDonador 
        SET estadoAptitud = 'No Apto' 
        WHERE idPersona = v_idPersona;

        IF EXISTS (SELECT 1 FROM Donante WHERE idPersona = v_idPersona) THEN
            UPDATE Donante 
            SET estadoHabilitacion = 'Diferido Definitivo' 
            WHERE idPersona = v_idPersona;
        END IF;
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