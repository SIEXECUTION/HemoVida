"""Diagnóstico remoto y aplicación explícita de 10, con respaldo privado previo.

No crea pacientes, cuentas, citas, entregas o pagos de ensayo en Supabase.
"""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hemovida_project.settings")
ROOT = Path(__file__).resolve().parent.parent
REQUIRED = {
    "agendaturno": ["idturno", "inicio", "fin", "cupo", "habilitado", "creadopor"],
    "prefiltrocita": [
        "idcita",
        "idusuario",
        "versioncatalogo",
        "catalogo",
        "respuestas",
        "aprobado",
        "fecharegistro",
    ],
    "citadonacion": ["idturno", "tipoatencion", "idprograma"],
    "colectaautologa": ["idprograma"],
    "requisitodonacion": ["activo"],
    "programacionautologa": [
        "idprograma",
        "idreceptor",
        "fechacirugia",
        "indicacion",
        "referenciamedica",
        "idmedico",
        "estado",
        "version",
        "revisadopor",
        "fecharevision",
        "motivorevision",
        "creado",
        "actualizado",
    ],
    "programacionautologahistorial": [
        "idhistorial",
        "idprograma",
        "version",
        "contenido",
        "idusuario",
        "registrado",
    ],
    "prefiltroborrador": [
        "idpersona",
        "idusuario",
        "versioncatalogo",
        "catalogo",
        "respuestas",
        "idturno",
        "tipoatencion",
        "idprograma",
        "actualizado",
    ],
    "cierreagenda": [
        "idcierre",
        "fecha",
        "cerrado",
        "motivo",
        "idusuario",
        "actualizado",
    ],
}
RLS_TABLES = [
    "agendaturno",
    "prefiltrocita",
    "programacionautologa",
    "programacionautologahistorial",
    "prefiltroborrador",
    "cierreagenda",
]
OPERATIONAL = [
    "persona",
    "usuario",
    "citadonacion",
    "triajeclinico",
    "diferimiento",
    "extracciondonacion",
    "consentimientoinformado",
    "unidadsangretotal",
    "ejemplarbolsa",
    "analisisinmunoserologico",
    "analisisinmunohematologico",
    "deudafinanciera",
    "pagofinanciero",
    "programacionautologa",
]
LEGACY = [
    "sp_procesar_triaje_clinico",
    "sp_registrar_flebotomia",
    "sp_registrar_fraccionamiento",
]


def diagnostic(c):
    from hemovida_project.schema_checks import missing_cycle3

    missing = missing_cycle3(c)
    c.execute(
        "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY(%s)",
        [list(REQUIRED)],
    )
    columns = set(c.fetchall())
    missing += [
        t + "." + col
        for t, fields in REQUIRED.items()
        for col in fields
        if (t, col) not in columns
    ]
    expected_fk = {
        ("citadonacion", "agendaturno"),
        ("citadonacion", "programacionautologa"),
        ("colectaautologa", "programacionautologa"),
        ("programacionautologa", "receptor"),
        ("programacionautologa", "personalsalud"),
        ("programacionautologahistorial", "programacionautologa"),
        ("programacionautologahistorial", "usuario"),
        ("prefiltroborrador", "posibledonador"),
        ("prefiltroborrador", "usuario"),
        ("prefiltroborrador", "agendaturno"),
        ("prefiltroborrador", "programacionautologa"),
        ("prefiltrocita", "citadonacion"),
    }
    c.execute(
        "SELECT s.relname,t.relname FROM pg_constraint k JOIN pg_class s ON s.oid=k.conrelid JOIN pg_class t ON t.oid=k.confrelid WHERE k.contype='f' AND k.convalidated AND s.relnamespace='public'::regnamespace"
    )
    present_fk = set(c.fetchall())
    fk_missing = [" -> ".join(pair) for pair in sorted(expected_fk - present_fk)]
    indexes = [
        "ux_programa_autologo_activo",
        "ix_cita_turno_ciclo2",
        "ix_cita_programa",
        "ix_colecta_programa",
    ]
    c.execute(
        "SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relnamespace='public'::regnamespace AND c.relname=ANY(%s) AND i.indisvalid",
        [indexes],
    )
    present_indexes = {r[0] for r in c.fetchall()}
    c.execute(
        "SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(%s)",
        [RLS_TABLES],
    )
    rls = dict(c.fetchall())
    c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    tables = {r[0] for r in c.fetchall()}
    counts = {}
    for table in OPERATIONAL:
        if table in tables:
            c.execute("SELECT count(*) FROM public." + table)
            counts[table] = c.fetchone()[0]
    c.execute(
        "SELECT r.codigorol,count(DISTINCT u.idusuario),count(DISTINCT ps.idpersona) FROM rol r LEFT JOIN usuariorol ur USING(idrol) LEFT JOIN usuario u ON u.idusuario=ur.idusuario AND u.estado='Activo' LEFT JOIN personalsalud ps ON ps.idpersona=u.idpersona GROUP BY r.codigorol ORDER BY r.codigorol"
    )
    roles = [
        dict(perfil=r, cuentas_activas=n, profesionales=p) for r, n, p in c.fetchall()
    ]
    c.execute(
        "SELECT t.relname FROM pg_class t WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(%s) AND NOT EXISTS(SELECT 1 FROM pg_trigger g JOIN pg_proc p ON p.oid=g.tgfoid WHERE g.tgrelid=t.oid AND g.tgenabled<>'D' AND p.proname='hemo_auditar_cambio')",
        [
            [
                "agendaturno",
                "prefiltrocita",
                "cierreagenda",
                "programacionautologa",
                "prefiltroborrador",
                "requisitodonacion",
            ]
        ],
    )
    audit_missing = [r[0] for r in c.fetchall()]
    c.execute(
        "SELECT p.proname,EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(%s)",
        [LEGACY],
    )
    public_acl = dict(c.fetchall())
    c.execute(
        "SELECT p.proname,r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN pg_roles r WHERE n.nspname='public' AND p.proname=ANY(%s) AND r.rolname IN ('anon','authenticated','service_role') ORDER BY p.proname,r.rolname",
        [LEGACY],
    )
    client_acl = [
        dict(procedimiento=p, rol=r, ejecutable=allowed)
        for p, r, allowed in c.fetchall()
    ]
    c.execute(
        "SELECT to_regprocedure('public.hemo_dia_clinico(timestamp with time zone)') IS NOT NULL,to_regprocedure('public.hemo_fecha_clinica(timestamp without time zone)') IS NOT NULL"
    )
    calendar = all(c.fetchone())
    midnight = None
    if calendar:
        c.execute(
            "SELECT hemo_dia_clinico('2026-11-01 02:00:00+00'::timestamptz),hemo_dia_clinico('2026-11-01 05:00:00+00'::timestamptz)"
        )
        midnight = [str(value) for value in c.fetchone()]
    c.execute(
        "SELECT COALESCE(position('hemo_dia_clinico' in pg_get_functiondef(to_regprocedure('public.hemo_barrera_liberacion()')))>0,false)"
    )
    barrier = c.fetchone()[0]
    c.execute(
        "SELECT tipocomponente,temperaturamin,temperaturamax,diasconservacion,requiereagitacion,aprobadopor FROM protocoloconservacion ORDER BY tipocomponente"
    )
    protocols = [
        dict(
            zip(
                [
                    "componente",
                    "minimo",
                    "maximo",
                    "dias",
                    "agitacion",
                    "responsable_id",
                ],
                r,
            )
        )
        for r in c.fetchall()
    ]
    return dict(
        columnas_faltantes=missing,
        claves_foraneas_faltantes=fk_missing,
        indices_faltantes=sorted(set(indexes) - present_indexes),
        rls=rls,
        auditoria_faltante=audit_missing,
        roles=roles,
        calendario_bolivia=calendar,
        prueba_medianoche_utc=midnight,
        barrera_liberacion_calendario_local=barrier,
        execute_public_heredados=public_acl,
        execute_roles_cliente=client_acl,
        protocolos=protocols,
        conteos_operativos=counts,
    )


def backup(connection, config):
    directory = (
        ROOT
        / ".venv"
        / "cierres"
        / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    )
    directory.mkdir(parents=True, exist_ok=False)
    executable = (
        shutil.which("pg_dump") or "C:/Program Files/PostgreSQL/18/bin/pg_dump.exe"
    )
    env = os.environ.copy()
    env.update(
        PGHOST=str(config["HOST"]),
        PGPORT=str(config["PORT"]),
        PGDATABASE=str(config["NAME"]),
        PGUSER=str(config["USER"]),
        PGPASSWORD=str(config["PASSWORD"]),
        PGSSLMODE="require",
    )
    result = subprocess.run(
        [
            executable,
            "--schema-only",
            "--schema=public",
            "--lock-wait-timeout=5000",
            "--file",
            str(directory / "schema_antes.sql"),
        ],
        env=env,
        capture_output=True,
    )
    if result.returncode or not (directory / "schema_antes.sql").stat().st_size:
        raise RuntimeError("No se completó el respaldo de esquema; no se aplicó 10.")
    # Inversa exacta de los permisos/comentarios de los SP que cambia 10.
    from psycopg2 import sql

    restore = ["BEGIN;"]
    with connection.cursor() as c:
        c.execute(
            "SELECT p.oid,format('%%I.%%I(%%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)),obj_description(p.oid,'pg_proc') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(%s)",
            [LEGACY],
        )
        for oid, signature, comment in c.fetchall():
            for role in ["PUBLIC", "anon", "authenticated", "service_role"]:
                if role != "PUBLIC":
                    c.execute("SELECT oid FROM pg_roles WHERE rolname=%s", [role])
                    r = c.fetchone()
                    if not r:
                        continue
                    grantee = r[0]
                    quoted = sql.Identifier(role).as_string(c.connection)
                else:
                    grantee = 0
                    quoted = "PUBLIC"
                c.execute(
                    "SELECT a.is_grantable FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=%s AND a.grantee=%s AND a.privilege_type='EXECUTE'",
                    [oid, grantee],
                )
                old = c.fetchone()
                restore.append(
                    f"REVOKE EXECUTE ON PROCEDURE {signature} FROM {quoted};"
                )
                if old:
                    restore.append(
                        f"GRANT EXECUTE ON PROCEDURE {signature} TO {quoted}"
                        + (" WITH GRANT OPTION" if old[0] else "")
                        + ";"
                    )
            restore.append(
                "COMMENT ON PROCEDURE "
                + signature
                + " IS "
                + sql.Literal(comment).as_string(c.connection)
                + ";"
            )
        c.execute(
            "SELECT pg_get_functiondef('public.hemo_barrera_liberacion()'::regprocedure)"
        )
        restore.append(c.fetchone()[0] + ";")
    restore.append("COMMIT;")
    (directory / "revertir_permisos_y_barrera.sql").write_text(
        "\n".join(restore), encoding="utf-8"
    )
    return directory


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aplicar-10", action="store_true")
    args = parser.parse_args()
    import django

    django.setup()
    from django.db import connection, transaction
    from django.conf import settings

    try:
        config = settings.DATABASES["default"]
        if (
            config["ENGINE"] != "django.db.backends.postgresql"
            or str(config["PORT"]) != "6543"
        ):
            raise RuntimeError(
                "Este diagnóstico remoto requiere PostgreSQL/Supabase por puerto 6543."
            )
        with transaction.atomic(), connection.cursor() as c:
            c.execute("SET TRANSACTION READ ONLY")
            before = diagnostic(c)
        if args.aplicar_10:
            if (
                before["columnas_faltantes"]
                or before["claves_foraneas_faltantes"]
                or before["indices_faltantes"]
                or not all(before["rls"].get(t) for t in RLS_TABLES)
            ):
                raise RuntimeError("08/09 incompletas o RLS ausente; no se aplicó 10.")
            directory = backup(connection, config)
            (directory / "diagnostico_antes.json").write_text(
                json.dumps(before, default=str, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            try:
                with connection.cursor() as c:
                    c.execute(
                        (
                            ROOT / "database/10_cierre_academico_y_calendario.sql"
                        ).read_text(encoding="utf-8")
                    )
            except Exception:
                connection.rollback()
                raise RuntimeError(
                    "La transacción de 10 falló y se revirtió; revisa el respaldo privado."
                ) from None
            with transaction.atomic(), connection.cursor() as c:
                c.execute("SET TRANSACTION READ ONLY")
                after = diagnostic(c)
            after["conteos_operativos_sin_cambios"] = (
                before["conteos_operativos"] == after["conteos_operativos"]
            )
            after["respaldo_privado"] = str(directory)
            (directory / "diagnostico_despues.json").write_text(
                json.dumps(after, default=str, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(json.dumps(after, default=str, ensure_ascii=False, indent=2))
        else:
            print(json.dumps(before, default=str, ensure_ascii=False, indent=2))
        return 0
    except RuntimeError as e:
        print(str(e))
        return 1
    except Exception:
        print(
            "No se completó el diagnóstico. No se imprimen credenciales ni errores del proveedor."
        )
        return 1
    finally:
        connection.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
