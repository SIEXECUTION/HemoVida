# Continuación local de HemoVida — 31 de octubre de 2026

> Informe histórico de la primera etapa. El estado y las pruebas actuales se documentan en [CICLO3_IMPLEMENTACION.md](CICLO3_IMPLEMENTACION.md); varios pendientes de este informe ya se implementaron.

Base: HemoVida_liberacion_conjunta_y_bitacora.zip. Referencia: schema_actual_supabase.txt del paquete. No se utilizó HemoVida_original.zip como versión operativa ni el SQL antiguo de correcciones.

## Cambios implementados

- CU10: expediente buscable por CI/nombre; cita admitida de la misma persona; registro de biometría y dictamen confirmado por médico, con responsable derivado del JWT. Valida formatos, presión coherente y las reglas parciales existentes (peso 50 kg, hemoglobina 12.5, temperatura 37.5). Impide triajes duplicados del día. No sustituye el protocolo clínico completo.
- CU11: clasificación Temporal o Definitivo explícita. Temporal requiere días positivos; definitivo exige cero días y fecha final nula. No infiere definitivo por superar 365 días. Registra motivo, suspende habilitación, cancela citas futuras dentro del intervalo y evita restricciones vigentes duplicadas. El vencimiento requiere nueva evaluación; no reactiva automáticamente al candidato. No bloquea su cuenta.
- CU15: aceptación y evidencia de firma previas, extracción vinculada al último triaje apto del día, descanso biológico de 90/120 días y madre en cuarentena, todo atómico. Fraccionamiento de componentes efectivamente obtenidos con balance de volumen, capacidad de bolsa/almacén, plazo de 8 horas del procedimiento actual, códigos únicos y caducidades existentes. Traslados y bajas de componentes sin liberar unidades por fuera del laboratorio.
- Bloqueos de persona/madre/ubicación serializan operaciones concurrentes. Repetir una colecta o un fraccionamiento no duplica registros.
- Para tablas críticas, continúa escribiendo la auditoría el trigger 06; los eventos de triaje, diferimiento, admisión y extracción se registran por backend. No se copian firmas ni resultados completos a bitácora.
- Nuevo selector firmado de perfil: el servidor verifica el rol realmente asignado y emite JWT para ese perfil. Login y cambio de perfil consumen este endpoint. No se modificaron hashes, validadores ni procedimientos de contraseñas.
- El médico usa ahora el circuito conectado. Recepción deriva sus botones de colecta a ese circuito; las otras funciones existentes se conservan. ADMIN, laboratorio y logística acceden a las operaciones apropiadas a su rol. No se importan registros de localStorage a PostgreSQL.

## API

Todas requieren JWT. Las escrituras exigen PersonalSalud y migración 06 disponible.

| Ruta bajo /api/clinica/ | Método | Uso |
|---|---|---|
| perfil/ | POST | Seleccionar rol asignado; cuerpo rolActivo |
| operaciones/?q=... | GET | Expediente y catálogos; listados acotados |
| admision/ | POST | Identidad y asistencia de cita existente con prefiltro aprobado |
| triajes/ | POST | CU10 |
| diferimientos/ | POST | CU11 |
| colectas/ | POST | Extracción + consentimiento + madre |
| madres/{id}/fraccionar/ | POST | Lista componentes con volumen/capacidad/categoría/ubicación |
| componentes/{id}/custodiar/ | POST | Traslado de ubicación |
| componentes/{id}/baja/ | POST | Motivo de baja |

Los cuerpos exactos y sus formatos están en backend/apps/clinica/serializers.py. Las operaciones no aceptan estado de liberación ni responsable arbitrario. Los errores de base devuelven 409 y rollback; sin 06, las nuevas escrituras devuelven 503.

## Verificación local realizada

- PostgreSQL 18 aislado, esquema exportado sin datos y migración 06. Se excluyeron propietarios/permisos de Supabase y su extensión vault únicamente al restaurar esta copia local.
- 12 pruebas nuevas de clínica y 8 existentes de liberación aprobadas: circuito completo hasta disponibilidad, consentimiento, identidad/admisión, diferimientos, agenda, balance, capacidad, baja, caducidad del triaje/plazo de fraccionamiento, exclusividad autóloga bloqueada en ruta general, concurrencia, JWT real y falta de migración.
- 22 pruebas existentes de seguridad/donantes/inventario aprobadas en su entorno SQLite de tests.
- Django check aprobado (el proyecto mantiene un aviso silenciado previamente).
- Compilación Vite aprobada. TypeScript global sigue sin aprobar: 46 errores iniciales, 45 finales, sin mensajes nuevos al comparar archivo y mensaje normalizando líneas. No confundir build de Vite con chequeo global de tipos.
- Navegador Edge headless contra React y el backend PostgreSQL local: guardó triaje, consentimiento/colecta y fraccionamiento. Revisión visual y ancho del circuito 358 px en viewport móvil de 390 px.

Para repetir las pruebas PostgreSQL: iniciar una instancia local vacía hemo_liberacion_test en 127.0.0.1:55439 con usuario hemovida_test, restaurar allí el esquema de referencia y aplicar 06; después ejecutar `python backend/tests_clinica_postgres.py` con las dependencias backend instaladas. Este script vacía exclusivamente la base local identificada, igual que las pruebas entregadas de laboratorio. No apuntarlo a Supabase. Las pruebas importadas de liberación también se ejecutan: total 20.

## Pendientes: estos casos todavía no están certificados como completos

- CU10: validar el protocolo institucional completo y ampliar persistencia de observaciones si se requiere; el esquema actual no tiene esa columna. La vigencia diaria del triaje es una restricción conservadora del circuito y requiere aprobación operativa.
- CU11: canal de comunicación al candidato y vinculación de hallazgos de laboratorio sin triaje previo. El profesional debe comunicar la indicación; la aplicación no envía notificaciones de diferimiento. La agenda antigua aún contiene funciones locales: este cambio cancela citas PostgreSQL y bloquea admisión/colecta, pero no convierte todo CU07 en un circuito persistente.
- CU15: circuito autólogo completo ligado a CU21 y reservas exclusivas. El fraccionamiento general rechaza donantes Autologo y el traslado/baja general rechaza componentes exclusivos o reservados; no elimina su marca ni los libera al stock general. Falta validación automática de conservación/temperatura por componente conforme al protocolo aprobado, registro de extracción interrumpida y baja de madre completa. Las ubicaciones se seleccionan y verifican por el responsable; la capacidad sí se valida automáticamente.
- No se certifica Código Rojo, retiro de unidades despachadas ni todos los ciclos previos. Las otras pantallas heredadas pueden seguir usando datos locales.
- CU22 Stripe y CU24 no se implementaron en esta etapa. La estructura financiera existente permanece intacta.

## Despliegue

Nada de esta continuación se desplegó ni se aplicó a Supabase. No se recibió una conexión remota ni se modificó DATABASE_URL. La migración 06 sigue pendiente en Supabase: revisarla y validarla en una base de pruebas antes de aplicarla allí. No ejecutar scripts maestros ni repetir CU22. No se añadió otra migración en esta entrega.

Configurar VITE_API_BASE_URL con la API efectiva de Render antes del build y los orígenes CORS de Cloudflare en Render. Se conservaron los valores de despliegue del paquete; el build de prueba no publica nada. La conexión de producción sigue siendo mediante DATABASE_URL en el backend.
