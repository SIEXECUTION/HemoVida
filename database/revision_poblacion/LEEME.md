# Población académica de los ciclos 2 y 3

Estado al 1 de noviembre de 2026: **población aplicada en Supabase**, después
de autorización explícita del usuario y respaldo privado de estructura y datos.
La verificación desde una conexión nueva confirmó 6 personas, 4 citas con
prefiltros completos, 1 programa pendiente y 2 deudas por 300 BOB, entre los
registros detallados abajo. Las API de agenda, programas y finanzas respondieron
200 con esos datos. Los 23 usuarios anteriores se conservaron sin modificaciones.
Ver [informe de aplicación](../../informes/POBLACION_DEMO_2026-11-01.md).
El archivo SQL del repositorio conserva ROLLBACK para evitar cargas accidentales;
la ejecución autorizada se confirmó mediante COMMIT controlado.

## Archivos

1. `01_revisar_usuarios.sql`: revisión de usuarios, roles, personal, auditoría y
   relaciones, sin contraseñas ni datos de contacto.
2. `02_poblacion_demo_revision.sql`: población aditiva descrita abajo.
3. `03_desactivar_usuarios_opcional.sql`: selección inicialmente vacía;
   requiere ID y username exactos, protege ADMIN y conserva auditoría.
   No contiene DELETE y no se ejecutó.

## Registros preparados

| Registro | Cantidad | Estado inicial |
| --- | ---: | --- |
| Personas sintéticas y candidaturas | 6 | En Evaluacion; sin análisis |
| Citas, turnos y snapshots de prefiltro | 4 de cada uno* | Evaluacion, Programada, sin asistencia |
| Respuestas de requisitos | Una por requisito activo y cita | P02/P03 tienen un requisito pendiente |
| Receptores | 3 | Grupo O Positivo |
| Programación autóloga e historial | 1 de cada uno | PendienteRevision, versión 1 |
| Institución | 1 | Identificada como DEMO |
| Solicitudes y detalles de componente | 3 de cada uno | Registrada, una unidad por solicitud |
| Obligaciones financieras | 2 | Pendiente, 100 y 200 BOB, sin abonos |
| Equipo de almacenamiento | 1 | DEMO vacío; no acredita medición física |

*Se reutilizan turnos compatibles libres si existen. No se reserva más de un
cupo por intervalo. Se buscan fechas futuras dentro de 14 días, lunes a viernes,
08:00–12:00 y 13:00–17:00 de Bolivia, con duración de 15 minutos y cupo 1.
No se reabre un día cerrado ni se ocupa un turno reservado.

Los códigos `DEMO-C3-*` permiten identificar los escenarios. P01 prepara
triaje/colecta; P02/P03 preparan evaluación de requisitos pendientes; P04
prepara revisión autóloga; P05 finanzas/Stripe y P06 posible tratamiento de
exoneración/convenio. Son puntos de partida, no resultados clínicos dictados.
La cirugía sintética se fecha a 30 días de la carga inicial. Repetir el archivo
no reinicia estados, fechas, pagos o revisiones ya realizados.

El prefiltro conserva el catálogo vigente, su SHA256 compatible con Django y
las respuestas de detalle. No se convierten requisitos pendientes en aptitud
ni diferimiento automáticamente. El programa autólogo no habilita colecta
hasta que el flujo de la aplicación lo revise y apruebe.

## Responsabilidad y límites

Requiere un ADMIN activo y un médico activo vinculado a PersonalSalud.
El ADMIN de menor ID queda como responsable técnico de snapshots/turnos y el
médico de menor ID como referencia de asignación del programa sintético.
La carga directa no representa que hayan iniciado sesión, firmado ni aprobado
un acto: la bitácora la distingue con rol `BD directa`, usuario de sesión nulo
y origen `poblacion_demo_revision`. Las respuestas e indicación están rotuladas
como sintéticas. No se crean cuentas ni se modifican contraseñas o roles.
No se sobrescriben protocolos, preguntas ni personas anteriores.

No se crean triajes aptos, consentimientos firmados, extracciones, bolsas
liberadas, pagos confirmados, comprobantes ni entregas. Esas operaciones deben
recorrerse desde la aplicación; para Stripe se usa modo test. Los datos DEMO
persistidos serían visibles también en reportes de la base compartida.

## Ejecución y confirmación

El archivo termina con `ROLLBACK`: muestra resultados y revierte los registros.
Para una carga persistente, después de revisar y autorizar el destino:

1. Guardar un respaldo privado de esquema y datos antes de insertar.
2. Si quedó una transacción fallida en SQL Editor, ejecutar `ROLLBACK;`.
3. Ejecutar el archivo completo actualizado. Revisar personas, cartera, citas
   y programa que devuelven los SELECT finales.
4. Para guardar, reemplazar únicamente el ROLLBACK final por COMMIT en la copia
   de ejecución autorizada. No mezclar archivos de versiones anteriores.
5. Consultar nuevamente desde una conexión distinta y revisar las pantallas
   de Agenda, Programación autóloga y Finanzas usando los roles autorizados.

## Secuencias y compatibilidad histórica

El script comprueba las secuencias de todas las tablas que inserta, incluida
la bitácora, y adelanta únicamente las que no superan el máximo ID existente.
No reduce secuencias adelantadas. Mantiene bloqueos de escritura hasta terminar
la transacción, con espera máxima de bloqueo de 5 segundos. Ejecutar sin
actividad concurrente, con el propietario de tablas y secuencias.

**Las secuencias pueden avanzar incluso con ROLLBACK.** La revisión no confirma
registros, pero no promete ausencia total de efectos sobre contadores.
Una cita DEMO de la versión anterior sin turno o snapshot provoca un error
explícito: requiere revisión y no se modifica silenciosamente.

## Validación realizada

`backend/tests_poblacion_postgres.py`: dos pruebas integradas, exclusivamente
en PostgreSQL local `hemo_liberacion_test:55439`, con rollback de la población.
Verifican secuencia desfasada y adelantada, repetición sin duplicados, horarios,
días cerrados, catálogo/hash/respuestas, programa e historial pendientes,
detalles de solicitudes, 300 BOB de saldo y ausencia de cuentas/pagos nuevos.
También comprueban las API reales de agenda, programas y finanzas; el acceso
financiero de logística devuelve 403. No se llamó a Stripe ni Brevo.
Se verificaron además las mismas API sobre Supabase, en transacción de solo
lectura y con perfil ADMIN de prueba técnica. No se declara una comprobación
visual manual del navegador ni una nueva prueba de inicio de sesión.

El informe individual de usuarios y el CSV original permanecen fuera de Git en
`C:/Users/Sebas/Desktop/pg/revision_hemovida`. No se desactivaron usuarios por
su nombre ni se restauró el dump original sobre Supabase.
