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