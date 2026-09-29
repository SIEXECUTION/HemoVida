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
-- 17. SINCRONIZACIÓN DE SECUENCIAS SERIAL (Evita errores de clave primaria duplicada)
-- ============================================================================
SELECT setval(pg_get_serial_sequence('gruposanguineo', 'idgrupo'), COALESCE((SELECT MAX(idgrupo) FROM gruposanguineo), 1));
SELECT setval(pg_get_serial_sequence('rol', 'idrol'), COALESCE((SELECT MAX(idrol) FROM rol), 1));
SELECT setval(pg_get_serial_sequence('persona', 'idpersona'), COALESCE((SELECT MAX(idpersona) FROM persona), 1));
SELECT setval(pg_get_serial_sequence('usuario', 'idusuario'), COALESCE((SELECT MAX(idusuario) FROM usuario), 1));
SELECT setval(pg_get_serial_sequence('bitacoraauditoria', 'idauditoria'), COALESCE((SELECT MAX(idauditoria) FROM bitacoraauditoria), 1));
SELECT setval(pg_get_serial_sequence('requisitodonacion', 'idrequisito'), COALESCE((SELECT MAX(idrequisito) FROM requisitodonacion), 1));
SELECT setval(pg_get_serial_sequence('citadonacion', 'idcita'), COALESCE((SELECT MAX(idcita) FROM citadonacion), 1));
SELECT setval(pg_get_serial_sequence('detallecitarequisito', 'iddetallecita'), COALESCE((SELECT MAX(iddetallecita) FROM detallecitarequisito), 1));
SELECT setval(pg_get_serial_sequence('triajeclinico', 'idtriaje'), COALESCE((SELECT MAX(idtriaje) FROM triajeclinico), 1));
SELECT setval(pg_get_serial_sequence('diferimiento', 'iddiferimiento'), COALESCE((SELECT MAX(iddiferimiento) FROM diferimiento), 1));
SELECT setval(pg_get_serial_sequence('extracciondonacion', 'idextraccion'), COALESCE((SELECT MAX(idextraccion) FROM extracciondonacion), 1));
SELECT setval(pg_get_serial_sequence('incentivoentrega', 'idincentivo'), COALESCE((SELECT MAX(idincentivo) FROM incentivoentrega), 1));
SELECT setval(pg_get_serial_sequence('unidadsangretotal', 'idunidadmadre'), COALESCE((SELECT MAX(idunidadmadre) FROM unidadsangretotal), 1));
SELECT setval(pg_get_serial_sequence('analisinmunoserologico', 'idanalisis'), COALESCE((SELECT MAX(idanalisis) FROM analisinmunoserologico), 1));
SELECT setval(pg_get_serial_sequence('pruebainmunohematologica', 'idpruebainmuno'), COALESCE((SELECT MAX(idpruebainmuno) FROM pruebainmunohematologica), 1));
SELECT setval(pg_get_serial_sequence('ubicacionalmacen', 'idubicacion'), COALESCE((SELECT MAX(idubicacion) FROM ubicacionalmacen), 1));
SELECT setval(pg_get_serial_sequence('parametrostockminimo', 'idparametro'), COALESCE((SELECT MAX(idparametro) FROM parametrostockminimo), 1));
SELECT setval(pg_get_serial_sequence('ejemplarbolsa', 'idejemplarbolsa'), COALESCE((SELECT MAX(idejemplarbolsa) FROM ejemplarbolsa), 1));
SELECT setval(pg_get_serial_sequence('bajainventario', 'idbaja'), COALESCE((SELECT MAX(idbaja) FROM bajainventario), 1));
SELECT setval(pg_get_serial_sequence('institucionsalud', 'idinstitucion'), COALESCE((SELECT MAX(idinstitucion) FROM institucionsalud), 1));
SELECT setval(pg_get_serial_sequence('citalaboratorio', 'idcitalab'), COALESCE((SELECT MAX(idcitalab) FROM citalaboratorio), 1));
SELECT setval(pg_get_serial_sequence('solicitudhospitalaria', 'idsolicitud'), COALESCE((SELECT MAX(idsolicitud) FROM solicitudhospitalaria), 1));
SELECT setval(pg_get_serial_sequence('pruebacompatibilidad', 'idpruebacompatibilidad'), COALESCE((SELECT MAX(idpruebacompatibilidad) FROM pruebacompatibilidad), 1));
SELECT setval(pg_get_serial_sequence('comprobantedespacho', 'iddespacho'), COALESCE((SELECT MAX(iddespacho) FROM comprobantedespacho), 1));
SELECT setval(pg_get_serial_sequence('detalledespacho', 'iddetalledespacho'), COALESCE((SELECT MAX(iddetalledespacho) FROM detalledespacho), 1));
SELECT setval(pg_get_serial_sequence('comprobantepago', 'idcomprobante'), COALESCE((SELECT MAX(idcomprobante) FROM comprobantepago), 1));
SELECT setval(pg_get_serial_sequence('reposicionpendiente', 'idreposicion'), COALESCE((SELECT MAX(idreposicion) FROM reposicionpendiente), 1));
SELECT setval(pg_get_serial_sequence('compromisodonacion', 'idcompromiso'), COALESCE((SELECT MAX(idcompromiso) FROM compromisodonacion), 1));

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