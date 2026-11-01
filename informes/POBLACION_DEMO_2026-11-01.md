# Población académica aplicada — 1 de noviembre de 2026

**Supabase quedó poblado con los escenarios DEMO autorizados.** Se ejecutó la
versión `7489429` del SQL, después de aprobación explícita del usuario para
cargar en Supabase con respaldo previo. El COMMIT se verificó desde otra conexión.

## Registros guardados

| Registro nuevo | Cantidad |
| --- | ---: |
| Personas / candidaturas | 6 / 6 |
| Citas / prefiltros históricos | 4 / 4 |
| Respuestas de detalle | 24 (6 requisitos por cita) |
| Receptores | 3 |
| Programación autóloga / historial | 1 / 1 |
| Institución | 1 |
| Solicitudes / detalles de componente | 3 / 3 |
| Deudas pendientes | 2, por 100 y 200 BOB |
| Equipo de almacenamiento vacío | 1 |

Códigos identificadores: `DEMO-C3-*`. El programa `DEMO-C3-AUTO-04` quedó
`PendienteRevision`, versión 1. No se crearon pagos, firmas, extracciones,
análisis aprobados ni bolsas liberadas. Los protocolos existentes se conservaron.

Las citas son de evaluación y quedaron sin asistencia confirmada:

| Persona | ID cita | Fecha y hora de Bolivia | Prefiltro |
| --- | ---: | --- | --- |
| DEMO-C3-P01 | 110 | 02/11/2026 08:00 | Cumple requisitos declarados sintéticos |
| DEMO-C3-P02 | 111 | 02/11/2026 08:15 | Un requisito pendiente de revisión |
| DEMO-C3-P03 | 112 | 02/11/2026 08:30 | Un requisito pendiente de revisión |
| DEMO-C3-P04 | 113 | 02/11/2026 08:45 | Cumple requisitos declarados sintéticos |

Son turnos de 15 minutos, con un cupo cada uno. Ningún prefiltro constituye
aptitud clínica ni autorización para extraer. La cirugía sintética del programa
se calcula a 30 días de su creación y todavía requiere revisión por Bioquímica.

## Respaldo y ejecución

Respaldo privado fuera de Git:
`.venv/poblacion_respaldos/20261101T105502Z/public_antes.dump`.
Contiene estructura y datos del esquema public; no incluye roles globales,
configuración de Supabase Auth/Storage ni servicios externos.
Tamaño: 260478 bytes. SHA256:
`cb998cb38c31c870fa9a6a708ae5d1a44f24ad0ae7a0f35cc38bc4acfb620a65`.
Se comprobó que pg_restore puede leer su índice. No se realizó una restauración.

Antes del COMMIT se compararon conteos de 31 tablas y huellas de usuario,
usuariorol, rol, requisitos y protocolos. Las diferencias coincidieron con los
registros autorizados. Se conservaron los 23 usuarios y sus datos, sin cambios
de contraseñas o permisos. La bitácora distingue la carga como `BD directa`,
usuario de sesión nulo y origen `poblacion_demo_revision`.

La validación técnica inicial del ejecutor se detuvo antes de insertar debido
a una comprobación de texto del ROLLBACK. Se corrigió, se generó un nuevo respaldo
y se completó una única carga confirmada. No hubo una población parcial.
El SQL del repositorio mantiene ROLLBACK; el ejecutor privado retiró los límites
de transacción del archivo, comprobó resultados y confirmó una sola transacción.
Los ajustes de secuencia pueden persistir aunque una transacción se revierta.

## Pruebas y comprobaciones

- Dos pruebas integradas locales: secuencias, repetición sin duplicados, horarios,
  días cerrados, catálogo/hash/respuestas, programación, historial y cartera.
- Verificación posterior desde otra conexión a Supabase: seis personas,
  cuatro citas con turnos/snapshots y 24 respuestas, programa pendiente y saldo
  exacto de 300 BOB sin abonos.
- API de agenda sobre Supabase: HTTP 200, 4 citas DEMO y 6 candidatos.
- API de programas sobre Supabase: HTTP 200, 1 programa DEMO pendiente.
- API de finanzas sobre Supabase: HTTP 200, 2 deudas DEMO y 300 BOB de saldo.

Estas últimas comprobaciones invocaron las vistas reales con perfil ADMIN
técnico y transacción de solo lectura. No equivalen a una nueva prueba del
login ni a aceptación visual en navegador. No se llamó a Stripe o Brevo.

Para revisar en la aplicación: buscar `DEMO-C3-` en Agenda y Programación autóloga;
en Agenda seleccionar el 2 de noviembre de 2026. En Finanzas (ADMIN), localizar
las solicitudes `DEMO-C3-SOL-04` y `DEMO-C3-SOL-05`.

La población inicial está completada. Falta recorrer desde la aplicación los
actos que correspondan a cada escenario. El despliegue del código nuevo y la
actualización del Word siguen separados de esta carga de datos.
