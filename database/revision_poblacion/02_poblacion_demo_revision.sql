-- DATOS SINTÉTICOS para revisar ciclos 2 y 3. NO aplicar en producción sin revisión.
-- No importa el dump original, no crea usuarios ni cambia contraseñas/roles.
-- Por defecto termina con ROLLBACK. Las secuencias PostgreSQL pueden avanzar
-- aunque se haga ROLLBACK; revisar en base de pruebas antes de cualquier carga.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(hashtext('hemovida_demo_c3_v1'));
SELECT pg_advisory_xact_lock(82007); -- mismo bloqueo que la agenda del backend
SELECT set_config('hemovida.usuario_id','',true);
SELECT set_config('hemovida.rol_activo','BD directa',true);
SELECT set_config('hemovida.origen','poblacion_demo_revision',true);

-- Un dump puede incluir IDs explícitos sin adelantar sus secuencias.
-- Bloquear escrituras mientras se comprueban y se insertan los datos DEMO.
-- También revisar la bitácora, que recibe inserciones desde los triggers.
LOCK TABLE public.persona, public.citadonacion, public.institucionsalud,
 public.solicitudhospitalaria, public.deudafinanciera,
 public.ubicacionalmacen, public.agendaturno, public.prefiltrocita,
 public.detallecitarequisito, public.detallesolicitud,
 public.programacionautologa, public.programacionautologahistorial,
 public.bitacoraauditoria IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.requisitodonacion IN SHARE MODE;
DO $secuencias$
DECLARE
 tabla text; columna text; secuencia text;
 maximo bigint; ultimo bigint;
BEGIN
 FOR tabla IN SELECT unnest(ARRAY['persona','citadonacion','institucionsalud',
     'solicitudhospitalaria','deudafinanciera','ubicacionalmacen','agendaturno',
     'detallecitarequisito','detallesolicitud','programacionautologa',
     'programacionautologahistorial','bitacoraauditoria'])
 LOOP
   -- Descubrir la columna serial/identity, sin asumir nombres de secuencias.
   FOR columna, secuencia IN
     SELECT a.attname, pg_get_serial_sequence('public.' || tabla, a.attname)
     FROM pg_attribute a
     WHERE a.attrelid=('public.' || tabla)::regclass
       AND a.attnum>0 AND NOT a.attisdropped
       AND pg_get_serial_sequence('public.' || tabla, a.attname) IS NOT NULL
   LOOP
     EXECUTE format('SELECT max(%I) FROM public.%I',columna,tabla) INTO maximo;
     EXECUTE format('SELECT last_value FROM %s',secuencia) INTO ultimo;
     IF maximo IS NOT NULL AND maximo>=ultimo THEN
       PERFORM setval(secuencia::regclass,maximo,true);
     END IF;
   END LOOP;
 END LOOP;
END;
$secuencias$;
DO $demo$
DECLARE
 n integer; p integer; g integer; inst integer; sol integer; loc integer;
 codigo text; escenario text; operador integer; medico integer;
 catalogo jsonb; versioncatalogo text; canonico text; respuestas jsonb;
 turno integer; cita integer; programa integer; inicio_turno timestamptz;
 dia date; candidato timestamptz; aprobado boolean; r record;
BEGIN
 IF to_regprocedure('public.hemo_lote_aprobado(integer)') IS NULL
    OR to_regclass('public.checkoutstripe') IS NULL
    OR to_regclass('public.protocoloconservacion') IS NULL
    OR to_regclass('public.programacionautologa') IS NULL
    OR to_regprocedure('public.hemo_dia_clinico(timestamp with time zone)') IS NULL THEN
   RAISE EXCEPTION 'Requiere esquema vigente y migraciones 06 a 10';
 END IF;
 SELECT idgrupo INTO g FROM public.gruposanguineo WHERE grupoabo='O' AND factorrh='Positivo';
 IF g IS NULL THEN RAISE EXCEPTION 'Falta grupo O Positivo; no se sobrescribe el catálogo'; END IF;
 -- Responsable técnico de la carga, no una sesión ni una aprobación clínica.
 SELECT min(u.idusuario) INTO operador FROM public.usuario u
 JOIN public.usuariorol ur USING(idusuario) JOIN public.rol ro USING(idrol)
 WHERE u.estado='Activo' AND ro.codigorol='ADMIN';
 SELECT min(u.idpersona) INTO medico FROM public.usuario u
 JOIN public.usuariorol ur USING(idusuario) JOIN public.rol ro USING(idrol)
 JOIN public.personalsalud ps USING(idpersona)
 WHERE u.estado='Activo' AND ro.codigorol IN ('DOC_TRIAJE','MED_SOLICITANTE');
 IF operador IS NULL OR medico IS NULL THEN
   RAISE EXCEPTION 'Se necesita ADMIN activo y médico vinculado a PersonalSalud; no se crean cuentas';
 END IF;
 -- Mismo JSON canónico y SHA256 que agenda.services.requirements.
 SELECT jsonb_agg(jsonb_build_object('idrequisito',idrequisito,
          'nombrerequisito',nombrerequisito,'tiporequisito',tiporequisito,
          'esexcluyentedefinitivo',esexcluyentedefinitivo) ORDER BY idrequisito),
        '[' || string_agg('{"esexcluyentedefinitivo": ' || esexcluyentedefinitivo::text ||
          ', "idrequisito": ' || idrequisito::text || ', "nombrerequisito": ' || to_json(nombrerequisito)::text ||
          ', "tiporequisito": ' || to_json(tiporequisito)::text || '}', ', ' ORDER BY idrequisito) || ']'
 INTO catalogo,canonico FROM public.requisitodonacion WHERE activo;
 IF catalogo IS NULL THEN RAISE EXCEPTION 'No hay requisitos activos; no se inventa un cuestionario'; END IF;
 versioncatalogo:=encode(sha256(convert_to(canonico,'UTF8')),'hex');

 FOR n IN 1..6 LOOP
   codigo:='DEMO-C3-P0'||n;
   escenario:=(ARRAY['Triaje y colecta','Diferimiento temporal','Diferimiento definitivo',
                      'Receptor y colecta autóloga','Finanzas y Stripe','Exoneración o convenio'])[n];
   SELECT idpersona INTO p FROM public.persona WHERE ci=codigo;
   IF p IS NULL THEN
     INSERT INTO public.persona(ci,nombres,apellidos,sexo,fechanacimiento,direccion,ocupacion)
     VALUES(codigo,'DEMO C3','Escenario '||n,CASE WHEN n IN (2,5) THEN 'F' ELSE 'M' END,DATE '1990-01-01','Registro sintético: no es paciente real',escenario)
     RETURNING idpersona INTO p;
   ELSIF NOT EXISTS(SELECT 1 FROM public.persona WHERE idpersona=p AND nombres='DEMO C3' AND apellidos='Escenario '||n) THEN
     RAISE EXCEPTION 'Código DEMO ocupado por otro registro: %',codigo;
   END IF;
   INSERT INTO public.posibledonador(idpersona,estadoaptitud,tieneanalisis,carnetprovisionalcodigo)
   VALUES(p,'En Evaluacion',false,'DEMO-C3-CARNET-0'||n) ON CONFLICT(idpersona) DO NOTHING;
   IF n>=4 THEN
     INSERT INTO public.receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo)
     VALUES(p,'DEMO-C3-HC-0'||n,'O Positivo',g) ON CONFLICT(idpersona) DO NOTHING;
   END IF;
 END LOOP;
 -- Cuatro evaluaciones, cada una con turno de 15 minutos y snapshot vigente.
 -- No se confirma asistencia ni se autoriza extracción. P02/P03 conservan
 -- una respuesta pendiente para revisión profesional, sin dictar diferimiento.
 FOR n IN 1..4 LOOP
   SELECT idpersona INTO p FROM public.persona WHERE ci='DEMO-C3-P0'||n;
   IF EXISTS(SELECT 1 FROM public.citadonacion WHERE idpersona=p) THEN
     IF EXISTS(SELECT 1 FROM public.citadonacion c WHERE c.idpersona=p
       AND (c.idturno IS NULL OR c.tipoatencion IS NULL OR NOT EXISTS(
         SELECT 1 FROM public.prefiltrocita f WHERE f.idcita=c.idcita))) THEN
       RAISE EXCEPTION 'Persona DEMO % tiene una cita antigua incompleta. Revisarla antes de cargar; no se sobrescribe',p;
     END IF;
     CONTINUE;
   END IF;
   inicio_turno:=NULL;
   FOR candidato IN
     SELECT z.inicio FROM generate_series(1,14) AS dd(n)
     CROSS JOIN generate_series(0,31) AS tt(n)
     CROSS JOIN LATERAL (SELECT ((public.hemo_dia_clinico()+dd.n)::timestamp
       + make_interval(hours=>CASE WHEN tt.n<16 THEN 8 ELSE 9 END,
                       mins=>tt.n*15)) AT TIME ZONE 'America/La_Paz' AS inicio) z
     WHERE extract(isodow FROM z.inicio AT TIME ZONE 'America/La_Paz') BETWEEN 1 AND 5
     ORDER BY z.inicio
   LOOP
     dia:=(candidato AT TIME ZONE 'America/La_Paz')::date;
     IF EXISTS(SELECT 1 FROM public.cierreagenda WHERE fecha=dia AND cerrado) THEN CONTINUE; END IF;
     IF EXISTS(SELECT 1 FROM public.agendaturno t WHERE t.inicio<candidato+interval '15 minutes'
       AND t.fin>candidato AND (t.inicio<>candidato OR t.fin<>candidato+interval '15 minutes'
         OR t.cupo<>1 OR NOT t.habilitado)) THEN CONTINUE; END IF;
     SELECT idturno INTO turno FROM public.agendaturno WHERE inicio=candidato;
     IF turno IS NOT NULL AND EXISTS(SELECT 1 FROM public.citadonacion WHERE idturno=turno
       AND estadocita IN ('Programada','Atendida','Inasistencia')) THEN CONTINUE; END IF;
     IF turno IS NULL THEN
       INSERT INTO public.agendaturno(inicio,fin,cupo,creadopor)
       VALUES(candidato,candidato+interval '15 minutes',1,operador) RETURNING idturno INTO turno;
     END IF;
     inicio_turno:=candidato;
     EXIT;
   END LOOP;
   IF inicio_turno IS NULL THEN RAISE EXCEPTION 'Sin turnos libres en próximos 14 días; no se modifica agenda ocupada'; END IF;
   aprobado:=(n NOT IN (2,3));
   SELECT jsonb_agg(jsonb_build_object('idrequisito',q.idrequisito,
       'cumple',CASE WHEN n IN (2,3) AND q.idrequisito=(catalogo->0->>'idrequisito')::integer THEN false ELSE true END,
       'observacion','DEMO sintético: respuesta para revisión académica, no declaración real') ORDER BY q.idrequisito)
   INTO respuestas FROM public.requisitodonacion q WHERE q.activo;
   INSERT INTO public.citadonacion(idpersona,fechahoraprogramada,idturno,tipoatencion,
     prefiltroaprobado,asistenciaconfirmada,estadocita)
   VALUES(p,inicio_turno AT TIME ZONE 'UTC',turno,'Evaluacion',aprobado,false,'Programada')
   RETURNING idcita INTO cita;
   FOR r IN SELECT * FROM jsonb_to_recordset(respuestas) AS x(idrequisito integer,cumple boolean,observacion text) LOOP
     INSERT INTO public.detallecitarequisito(idcita,idrequisito,cumplerequisito,observacionrespuesta)
     VALUES(cita,r.idrequisito,r.cumple,r.observacion);
   END LOOP;
   INSERT INTO public.prefiltrocita(idcita,idusuario,versioncatalogo,catalogo,respuestas,aprobado)
   VALUES(cita,operador,versioncatalogo,catalogo,respuestas,aprobado);
 END LOOP;
 -- CU21: preparación sintética pendiente de revisión BIOQ. Nunca Aprobada.
 SELECT idpersona INTO p FROM public.persona WHERE ci='DEMO-C3-P04';
 SELECT idprograma INTO programa FROM public.programacionautologa
 WHERE idreceptor=p AND referenciamedica='DEMO-C3-AUTO-04' ORDER BY idprograma LIMIT 1;
 IF programa IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.programacionautologa WHERE idreceptor=p AND estado NOT IN ('Cancelada','Cerrada')) THEN
     RAISE EXCEPTION 'Receptor DEMO tiene otro programa activo; no se sobrescribe';
   END IF;
   INSERT INTO public.programacionautologa(idreceptor,fechacirugia,indicacion,referenciamedica,idmedico)
   VALUES(p,public.hemo_dia_clinico()+30,
     'DEMO académico: preparación de escenario autólogo; sin indicación clínica real ni aprobación biológica',
     'DEMO-C3-AUTO-04',medico) RETURNING idprograma INTO programa;
   INSERT INTO public.programacionautologahistorial(idprograma,version,contenido,idusuario)
   SELECT idprograma,version,to_jsonb(a),operador FROM public.programacionautologa a WHERE idprograma=programa;
 END IF;
 SELECT idinstitucion INTO inst FROM public.institucionsalud WHERE nombreinstitucion='DEMO C3 - Institución de pruebas' ORDER BY idinstitucion LIMIT 1;
 IF inst IS NULL THEN
   INSERT INTO public.institucionsalud(nombreinstitucion,tipoinstitucion,direccion)
   VALUES('DEMO C3 - Institución de pruebas','Pruebas','Registro sintético; sin atención real') RETURNING idinstitucion INTO inst;
 END IF;
 FOR n IN 4..6 LOOP
   SELECT idpersona INTO p FROM public.persona WHERE ci='DEMO-C3-P0'||n;
   SELECT idsolicitud INTO sol FROM public.solicitudhospitalaria WHERE numerosolicitud='DEMO-C3-SOL-0'||n;
   IF sol IS NULL THEN
     INSERT INTO public.solicitudhospitalaria(idinstitucion,idreceptor,numerosolicitud,prioridadsolicitud,motivotransfusion,cantidadbolsassolicitadas)
     VALUES(inst,p,'DEMO-C3-SOL-0'||n,'Programada','Escenario sintético ciclo 3; no orden médica real',1)
     RETURNING idsolicitud INTO sol;
   ELSIF NOT EXISTS(SELECT 1 FROM public.solicitudhospitalaria WHERE idsolicitud=sol AND idreceptor=p AND idinstitucion=inst) THEN
     RAISE EXCEPTION 'Solicitud DEMO pertenece a otro receptor o institución';
   END IF;
   IF NOT EXISTS(SELECT 1 FROM public.detallesolicitud WHERE idsolicitud=sol) THEN
     INSERT INTO public.detallesolicitud(idsolicitud,idgrupo,tipocomponenterequerido,cantidadsolicitada)
     VALUES(sol,g,'Concentrado de Globulos Rojos',1);
   END IF;
   IF n IN (4,5) THEN
     INSERT INTO public.deudafinanciera(idsolicitud,montooriginal,motivodeuda,fechavencimiento,moneda)
     SELECT sol,CASE WHEN n=4 THEN 100 ELSE 200 END,'DEMO ciclo 3: obligación de prueba sin abono',now()+interval '7 days','BOB'
     WHERE NOT EXISTS(SELECT 1 FROM public.deudafinanciera WHERE idsolicitud=sol)
       AND NOT EXISTS(SELECT 1 FROM public.comprobantepago WHERE idsolicitud=sol);
   END IF;
 END LOOP;
 SELECT idubicacion INTO loc FROM public.ubicacionalmacen WHERE identificadorcompartimento='DEMO-C3-REF-01';
 IF loc IS NULL THEN
   INSERT INTO public.ubicacionalmacen(identificadorcompartimento,tipoequipo,temperaturaregistro,capacidadmaxima,tieneagitacion)
   VALUES('DEMO-C3-REF-01','Equipo DEMO para pruebas de custodia',4,20,false);
 END IF;
 -- Conserva los protocolos académicos ya configurados; no los sobrescribe.
 -- No se inventan cobros, comprobantes, resultados ni autorizaciones médicas.
END;
$demo$;
SELECT p.ci,p.nombres,p.apellidos,p.ocupacion AS escenario FROM public.persona p WHERE p.ci LIKE 'DEMO-C3-%' ORDER BY p.ci;
SELECT s.numerosolicitud,d.moneda,d.montooriginal,d.montoabonado,d.saldopendiente
FROM public.solicitudhospitalaria s LEFT JOIN public.deudafinanciera d USING(idsolicitud)
WHERE s.numerosolicitud LIKE 'DEMO-C3-%' ORDER BY s.numerosolicitud;
SELECT p.ci,c.idcita,c.tipoatencion,c.estadocita,
 t.inicio AT TIME ZONE 'America/La_Paz' AS fecha_hora_bolivia,
 c.prefiltroaprobado,f.versioncatalogo,jsonb_array_length(f.respuestas) AS respuestas
FROM public.persona p JOIN public.citadonacion c USING(idpersona)
JOIN public.agendaturno t USING(idturno) JOIN public.prefiltrocita f USING(idcita)
WHERE p.ci LIKE 'DEMO-C3-%' ORDER BY p.ci;
SELECT a.referenciamedica,a.estado,a.version,a.fechacirugia
FROM public.programacionautologa a WHERE a.referenciamedica='DEMO-C3-AUTO-04';
ROLLBACK; -- Revisar resultados. La aplicación persistente requiere autorización explícita.
