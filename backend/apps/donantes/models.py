"""
Modelos ORM para la app Donantes de HemoVida.
Mapeo de tablas de PostgreSQL (Supabase):
- posibledonador
- donante
- extracciondonacion
"""
from django.db import models
from apps.seguridad.models import Persona, PersonalSalud

class PosibleDonador(models.Model):
    persona = models.OneToOneField(
        Persona,
        primary_key=True,
        on_delete=models.CASCADE,
        db_column='idpersona',
        related_name='posible_donador'
    )
    estadoAptitud = models.CharField(
        max_length=30,
        default='No Apto',
        choices=[
            ('No Apto', 'No Apto'),
            ('En Evaluacion', 'En Evaluacion'),
            ('Apto', 'Apto')
        ],
        db_column='estadoaptitud'
    )
    tieneAnalisis = models.BooleanField(default=False, db_column='tieneanalisis')
    fechaRegistroPostulante = models.DateField(auto_now_add=True, db_column='fecharegistropostulante')

    class Meta:
        managed = False
        db_table = 'posibledonador'
        verbose_name = 'Posible Donador'
        verbose_name_plural = 'Posibles Donadores'

    def __str__(self):
        return f"{self.persona.nombreCompleto} - {self.estadoAptitud} (Análisis: {self.tieneAnalisis})"


class Donante(models.Model):
    persona = models.OneToOneField(
        Persona, 
        primary_key=True, 
        on_delete=models.CASCADE, 
        db_column='idpersona',
        related_name='donante'
    )
    carnetDigitalCodigo = models.CharField(max_length=30, unique=True, db_column='carnetdigitalcodigo')
    tipoDonante = models.CharField(
        max_length=30,
        default='Voluntario Altruista',
        choices=[
            ('Voluntario Altruista', 'Voluntario Altruista'),
            ('Reposicion Familiar', 'Reposicion Familiar'),
            ('Autologo', 'Autologo'),
        ],
        db_column='tipodonante'
    )
    estadoHabilitacion = models.CharField(
        max_length=30,
        default='Apto',
        choices=[
            ('Apto', 'Apto'),
            ('Diferido Temporal', 'Diferido Temporal'),
            ('Diferido Definitivo', 'Diferido Definitivo'),
        ],
        db_column='estadohabilitacion'
    )
    fechaUltimaDonacion = models.DateField(null=True, blank=True, db_column='fechaultimadonacion')

    class Meta:
        managed = False
        db_table = 'donante'
        verbose_name = 'Donante'
        verbose_name_plural = 'Donantes'

    def __str__(self):
        return f"{self.persona.nombreCompleto} - {self.carnetDigitalCodigo} ({self.estadoHabilitacion})"


class ExtraccionDonacion(models.Model):
    idExtraccion = models.AutoField(primary_key=True, db_column='idextraccion')
    personaDonante = models.ForeignKey(
        Persona, 
        on_delete=models.CASCADE, 
        db_column='idpersonadonante',
        related_name='extracciones'
    )
    personalSalud = models.ForeignKey(
        PersonalSalud, 
        on_delete=models.RESTRICT, 
        db_column='idpersonalsalud',
        related_name='extracciones_realizadas'
    )
    codigoExtraccion = models.CharField(max_length=30, unique=True, db_column='codigoextraccion')
    fechaHora = models.DateTimeField(auto_now_add=True, db_column='fechahora')
    volumenExtraidoMl = models.IntegerField(db_column='volumenextraidoml')
    brazoExtraccion = models.CharField(
        max_length=15,
        choices=[('Izquierdo', 'Izquierdo'), ('Derecho', 'Derecho')],
        db_column='brazoextraccion'
    )

    class Meta:
        managed = False
        db_table = 'extracciondonacion'
        verbose_name = 'Extracción de Donación'
        verbose_name_plural = 'Extracciones de Donaciones'
        ordering = ['-fechaHora']

    def __str__(self):
        return f"{self.codigoExtraccion} - {self.personaDonante.nombreCompleto} ({self.volumenExtraidoMl} ml)"
