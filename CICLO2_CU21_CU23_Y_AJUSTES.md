# Ciclo 2: CU21, CU23 y ajustes del primer bloque

Actualización posterior: 09 está verificada en Supabase y 10 fue aplicada para el cierre académico. Consultar el [informe vigente](informes/INFORME_CIERRE_CICLOS_2_Y_3_2026-11-01.md); las secciones siguientes conservan el estado y las pruebas de esta entrega anterior.

Estado al **1 de noviembre de 2026**. Rama `codex/ciclo3-desarrollo-local`.
Este informe actualiza `CICLO2_IMPLEMENTACION.md`. La implementación funcional descrita está probada localmente; no equivale a validación clínica institucional ni a despliegue en Render/Cloudflare.

## Resultado por caso

| Caso | Resultado implementado y probado |
|---|---|
| CU06 | Autorregistro atómico, compatibilidad del hash existente, cuestionario versionado, respuestas completas y borradores incompletos persistidos por persona. ADMIN mantiene requisitos y puede desactivarlos conservando el historial. |
| CU07 | Se conserva el horario confirmado de 32 turnos de 15 minutos, lunes a viernes. Cierres/reaperturas explícitos, cupos con bloqueo transaccional, búsqueda por CI/carnet/nombre, filtros por fecha/estado y paginación real de personas, citas y turnos. |
| CU08 | Admisión de citas del día y admisión presencial autorizada, reservando un intervalo libre del mismo día dentro de la misma transacción. Si falla la admisión, se revierte también la nueva cita/prefiltro. No exige un triaje previo para derivar a CU10. |
| CU09 | Se conserva entrega única por extracción, estado real del refrigerio y confirmación posterior auditada. El personal debe confirmar lo ocurrido físicamente; el sistema no declara una entrega automática. |
| CU21 | Indicación médica, referencia de orden, cirugía, aprobación bioquímica, coordinación de citas, vínculo a nuevas colectas y revisión de cambios/cancelación/cierre. Historial de versiones y controles sobre unidades/reservas vinculadas. |
| CU23 | Ocho plantillas estáticas autorizadas por área, consulta con estructura fija, CSV y PDF. No acepta columnas, fórmulas, agrupaciones o fuentes elegidas por el navegador. CU24 mantiene su constructor dinámico independiente. |

Las funciones del bloque anterior siguen disponibles. El tema visual HEMOVIDAX, Brevo, Stripe y el mecanismo de contraseñas de Django se conservaron. No se ejecutó el SQL antiguo de correcciones ni los scripts de población/revisión de usuarios.

## CU21: circuito y responsabilidades

1. El paciente debe existir como Persona y Receptor. El médico selecciona su expediente, registra indicación, referencia de orden y fecha futura. Si todavía no tiene candidatura, se crea PosibleDonador con el estado inicial del esquema; no se crea una cuenta ni se declara aptitud.
2. `MED_SOLICITANTE` o `DOC_TRIAJE` registran/modifican la indicación. Se conserva su identidad profesional real. Cada receptor puede tener un solo programa activo; un episodio cancelado/cerrado permite abrir otro.
3. `BIOQ_INTEGRAL` confirma la revisión y aprueba, cancela o cierra el programa. ADMIN puede consultar, pero no suplanta al médico ni al bioquímico. Toda revisión exige motivo y versión vigente; aprobar/cancelar/cerrar exige confirmación explícita también en el servidor.
4. Recepción o el propio paciente coordinan una cita vinculada. Atención `Autologa` requiere programa aprobado, mismo paciente, fecha anterior a cirugía y requisitos cumplidos; evaluación permite revisar requisitos pendientes. Un perfil RECEPTOR solo agenda atenciones vinculadas a su programa.
5. Las nuevas colectas autólogas exigen `idprograma` aprobado y cirugía concordante, además de todos los controles de CU15 ya existentes: identidad, triaje apto, consentimiento, descanso, volumen y conservación. Se vinculan `citadonacion` y `colectaautologa` al programa.
6. Se conservan exclusividad, reserva para el propio receptor y liberación conjunta CU13/CU14. Aprobar el programa **no libera** sangre. Colecta/citas nuevas deben preceder a la cirugía; se preserva la posibilidad de fraccionar/reactivar/liberar unidades aptas el propio día quirúrgico, sin extender caducidad ni autorizar despacho por esta operación.

### Cambios, cancelación y cierre

- Modificar fecha/indicación devuelve el programa a `RevisionRequerida`, cancela citas no admitidas y pone las unidades vinculadas pendientes de uso en cuarentena, con reservas activas canceladas. Se preservan las bajas y la exclusividad autóloga. Se requiere una nueva revisión BIOQ.
- Aprobar una fecha nueva comprueba que los componentes no dados de baja conserven exclusividad y vigencia hasta la cirugía. La cirugía vinculada a la colecta se actualiza después de aprobar. Las reservas canceladas no se reactivan ni se libera el lote automáticamente: siguen su revisión y liberación expresas del circuito existente.
- Cancelar no reasigna las unidades a terceros ni ejecuta una baja automática. Una eventual baja se decide por el procedimiento autorizado de CU15.
- Un cambio/cancelación con unidades ya entregadas se rechaza sin modificar el programa; exige el circuito institucional de retiro/revisión clínica. CU21 no implementa ese circuito posterior al despacho.
- El cierre del episodio se permite desde la fecha quirúrgica, con revisión BIOQ. Conserva la entrega histórica de unidades despachadas y mantiene fuera del stock general las unidades restantes. No certifica por sí mismo la realización o resultado de la cirugía.
- `programacionautologahistorial` guarda cada versión registrada mediante la API, con contenido, fecha y usuario real. La bitácora conserva además los eventos operativos. Se puede consultar el historial desde la pantalla.
- Las colectas autólogas históricas sin programa no se asociaron arbitrariamente a una nueva orden. Se conserva su circuito previo; su revisión y asociación histórica, si se necesita, es una actuación separada.

## Ajustes transversales de CU06/CU07/CU08

**Autorregistro:** se revisó el SP actual y el comportamiento `set_password/check_password`. El SP y la conversión de texto legado al hash existente quedan dentro de una sola transacción. Ante error PostgreSQL se revierte el registro; ya no se ejecuta un segundo alta ORM después de un fallo del SP o del hash. El camino SQLite permanece solo para las pruebas existentes. Se revalidan duplicados dentro del bloqueo de registro y se exige el rol inicial. No se resetean secuencias desde el alta pública. La respuesta ya no expone excepciones SQL. No se cambiaron algoritmos, triggers de contraseñas ni hashes históricos. La prueba PostgreSQL verifica hash/login compatible y ausencia de Persona huérfana ante fallo simulado del hash.

**Borradores:** se guarda únicamente lo contestado, sin convertir una respuesta ausente en falsa. No se reserva cupo ni se crea un dictamen. `detallecitarequisito` se usa al confirmar la atención con su cita real; el borrador usa una tabla propia y conserva versión/copia del catálogo. Recuperar un borrador antiguo exige revisar el cuestionario vigente. Al confirmar correctamente una cita se elimina su borrador dentro de la misma transacción. Un donante/receptor no puede leer ni escribir el borrador de otra persona.

**Requisitos:** ADMIN puede crear, editar y desactivar. Las filas históricas no se eliminan. Su clasificación no genera por sí misma un diferimiento definitivo; este sigue requiriendo criterio profesional CU11. Cambiar el catálogo invalida formularios, reprogramaciones o admisiones basados en otra versión. La pantalla descarta respuestas de una versión anterior.

**Agenda:** páginas de 50 con total y navegación independiente para citas, personas y turnos. Se puede buscar CI, carnet provisional, carnet de donante o nombre, además de fechas/estados. La consulta del propio paciente conserva el filtro de propiedad en todos los conteos y páginas. Los programas muestran hasta 100 coincidencias con búsqueda por paciente, y su historial específico permite consultar sus versiones.

**Cierres:** solo ADMIN registra un cierre/reapertura con motivo. Cerrar bloquea publicación y nuevas reservas, deshabilita intervalos futuros y cancela citas futuras no admitidas del día. Reabrir no resucita citas canceladas. Se usa el mismo bloqueo transaccional de agenda para evitar carreras con reservas/reprogramaciones. Una recepción ya efectuada no se borra por cerrar el día.

**Presencial:** exige personal vinculado, identidad, autorización explícita, motivo y un turno de hoy con cupo. Una cita futura sigue sin permitir confirmar asistencia. Si el prefiltro no permite el circuito de donación, se debe elegir evaluación; la autorización de recepción no anula restricciones clínicas ni permite una extracción.

El alcance acordado es **un centro**. Multisedes y recordatorios automáticos no son requisitos incorporados a este bloque; no se inventaron sedes ni se enviaron correos de prueba. Los cierres permiten gestionar excepcionalmente los días publicados.

## CU23: plantillas y permisos

| Plantilla | Estructura fija / período |
|---|---|
| Donaciones y volumen por día | Día, cantidad y ml; período seleccionable |
| Evaluaciones clínicas por día | Día, aptos/rechazados y tasas; período seleccionable |
| Asistencia a citas por día | Día, confirmadas/canceladas/pendientes y asistencia; período seleccionable |
| Tamizaje serológico por día | Día, concluidos/reactivos/indeterminados y tasa; período seleccionable |
| Inventario actual por componente | Componente, bolsas, ml y caducidad próxima; sin reconstrucción histórica |
| Bajas por motivo | Motivo y conteos de madre/componentes; período seleccionable |
| Ingresos confirmados BOB por día | Día, pagos e importe BOB; período seleccionable |
| Cartera actual por institución | Institución, obligaciones y saldo BOB; sin reconstrucción histórica |

Se reutilizan los cálculos probados de CU24, no su selección libre de dimensiones. Se rechazan parámetros extra o repetidos. Las citas pendientes/canceladas no integran el denominador de asistencia, las divisiones vacías muestran No aplica y los ingresos no suman comprobantes como si fueran nuevos pagos.

La matriz aprobada se aplica también a las plantillas: ADMIN todas; DOC_TRIAJE clínica; BIOQ_INTEGRAL clínica/laboratorio/inventario; TEC_LOGISTICA inventario. Finanzas sigue exclusivamente en ADMIN. Los accesos directos y exportaciones comprueban el rol activo realmente asignado.

CSV conserva UTF-8/BOM y protege celdas interpretables como fórmulas. El PDF incluye título, período/unidad, fecha de generación en Bolivia, totales, tablas con encabezado repetido, criterios pertinentes y número de página. Un informe vacío se emite como vacío, no con datos simulados. La interfaz elimina resultados anteriores ante cambios de criterios o errores.

## Estado de Supabase y migración 09

Durante esta entrega se consultó Supabase **solo en lectura**: la estructura de 08 (`agendaturno`) está presente; la de 09 (`programacionautologa`) todavía no se detectó. No se aplicó ninguna migración ni se escribieron fixtures en Supabase.

Archivo para revisar/aplicar: `database/09_ciclo2_programacion_y_ajustes.sql`. Requiere 06/07/08. Añade programación e historial, borradores, cierres, vigencia de requisitos y referencias de programa en citas/colectas. Incorpora índices, auditoría y RLS sin políticas públicas para las tablas nuevas. La conexión backend actual es propietaria; otro rol PostgreSQL necesitaría permisos/políticas explícitos. No contiene pacientes, usuarios, horarios ni valores clínicos de producción.

La migración final se aplicó y se repitió únicamente en la base desechable local. Una estructura 09 ausente produce un 503 explícito en agenda/programación. CU23 utiliza las fuentes existentes y no exige tablas clínicas ficticias de ciclos posteriores.

Para probar con tu Supabase:

1. Revisar y aplicar **09**, después de comprobar que 08 está completa. No ejecutar `manage.py migrate` para reemplazar este esquema existente.
2. Reiniciar el backend con tu `backend/.env`. La conexión sigue siendo `DATABASE_URL`, SSL y pooler de transacciones 6543; no hacen falta nuevas claves de API para estos casos.
3. Confirmar los roles/perfiles médicos y BIOQ de las cuentas reales; registrar el receptor y su indicación, revisar y aprobar.
4. Publicar días desde ADMIN, probar cita y reprogramación autóloga, y comprobar el efecto de cambiar/cancelar una cirugía.
5. Verificar informes vacíos/con datos y PDF/CSV con cada perfil autorizado.

Las operaciones manuales del servidor local conectado a Supabase persistirán allí. Las pruebas automáticas fuerzan una BD separada y nunca deben apuntarse a Supabase. No se ejecutaron los scripts previos de población o desactivación de usuarios.

## API añadida

Todas requieren JWT con perfil autorizado:

| Ruta bajo `/api/` | Método | Uso |
|---|---|---|
| `agenda/programas/` | GET | Programas visibles y búsqueda `q` por paciente |
| `agenda/programas/crear/` | POST | Médico: receptor, cirugía, indicación y referencia |
| `agenda/programas/{id}/revision/` | POST | Versión, acción, motivo y confirmación profesional; datos médicos completos al modificar |
| `agenda/programas/{id}/historial/` | GET | Versiones con control de acceso |
| `agenda/borrador/` | GET/POST | Recuperar/guardar respuestas incompletas de la persona autorizada |
| `agenda/requisitos/` y `agenda/requisitos/{id}/` | GET/POST | Administración del catálogo, incluida desactivación |
| `agenda/cierres/` | POST | Fecha, cerrado/reabierto y motivo |
| `agenda/presencial/` | POST | Datos de cita/prefiltro, `autorizada=true` y motivo |
| `reportes/estaticos/catalogo/` | GET | Plantillas autorizadas |
| `reportes/estaticos/informe/` | GET | `plantilla`, `desde/hasta` si admite período y `formato=json/csv/pdf` |

`agenda/catalogo/` incorpora `q`, `fecha`, `estado`, `fecha_turnos`, `pagina`, `pagina_personas` y `pagina_turnos`. Las respuestas incluyen metadatos de paginación. Las nuevas citas/colectas autólogas usan `idprograma`.

## Evidencia de pruebas

- **83 pruebas PostgreSQL local:** 52 del ciclo 3, 14 del primer bloque de agenda y 17 de esta continuación. Incluyen roles/confirmación/versiones CU21, cambio/cancelación/cierre, exclusividad, caducidad, entrega histórica, día quirúrgico, historial, borradores, búsqueda/paginación, cierres, presencial positivo y reversión atómica, plantillas/permisos/exportaciones CU23, registro/hash compatible y rollback, migración 09 ausente.
- **31 pruebas existentes** de seguridad, donantes, inventario y CORS; 2 comprobaciones de arquitectura frontend. Compilación TypeScript/Vite y Django check sin errores.
- **13 pruebas de navegador**, incluidas persistencia del borrador parcial, revisión BIOQ con error/reintento, plantillas fijas y descarga/error de CU23. Se conservaron las pruebas de Stripe, CU24, conservación y corrección ABO/Rh. Comprobaciones de ancho móvil sin desbordamiento.
- Ensayo adicional con **frontend, HTTP Django y PostgreSQL reales**: médico registra indicación, BIOQ aprueba, recepción reserva cita autóloga, médico cambia cirugía, BIOQ revisa de nuevo, historial con cuatro versiones, reporte CU23 y descarga PDF. Servidor de prueba 8010 y firma JWT aislados; servidor detenido y archivo de sesión eliminado al terminar.
- Exportación PDF real desde la API, con 71 registros sintéticos agrupados y cuatro páginas. Primera/última página renderizadas e inspeccionadas; tabla completa, encabezados repetidos, criterios y pie de página. Los archivos/capturas de ensayo quedan en `.venv`, fuera de Git.

Desde `backend`:

```powershell
..\.venv\Scripts\python.exe -m unittest tests_ciclo2_completion_postgres.Cycle2CompletionTests tests_agenda_postgres.AgendaTests tests_ciclo3_postgres.Cycle3Tests tests_liberacion_postgres.LiberacionPostgresTests -q
..\.venv\Scripts\python.exe manage.py test apps.seguridad apps.donantes apps.inventario tests_cors --noinput
```

Desde `frontend`: `npm run build`, `npm test`, `npm run test:browser` con Vite en 3000.

## Límite de entrega

CU21, CU23 y los ajustes funcionales identificados del ciclo 2 están implementados y probados localmente para el centro acordado. Quedan **aplicación de 09, aceptación operativa con las cuentas/datos reales y pruebas del despliegue**. No se hizo push ni despliegue, ni cobros/correos reales durante estas pruebas.

Las observaciones clínicas del ciclo 3 siguen vigentes: aprobación institucional de umbrales y conservación, revisión de fechas clínicas heredadas y saneamiento de procedimientos antiguos. Este cierre técnico no certifica un protocolo médico integral, ni implementa retiro de unidades ya entregadas, despacho/compatibilidad del ciclo 4 o corrección automática de históricos.
