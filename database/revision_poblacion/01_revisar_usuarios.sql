-- Solo lectura. No devuelve contraseñas, hashes ni datos de contacto.
BEGIN READ ONLY;
SELECT u.idusuario,u.username,u.estado,
       string_agg(r.codigorol, ', ' ORDER BY r.codigorol) AS roles,
       EXISTS(SELECT 1 FROM public.personalsalud ps WHERE ps.idpersona=u.idpersona) AS vinculado_personal,
       (SELECT count(*) FROM public.bitacoraauditoria a WHERE a.idusuario=u.idusuario) AS eventos_auditoria,
       CASE WHEN u.username ~* '(^test_|^prueba$)' THEN 'Revisar con propietario: posible prueba'
            WHEN bool_or(r.codigorol='ADMIN') THEN 'Administrador: conservar y revisar propósito'
            ELSE 'Sin motivo suficiente para eliminar' END AS recomendacion
FROM public.usuario u LEFT JOIN public.usuariorol ur USING(idusuario)
LEFT JOIN public.rol r USING(idrol)
GROUP BY u.idusuario,u.username,u.estado,u.idpersona ORDER BY u.idusuario;
-- Revisar dependencias antes de considerar cualquier baja.
SELECT tc.table_name,kcu.column_name,rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING(constraint_catalog,constraint_schema,constraint_name)
JOIN information_schema.referential_constraints rc USING(constraint_catalog,constraint_schema,constraint_name)
JOIN information_schema.constraint_column_usage ccu
 ON ccu.constraint_catalog=rc.unique_constraint_catalog AND ccu.constraint_schema=rc.unique_constraint_schema AND ccu.constraint_name=rc.unique_constraint_name
WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_schema='public'
  AND ccu.table_name IN ('usuario','persona') ORDER BY tc.table_name;
COMMIT;
