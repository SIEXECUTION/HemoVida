"""Pruebas de configuración puras: no se conectan a Supabase."""

import unittest
from django.core.exceptions import ImproperlyConfigured
from hemovida_project.database_config import database_from_url


class DatabaseConfigTests(unittest.TestCase):
    def test_pooler_ssl_and_cursor_settings(self):
        c = database_from_url(
            "postgresql://postgres.example:p%40ss%5Bword%5D@aws-0-example.pooler.supabase.com:6543/postgres?sslmode=require",
            True,
        )
        self.assertEqual(c["PASSWORD"], "p@ss[word]")
        self.assertEqual(c["PORT"], 6543)
        self.assertEqual(c["CONN_MAX_AGE"], 0)
        self.assertTrue(c["DISABLE_SERVER_SIDE_CURSORS"])
        self.assertEqual(c["OPTIONS"]["sslmode"], "require")

    def test_invalid_url_never_falls_back_or_leaks_secret(self):
        for value in [
            "",
            "sqlite:///local.db",
            "postgresql://user:TOP_SECRET@/postgres",
            "postgresql://user:TOP_SECRET@host:5432/postgres",
        ]:
            with self.assertRaises(ImproperlyConfigured) as ctx:
                database_from_url(value, True)
            self.assertNotIn("TOP_SECRET", str(ctx.exception))

    def test_database_name_and_password_required(self):
        for value in [
            "postgresql://user:pass@host:6543/",
            "postgresql://user@host:6543/postgres",
        ]:
            with self.assertRaises(ImproperlyConfigured):
                database_from_url(value, True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
