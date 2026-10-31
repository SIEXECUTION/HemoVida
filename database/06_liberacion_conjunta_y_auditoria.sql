-- Aplicar DESPUES de la migracion financiera CU22. No altera contrasenas.
-- La auditoria de estas tablas tiene un solo escritor: este trigger.
-- El backend aporta identidad mediante SET LOCAL dentro de su transaccion.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.pagofinanciero') IS NULL THEN
  RAISE EXCEPTION 'Falta aplicar la migracion financiera CU22';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hemo_lote_aprobado(p_madre integer)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=public,pg_temp AS $$
 SELECT COALESCE((
 SELECT s.dictamenfinal='Apto'
 AND s.resultadovih='No Reactivo' AND s.resultadochagas='No Reactivo'
 AND s.resultadohepatitisb='No Reactivo' AND s.resultadohepatitisc='No Reactivo'
 AND s.resultadosifilis='No Reactivo' AND s.resultadohtlv='No Reactivo'
 AND h.dictameninmunohematologico='Apto'
 AND h.grupoaboconfirmado=g.grupoabo AND h.factorrhconfirmado=g.factorrh
 FROM public.unidadsangretotal m JOIN public.gruposanguineo g USING(idgrupo)
 CROSS JOIN LATERAL (SELECT * FROM public.analisisinmunoserologico
 WHERE idunidadmadre=m.idunidadmadre ORDER BY fechaanalisis DESC,idanalisis DESC LIMIT 1) s
 CROSS JOIN LATERAL (SELECT * FROM public.analisisinmunohematologico
 WHERE idunidadmadre=m.idunidadmadre AND etapaanalisis='Post-Extraccion'
 ORDER BY fechaanalisis DESC,idanalisishematologico DESC LIMIT 1) h
 WHERE m.idunidadmadre=p_madre),false);
$$;

CREATE OR REPLACE FUNCTION public.hemo_auditar_cambio()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE j jsonb; anterior jsonb; clave text; uid integer; rol text; accion text;
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(OLD)=to_jsonb(NEW) THEN RETURN NEW; END IF;
 j:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 anterior:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 clave:=TG_ARGV[0];
 uid:=NULLIF(current_setting('hemovida.usuario_id',true),'')::integer;
 rol:=NULLIF(current_setting('hemovida.rol_activo',true),'');
 IF uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.usuario WHERE idusuario=uid) THEN
  RAISE EXCEPTION 'Contexto de auditoria invalido';
 END IF;
 accion:=TG_OP||' origen='||COALESCE(NULLIF(current_setting('hemovida.origen',true),''),'BD directa:'||session_user)
   ||' estado='||COALESCE(anterior->>'estadobolsak',anterior->>'estadoliberacion',anterior->>'estadotransaccion','-')
   ||' -> '||COALESCE(j->>'estadobolsak',j->>'estadoliberacion',j->>'estadotransaccion','-');
 IF TG_TABLE_NAME IN ('unidadsangretotal','ejemplarbolsa') THEN
  accion:=accion||' madre='||COALESCE(j->>'idunidadmadre','-');
  accion:=accion||' CU13='||COALESCE((SELECT idanalisis::text FROM public.analisisinmunoserologico
    WHERE idunidadmadre=(j->>'idunidadmadre')::integer ORDER BY fechaanalisis DESC,idanalisis DESC LIMIT 1),'-')
   ||' CU14='||COALESCE((SELECT idanalisishematologico::text FROM public.analisisinmunohematologico
    WHERE idunidadmadre=(j->>'idunidadmadre')::integer AND etapaanalisis='Post-Extraccion'
    ORDER BY fechaanalisis DESC,idanalisishematologico DESC LIMIT 1),'-');
 END IF;
 -- Sin resultados clinicos completos, firmas, tarjetas, tokens ni secretos.
 INSERT INTO public.bitacoraauditoria(idusuario,rolactivo,accionrealizada,tablaafectada,idregistroafectado,iporigen)
 VALUES(uid,COALESCE(rol,'BD directa'),left(accion,255),TG_TABLE_NAME,(j->>clave)::integer,
 left(NULLIF(current_setting('hemovida.ip',true),''),45));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.hemo_barrera_liberacion()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE madre integer; exige boolean;
BEGIN
 madre:=NEW.idunidadmadre;
 IF TG_TABLE_NAME='unidadsangretotal' THEN exige:=NEW.estadoliberacion='Liberada Apta';
 ELSE
  -- Despacho directo de Codigo Rojo conserva su procedimiento de emergencia.
  exige:=NEW.estadobolsak='Disponible' OR
    (NEW.estadobolsak='Reservada' AND NOT NEW.esexclusivoautologo);
 END IF;
 IF NOT exige THEN RETURN NEW; END IF;
 IF madre IS NULL THEN RAISE EXCEPTION 'Unidad sin madre trazable'; END IF;
 PERFORM 1 FROM public.unidadsangretotal WHERE idunidadmadre=madre FOR UPDATE;
 IF NOT public.hemo_lote_aprobado(madre) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Liberacion conjunta pendiente: revisar CU13 y CU14';
 END IF;
 IF TG_TABLE_NAME='unidadsangretotal' AND TG_OP='UPDATE' THEN
  IF NEW.idgrupo IS DISTINCT FROM OLD.idgrupo AND NEW.estadoliberacion='Liberada Apta' THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Devuelva el lote a cuarentena antes de corregir su grupo';
  END IF;
 END IF;
 IF TG_TABLE_NAME='ejemplarbolsa' THEN
  IF NEW.fechacaducidad<CURRENT_DATE THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='No se puede liberar una unidad caducada';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.unidadsangretotal m
    WHERE m.idunidadmadre=madre AND m.idgrupo=NEW.idgrupo) THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Grupo del componente distinto a su madre';
  END IF;
 END IF;
 RETURN NEW;
END $$;

-- Serializa escrituras de analisis con la liberacion del mismo lote.
CREATE OR REPLACE FUNCTION public.hemo_bloquear_lote_analisis()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE madre integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.idunidadmadre IS DISTINCT FROM OLD.idunidadmadre THEN
  RAISE EXCEPTION 'No se puede reasignar un analisis; registre la correccion en el mismo lote';
 END IF;
 madre:=CASE WHEN TG_OP='DELETE' THEN OLD.idunidadmadre ELSE NEW.idunidadmadre END;
 PERFORM 1 FROM public.unidadsangretotal WHERE idunidadmadre=madre FOR UPDATE;
 IF madre IS NOT NULL AND NOT FOUND THEN RAISE EXCEPTION 'Bolsa madre inexistente'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.hemo_revisar_lote_modificado()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE madre integer; despachadas integer;
BEGIN
 madre:=CASE WHEN TG_OP='DELETE' THEN OLD.idunidadmadre ELSE NEW.idunidadmadre END;
 IF madre IS NOT NULL AND NOT public.hemo_lote_aprobado(madre) THEN
  UPDATE public.unidadsangretotal SET estadoliberacion='En Cuarentena'
   WHERE idunidadmadre=madre AND estadoliberacion='Liberada Apta';
  UPDATE public.reservasangre SET estadoreserva='Cancelada'
   WHERE estadoreserva='Activa' AND idejemplarbolsa IN
    (SELECT idejemplarbolsa FROM public.ejemplarbolsa WHERE idunidadmadre=madre AND estadobolsak='Reservada');
  UPDATE public.ejemplarbolsa SET estadobolsak='En Cuarentena'
   WHERE idunidadmadre=madre AND estadobolsak IN ('Disponible','Reservada');
  SELECT count(*) INTO despachadas FROM public.ejemplarbolsa
   WHERE idunidadmadre=madre AND estadobolsak='Despachada';
  IF despachadas>0 THEN
   INSERT INTO public.bitacoraauditoria(idusuario,rolactivo,accionrealizada,tablaafectada,idregistroafectado,iporigen)
   VALUES(NULLIF(current_setting('hemovida.usuario_id',true),'')::integer,
    COALESCE(NULLIF(current_setting('hemovida.rol_activo',true),''),'BD directa'),
    'REVISION URGENTE: cambio de analisis con '||despachadas||' componentes despachados',
    'unidadsangretotal',madre,NULLIF(current_setting('hemovida.ip',true),''));
  END IF;
 END IF;
 RETURN NULL;
END $$;

-- Desactiva el mecanismo unilateral si estaba conectado en otra instalacion.
DO $$ DECLARE r record;
BEGIN
 FOR r IN SELECT t.tgname, c.relname FROM pg_trigger t
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal
 AND p.proname='fn_trg_barrera_liberacion_serologica'
 LOOP EXECUTE format('DROP TRIGGER %I ON public.%I',r.tgname,r.relname); END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_hemo_liberacion_madre ON public.unidadsangretotal;
CREATE TRIGGER trg_hemo_liberacion_madre BEFORE INSERT OR UPDATE OF estadoliberacion,idgrupo
 ON public.unidadsangretotal FOR EACH ROW EXECUTE FUNCTION public.hemo_barrera_liberacion();
DROP TRIGGER IF EXISTS trg_hemo_liberacion_componente ON public.ejemplarbolsa;
CREATE TRIGGER trg_hemo_liberacion_componente BEFORE INSERT OR UPDATE OF estadobolsak,idunidadmadre,idgrupo,fechacaducidad
 ON public.ejemplarbolsa FOR EACH ROW EXECUTE FUNCTION public.hemo_barrera_liberacion();

DO $$ DECLARE tabla text; clave text;
BEGIN
 FOREACH tabla IN ARRAY ARRAY['analisisinmunoserologico','analisisinmunohematologico'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS trg_hemo_bloqueo ON public.%I',tabla);
  EXECUTE format('CREATE TRIGGER trg_hemo_bloqueo BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.hemo_bloquear_lote_analisis()',tabla);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_hemo_revision ON public.%I',tabla);
  EXECUTE format('CREATE TRIGGER trg_hemo_revision AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.hemo_revisar_lote_modificado()',tabla);
 END LOOP;
 FOR tabla,clave IN SELECT * FROM (VALUES
  ('analisisinmunoserologico','idanalisis'),('analisisinmunohematologico','idanalisishematologico'),
  ('unidadsangretotal','idunidadmadre'),('ejemplarbolsa','idejemplarbolsa'),
  ('pagofinanciero','idpago'),('bajainventario','idbaja')) x(t,k)
 LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS trg_hemo_auditoria ON public.%I',tabla);
  EXECUTE format('CREATE TRIGGER trg_hemo_auditoria AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.hemo_auditar_cambio(%L)',tabla,clave);
 END LOOP;
END $$;
COMMIT;
