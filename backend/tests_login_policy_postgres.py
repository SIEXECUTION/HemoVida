"""Pruebas de bloqueo contra PostgreSQL local desechable, nunca Supabase."""

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from tests_liberacion_postgres import LiberacionPostgresTests
from django.db import connection, connections
from rest_framework.exceptions import ValidationError
from apps.seguridad.login_policy import authenticate_user
from apps.seguridad.models import Usuario


class LoginPolicyTests(unittest.TestCase):
    def setUp(self):
        LiberacionPostgresTests.setUp(self)
        self.user.set_password("Correcta#2026")
        self.user.save()
        self.now = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)

    def attempt(self, password="incorrecta"):
        with patch("apps.seguridad.login_policy.timezone.now", return_value=self.now):
            return authenticate_user("lab", password)

    def fail(self):
        with self.assertRaises(ValidationError):
            self.attempt()
        self.user.refresh_from_db()

    def test_escalada_expiracion_y_no_contar_durante_bloqueo(self):
        for block, minutes in enumerate([15, 30, 60, 120], 1):
            for _ in range(3):
                self.fail()
            self.assertEqual(self.user.intentosFallidos, block * 3)
            self.assertEqual(self.user.estado, "Bloqueado Temporal")
            self.assertEqual(
                self.user.fechaBloqueoHasta.replace(tzinfo=timezone.utc),
                self.now + timedelta(minutes=minutes),
            )
            self.fail()
            self.assertEqual(self.user.intentosFallidos, block * 3)
            self.now = self.user.fechaBloqueoHasta.replace(tzinfo=timezone.utc)
            self.assertEqual(self.attempt("Correcta#2026").estado, "Activo")

    def test_reinicio_en_medianoche_bolivia(self):
        self.now = datetime(2026, 11, 2, 3, 59, tzinfo=timezone.utc)
        for _ in range(3):
            self.fail()
        self.now += timedelta(minutes=1)
        self.assertEqual(self.attempt("Correcta#2026").intentosFallidos, 0)
        self.user.refresh_from_db()
        self.assertEqual(str(self.user.fechaIntentosDia), "2026-11-02")

    def test_bloqueo_manual_no_expira(self):
        self.user.estado = "Bloqueado"
        self.user.save()
        with self.assertRaises(ValidationError):
            self.attempt("Correcta#2026")
        self.user.refresh_from_db()
        self.assertEqual(self.user.estado, "Bloqueado")

    def test_login_correcto_no_borra_fallos_del_dia(self):
        self.fail()
        self.assertEqual(self.attempt("Correcta#2026").intentosFallidos, 1)
        self.fail()
        self.fail()
        self.assertEqual(self.user.estado, "Bloqueado Temporal")

    def test_fallos_concurrentes_se_conservan(self):
        from concurrent.futures import ThreadPoolExecutor

        def attempt(_):
            try:
                with self.assertRaises(ValidationError):
                    authenticate_user("lab", "incorrecta")
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(attempt, range(3)))
        self.user.refresh_from_db()
        self.assertEqual(self.user.intentosFallidos, 3)
        self.assertEqual(self.user.totalBloqueosRecibidos, 1)
