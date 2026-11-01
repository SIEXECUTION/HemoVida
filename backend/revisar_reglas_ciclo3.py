"""Revisión de metadatos/configuración, sin pacientes ni escrituras en Supabase."""

import json
import os
import re
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hemovida_project.settings")

LEGACY = [
    "sp_procesar_triaje_clinico",
    "sp_registrar_flebotomia",
    "sp_registrar_fraccionamiento",
]


def review(cursor):
    cursor.execute(
        """SELECT p.proname, pg_get_function_identity_arguments(p.oid),
                  p.prosecdef, has_function_privilege(current_user,p.oid,'EXECUTE'),
                  EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,
                      acldefault('f',p.proowner))) a
                      WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),
                  pg_get_functiondef(p.oid)
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname=ANY(%s) ORDER BY p.proname""",
        [LEGACY],
    )
    procedures = []
    for name, signature, definer, executable, public, definition in cursor.fetchall():
        body = definition.lower()
        procedures.append(dict(
            nombre=name, firma=signature, security_definer=definer,
            ejecutable_por_conexion=executable, execute_public=public,
            menciona_consentimiento="consentimientoinformado" in body,
            menciona_idtriaje="idtriaje" in body,
            menciona_protocolo="protocoloconservacion" in body,
            infiere_definitivo_por_365=bool(re.search(r"p_diasinhabilitacion\s*>\s*365", body)),
            plazos_fijos_dias=sorted(set(int(n) for n in re.findall(r"f::date\s*\+\s*(\d+)", body))),
        ))
    cursor.execute(
        """SELECT tipocomponente, temperaturamin, temperaturamax, diasconservacion,
                  requiereagitacion, aprobadopor IS NOT NULL, fechaaprobacion IS NOT NULL
           FROM public.protocoloconservacion ORDER BY tipocomponente"""
    )
    protocols = [dict(zip(
        ["componente", "temperatura_min", "temperatura_max", "dias", "agitacion",
         "responsable_registrado", "fecha_registrada"], row
    )) for row in cursor.fetchall()]
    cursor.execute(
        """SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace
           AND NOT convalidated ORDER BY conname"""
    )
    return dict(
        solo_lectura=True, procedimientos_heredados=procedures,
        protocolos_configurados=protocols,
        restricciones_sin_validacion_historica=[r[0] for r in cursor.fetchall()],
        alcance="Metadatos y configuración; no certifica aprobación médica ni uso por clientes externos.",
    )


def main():
    from django.db import connection, transaction
    try:
        import django
        django.setup()
        with transaction.atomic(), connection.cursor() as cursor:
            # Debe ser la primera sentencia de la transacción.
            cursor.execute("SET TRANSACTION READ ONLY")
            result = review(cursor)
        print(json.dumps(result, ensure_ascii=False, default=str, indent=2))
        return 0
    except Exception:
        print("ERROR: revisión no completada. Revisa conexión y migraciones 06/07; no se aplicó SQL.")
        return 1
    finally:
        connection.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
