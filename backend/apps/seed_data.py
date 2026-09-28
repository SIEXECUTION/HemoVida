import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hemovida_project.settings')
import django
django.setup()


from datetime import date, datetime, timedelta
from django.db import connection
from apps.seguridad.models import Persona, Rol, PersonalSalud, Usuario, BitacoraAuditoria
from apps.donantes.models import Donante, ExtraccionDonacion
from apps.inventario.models import GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa

def seed():
    print("Iniciando sembrado de datos HemoVida...")

    existing_tables = connection.introspection.table_names()
    models_to_create = [
        Persona, Rol, PersonalSalud, Usuario, BitacoraAuditoria,
        Donante, ExtraccionDonacion,
        GrupoSanguineo, ParametroStockMinimo, EjemplarBolsa
    ]
    with connection.schema_editor() as editor:
        for m in models_to_create:
            m._meta.managed = True
            if m._meta.db_table not in existing_tables:
                try:
                    editor.create_model(m)
                    print(f"Tabla {m._meta.db_table} creada.")
                except Exception as e:
                    print(f"Aviso en {m._meta.db_table}: {e}")


    # 1. Grupos Sanguíneos
    grupos_data = [
        (1, 'O', 'Positivo'),
        (2, 'O', 'Negativo'),
        (3, 'A', 'Positivo'),
        (4, 'A', 'Negativo'),
        (5, 'B', 'Positivo'),
        (6, 'B', 'Negativo'),
        (7, 'AB', 'Positivo'),
        (8, 'AB', 'Negativo'),
    ]
    for gid, abo, rh in grupos_data:
        GrupoSanguineo.objects.get_or_create(idGrupo=gid, defaults={'grupoABO': abo, 'factorRh': rh})

    # 2. Roles Institucionales
    roles_data = [
        (1, 'Administrador del Sistema', 'Control total, configuración de parámetros y auditoría forense'),
        (2, 'Secretaría y Admisión', 'Ventanilla, registro de postulantes, carnet digital y cobro de aranceles'),
        (3, 'Médico Evaluador de Triaje', 'Anamnesis clínica, signos vitales y emisión de diferimientos médicos'),
        (4, 'Bioquímico Serólogo', 'Tamizaje de 6 marcadores infecciosos automatizado'),
        (5, 'Bioquímico Inmunohematólogo', 'Tipificación globular/sérica, Coombs y pruebas cruzadas'),
        (6, 'Técnico de Fraccionamiento y Almacén', 'Centrifugación mecánica precoz y custodia de cámaras frías'),
    ]
    for rid, nom, desc in roles_data:
        Rol.objects.get_or_create(idRol=rid, defaults={'nombreRol': nom, 'descripcion': desc})

    # 3. Personas
    personas_data = [
        (1, '4729103 SC', 'Patricia', 'Arteaga Vaca', 'F', '1988-06-12', 'Barrio Las Palmas, C. 3 #120', '76044912', 'Lic. en Enfermería'),
        (2, '3948201 SC', 'Carlos', 'Mendoza Cuéllar', 'M', '1984-03-22', 'Av. Busch, Calle 8 #45', '77088120', 'Bioquímico Farmacéutico'),
        (3, '5012391 SC', 'Cristhian', 'Gandarillas Paz', 'M', '1990-11-15', 'Av. San Martín, Cond. El Bosque', '70911223', 'Bioquímico Serólogo'),
        (4, '3108920 SC', 'Trinidad', 'Álvarez Pinto', 'F', '1979-08-30', 'Calle Warnes #280', '72166778', 'Médico Hemoterapeuta'),
        (5, '4421902 SC', 'Silvia', 'Guerrero Roca', 'F', '1992-01-25', 'Av. Cristo Redentor #550', '78190234', 'Lic. en Bioquímica'),
        (6, '2940182 SC', 'Fernando', 'Aguilera Justiniano', 'M', '1975-09-18', 'Urb. Sirari, Calle Los Claveles #12', '76399120', 'Médico Cirujano'),
        (7, '5819201 SC', 'Ernesto', 'Zabala Melgar', 'M', '1987-04-05', 'Barrio Equipetrol Norte #304', '71655441', 'Ingeniero de Sistemas'),
        (8, '7894561 SC', 'Carlos Andrés', 'Pimentel Guarena', 'M', '1995-04-18', 'Barrio Sirari, Calle Los Claveles #145', '76044912', 'Ingeniero de Sistemas'),
        (9, '8934120 SC', 'Sofía Elena', 'Mendoza Vaca', 'F', '1998-09-12', 'Av. Las Américas, Edif. Panorama #4B', '78190234', 'Bioquímica'),
        (10, '6512399 SC', 'Rodrigo', 'Justiniano Paz', 'M', '1990-11-04', 'Av. Cristo Redentor, Calle 5 #88', '70911223', 'Arquitecto'),
        (11, '5421980 SC', 'Claudia', 'Vaca Hurtado', 'F', '1993-07-21', 'Barrio Hamacas, Calle 4 #19', '75033441', 'Contadora Pública'),
        (12, '9120394 SC', 'Mateo', 'Banegas Justiniano', 'M', '2001-02-14', 'Plan 3000, Barrio Guapilo #44', '71399440', 'Estudiante Universitario'),
        (13, '4019283 SC', 'Jorge', 'Salvatierra Méndez', 'M', '1986-10-09', 'Villa 1ro de Mayo, Calle 3 #10', '76322119', 'Comerciante'),
        (14, '6928172 SC', 'Luciana', 'Mercado Suárez', 'F', '1997-03-16', 'Av. Santos Dumont, Calle 9 #202', '70822340', 'Docente'),
        (15, '8192031 SC', 'Gustavo Adolfo', 'Ribera Céspedes', 'M', '1994-12-01', 'Barrio Urbarí, Calle Los Pinos #5', '77291029', 'Abogado'),
    ]
    for pid, ci, nom, ape, sex, fnac, dirn, cel, ocup in personas_data:
        Persona.objects.get_or_create(
            idPersona=pid,
            defaults={
                'ci': ci,
                'nombres': nom,
                'apellidos': ape,
                'sexo': sex,
                'fechaNacimiento': datetime.strptime(fnac, '%Y-%m-%d').date(),
                'direccion': dirn,
                'celular': cel,
                'ocupacion': ocup
            }
        )

    # 4. Personal de Salud
    personal_data = [
        (1, 'Encargada de Recepción y Registro', 'REC-2026-4729'),
        (2, 'Responsable de Despacho Transfusional', 'DESP-2026-3948'),
        (3, 'Bioquímico Serólogo Principal', 'SER-2026-5012'),
        (4, 'Médico Hemoterapeuta de Triaje', 'MED-2026-3108'),
        (5, 'Bioquímica de Flebotomía', 'FLE-2026-4421'),
        (6, 'Cirujano de Trauma Quirúrgico', 'CIR-2026-2940'),
        (7, 'Administrador de Servidores e Infraestructura', 'SIS-2026-5819'),
    ]
    for pid, cargo, reg in personal_data:
        p = Persona.objects.get(idPersona=pid)
        PersonalSalud.objects.get_or_create(
            persona=p,
            defaults={'cargo': cargo, 'registroProfesional': reg, 'estado': 'Activo'}
        )

    # 5. Donantes
    donantes_data = [
        (8, 'HV-DON-2024-0491', 'Voluntario Altruista', 'Apto', '2026-05-10'),
        (9, 'HV-DON-2025-1102', 'Reposicion Familiar', 'Diferido Temporal', '2026-08-01'),
        (10, 'HV-DON-2023-0189', 'Voluntario Altruista', 'Apto', '2026-04-12'),
        (11, 'HV-DON-2026-5421', 'Reposicion Familiar', 'Apto', '2026-09-19'),
        (12, 'HV-DON-2026-9120', 'Voluntario Altruista', 'Apto', None),
        (13, 'HV-DON-2026-4019', 'Reposicion Familiar', 'Apto', '2026-01-10'),
        (14, 'HV-DON-2026-6928', 'Voluntario Altruista', 'Apto', None),
        (15, 'HV-DON-2026-8192', 'Voluntario Altruista', 'Apto', '2026-02-20'),
    ]
    for pid, cod, tdon, hab, fult in donantes_data:
        p = Persona.objects.get(idPersona=pid)
        fult_date = datetime.strptime(fult, '%Y-%m-%d').date() if fult else None
        Donante.objects.get_or_create(
            persona=p,
            defaults={'carnetDigitalCodigo': cod, 'tipoDonante': tdon, 'estadoHabilitacion': hab, 'fechaUltimaDonacion': fult_date}
        )

    # 6. Usuarios
    usuarios_data = [
        (1, 7, 1, 'admin.ezabala', 'admin@hemovida.org', 'HemoVida#2026!', 'Activo'),
        (2, 1, 2, 'recepcion.patricia', 'recepcion@hemovida.org', 'Patricia@Pass123', 'Activo'),
        (3, 2, 6, 'despacho.carlos', 'despacho@hemovida.org', 'Carlos*Mendoza2026', 'Activo'),
        (4, 3, 4, 'serologia.cristhian', 'cristhian.serologia@hemovida.org', 'Cristhian$Vero88', 'Activo'),
        (5, 4, 3, 'triaje.trinidad', 'trinidad.triaje@hemovida.org', 'Doctora!Triaje99', 'Activo'),
        (6, 5, 5, 'inmuno.silvia', 'silvia.inmuno@hemovida.org', 'Silvia#Lab2026', 'Activo'),
        (7, 8, 2, 'carlos.pimentel', 'carlos.pimentel@hemovida.org', 'Pimentel$Dev12', 'Activo'),
    ]
    for uid, pid, rid, uname, em, pwd, est in usuarios_data:
        p = Persona.objects.get(idPersona=pid)
        r = Rol.objects.get(idRol=rid)
        u, created = Usuario.objects.get_or_create(
            idUsuario=uid,
            defaults={'persona': p, 'rol': r, 'username': uname, 'email': em, 'passwordHash': pwd, 'estado': est}
        )
        if not created:
            u.passwordHash = pwd
            u.save()

    # 7. Parámetros de Stock Mínimo
    # (idParametro, idGrupo, tipoComponente, stockMinimo, stockCritico, stockOptimo)
    params_data = [
        (1, 1, 'Concentrado de Globulos Rojos', 20, 5, 40),
        (2, 2, 'Concentrado de Globulos Rojos', 15, 3, 30),
        (3, 3, 'Concentrado de Globulos Rojos', 15, 4, 30),
        (4, 1, 'Plasma Fresco Congelado', 10, 2, 25),
        (5, 2, 'Plasma Fresco Congelado', 10, 2, 25),
        (6, 1, 'Concentrado Plaquetario', 8, 2, 16),
        (7, 2, 'Concentrado Plaquetario', 6, 1, 12),
    ]
    for pid, gid, comp, smin, scrit, sopt in params_data:
        g = GrupoSanguineo.objects.get(idGrupo=gid)
        ParametroStockMinimo.objects.get_or_create(
            idParametro=pid,
            defaults={'grupo': g, 'tipoComponente': comp, 'stockMinimoSeguridad': smin, 'stockCriticoAlerta': scrit, 'stockOptimo': sopt}
        )

    # 8. Ejemplares de Bolsas de Sangre
    bolsas_data = [
        (1, 1, 1, 'BOL-MAD-001-K1', 'Concentrado de Globulos Rojos', 250, 'Disponible'),
        (2, 1, 1, 'BOL-MAD-001-K2', 'Plasma Fresco Congelado', 150, 'Disponible'),
        (3, 1, 2, 'BOL-MAD-002-K1', 'Concentrado de Globulos Rojos', 250, 'Disponible'),
        (4, 1, 2, 'BOL-MAD-002-K2', 'Plasma Fresco Congelado', 150, 'Disponible'),
        (5, 1, 3, 'BOL-MAD-003-K1', 'Concentrado de Globulos Rojos', 250, 'En Cuarentena'),
    ]
    for bid, mid, gid, cod, comp, vol, est in bolsas_data:
        g = GrupoSanguineo.objects.get(idGrupo=gid)
        EjemplarBolsa.objects.get_or_create(
            idEjemplarBolsa=bid,
            defaults={
                'idUnidadMadre': mid,
                'grupo': g,
                'codigoEjemplarK': cod,
                'tipoComponente': comp,
                'volumenMl': vol,
                'fechaFraccionamiento': datetime.now(),
                'fechaCaducidad': date.today() + timedelta(days=35),
                'estadoBolsaK': est
            }
        )

    # 9. Extracciones de Donación de prueba
    donante_carlos = Donante.objects.get(persona__ci='7894561 SC')
    enfermero_silvia = PersonalSalud.objects.get(persona__idPersona=5)
    ExtraccionDonacion.objects.get_or_create(
        idExtraccion=1,
        defaults={
            'donante': donante_carlos,
            'personalSalud': enfermero_silvia,
            'codigoExtraccion': 'EXT-20260510-1001',
            'modalidadDonacion': 'Sangre Total',
            'brazoExtraccion': 'Izquierdo',
            'volumenExtraidoMl': 450,
            'fechaHora': datetime(2026, 5, 10, 9, 30)
        }
    )

    print("Sembrado completado con éxito.")

if __name__ == '__main__':
    seed()
