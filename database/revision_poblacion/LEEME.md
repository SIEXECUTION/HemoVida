# Población propuesta para revisión

Preparación solicitada: solo SQL para revisar, sin aplicarlo. No se conectó a Supabase ni se ejecutó esta población. No es una migración 08.

1. `01_revisar_usuarios.sql`: consultas de solo lectura, roles, vínculo con personal, auditoría y claves foráneas. No devuelve contraseñas ni datos de contacto.
2. `02_poblacion_demo_revision.sql`: propuesta aditiva para 6 personas sintéticas, 6 candidatos, 4 citas pendientes de asistencia, 3 receptores, una institución, 3 solicitudes, 2 obligaciones pendientes (100/200 BOB) y un equipo vacío. Los códigos DEMO permiten identificar los registros; una segunda ejecución no vuelve a insertar los escenarios existentes ni reinicia sus estados. No crea cuentas ni cambia roles/contraseñas. No restaura el dump sobre la BD existente.
3. `03_desactivar_usuarios_opcional.sql`: selección inicialmente vacía; exige ID y username exactos, protege ADMIN y conserva identidad/auditoría. Desactiva solo si se seleccionan explícitamente cuentas; no contiene DELETE. No se ejecutó.

02 y 03 terminan con ROLLBACK para revisión. Incluso con ROLLBACK las secuencias pueden avanzar si se ejecutan inserciones; no se promete ausencia total de efectos por ejecutar una previsualización. Los scripts NO fueron ejecutados sobre ninguna base. No cambiar ROLLBACK por COMMIT sin revisar resultados y destino.

Las citas DEMO incluyen un prefiltro favorable sintético para poder ensayar admisión; no contienen dictámenes ni resultados médicos reales. Se requiere un operador existente con rol y vínculo a PersonalSalud. Los protocolos de conservación deben ser aprobados por el responsable desde la aplicación. No se crean análisis aptos, bolsas disponibles, pagos confirmados ni comprobantes ficticios. Stripe sigue en modo test para cualquier prueba posterior; una carga en Supabase crearía registros persistentes de demostración.

El informe individual del archivo y el CSV de 23 usuarios se guardaron junto al archivo proporcionado, en `C:/Users/Sebas/Desktop/pg/revision_hemovida`, fuera del repositorio. Los nombres no demuestran que una cuenta sea descartable. La propuesta no elimina ni desactiva cuentas automáticamente.

Validación: sintaxis SQL y bloques PL/pgSQL analizados offline con pglast. No se probó la ejecución, constraints ni triggers: eso requiere un ensayo en una base de pruebas después de revisar el SQL. Mantener actualizado el esquema de referencia; requiere 06/07 y catálogo O Positivo existente. Se usan identificadores generados por PostgreSQL; no se reinician secuencias ni se asumen IDs del dump.
