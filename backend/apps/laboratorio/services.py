from contextlib import contextmanager

from django.db import connection, transaction
from rest_framework.exceptions import NotFound, ValidationError


@contextmanager
def operacion_auditada(request):
    """Contexto local a la transacción; no persiste en conexiones reutilizadas.

    Los triggers son el único escritor de la bitácora para las tablas críticas
    de la migración 06. No llamar registrar_auditoria otra vez por esas filas.
    """
    if connection.vendor != 'postgresql':
        raise ValidationError('Esta operación requiere PostgreSQL y la migración 06.')
    with transaction.atomic():
        rol = request.auth.get('rolActivo', '') if request.auth else ''
        if not rol or not request.user.roles.filter(codigoRol=rol).exists():
            raise ValidationError('Seleccione un rol activo asignado a su cuenta.')
        with connection.cursor() as cursor:
            for key, value in {
                'hemovida.usuario_id': str(request.user.idUsuario),
                'hemovida.rol_activo': rol,
                'hemovida.ip': request.META.get('REMOTE_ADDR', '')[:45],
                'hemovida.origen': 'backend',
            }.items():
                cursor.execute('SELECT set_config(%s, %s, true)', [key, value])
        yield


def bloquear_madre(cursor, madre):
    cursor.execute('SELECT idunidadmadre FROM public.unidadsangretotal WHERE idunidadmadre=%s FOR UPDATE', [madre])
    if not cursor.fetchone():
        raise NotFound('Bolsa madre inexistente.')


def guardar_analisis(request, madre, tipo, datos, analisis_id=None):
    # Los identificadores SQL provienen exclusivamente de este mapa, nunca del cliente.
    tabla, pk = {
        'serologia': ('analisisinmunoserologico', 'idanalisis'),
        'hematologia': ('analisisinmunohematologico', 'idanalisishematologico'),
    }[tipo]
    with operacion_auditada(request), connection.cursor() as cursor:
        bloquear_madre(cursor, madre)
        cursor.execute('SELECT idpersona FROM public.personalsalud WHERE idpersona=%s', [request.user.persona_id])
        if not cursor.fetchone():
            raise ValidationError('La cuenta debe estar vinculada a un profesional de salud.')
        valores = dict(datos, idpersonalsalud=request.user.persona_id)
        if tipo == 'hematologia':
            valores['etapaanalisis'] = 'Post-Extraccion'
        else:
            # No se usa este campo legado como autorización de colecta ni liberación.
            valores['habilitaextraccion'] = False
        if analisis_id is None:
            valores['idunidadmadre'] = madre
            columnas = list(valores)
            cursor.execute(
                f'INSERT INTO public.{tabla} ({", ".join(columnas)}) VALUES ({", ".join(["%s"] * len(columnas))}) RETURNING {pk}',
                list(valores.values()),
            )
        else:
            cursor.execute(
                f'UPDATE public.{tabla} SET {", ".join(k+"=%s" for k in valores)} '
                f'WHERE {pk}=%s AND idunidadmadre=%s RETURNING {pk}',
                [*valores.values(), analisis_id, madre],
            )
        row = cursor.fetchone()
        if not row:
            raise NotFound('Análisis inexistente en esta bolsa madre.')
        return row[0]


def liberar_lote(request, madre):
    with operacion_auditada(request), connection.cursor() as cursor:
        bloquear_madre(cursor, madre)
        cursor.execute('SELECT public.hemo_lote_aprobado(%s)', [madre])
        if not cursor.fetchone()[0]:
            raise ValidationError('Liberación pendiente: CU13 y CU14 deben estar aprobados y concordar con el grupo de la madre.')
        cursor.execute("SELECT estadoliberacion FROM public.unidadsangretotal WHERE idunidadmadre=%s", [madre])
        if cursor.fetchone()[0] == 'Rechazada':
            raise ValidationError('La madre está rechazada; requiere revisión técnica antes de liberar.')
        cursor.execute("SELECT idejemplarbolsa FROM public.ejemplarbolsa WHERE idunidadmadre=%s AND estadobolsak='En Cuarentena' ORDER BY idejemplarbolsa FOR UPDATE", [madre])
        ids = [r[0] for r in cursor.fetchall()]
        cursor.execute("UPDATE public.unidadsangretotal SET estadoliberacion='Liberada Apta' WHERE idunidadmadre=%s AND estadoliberacion<>'Liberada Apta'", [madre])
        if ids:
            # Una reserva autóloga permanece exclusiva y debe reactivarse por su flujo.
            cursor.execute("SELECT 1 FROM ejemplarbolsa b WHERE b.idejemplarbolsa=ANY(%s) AND b.esexclusivoautologo AND NOT EXISTS(SELECT 1 FROM reservasangre r WHERE r.idejemplarbolsa=b.idejemplarbolsa AND r.esautologa AND r.estadoreserva='Activa' AND r.fechavencimientoreserva>=CURRENT_DATE)",[ids])
            if cursor.fetchone():raise ValidationError('Falta reserva exclusiva autóloga vigente; no se libera el lote.')
            cursor.execute("UPDATE public.ejemplarbolsa SET estadobolsak=CASE WHEN esexclusivoautologo THEN 'Reservada' ELSE 'Disponible' END WHERE idejemplarbolsa=ANY(%s)", [ids])
        return ids
