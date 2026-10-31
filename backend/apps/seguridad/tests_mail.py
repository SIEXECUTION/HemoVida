import json
from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase, override_settings
from .utils import enviar_correo_institucional

@override_settings(BREVO_API_KEY='synthetic-test-key', BREVO_SENDER_EMAIL='sender@example.test')
class BrevoMailTests(SimpleTestCase):
    @patch('django.core.mail.send_mail')
    @patch('urllib.request.urlopen')
    def test_brevo_payload_and_no_smtp(self, urlopen, send_mail):
        urlopen.return_value.__enter__.return_value.status=201
        self.assertTrue(enviar_correo_institucional('Prueba','Texto','<p>Texto</p>','recipient@example.test'))
        req=urlopen.call_args.args[0]
        self.assertEqual(req.full_url,'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(req.get_header('Api-key'),'synthetic-test-key')
        self.assertEqual(json.loads(req.data)['sender']['email'],'sender@example.test')
        send_mail.assert_not_called()
    @patch('django.core.mail.send_mail')
    @patch('urllib.request.urlopen', side_effect=TimeoutError)
    def test_failure_not_reported_as_console_delivery(self, urlopen, send_mail):
        self.assertFalse(enviar_correo_institucional('Prueba','Texto','<p>Texto</p>','recipient@example.test'))
        send_mail.assert_not_called()
    @override_settings(BREVO_SENDER_EMAIL='')
    @patch('urllib.request.urlopen')
    def test_sender_required(self, urlopen):
        self.assertFalse(enviar_correo_institucional('Prueba','Texto','<p>Texto</p>','recipient@example.test'))
        urlopen.assert_not_called()
    @override_settings(BREVO_API_KEY='')
    @patch('django.core.mail.send_mail', return_value=1)
    @patch('urllib.request.urlopen')
    def test_without_key_preserves_local_mail_backend(self, urlopen, send_mail):
        self.assertTrue(enviar_correo_institucional('Prueba','Texto','<p>Texto</p>','recipient@example.test'))
        send_mail.assert_called_once()
        urlopen.assert_not_called()
