"""Conciliación de la clasificación del lote con CU14; no libera unidades."""

from django.db import connection
from rest_framework.exceptions import ValidationError
from apps.clinica.services import clinical_operation, professional, one, rows, audit
from .services import bloquear_madre


def correct_group(request, madre, data):
    with clinical_operation(request), connection.cursor() as c:
        professional(c, request)
        bloquear_madre(c, madre)
        before = one(
            c, "SELECT * FROM unidadsangretotal WHERE idunidadmadre=%s", [madre]
        )
        if before["estadoliberacion"] == "Rechazada":
            raise ValidationError(
                "Lote rechazado: requiere revisión técnica específica."
            )
        if before["idgrupo"] != data["idgrupo_anterior"]:
            raise ValidationError(
                "La clasificación cambió. Recarga el lote antes de corregir."
            )
        analysis = one(
            c,
            "SELECT * FROM analisisinmunohematologico WHERE idunidadmadre=%s AND etapaanalisis='Post-Extraccion' ORDER BY fechaanalisis DESC,idanalisishematologico DESC LIMIT 1 FOR UPDATE",
            [madre],
        )
        if analysis["idanalisishematologico"] != data["idanalisishematologico"]:
            raise ValidationError("El análisis de referencia cambió. Recarga el lote.")
        if analysis["dictameninmunohematologico"] != "Apto":
            raise ValidationError(
                "Se requiere un análisis postextracción certificado Apto."
            )
        if (analysis["grupoaboconfirmado"], analysis["factorrhconfirmado"]) != (
            data["grupoaboconfirmado"],
            data["factorrhconfirmado"],
        ):
            raise ValidationError(
                "ABO/Rh del análisis cambió. Recarga y verifica el rotulado antes de corregir."
            )
        target = one(
            c,
            "SELECT * FROM gruposanguineo WHERE grupoabo=%s AND factorrh=%s",
            [analysis["grupoaboconfirmado"], analysis["factorrhconfirmado"]],
        )
        if before["idgrupo"] == target["idgrupo"]:
            raise ValidationError(
                "El lote ya coincide con el análisis; no hay grupo que corregir."
            )
        parts = rows(
            c,
            "SELECT * FROM ejemplarbolsa WHERE idunidadmadre=%s ORDER BY idejemplarbolsa FOR UPDATE",
            [madre],
        )
        if any(p["estadobolsak"] in ["Despachada", "Baja"] for p in parts):
            raise ValidationError(
                "Existen componentes despachados o dados de baja; no se reescribe su clasificación histórica."
            )
        if any(p["idgrupo"] != before["idgrupo"] for p in parts):
            raise ValidationError(
                "Los componentes tienen grupos previos inconsistentes; requiere revisión técnica."
            )
        c.execute(
            "SELECT 1 FROM detalledespacho d JOIN ejemplarbolsa b USING(idejemplarbolsa) WHERE b.idunidadmadre=%s UNION ALL SELECT 1 FROM pruebacompatibilidad p JOIN ejemplarbolsa b USING(idejemplarbolsa) WHERE b.idunidadmadre=%s LIMIT 1",
            [madre, madre],
        )
        if c.fetchone():
            raise ValidationError(
                "El lote tiene pruebas pretransfusionales o entregas registradas; requiere un circuito de revisión específico."
            )
        c.execute(
            "SELECT r.idgrupo FROM colectaautologa a JOIN receptor r ON r.idpersona=a.idreceptor WHERE a.idunidadmadre=%s",
            [madre],
        )
        receptor = c.fetchone()
        if receptor and receptor[0] != target["idgrupo"]:
            raise ValidationError(
                "El grupo del paciente autólogo no coincide; primero debe revisarse su historial. No se modifica automáticamente."
            )
        reservations = rows(
            c,
            "UPDATE reservasangre SET estadoreserva='Cancelada' WHERE estadoreserva='Activa' AND idejemplarbolsa IN (SELECT idejemplarbolsa FROM ejemplarbolsa WHERE idunidadmadre=%s) RETURNING idreserva",
            [madre],
        )
        for r in reservations:
            audit(
                c,
                request,
                "reservasangre",
                r["idreserva"],
                "Reserva cancelada por corrección ABO/Rh del lote",
            )
        c.execute(
            "UPDATE ejemplarbolsa SET estadobolsak='En Cuarentena' WHERE idunidadmadre=%s AND estadobolsak<>'En Cuarentena'",
            [madre],
        )
        c.execute(
            "UPDATE unidadsangretotal SET estadoliberacion='En Cuarentena' WHERE idunidadmadre=%s AND estadoliberacion<>'En Cuarentena'",
            [madre],
        )
        c.execute(
            "UPDATE unidadsangretotal SET idgrupo=%s WHERE idunidadmadre=%s",
            [target["idgrupo"], madre],
        )
        c.execute(
            "UPDATE ejemplarbolsa SET idgrupo=%s WHERE idunidadmadre=%s",
            [target["idgrupo"], madre],
        )
        # Evento de decisión distinto de los cambios por fila auditados por 06.
        audit(
            c,
            request,
            "correccion_grupo",
            madre,
            f"CU14 ABO/Rh grupo {before['idgrupo']}->{target['idgrupo']}; análisis {analysis['idanalisishematologico']}; motivo: {data['motivo']}",
        )
        return {
            "idunidadmadre": madre,
            "idgrupo": target["idgrupo"],
            "grupoabo": target["grupoabo"],
            "factorrh": target["factorrh"],
            "componentes": len(parts),
            "reservas_canceladas": len(reservations),
            "estado": "En Cuarentena",
        }
