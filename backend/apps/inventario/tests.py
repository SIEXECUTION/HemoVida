"""
Pruebas unitarias para la app Inventario (CU04).
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from django.utils import timezone

from apps.seguridad.models import Rol, Usuario, Persona
from .models import GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa

class StockAlertasTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Usuario Administrador autenticado
        self.rol_admin = Rol.objects.create(nombreRol='Administrador del Sistema')
        self.user_admin = Usuario.objects.create(
            rol=self.rol_admin,
            username='admin.stock',
            email='admin.stock@hemovida.org',
            passwordHash='HemoVida#2026!',
            estado='Activo'
        )
        self.client.force_authenticate(user=self.user_admin)

        # Grupos Sanguíneos
        self.grupo_o_neg = GrupoSanguineo.objects.create(idGrupo=2, grupoABO='O', factorRh='Negativo')
        self.grupo_o_pos = GrupoSanguineo.objects.create(idGrupo=1, grupoABO='O', factorRh='Positivo')

        # Parámetro 1: O- Glóbulos Rojos (Mínimo: 10, Crítico: 3)
        self.param_o_neg = ParametroStockMinimo.objects.create(
            grupo=self.grupo_o_neg,
            tipoComponente='Concentrado de Globulos Rojos',
            stockMinimoSeguridad=10,
            stockCriticoAlerta=3,
            stockOptimo=20
        )

        # Parámetro 2: O+ Glóbulos Rojos (Mínimo: 15, Crítico: 5)
        self.param_o_pos = ParametroStockMinimo.objects.create(
            grupo=self.grupo_o_pos,
            tipoComponente='Concentrado de Globulos Rojos',
            stockMinimoSeguridad=15,
            stockCriticoAlerta=5,
            stockOptimo=30
        )

        # Crear 1 bolsa disponible para O- (1 <= 3 -> DEFICIT CRITICO)
        EjemplarBolsa.objects.create(
            idUnidadMadre=101,
            grupo=self.grupo_o_neg,
            codigoEjemplarK='BOLSA-O-NEG-01',
            tipoComponente='Concentrado de Globulos Rojos',
            volumenMl=250,
            fechaFraccionamiento=timezone.now(),
            fechaCaducidad=date.today() + timedelta(days=30),
            estadoBolsaK='Disponible'
        )

        # Crear 8 bolsas disponibles para O+ (8 < 15 pero 8 > 5 -> DEFICIT SEGURIDAD)
        for i in range(8):
            EjemplarBolsa.objects.create(
                idUnidadMadre=200 + i,
                grupo=self.grupo_o_pos,
                codigoEjemplarK=f'BOLSA-O-POS-{i}',
                tipoComponente='Concentrado de Globulos Rojos',
                volumenMl=250,
                fechaFraccionamiento=timezone.now(),
                fechaCaducidad=date.today() + timedelta(days=30),
                estadoBolsaK='Disponible'
            )

    def test_cu04_listar_parametros_stock(self):
        response = self.client.get('/api/stock/parametros/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_cu04_actualizar_parametro_stock_valido(self):
        response = self.client.put(f'/api/stock/parametros/{self.param_o_neg.idParametro}/', {
            'stockMinimoSeguridad': 12,
            'stockCriticoAlerta': 4,
            'stockOptimo': 25
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.param_o_neg.refresh_from_db()
        self.assertEqual(self.param_o_neg.stockMinimoSeguridad, 12)
        self.assertEqual(self.param_o_neg.stockCriticoAlerta, 4)

    def test_cu04_actualizar_parametro_invalido_critico_mayor_a_minimo(self):
        response = self.client.put(f'/api/stock/parametros/{self.param_o_neg.idParametro}/', {
            'stockMinimoSeguridad': 5,
            'stockCriticoAlerta': 10  # Inválido: Crítico mayor a Mínimo
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('stockCriticoAlerta', response.data)

    def test_cu04_reporte_alertas_subconsulta_b4(self):
        response = self.client.get('/api/stock/alertas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totalAlertas'], 2)

        alertas = response.data['alertas']
        # El primero debe ser O- por ser Déficit Crítico
        alerta_critica = alertas[0]
        self.assertEqual(alerta_critica['tipificacion'], 'O Negativo')
        self.assertEqual(alerta_critica['nivelAlerta'], 'DEFICIT CRITICO')
        self.assertTrue(alerta_critica['requiereCampanaDonacion'])
        self.assertEqual(alerta_critica['stockDisponibleActual'], 1)
        self.assertEqual(alerta_critica['deficitUnidades'], 9)

        # El segundo debe ser O+ por ser Déficit de Seguridad
        alerta_seguridad = alertas[1]
        self.assertEqual(alerta_seguridad['tipificacion'], 'O Positivo')
        self.assertEqual(alerta_seguridad['nivelAlerta'], 'DEFICIT SEGURIDAD')
        self.assertFalse(alerta_seguridad['requiereCampanaDonacion'])
        self.assertEqual(alerta_seguridad['stockDisponibleActual'], 8)
        self.assertEqual(alerta_seguridad['deficitUnidades'], 7)
