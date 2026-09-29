"""
Pruebas unitarias para la app Donantes (CU05) y Posible Donador.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta

from apps.seguridad.models import Persona, PersonalSalud
from .models import Donante, PosibleDonador, ExtraccionDonacion

class DonanteCarnetDigitalTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hoy = date.today()

        # Personal de salud para registrar extracciones
        self.persona_enfermero = Persona.objects.create(
            ci='ENF-1111',
            nombres='Silvia',
            apellidos='Guerrero',
            fechaNacimiento=date(1992, 1, 25),
            sexo='F'
        )
        self.enfermero = PersonalSalud.objects.create(
            persona=self.persona_enfermero,
            cargo='Bioquímica de Flebotomía',
            registroProfesional='FLE-2026-999'
        )

        # 1. Donante Varón (M) con donación hace 30 días (debe esperar 60 días más de los 90 reglamentarios)
        self.persona_varon = Persona.objects.create(
            ci='7894561-SC',
            nombres='Carlos Andrés',
            apellidos='Pimentel',
            fechaNacimiento=date(1995, 4, 18),
            sexo='M',
            celular='76044912'
        )
        self.donante_varon = Donante.objects.create(
            persona=self.persona_varon,
            tipoDonante='Voluntario Altruista',
            carnetDigitalCodigo='HV-DON-2024-0491',
            estadoHabilitacion='Apto',
            fechaUltimaDonacion=self.hoy - timedelta(days=30)
        )

        # Registrar 2 extracciones históricas (450ml + 450ml = 900ml)
        ExtraccionDonacion.objects.create(
            personaDonante=self.persona_varon,
            personalSalud=self.enfermero,
            codigoExtraccion='EXT-20260101-001',
            brazoExtraccion='Izquierdo',
            volumenExtraidoMl=450
        )
        ExtraccionDonacion.objects.create(
            personaDonante=self.persona_varon,
            personalSalud=self.enfermero,
            codigoExtraccion='EXT-20260201-002',
            brazoExtraccion='Derecho',
            volumenExtraidoMl=450
        )

        # 2. Donante Mujer (F) con donación hace 100 días (regla: 120 días, le faltan 20 días)
        self.persona_mujer = Persona.objects.create(
            ci='8934120-SC',
            nombres='Sofía Elena',
            apellidos='Mendoza',
            fechaNacimiento=date(1998, 9, 12),
            sexo='F',
            celular='78190234'
        )
        self.donante_mujer = Donante.objects.create(
            persona=self.persona_mujer,
            tipoDonante='Reposicion Familiar',
            carnetDigitalCodigo='HV-DON-2025-1102',
            estadoHabilitacion='Apto',
            fechaUltimaDonacion=self.hoy - timedelta(days=100)
        )

        # 3. Posible Donador (sin análisis)
        self.persona_posible = Persona.objects.create(
            ci='12345678',
            nombres='Mario',
            apellidos='Suarez',
            fechaNacimiento=date(2000, 5, 10),
            sexo='M',
            celular='70099887'
        )
        self.posible_donador = PosibleDonador.objects.create(
            persona=self.persona_posible,
            estadoAptitud='No Apto',
            tieneAnalisis=False
        )

    def test_cu05_carnet_digital_varon_regla_90_dias(self):
        response = self.client.get(f'/api/donantes/{self.persona_varon.ci}/carnet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertFalse(data['esPosibleDonador'])
        self.assertEqual(data['carnetDigitalCodigo'], 'HV-DON-2024-0491')
        self.assertEqual(data['ci'], '7894561-SC')
        self.assertEqual(data['sexo'], 'M')
        self.assertEqual(data['periodoEsperaDias'], 90)
        self.assertEqual(data['diasRestantesEspera'], 60)
        self.assertFalse(data['estaHabilitadoParaDonar'])
        self.assertEqual(data['totalDonacionesHistoricas'], 2)
        self.assertEqual(data['volumenHistoricoAportadoMl'], 900)
        self.assertEqual(len(data['extraccionesRecientes']), 2)

    def test_cu05_carnet_digital_mujer_regla_120_dias(self):
        response = self.client.get(f'/api/donantes/{self.persona_mujer.ci}/carnet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertFalse(data['esPosibleDonador'])
        self.assertEqual(data['sexo'], 'F')
        self.assertEqual(data['periodoEsperaDias'], 120)
        self.assertEqual(data['diasRestantesEspera'], 20)
        self.assertFalse(data['estaHabilitadoParaDonar'])

    def test_cu05_consulta_posible_donador(self):
        response = self.client.get(f'/api/donantes/{self.persona_posible.ci}/carnet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertTrue(data['esPosibleDonador'])
        self.assertEqual(data['ci'], '12345678')
        self.assertEqual(data['estadoAptitud'], 'No Apto')
        self.assertFalse(data['tieneAnalisis'])
        self.assertFalse(data['estaHabilitadoParaDonar'])

    def test_cu05_donante_no_encontrado(self):
        response = self.client.get('/api/donantes/9999999-INEXISTENTE/carnet/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
