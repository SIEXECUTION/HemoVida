"""
Modelos ORM para la app Donantes de HemoVida.
Mapeo de tablas existentes en PostgreSQL:
- donante
- extracciondonacion
"""
from django.db import models
from apps.seguridad.models import Persona, PersonalSalud

class Donante(models.Model):
    persona = models.OneToOneField(
        Persona, 
        primary_key=True, 
        on_delete=models.CASCADE, 
        db_column='idpersona',
        related_name='donante'
    )
    tipoDonante = models.CharField(
        max_length=50,
        choices=[
            ('Voluntario Altruista', 'Voluntario Altruista'),
            ('Reposicion Familiar', 'Reposición Familiar'),
            ('Autologo', 'Autólogo'),
        ],
        db_column='tipodonante'
    )
    carnetDigitalCodigo = models.CharField(max_length=50, unique=True, db_column='carnetdigitalcodigo')
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
    donante = models.ForeignKey(
        Donante, 
        on_delete=models.RESTRICT, 
        db_column='iddonante',
        related_name='extracciones'
    )
    idTriaje = models.IntegerField(null=True, blank=True, unique=True, db_column='idtriaje')
    personalSalud = models.ForeignKey(
        PersonalSalud, 
        on_delete=models.RESTRICT, 
        db_column='idpersonalsalud',
        related_name='extracciones_realizadas'
    )
    codigoExtraccion = models.CharField(max_length=50, unique=True, db_column='codigoextraccion')
    modalidadDonacion = models.CharField(
        max_length=50,
        default='Sangre Total',
        choices=[
            ('Sangre Total', 'Sangre Total'),
            ('Aferesis Plaquetaria', 'Aférisis Plaquetaria'),
            ('Autologa', 'Autóloga'),
        ],
        db_column='modalidaddonacion'
    )
    fechaHora = models.DateTimeField(auto_now_add=True, db_column='fechahora')
    brazoExtraccion = models.CharField(
        max_length=20,
        choices=[('Izquierdo', 'Izquierdo'), ('Derecho', 'Derecho')],
        db_column='brazoextraccion'
    )
    volumenExtraidoMl = models.IntegerField(db_column='volumenextraidoml')

    class Meta:
        managed = False
        db_table = 'extracciondonacion'
        verbose_name = 'Extracción de Donación'
        verbose_name_plural = 'Extracciones de Donaciones'
        ordering = ['-fechaHora']

    def __str__(self):
        return f"{self.codigoExtraccion} - {self.donante.persona.nombreCompleto} ({self.volumenExtraidoMl} ml)"
