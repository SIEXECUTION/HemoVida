"""PDF de CU23: encabezados legibles, tabla repetida y páginas completas."""

from io import BytesIO
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


def render(result):
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=32,
        rightMargin=32,
        topMargin=32,
        bottomMargin=34,
        title=result["titulo"],
        author="HemoVida",
    )
    styles = getSampleStyleSheet()
    cell = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8, leading=11)
    header = ParagraphStyle(
        "header", parent=cell, textColor=colors.white, fontName="Helvetica-Bold"
    )

    def text(value, style=cell):
        return Paragraph(escape("No aplica" if value is None else str(value)), style)

    stamp = (
        result["actualizado"]
        .astimezone(ZoneInfo("America/La_Paz"))
        .strftime("%d/%m/%Y %H:%M")
    )
    story = [
        text("HemoVida - Informe de gestión", styles["Heading2"]),
        text(result["titulo"], styles["Title"]),
        text("Generado: " + stamp + " (Bolivia)"),
        Spacer(1, 8),
    ]
    period = (
        ("Período: " + str(result["desde"]) + " a " + str(result["hasta"]))
        if result["desde"]
        else "Estado actual al momento de generación"
    )
    story += [text(period), text("Unidad: " + result["unidad"]), Spacer(1, 8)]
    labels = result["etiquetas"]
    story += [
        text(
            "Totales: "
            + " | ".join(
                labels.get(k, k) + ": " + ("No aplica" if v is None else str(v))
                for k, v in result["totales"].items()
            )
        ),
        Spacer(1, 12),
    ]
    columns = result["columnas"]
    data = [[text(labels.get(col, col), header) for col in columns]]
    for row in result["filas"]:
        data.append([text(row.get(col)) for col in columns])
    if len(data) == 1:
        story.append(text("No hay registros para los criterios seleccionados."))
    else:
        table = Table(
            data,
            colWidths=[doc.width / len(columns)] * len(columns),
            repeatRows=1,
            hAlign="LEFT",
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#881337")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f8fafc")],
                    ),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#881337")),
                ]
            )
        )
        story.append(table)
    story += [Spacer(1, 12), text("Criterios", styles["Heading3"])]
    story.extend(text(value) for value in result["criterios"].values())

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.drawString(32, 18, "HemoVida - Informe de gestión")
        canvas.drawRightString(
            landscape(A4)[0] - 32, 18, "Página " + str(document.page)
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    response = HttpResponse(output.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = (
        'attachment; filename="hemovida-' + result["plantilla"] + '.pdf"'
    )
    return response
