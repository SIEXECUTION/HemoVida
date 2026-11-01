-- DATOS SINTÉTICOS para revisar ciclo 3. NO aplicar en producción sin revisión.
-- No importa el dump original, no crea usuarios ni cambia contraseñas/roles.
-- Por defecto termina con ROLLBACK. Las secuencias PostgreSQL pueden avanzar
-- aunque se haga ROLLBACK; revisar en base de pruebas antes de cualquier carga.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(hashtext('hemovida_demo_c3_v1'));
SELECT set_config('hemovida.usuario_id','',true);
SELECT set_config('hemovida.rol_activo','BD directa',true);
SELECT set_config('hemovida.origen','poblacion_demo_revision',true);

-- Un dump puede incluir IDs explícitos sin adelantar sus secuencias.
-- Bloquear escrituras mientras se comprueban y se insertan los datos DEMO.
-- También revisar la bitácora, que recibe inserciones desde los triggers.
LOCK TABLE public.persona, public.citadonacion, public.institucionsalud,
 public.solicitudhospitalaria, public.deudafinanciera,
 public.ubicacionalmacen, public.bitacoraauditoria IN SHARE ROW EXCLUSIVE MODE;
DO $secuencias$
DECLARE
 tabla text; columna text; secuencia text;
 maximo bigint; ultimo bigint;
BEGIN
 FOR tabla IN SELECT unnest(ARRAY['persona','citadonacion','institucionsalud',
     'solicitudhospitalaria','deudafinanciera','ubicacionalmacen','bitacoraauditoria'])
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
 codigo text; escenario text;
BEGIN
 IF to_regprocedure('public.hemo_lote_aprobado(integer)') IS NULL
    OR to_regclass('public.checkoutstripe') IS NULL
    OR to_regclass('public.protocoloconservacion') IS NULL THEN
   RAISE EXCEPTION 'Requiere esquema vigente y migraciones 06/07';
 END IF;
 SELECT idgrupo INTO g FROM public.gruposanguineo WHERE grupoabo='O' AND factorrh='Positivo';
 IF g IS NULL THEN RAISE EXCEPTION 'Falta grupo O Positivo; no se sobrescribe el catálogo'; END IF;
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
   IF n<=4 AND NOT EXISTS(SELECT 1 FROM public.citadonacion WHERE idpersona=p) THEN
     -- Prefiltro aprobado como escenario sintético, pendiente identidad/asistencia.
     -- No se insertan triajes aptos, análisis ni liberaciones simuladas.
     INSERT INTO public.citadonacion(idpersona,fechahoraprogramada,prefiltroaprobado,asistenciaconfirmada)
     VALUES(p,CURRENT_DATE+TIME '10:00',true,false);
   END IF;
   IF n>=4 THEN
     INSERT INTO public.receptor(idpersona,codigohistorialclinico,gruposanguineoreceptor,idgrupo)
     VALUES(p,'DEMO-C3-HC-0'||n,'O Positivo',g) ON CONFLICT(idpersona) DO NOTHING;
   END IF;
 END LOOP;
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
 -- Los protocolos se aprueban desde la aplicación por el responsable.
 -- No se inventan cobros, comprobantes, resultados ni autorizaciones médicas.
END;
$demo$;
SELECT p.ci,p.nombres,p.apellidos,p.ocupacion AS escenario FROM public.persona p WHERE p.ci LIKE 'DEMO-C3-%' ORDER BY p.ci;
SELECT s.numerosolicitud,d.moneda,d.montooriginal,d.montoabonado,d.saldopendiente
FROM public.solicitudhospitalaria s LEFT JOIN public.deudafinanciera d USING(idsolicitud)
WHERE s.numerosolicitud LIKE 'DEMO-C3-%' ORDER BY s.numerosolicitud;
ROLLBACK; -- Conservar así mientras se revisa. No se aplicó este archivo.
