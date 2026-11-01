"""Regresión del SQL DEMO, exclusivamente en PostgreSQL local aislado."""

import unittest
from pathlib import Path

import psycopg2


class PoblacionPostgresTests(unittest.TestCase):
    def test_secuencia_desfasada_y_reejecucion_sin_duplicados(self):
        script = (
            Path(__file__).resolve().parents[1]
            / "database"
            / "revision_poblacion"
            / "02_poblacion_demo_revision.sql"
        ).read_text(encoding="utf-8")
        # La transacción de prueba controla el rollback para inspeccionar resultados.
        script = script.replace("BEGIN;", "", 1).rsplit("ROLLBACK;", 1)[0]
        with psycopg2.connect(
            host="127.0.0.1",
            port=55439,
            dbname="hemo_liberacion_test",
            user="hemovida_test",
            password="",
            connect_timeout=5,
        ) as conn:
            try:
                with conn.cursor() as c:
                    c.execute("SELECT current_database()")
                    self.assertEqual(c.fetchone()[0], "hemo_liberacion_test")
                    c.execute(
                        "SELECT coalesce(max(idinstitucion),0)+1000 FROM institucionsalud"
                    )
                    occupied = c.fetchone()[0]
                    c.execute(
                        "INSERT INTO institucionsalud(idinstitucion,nombreinstitucion,tipoinstitucion,direccion) VALUES(%s,'TEST secuencia','Pruebas','Local')",
                        [occupied],
                    )
                    c.execute(
                        "SELECT pg_get_serial_sequence('public.institucionsalud','idinstitucion')"
                    )
                    seq = c.fetchone()[0]
                    c.execute("SELECT setval(%s::regclass,%s,false)", [seq, occupied])
                    c.execute(
                        "INSERT INTO gruposanguineo(grupoabo,factorrh) SELECT 'O','Positivo' WHERE NOT EXISTS (SELECT 1 FROM gruposanguineo WHERE grupoabo='O' AND factorrh='Positivo')"
                    )
                    c.execute(script)
                    c.execute(
                        "SELECT idinstitucion FROM institucionsalud WHERE nombreinstitucion='DEMO C3 - Institución de pruebas'"
                    )
                    institution = c.fetchone()[0]
                    self.assertNotEqual(institution, occupied)
                    c.execute("SELECT count(*) FROM persona WHERE ci LIKE 'DEMO-C3-%'")
                    self.assertEqual(c.fetchone()[0], 6)
                    # Simular secuencia adelantada por intentos fallidos/rollback.
                    high = occupied + 1000
                    c.execute("SELECT setval(%s::regclass,%s,true)", [seq, high])
                    c.execute(script)
                    c.execute("SELECT count(*) FROM persona WHERE ci LIKE 'DEMO-C3-%'")
                    self.assertEqual(c.fetchone()[0], 6)
                    c.execute(
                        "SELECT count(*) FROM institucionsalud WHERE nombreinstitucion='DEMO C3 - Institución de pruebas'"
                    )
                    self.assertEqual(c.fetchone()[0], 1)
                    from psycopg2 import sql

                    c.execute(
                        sql.SQL("SELECT last_value FROM {}").format(
                            sql.Identifier(*seq.split("."))
                        )
                    )
                    self.assertEqual(c.fetchone()[0], high)
            finally:
                # Nunca confirmar registros; setval sí persiste, solo en esta BD local.
                conn.rollback()
