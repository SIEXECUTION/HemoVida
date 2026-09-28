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