"""Diagnóstico de solo lectura. No importa/restaura schema ni ejecuta migraciones."""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hemovida_project.settings")


def main():
    try:
        from pathlib import Path
        from dotenv import load_dotenv

        load_dotenv(Path(__file__).resolve().parent / ".env")
        if not os.getenv("DATABASE_URL", "").strip():
            print(
                "PENDIENTE: completa DATABASE_URL en backend/.env con tu URI de Supabase, puerto 6543."
            )
            return 1
        import django

        django.setup()
        from django.db import connection
        from django.conf import settings

        config = settings.DATABASES["default"]
        if config["ENGINE"] != "django.db.backends.postgresql":
            print(
                "ERROR: el ambiente local debe usar DATABASE_URL PostgreSQL, no SQLite."
            )
            return 1
        if str(config.get("PORT")) != "6543":
            print(
                "ERROR: esta configuración local requiere el pooler Supabase en puerto 6543."
            )
            return 1
        with connection.cursor() as c:
            complete = True
            c.execute("SELECT 1")
            assert c.fetchone()[0] == 1
            print("OK: conexión PostgreSQL por SSL, puerto 6543.")
            for table in [
                "persona",
                "usuario",
                "triajeclinico",
                "diferimiento",
                "extracciondonacion",
                "consentimientoinformado",
                "unidadsangretotal",
                "ejemplarbolsa",
                "deudafinanciera",
                "pagofinanciero",
            ]:
                c.execute("SELECT to_regclass(%s)", ["public." + table])
                if c.fetchone()[0] is None:
                    print("ERROR: falta la tabla requerida " + table)
                    return 1
            c.execute(
                "SELECT to_regprocedure('public.hemo_lote_aprobado(integer)') IS NOT NULL"
            )
            if not c.fetchone()[0]:
                complete = False
                print(
                    "PENDIENTE: migración 06 no detectada; las escrituras clínicas permanecen bloqueadas. No se aplicó SQL."
                )
            else:
                print("OK: función de liberación conjunta de migración 06 detectada.")
            from hemovida_project.schema_checks import missing_cycle3

            missing = missing_cycle3(c)
            if missing:
                complete = False
                print("PENDIENTE: migración 07 incompleta: " + ", ".join(missing))
            else:
                print("OK: columnas y tablas de migración 07 verificadas.")
            if not missing:
                c.execute(
                    "SELECT relname FROM pg_class WHERE oid IN ('public.incidenciacolecta'::regclass,'public.colectaautologa'::regclass) AND NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid=pg_class.oid AND p.proname='hemo_auditar_cambio' AND t.tgenabled<>'D')"
                )
                if c.fetchall():
                    complete = False
                    print("PENDIENTE: falta auditoría activa de tablas nuevas.")
                else:
                    print("OK: auditoría activa de tablas nuevas.")
            c.execute(
                "SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='public.pagofinanciero'::regclass AND NOT t.tgisinternal AND t.tgenabled<>'D'"
            )
            if c.fetchone()[0] < 2:
                complete = False
                print(
                    "PENDIENTE: revisar triggers de actualización financiera y auditoría."
                )
            print("Verificación de solo lectura terminada. No se modificaron datos.")
            return 0 if complete else 1
    except Exception:
        # Nunca imprimir DSN, contraseñas ni excepciones del driver.
        print(
            "ERROR: no se pudo verificar la conexión. Revisa DATABASE_URL en backend/.env, SSL, contraseña codificada, usuario y host del pooler de Supabase."
        )
        return 1
    finally:
        try:
            from django.db import connections

            connections.close_all()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
