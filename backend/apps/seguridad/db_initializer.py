"""
Inicializador automático y resiliente de tablas y datos semilla de HemoVida.
Garantiza que el backend funcione tanto en PostgreSQL como en SQLite en Render sin error 500.
"""
import os
import sys
from datetime import date
from django.db import connection

def initialize_database_if_needed():
    # Evitar ejecutar durante migraciones formales, tests o comandos de build
    if any(cmd in sys.argv for cmd in ['makemigrations', 'migrate', 'collectstatic', 'test']):
        return

    try:
        from apps.seguridad.models import Persona, Rol, Usuario, PersonalSalud, BitacoraAuditoria
        from apps.donantes.models import Donante, ExtraccionDonacion
        from apps.inventario.models import GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa

        existing_tables = connection.introspection.table_names()

        # 1. Crear tablas faltantes (especialmente en SQLite en despliegues como Render)
        all_models = [
            Persona, Rol, Usuario, PersonalSalud, BitacoraAuditoria,
            Donante, ExtraccionDonacion,
            GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa
        ]

        missing_models = [m for m in all_models if m._meta.db_table.lower() not in [t.lower() for t in existing_tables]]

        if missing_models:
            with connection.schema_editor() as editor:
                for m in missing_models:
                    try:
                        editor.create_model(m)
                    except Exception as e:
                        print(f"[DB INIT] Tabla {m._meta.db_table} omitida o ya existente: {e}")

        # 2. Sembrar Roles Institucionales Básicos
        roles_data = [
            (1, 'Administrador del Sistema', 'Acceso irrestricto y auditoría forense'),
            (2, 'Recepcionista de Banco de Sangre', 'Registro de postulantes y citas'),
            (3, 'Médico Evaluador', 'Triaje clínico, signos vitales y dictamen'),
            (4, 'Bioquímico Serólogo', 'Tamizaje serológico de infecciones transmisibles'),
            (5, 'Bioquímico Inmunohematólogo', 'Grupo sanguíneo y compatibilidad'),
            (6, 'Encargado de Distribución y Despacho', 'Logística hospitalaria'),
            (7, 'Donante Voluntario', 'Portal de donantes, carnet y citas')
        ]
        for r_id, r_name, r_desc in roles_data:
            if not Rol.objects.filter(idRol=r_id).exists():
                Rol.objects.create(idRol=r_id, nombreRol=r_name, descripcion=r_desc)

        # 3. Sembrar Grupos Sanguíneos
        grupos_data = [
            ('O', 'Positivo'), ('O', 'Negativo'),
            ('A', 'Positivo'), ('A', 'Negativo'),
            ('B', 'Positivo'), ('B', 'Negativo'),
            ('AB', 'Positivo'), ('AB', 'Negativo')
        ]
        for abo, rh in grupos_data:
            if not GrupoSanguineo.objects.filter(grupoABO=abo, factorRh=rh).exists():
                GrupoSanguineo.objects.create(grupoABO=abo, factorRh=rh)

        # 4. Sembrar Usuarios Institucionales con Contraseñas Seguras
        usuarios_data = [
            {
                'ci': '11223344',
                'nombres': 'Eduardo',
                'apellidos': 'Zabala',
                'email': 'admin@hemovida.org',
                'username': 'admin.ezabala',
                'password': 'HemoVida#2026!',
                'rol_id': 1,
                'cargo': 'Director General y Administrador del Sistema'
            },
            {
                'ci': '22334455',
                'nombres': 'Patricia',
                'apellidos': 'Aguilera',
                'email': 'recepcion@hemovida.org',
                'username': 'recepcion.patricia',
                'password': 'Patricia@Pass123',
                'rol_id': 2,
                'cargo': 'Jefe de Recepción y Atención al Donante'
            },
            {
                'ci': '33445566',
                'nombres': 'Carlos',
                'apellidos': 'Mendoza',
                'email': 'despacho@hemovida.org',
                'username': 'despacho.carlos',
                'password': 'Carlos*Mendoza2026',
                'rol_id': 6,
                'cargo': 'Encargado de Distribución y Hemocomponentes'
            },
            {
                'ci': '44556677',
                'nombres': 'Cristhian',
                'apellidos': 'Vergara',
                'email': 'cristhian.serologia@hemovida.org',
                'username': 'serologia.cristhian',
                'password': 'Cristhian$Vero88',
                'rol_id': 4,
                'cargo': 'Bioquímico Responsable de Serología'
            },
            {
                'ci': '55667788',
                'nombres': 'Trinidad',
                'apellidos': 'Justiniano',
                'email': 'trinidad.triaje@hemovida.org',
                'username': 'triaje.trinidad',
                'password': 'Doctora!Triaje99',
                'rol_id': 3,
                'cargo': 'Médico General de Triaje Clínico'
            },
            {
                'ci': '66778899',
                'nombres': 'Silvia',
                'apellidos': 'Suárez',
                'email': 'silvia.inmuno@hemovida.org',
                'username': 'inmuno.silvia',
                'password': 'Silvia#Lab2026',
                'rol_id': 5,
                'cargo': 'Bioquímica de Inmunohematología'
            },
            {
                'ci': '7821940',
                'nombres': 'Mateo',
                'apellidos': 'Ribera Saucedo',
                'email': 'donante@hemovida.org',
                'username': 'mateo.ribera',
                'password': 'Donante#2026!',
                'rol_id': 7,
                'cargo': 'Donante Voluntario Altruista'
            }
        ]

        for u_item in usuarios_data:
            persona, _ = Persona.objects.get_or_create(
                ci=u_item['ci'],
                defaults={
                    'nombres': u_item['nombres'],
                    'apellidos': u_item['apellidos'],
                    'fechaNacimiento': date(1990, 5, 20),
                    'sexo': 'M',
                    'nacionalidad': 'Boliviana',
                    'direccion': 'Santa Cruz de la Sierra',
                    'celular': '+591 70000000',
                    'ocupacion': u_item['cargo']
                }
            )

            if not Usuario.objects.filter(email__iexact=u_item['email']).exists():
                user_obj = Usuario(
                    persona=persona,
                    rol_id=u_item['rol_id'],
                    username=u_item['username'],
                    email=u_item['email'],
                    estado='Activo'
                )
                user_obj.set_password(u_item['password'])
                user_obj.save()

            # Si es donante, registrar en la tabla donante
            if u_item['rol_id'] == 7:
                if not Donante.objects.filter(persona=persona).exists():
                    Donante.objects.create(
                        persona=persona,
                        tipoDonante='Voluntario Altruista',
                        carnetDigitalCodigo='HD-782194',
                        estadoHabilitacion='Apto'
                    )

    except Exception as e:
        print(f"[DB INIT ERROR] Error durante inicialización resiliente de DB: {e}")
