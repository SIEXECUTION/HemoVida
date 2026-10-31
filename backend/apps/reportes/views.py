import csv, io, json
from django.db import connection, DatabaseError
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.clinica.views import ClinicalRole
from apps.clinica.services import revision07
from apps.seguridad.utils import registrar_auditoria, get_client_ip
from apps.laboratorio.views import ConflictoLaboratorio
from .services import CATALOG, METRICS, query


class Catalogo(APIView):
    permission_classes = [ClinicalRole]
    roles = ["ADMIN"]

    def get(self, request):
        from apps.clinica.services import rows

        with connection.cursor() as c:
            revision07(c)
            groups = rows(
                c,
                "SELECT idgrupo::text AS valor,grupoabo||' '||factorrh AS etiqueta FROM gruposanguineo ORDER BY idgrupo",
            )
            institutions = rows(
                c,
                "SELECT idinstitucion::text AS valor,nombreinstitucion AS etiqueta FROM institucionsalud ORDER BY nombreinstitucion",
            )
            categories = rows(
                c,
                "SELECT DISTINCT categoriaetaria AS valor,categoriaetaria AS etiqueta FROM ejemplarbolsa ORDER BY categoriaetaria",
            )
            components = rows(
                c,
                "SELECT DISTINCT tipocomponente AS valor,tipocomponente AS etiqueta FROM ejemplarbolsa ORDER BY tipocomponente",
            )
            priorities = rows(
                c,
                "SELECT DISTINCT prioridadsolicitud AS valor,prioridadsolicitud AS etiqueta FROM solicitudhospitalaria ORDER BY prioridadsolicitud",
            )
        states = {
            "triajes": ["Apto", "Rechazado"],
            "citas": ["Programada", "Atendida", "Cancelada", "Inasistencia"],
            "serologia": ["Apto", "No Apto"],
            "cartera": ["Pendiente", "Parcial", "Liquidada", "Vencida"],
        }
        choices = lambda values: [{"valor": v, "etiqueta": v} for v in values]
        common = {
            "grupo": groups,
            "institucion": institutions,
            "categoria": categories,
            "componente": components,
            "prioridad": priorities,
            "metodo": choices(
                [
                    "Efectivo",
                    "Deposito",
                    "Transferencia QR",
                    "Transferencia bancaria",
                    "Tarjeta",
                ]
            ),
            "proveedor": choices(["Stripe", "Manual"]),
        }
        return Response(
            {
                k: {
                    "dimensiones": list(v["dims"]),
                    "filtros": list(v["filters"]),
                    "periodo": bool(v["date"]),
                    "unidad": v["unit"],
                    "metricas": METRICS[k],
                    "opciones": {
                        field: (
                            choices(states[k])
                            if field == "estado"
                            else common.get(field, [])
                        )
                        for field in v["filters"]
                    },
                }
                for k, v in CATALOG.items()
            }
        )


class Consulta(APIView):
    permission_classes = [ClinicalRole]
    roles = ["ADMIN"]

    def get(self, request):
        format = request.query_params.get("formato", "json")
        if format not in ["json", "csv", "pdf"]:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Formato no permitido.")
        try:
            with connection.cursor() as c:
                revision07(c)
            result = query(request.query_params)
            registrar_auditoria(
                request.user,
                "CU24 consulta "
                + result["fuente"]
                + " formato="
                + request.query_params.get("formato", "json"),
                "reporte",
                ip_origen=get_client_ip(request),
                rol_activo=request.auth.get("rolActivo"),
            )
        except DatabaseError as exc:
            raise ConflictoLaboratorio() from exc
        if format == "json":
            return Response(result)
        if format == "csv":
            out = io.StringIO()
            writer = csv.writer(out)
            writer.writerow(
                [
                    "HemoVida CU24",
                    result["fuente"],
                    "Unidad",
                    result["unidad"],
                    "Desde",
                    result["desde"],
                    "Hasta",
                    result["hasta"],
                    "Actualizado",
                    str(result["actualizado"]),
                ]
            )
            writer.writerow(
                ["Filtros", json.dumps(result["filtros"], ensure_ascii=False)]
            )
            cols = (
                list(result["filas"][0])
                if result["filas"]
                else ["dimension", *METRICS[result["fuente"]]]
            )
            writer.writerow(cols)
            for row in result["filas"]:
                writer.writerow([safe(row.get(k)) for k in cols])
            response = HttpResponse(
                "﻿" + out.getvalue(), content_type="text/csv; charset=utf-8"
            )
        else:
            from reportlab.pdfgen import canvas

            out = io.BytesIO()
            pdf = canvas.Canvas(out, pagesize=(842, 595))
            y = 560

            def line(text):
                nonlocal y
                import textwrap

                for fragment in textwrap.wrap(str(text), width=135) or [""]:
                    if y < 40:
                        pdf.showPage()
                        pdf.setFont("Helvetica", 10)
                        y = 560
                    pdf.drawString(30, y, fragment)
                    y -= 16

            pdf.setFont("Helvetica", 10)
            line("HemoVida CU24 - " + result["fuente"] + " - " + result["unidad"])
            line("Actualizado: " + str(result["actualizado"]))
            line("Periodo: " + str(result["desde"]) + " a " + str(result["hasta"]))
            line("Filtros: " + json.dumps(result["filtros"], ensure_ascii=False))
            line("Totales: " + str(result["totales"]))
            cols = (
                list(result["filas"][0])
                if result["filas"]
                else ["dimension", *METRICS[result["fuente"]]]
            )
            line(" | ".join(cols))
            for row in result["filas"]:
                line(
                    " | ".join(
                        str(row.get(k) if row.get(k) is not None else "No aplica")
                        for k in cols
                    )
                )
            pdf.save()
            response = HttpResponse(out.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = (
            'attachment; filename="hemovida-' + result["fuente"] + "." + format + '"'
        )
        return response


def safe(value):
    if value is None:
        return "No aplica"
    if isinstance(value, str) and value[:1] in ["=", "+", "-", "@"]:
        return "'" + value
    return value
