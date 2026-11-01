-- Plantilla opcional: NO ejecutada. No elimina usuarios ni personas.
-- La selección está vacía. Elegir ID Y username después de revisar 01.
BEGIN;
CREATE TEMP TABLE seleccion_revision_usuario(idusuario integer PRIMARY KEY,username text NOT NULL) ON COMMIT DROP;
-- Añadir aquí SOLO las cuentas aprobadas para desactivación:
-- INSERT INTO seleccion_revision_usuario VALUES (ID_REVISADO,'USERNAME_REVISADO');
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM seleccion_revision_usuario s LEFT JOIN public.usuario u USING(idusuario)
           WHERE u.idusuario IS NULL OR u.username<>s.username) THEN
   RAISE EXCEPTION 'ID y username no coinciden: revisar selección';
 END IF;
 IF EXISTS(SELECT 1 FROM seleccion_revision_usuario s JOIN public.usuariorol ur USING(idusuario)
           JOIN public.rol r USING(idrol) WHERE r.codigorol='ADMIN') THEN
   RAISE EXCEPTION 'La plantilla protege todas las cuentas ADMIN';
 END IF;
END;
$check$;
SELECT u.idusuario,u.username,u.estado AS estado_anterior FROM public.usuario u JOIN seleccion_revision_usuario s USING(idusuario);
WITH cambiados AS (
 UPDATE public.usuario u SET estado='Inactivo'
 FROM seleccion_revision_usuario s
 WHERE u.idusuario=s.idusuario AND u.username=s.username AND u.estado<>'Inactivo'
 RETURNING u.idusuario
)
INSERT INTO public.bitacoraauditoria(idusuario,rolactivo,accionrealizada,tablaafectada,idregistroafectado)
SELECT NULL,'BD directa','Desactivación explícita revisada; se conserva historial','usuario',idusuario FROM cambiados;
ROLLBACK; -- Revisar selección y resultado antes de considerar COMMIT.
