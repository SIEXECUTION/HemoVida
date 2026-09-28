"""
Modelos ORM para la app Inventario de HemoVida.
Mapeo de tablas existentes en PostgreSQL:
- gruposanguineo
- parametrostockminimo
- ejemplarbolsa
"""
from django.db import models

class GrupoSanguineo(models.Model):
    idGrupo = models.AutoField(primary_key=True, db_column='idgrupo')
    grupoABO = models.CharField(
        max_length=5,
        choices=[('A', 'A'), ('B', 'B'), ('AB', 'AB'), ('O', 'O')],
        db_column='grupoabo'
    )
    factorRh = models.CharField(
        max_length=10,
        choices=[('Positivo', 'Positivo'), ('Negativo', 'Negativo')],
        db_column='factorrh'
    )

    class Meta:
        managed = False
        db_table = 'gruposanguineo'
        verbose_name = 'Grupo Sanguíneo'
        verbose_name_plural = 'Grupos Sanguíneos'
        unique_together = (('grupoABO', 'factorRh'),)

    def __str__(self):
        return f"{self.grupoABO} {self.factorRh}"

    @property
    def tipificacion(self):
        return f"{self.grupoABO} {self.factorRh}"


class ParametroStockMinimo(models.Model):
    COMPONENTES_CHOICES = [
        ('Concentrado de Globulos Rojos', 'Concentrado de Glóbulos Rojos'),
        ('Plasma Fresco Congelado', 'Plasma Fresco Congelado'),
        ('Concentrado Plaquetario', 'Concentrado Plaquetario'),
        ('Crioprecipitado', 'Crioprecipitado'),
    ]

    idParametro = models.AutoField(primary_key=True, db_column='idparametro')
    grupo = models.ForeignKey(
        GrupoSanguineo,
        on_delete=models.RESTRICT,
        db_column='idgrupo',
        related_name='parametros_stock'
    )
    tipoComponente = models.CharField(
        max_length=50,
        choices=COMPONENTES_CHOICES,
        db_column='tipocomponente'
    )
    stockMinimoSeguridad = models.IntegerField(db_column='stockminimoseguridad')
    stockCriticoAlerta = models.IntegerField(db_column='stockcriticoalerta')
    stockOptimo = models.IntegerField(default=0, db_column='stockoptimo')

    class Meta:
        managed = False
        db_table = 'parametrostockminimo'
        verbose_name = 'Parámetro de Stock Mínimo'
        verbose_name_plural = 'Parámetros de Stock Mínimo'
        unique_together = (('grupo', 'tipoComponente'),)
        ordering = ['grupo__idGrupo', 'tipoComponente']

    def __str__(self):
        return f"{self.grupo.tipificacion} - {self.tipoComponente} (Mín: {self.stockMinimoSeguridad}, Crítico: {self.stockCriticoAlerta})"


class EjemplarBolsa(models.Model):
    ESTADOS_BOLSA = [
        ('En Cuarentena', 'En Cuarentena'),
        ('Disponible', 'Disponible'),
        ('Reservada', 'Reservada'),
        ('Despachada', 'Despachada'),
        ('Baja', 'Baja'),
    ]

    idEjemplarBolsa = models.AutoField(primary_key=True, db_column='idejemplarbolsa')
    idUnidadMadre = models.IntegerField(db_column='idunidadmadre')
    grupo = models.ForeignKey(
        GrupoSanguineo,
        on_delete=models.RESTRICT,
        db_column='idgrupo',
        related_name='bolsas'
    )
    idUbicacion = models.IntegerField(null=True, blank=True, db_column='idubicacion')
    codigoEjemplarK = models.CharField(max_length=50, unique=True, db_column='codigoejemplark')
    tipoComponente = models.CharField(
        max_length=50,
        choices=ParametroStockMinimo.COMPONENTES_CHOICES,
        db_column='tipocomponente'
    )
    volumenMl = models.IntegerField(db_column='volumenml')
    fechaFraccionamiento = models.DateTimeField(db_column='fechafraccionamiento')
    fechaCaducidad = models.DateField(db_column='fechacaducidad')
    esExclusivoAutologo = models.BooleanField(default=False, db_column='esexclusivoautologo')
    estadoBolsaK = models.CharField(
        max_length=30,
        default='En Cuarentena',
        choices=ESTADOS_BOLSA,
        db_column='estadobolsak'
    )

    class Meta:
        managed = False
        db_table = 'ejemplarbolsa'
        verbose_name = 'Ejemplar de Bolsa (K)'
        verbose_name_plural = 'Ejemplares de Bolsas (K)'
        ordering = ['fechaCaducidad']

    def __str__(self):
        return f"{self.codigoEjemplarK} ({self.tipoComponente} - {self.grupo.tipificacion}) [{self.estadoBolsaK}]"
