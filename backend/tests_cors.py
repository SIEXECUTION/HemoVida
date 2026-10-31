"""Preflight sin acceso a la base de datos ni proveedores externos."""

from django.test import SimpleTestCase, override_settings, Client


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    CORS_ALLOW_ALL_ORIGINS=False,
    CORS_ALLOWED_ORIGINS=[
        "https://hemovidax.siexecution2026.workers.dev",
        "http://127.0.0.1:3000",
    ],
)
class CorsTests(SimpleTestCase):
    def preflight(self, origin):
        return Client().options(
            "/api/finanzas/deudas/",
            HTTP_ORIGIN=origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
        )

    def test_cloudflare_and_local_can_send_authorization(self):
        for origin in [
            "https://hemovidax.siexecution2026.workers.dev",
            "http://127.0.0.1:3000",
        ]:
            r = self.preflight(origin)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.headers["Access-Control-Allow-Origin"], origin)
            self.assertIn("authorization", r.headers["Access-Control-Allow-Headers"])

    def test_unknown_origin_receives_no_cors_permission(self):
        r = self.preflight("https://unknown.example.test")
        self.assertNotIn("Access-Control-Allow-Origin", r.headers)
