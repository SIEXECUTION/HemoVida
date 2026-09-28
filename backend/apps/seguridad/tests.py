"""
Pruebas unitarias para Seguridad, Autenticación y Auditoría (CU01, CU02, CU03).
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, datetime

from .models import Persona, Rol, PersonalSalud, Usuario, BitacoraAuditoria
from .validators import SecurePasswordValidator, validate_password_complexity

class PasswordValidatorTestCase(TestCase):
    def setUp(self):
        self.validator = SecurePasswordValidator()

    def test_valid_passwords(self):
        valid_passwords = [
            'HemoVida#2026!',
            'Admin$99Abc',
            'Secure*Pass1',
            'B0l1v1a@2026#',
        ]
        for pwd in valid_passwords:
            try:
                self.validator.validate(pwd)
            except ValidationError:
                self.fail(f"La contraseña válida '{pwd}' falló la validación.")

    def test_invalid_passwords(self):
        invalid_cases = [
            ('Sh1!a', False),  # 5 chars (< 8)
            ('alllowercase123!', False),  # no uppercase
            ('ALLUPPERCASE123!', False),  # no lowercase
            ('NoDigitsHere!@#', False),  # no digit
            ('NoSpecialChars123A', False),  # no special
        ]
        for pwd, _ in invalid_cases:
            with self.assertRaises(ValidationError, msg=f"'{pwd}' debió ser rechazada."):
                self.validator.validate(pwd)


class SeguridadAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Crear Rol Admin
        self.rol_admin = Rol.objects.create(
            nombreRol='Administrador del Sistema',
            descripcion='Administrador general'
        )
        self.rol_serologo = Rol.objects.create(
            nombreRol='Bioquímico Serólogo',
            descripcion='Tamizaje de sangre'
        )

        # Crear Persona
        self.persona_admin = Persona.objects.create(
            ci='11223344',
            nombres='Ernesto',
            apellidos='Zabala',
            fechaNacimiento=date(1987, 4, 5),
            sexo='M',
            nacionalidad='Boliviana',
            celular='71655441'
        )

        self.persona_medico = Persona.objects.create(
            ci='55667788',
            nombres='Patricia',
            apellidos='Arteaga',
            fechaNacimiento=date(1988, 6, 12),
            sexo='F',
            nacionalidad='Boliviana',
            celular='76044912'
        )

        self.personal_medico = PersonalSalud.objects.create(
            persona=self.persona_medico,
            cargo='Lic. en Enfermería',
            registroProfesional='ENF-2026-001',
            estado='Activo'
        )

        # Crear Usuario Admin Activo
        self.user_admin = Usuario.objects.create(
            persona=self.persona_admin,
            rol=self.rol_admin,
            username='admin.test',
            email='admin.test@hemovida.org',
            passwordHash='HemoVida#2026!',
            estado='Activo'
        )

        # Crear Usuario Inactivo
        self.user_inactivo = Usuario.objects.create(
            rol=self.rol_serologo,
            username='inactivo.test',
            email='inactivo@hemovida.org',
            passwordHash='Inactivo#2026!',
            estado='Inactivo'
        )

    # -------------------------------------------------------------------------
    # [CU01] Autenticar Usuario e Iniciar Sesión
    # -------------------------------------------------------------------------
    def test_cu01_login_exitoso_y_auditoria(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin.test',
            'password': 'HemoVida#2026!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['usuario']['username'], 'admin.test')
        self.assertEqual(response.data['usuario']['rol']['nombreRol'], 'Administrador del Sistema')
        self.assertEqual(response.data['usuario']['persona']['ci'], '11223344')

        # Verificar que se registró la auditoría
        auditoria = BitacoraAuditoria.objects.filter(
            usuario=self.user_admin,
            accionRealizada='Inicio de Sesión Exitoso'
        ).first()
        self.assertIsNotNone(auditoria)
        self.assertEqual(auditoria.tablaAfectada, 'Usuario')

    def test_cu01_login_usuario_inactivo_rechazado(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'inactivo.test',
            'password': 'Inactivo#2026!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('Inactivo', str(response.data['detail']))

    def test_cu01_login_password_incorrecto(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin.test',
            'password': 'WrongPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # [CU02] Gestionar Cuentas de Personal y Roles RBAC
    # -------------------------------------------------------------------------
    def test_cu02_registrar_usuario_exitoso(self):
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.post('/api/usuarios/registrar/', {
            'username': 'nuevo.bioquimico',
            'email': 'nuevo@hemovida.org',
            'password': 'PasswordSeguro#2026',
            'idRol': self.rol_serologo.idRol,
            'idPersona': self.persona_medico.idPersona
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Usuario.objects.filter(username='nuevo.bioquimico').exists())

        # Verificar auditoría de creación
        self.assertTrue(BitacoraAuditoria.objects.filter(
            accionRealizada__icontains='Alta de usuario institucional: nuevo.bioquimico'
        ).exists())

    def test_cu02_registrar_usuario_password_debil_rechazado(self):
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.post('/api/usuarios/registrar/', {
            'username': 'debil.user',
            'email': 'debil@hemovida.org',
            'password': '12345',  # Insegura
            'idRol': self.rol_serologo.idRol,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_cu02_listado_personal_c4(self):
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get('/api/personal/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        item = response.data[0]
        self.assertIn('cargo', item)
        self.assertIn('registroProfesional', item)
        self.assertIn('ci', item)

    def test_cu02_modificar_estado_usuario(self):
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.patch(f'/api/usuarios/{self.user_inactivo.idUsuario}/estado/', {
            'estado': 'Activo'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_inactivo.refresh_from_db()
        self.assertEqual(self.user_inactivo.estado, 'Activo')

    # -------------------------------------------------------------------------
    # [CU03] Consultar y Auditar Bitácora de Eventos Forenses
    # -------------------------------------------------------------------------
    def test_cu03_listar_auditoria_con_filtros(self):
        self.client.force_authenticate(user=self.user_admin)
        BitacoraAuditoria.objects.create(
            usuario=self.user_admin,
            accionRealizada='Edición de prueba',
            tablaAfectada='EjemplarBolsa',
            idRegistroAfectado=10,
            ipOrigen='192.168.1.50'
        )

        response = self.client.get('/api/auditoria/?tabla_afectada=EjemplarBolsa')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('eventos', response.data)
        self.assertGreaterEqual(len(response.data['eventos']), 1)
        self.assertEqual(response.data['eventos'][0]['tablaAfectada'], 'EjemplarBolsa')

    def test_cu03_filtro_fuera_turno_b2(self):
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get('/api/auditoria/?fuera_turno=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['esFiltroFueraTurno'])
