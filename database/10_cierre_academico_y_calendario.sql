-- Cierre técnico académico autorizado: calendario Bolivia, SP heredados y conservación.
-- Requiere 06/07/08/09. No altera contraseñas ni registros clínicos históricos.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF to_regclass('public.programacionautologahistorial') IS NULL OR
    to_regprocedure('public.hemo_barrera_liberacion()') IS NULL THEN
  RAISE EXCEPTION 'Se requieren migraciones 06 a 09 completas';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hemo_dia_clinico(p_instante timestamptz DEFAULT CURRENT_TIMESTAMP)
RETURNS date LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$
 SELECT (p_instante AT TIME ZONE 'America/La_Paz')::date;
$$;
CREATE OR REPLACE FUNCTION public.hemo_fecha_clinica(p_instante timestamp without time zone)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT ((p_instante AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date;
$$;
-- Conserva íntegra la barrera de 06; cambia solamente su fecha de caducidad al día clínico.
DO $$ DECLARE cuerpo text; BEGIN
 cuerpo:=pg_get_functiondef('public.hemo_barrera_liberacion()'::regprocedure);
 IF cuerpo ~* '\mCURRENT_DATE\M' THEN
  EXECUTE regexp_replace(cuerpo,'\mCURRENT_DATE\M','public.hemo_dia_clinico()','gi');
 ELSIF position('hemo_dia_clinico' in cuerpo)=0 THEN
  RAISE EXCEPTION 'Barrera de liberación no reconocida; revisar antes de aplicar';
 END IF;
END $$;

-- Únicamente tres SP clínicos que el backend actual no invoca.
-- Se preservan sus definiciones y el acceso del propietario administrativo.
DO $$ DECLARE v_proc record; r text; total integer; BEGIN
 SELECT count(*) INTO total FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='p' AND p.proname IN
 ('sp_procesar_triaje_clinico','sp_registrar_flebotomia','sp_registrar_fraccionamiento');
 IF total<>3 THEN RAISE EXCEPTION 'Revisar firmas de los tres procedimientos heredados'; END IF;
 FOR v_proc IN SELECT p.proname,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) AS firma
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind='p' AND p.proname IN
  ('sp_procesar_triaje_clinico','sp_registrar_flebotomia','sp_registrar_fraccionamiento') LOOP
  EXECUTE format('REVOKE EXECUTE ON PROCEDURE %s FROM PUBLIC',v_proc.firma);
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
    EXECUTE format('REVOKE EXECUTE ON PROCEDURE %s FROM %I',v_proc.firma,r);
   END IF;
  END LOOP;
  EXECUTE format('COMMENT ON PROCEDURE %s IS %L',v_proc.firma,
   'HEREDADO: reservado a mantenimiento administrativo. CU10/CU11/CU15 usan servicios transaccionales de la API; este SP no incorpora sus controles actuales.');
 END LOOP;
END $$;

ALTER TABLE public.protocoloconservacion ADD COLUMN IF NOT EXISTS contexto varchar(30) NOT NULL DEFAULT 'Academico';
ALTER TABLE public.protocoloconservacion ADD COLUMN IF NOT EXISTS referencia varchar(500) NOT NULL DEFAULT '';
-- Inserta solo los parámetros ausentes. No sobrescribe ajustes posteriores de Logística.
-- El responsable se asigna a una cuenta activa existente de Logística, priorizando una sin ADMIN.
-- El actor de configuración es el sistema; no se simula una sesión/firma del responsable.
DO $$ DECLARE responsable integer; fila record; BEGIN
 SELECT ps.idpersona INTO responsable FROM personalsalud ps JOIN usuario u USING(idpersona)
 JOIN usuariorol ur USING(idusuario) JOIN rol r USING(idrol)
 WHERE u.estado='Activo' AND r.codigorol='TEC_LOGISTICA'
 ORDER BY EXISTS(SELECT 1 FROM usuariorol x JOIN rol y USING(idrol) WHERE x.idusuario=u.idusuario AND y.codigorol='ADMIN'),u.idusuario LIMIT 1;
 IF responsable IS NULL THEN RAISE EXCEPTION 'Falta profesional activo con TEC_LOGISTICA para la configuración académica'; END IF;
 PERFORM set_config('hemovida.usuario_id','',true);
 PERFORM set_config('hemovida.rol_activo','Configuracion academica',true);
 PERFORM set_config('hemovida.origen','migracion10',true);
 FOR fila IN
  INSERT INTO public.protocoloconservacion(tipocomponente,temperaturamin,temperaturamax,diasconservacion,requiereagitacion,aprobadopor,contexto,referencia)
  SELECT x.tipo,x.minimo,x.maximo,x.dias,x.agita,responsable,'Academico',
   'Parámetros autorizados por el usuario para proyecto universitario el 2026-11-01. GR/ST: 35 días dentro del rango 35-40; supervisión biológica BIOQ_INTEGRAL.'
  FROM (VALUES
   ('Concentrado de Globulos Rojos',2,6,35,false),('Paquete Globular',2,6,35,false),
   ('Sangre Total',2,6,35,false),('Concentrado Plaquetario',20,24,5,true),
   ('Plasma Fresco Congelado',-30,-18,365,false),('Crioprecipitado',-30,-18,365,false)
  ) x(tipo,minimo,maximo,dias,agita)
  ON CONFLICT(tipocomponente) DO NOTHING RETURNING tipocomponente
 LOOP
  INSERT INTO public.bitacoraauditoria(idusuario,rolactivo,accionrealizada,tablaafectada,idregistroafectado)
  VALUES(NULL,'Configuracion academica','Configuración académica autorizada; responsable de conservación asignado #'
   ||responsable||'; componente='||fila.tipocomponente,'protocoloconservacion',NULL);
 END LOOP;
END $$;
COMMIT;
