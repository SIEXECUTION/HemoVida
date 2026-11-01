# Ciclo 2: primer bloque conectado y probado

Estado al 31 de octubre de 2026. Rama `codex/ciclo3-desarrollo-local`.
Se mantiene el diseño HEMOVIDAX y la conexión privada del backend a Supabase por `DATABASE_URL`, puerto 6543. Los cambios no se desplegaron ni se hizo push.

## Alcance real

| Caso | Implementado en este bloque | Pendiente para cierre del caso |
|---|---|---|
| CU06 | Se conserva el autorregistro existente y sus contraseñas. Cuestionario del catálogo real, validación completa en servidor, respuestas por cita y copia histórica del catálogo/respuestas con actor y fecha. | Revisar integralmente el autorregistro heredado y la política de requisitos; borradores incompletos no se guardan todavía en BD. No hay editor de requisitos en este bloque. |
| CU07 | Publicación de agenda diaria, reserva de cupo con bloqueo, consulta propia, reprogramación y cancelación auditadas. Comprueba edad mínima de 18 del documento provisional, diferimientos y descanso para turnos de donación; evaluación no aplica el descanso de colecta. | Cierres excepcionales/feriados y paginación/búsqueda completa de la agenda. No hay agenda multisedes, recordatorios automáticos ni programación autóloga en este bloque. |
| CU08 | Recepción puede confirmar identidad/asistencia y derivar a CU10 sin exigir triaje previo. Ahora exige el día de la cita en Bolivia y cuestionario vigente para las citas nuevas. Evaluación admite prefiltro pendiente de revisión profesional. | Admisión presencial autorizada sin cita y búsqueda integral por CI/carnet desde esta pantalla. La selección actual usa hasta 200 postulantes recientes. |
| CU09 | Registro único por extracción real, artículo efectivamente entregado, estado real del refrigerio y confirmación posterior de entrega con auditoría. Se bloquean duplicados y perfiles no autorizados. | Validación operativa del proceso por recepción/enfermería. La confirmación posterior cambia solo refrigerio; no es un editor de artículos históricos. |
| CU21 | Se conserva la colecta/custodia exclusiva autóloga del ciclo 3. | **Programación preoperatoria pendiente**: indicación, coordinación de citas, cambios/cancelación de cirugía y su revisión. No se confunde esta programación con el módulo de colecta ya existente. |
| CU23 | CU24 conserva consultas y exportaciones reales. | **Catálogo de plantillas estáticas pendiente**, con columnas/agrupaciones fijas por informe. CU24 no se presenta como sustituto de CU23. |

El ciclo 2 **no está cerrado**. Este bloque incorpora persistencia y controles probados, no solamente pantallas.

## Horario confirmado por el usuario

- Un centro, zona `America/La_Paz`.
- Lunes a viernes, 08:00–12:00 y 13:00–17:00.
- Citas de 15 minutos: 4 por hora y **32 por día completo**. Se interpretó un cupo por intervalo, sin atención simultánea adicional.
- ADMIN publica un día concreto; no se inventan días abiertos ni se crean citas automáticamente. Al publicar hoy se omiten intervalos ya iniciados. Repetir publicación no duplica turnos.
- Se pueden publicar días dentro de los próximos 180 días. No se aceptan fines de semana, almuerzo, intervalos de otra duración ni turnos incompatibles al reservar, aunque alguien los hubiera insertado directamente en la BD.
- La consulta lista hasta 500 próximos intervalos publicados con cupo y 200 citas; estos límites se deben ampliar con paginación/filtros en la revisión pendiente. Los feriados se pueden dejar sin publicar; no hay cierre masivo de un día ya publicado en esta entrega.

## Prefiltro y pase a evaluación

Las respuestas significan **cumplo/no cumplo el requisito**, no sí/no a una pregunta de polaridad desconocida. Se usa `requisitodonacion`; no se copiaron las preguntas médicas fijas del antiguo modal. El catálogo debe ser revisado por el responsable institucional. El texto del proyecto es la referencia provisional autorizada; no es certificación médica.

El servidor exige exactamente una respuesta por requisito vigente y compara la versión SHA-256 del catálogo. Guarda `detallecitarequisito` y la copia JSON del catálogo/respuestas en una sola transacción. Los cambios posteriores de nombres no reescriben las respuestas históricas. Si cambia el cuestionario, se rechaza un formulario anterior y la reprogramación/admisión requieren revisar el prefiltro.

Con todos los requisitos cumplidos se confirma el turno. Si falta un requisito:

- **Evaluación:** se puede confirmar la cita para revisión profesional; `prefiltroaprobado=false` permanece visible. Recepción deriva a triaje y no certifica aptitud.
- **Donación:** la solicitud queda `Pendiente`, no reserva cupo y no habilita admisión ordinaria; se orienta a evaluación.

No se cambia `estadoaptitud` a Apto, no se genera un diferimiento médico automático y no se autoriza extracción por contestar el cuestionario. CU10 y CU15 conservan dictamen, consentimiento y sus propios controles. Las restricciones clínicas y horarias pendientes del cierre del ciclo 3 siguen registradas en `REVISION_CIERRE_CICLO3.md`.

CU24 separa las solicitudes pendientes: no las cuenta como canceladas ni las incluye en el denominador de asistencia. Se añadió el indicador `pendientes`, también en catálogo/exportaciones.

## Permisos

- `DONANTE` y `POSIBLE_DONADOR`: sus propias citas y respuestas. No pueden enviar el ID de otra persona ni ver su expediente.
- `ADMIN` y `PERS_COLECTA`: gestión de citas, recepción y entregas. Es la correspondencia con los roles operativos existentes; no se creó un rol ficticio de recepción.
- Solo `ADMIN` publica días. Todos los permisos comprueban cuenta activa, perfil activo del JWT y rol realmente asignado en BD.
- Las tablas nuevas tienen RLS habilitada sin políticas públicas. La conexión backend actual usa el propietario; si se cambia a otro rol PostgreSQL, deberán configurarse sus permisos/políticas explícitamente.

## Migración 08: preparada, no aplicada en Supabase

Archivo: `database/08_ciclo2_agenda_prefiltro.sql`.
Añade `agendaturno`, `prefiltrocita`, las referencias `citadonacion.idturno/tipoatencion`, el estado `Pendiente`, índice y triggers de auditoría de las dos tablas nuevas. Mantiene las citas antiguas sin clasificación inventada. No incluye INSERT de horarios, pacientes, protocolos ni preguntas; no cambia contraseñas.

Se aplicó y se comprobó su repetición **solo** en `127.0.0.1:55439/hemo_liberacion_test`. Supabase permanece sin escrituras realizadas por este bloque. Antes de aplicar, revisar SQL, permisos del rol backend y respaldo habitual. La API devuelve 503 con el nombre de la migración si detecta que falta o está incompleta.

Después de aplicar 08 en Supabase y reiniciar el backend local:

1. Entrar con ADMIN → Citas y recepción → Publicar agenda del día.
2. Con postulante/donante, abrir Citas y prefiltro, contestar requisitos y seleccionar atención y turno.
3. Probar reprogramación y cancelación. Una respuesta negativa en donación debe quedar pendiente; en evaluación debe confirmar revisión profesional.
4. El día de atención, recepción confirma presencia física/identidad y deriva a Atención clínica/CU10. No se puede admitir una cita futura.
5. Tras una extracción real, registrar la entrega en Refrigerio e incentivos. No declarar un refrigerio entregado si todavía falta; confirmar posteriormente cuando ocurra.

Esas operaciones manuales usarán la BD indicada en `backend/.env`; si apunta a Supabase, persistirán allí. No ejecutar contra Supabase los fixtures de pruebas ni los scripts de población preparados anteriormente.

## API

Todas las rutas requieren JWT y perfil autorizado:

| Ruta bajo `/api/` | Método | Contrato |
|---|---|---|
| `agenda/catalogo/` | GET | Requisitos/versionado, intervalos publicados, citas visibles y selección de postulantes para recepción |
| `agenda/turnos/` | POST | `{fecha: YYYY-MM-DD}` publica los intervalos del día |
| `agenda/citas/` | POST | `idturno`, `tipoatencion`, `versioncatalogo`, `respuestas[{idrequisito,cumple,observacion?}]`; `idpersona` para recepción |
| `agenda/citas/{id}/reprogramar/` | POST | `{idturno}` |
| `agenda/citas/{id}/cancelar/` | POST | Cancela una cita futura sin asistencia; conserva respuestas |
| `clinica/admision/` | POST | Ruta existente: `idcita`, `idpersona`; valida día y prefiltro/derivación |
| `agenda/incentivos/` | GET/POST | Entregas y extracciones; POST `idextraccion`, `tipoarticulo`, `refrigerioentregado` |
| `agenda/incentivos/{id}/confirmar-refrigerio/` | POST | `{confirmada:true}`, idempotente y auditado al cambiar |

## Pruebas realizadas

- **66 pruebas PostgreSQL:** 52 de regresión del ciclo 3 y 14 de agenda/entregas. Incluyen concurrencia sobre el último cupo, 32 intervalos y almuerzo, permisos/privacidad, catálogo desactualizado, copia histórica, reversión de datos incompletos, diferimiento, descanso, menor de edad, evaluación con respuestas negativas, admisión y entregas únicas.
- **31 pruebas existentes** de seguridad, donantes, inventario y CORS, en BD de pruebas de Django.
- **10 pruebas de navegador:** 7 del ciclo 3 y 3 nuevas de prefiltro con error/reintento, publicación diaria y refrigerio pendiente/confirmado. Incluyen comprobación de ancho móvil.
- Compilación TypeScript/Vite y 2 comprobaciones de arquitectura del frontend aprobadas.
- Prueba adicional del frontend contra **HTTP Django y PostgreSQL local reales**: crear cita, reprogramar, cancelar, registrar entrega y confirmar refrigerio. Captura inspeccionada en `.venv/agenda-local.png`; fixture y servidor de prueba fuera de Git, servidor 8010 detenido al finalizar.

Desde `backend`:

```powershell
..\.venv\Scripts\python.exe -m unittest tests_agenda_postgres.AgendaTests tests_ciclo3_postgres.Cycle3Tests tests_liberacion_postgres.LiberacionPostgresTests -q
..\.venv\Scripts\python.exe manage.py test apps.seguridad apps.donantes apps.inventario tests_cors --noinput
```

Desde `frontend`: `npm run build`, `npm test`, `npm run test:browser` (requiere Vite en 3000). Las pruebas de escritura PostgreSQL fuerzan la base desechable local y no leen DATABASE_URL de Supabase.

Siguiente bloque del plan: revisar e implementar la programación CU21 y las plantillas CU23, y completar los puntos pendientes de CU06/CU07/CU08. Conservar separadas la implementación local, la aplicación de 08 en Supabase y las pruebas posteriores al despliegue.
