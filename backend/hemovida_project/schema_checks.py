"""Contrato aditivo de ciclo 3. Solo consultas de metadatos."""

CYCLE3_COLUMNS = {
    "triajeclinico": ["observaciones"],
    "diferimiento": [
        "idserologia",
        "idhematologia",
        "comunicacionfecha",
        "canalcomunicacion",
        "comunicadopor",
    ],
    "incidenciacolecta": [
        "idincidencia",
        "idtriaje",
        "idpersonalsalud",
        "motivo",
        "volumenobtenidoml",
    ],
    "colectaautologa": [
        "idunidadmadre",
        "idreceptor",
        "fechacirugia",
        "idpersonalsalud",
    ],
    "protocoloconservacion": [
        "tipocomponente",
        "temperaturamin",
        "temperaturamax",
        "diasconservacion",
        "requiereagitacion",
        "aprobadopor",
        "fechaaprobacion",
    ],
    "ubicacionalmacen": ["tieneagitacion"],
    "deudafinanciera": ["moneda"],
    "checkoutstripe": [
        "idpago",
        "idempotencia",
        "sesionid",
        "urlcheckout",
        "moneda",
        "monto",
        "idusuario",
        "fechacreacion",
    ],
    "eventostripe": [
        "idevento",
        "tipo",
        "sesionid",
        "idpago",
        "resultado",
        "fecharecepcion",
    ],
}


def missing_cycle3(cursor):
    cursor.execute(
        "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY(%s)",
        [list(CYCLE3_COLUMNS)],
    )
    present = set(cursor.fetchall())
    return [
        table + "." + column
        for table, columns in CYCLE3_COLUMNS.items()
        for column in columns
        if (table, column) not in present
    ]
