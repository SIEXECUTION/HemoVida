# Liberación conjunta CU13 y CU14 y bitácora

Esta entrega añade una pantalla de laboratorio conectada a PostgreSQL, endpoints
para guardar y corregir análisis, liberación ordinaria conjunta y auditoría de
operaciones críticas. Conserva los hashes y el mecanismo de acceso existentes.

## Aplicación

1. La base debe contener la migración financiera CU22 ya aplicada y el esquema
   que se revisó el 31 de octubre de 2026. No ejecutar nuevamente los scripts
   maestros del ZIP para actualizar una base existente.
2. Aplicar únicamente `database/06_liberacion_conjunta_y_auditoria.sql`, primero
   en pruebas. Es transaccional y admite reaplicación. No modifica datos
   históricos para liberarlos ni hace bajas retrospectivas.
3. Desplegar el backend actualizado con su conexión PostgreSQL. El módulo nuevo
   se incorpora en las rutas centrales; no crea modelos ni migraciones Django.
4. Configurar `VITE_API_BASE_URL` antes de compilar el frontend si la URL de API
   difiere de `https://hemovida-backend.onrender.com/api`.
5. Entrar con rol activo BIOQ_INTEGRAL o ADMIN asignado realmente al usuario.
   Para guardar análisis se requiere además su registro en PersonalSalud.

No ejecutar el antiguo `hemovida_correcciones_ciclos_1_3.sql`: esta implementación
lo sustituye para liberación y auditoría, sin cambiar el contrato de contraseñas.

## Comportamiento

- Guardar CU13 o CU14 no libera automáticamente las unidades. La liberación es
  una acción explícita del responsable.
- CU13 exige dictamen Apto y seis marcadores No Reactivo; CU14 exige dictamen
  Apto, etapa Post-Extraccion y grupo ABO/Rh concordante con la madre.
- Se evalúa el análisis más reciente de cada área por fecha e identificador.
- La liberación actualiza madre y componentes en una sola transacción. Las
  unidades caducadas o con grupo distinto provocan rollback de toda la operación.
- Las correcciones o eliminaciones de análisis que dejen al lote sin aprobación
  devuelven unidades disponibles/reservadas a cuarentena y cancelan sus reservas
  activas. No se liberan otra vez sin una nueva acción del responsable.
- Los componentes ya despachados conservan su estado y se genera un evento
  REVISION URGENTE en bitácora. Este registro requiere seguimiento del responsable;
  no se implementa una notificación por correo ni un proceso de retiro.
- Las unidades autólogas conservan su marca de exclusividad. La reserva que haya
  sido cancelada por una corrección requiere revisión del flujo autólogo.
- Se serializan los cambios de análisis y liberación mediante bloqueo del lote.
  Un conflicto de BD devuelve 409 sin confirmar parcialmente la operación.
- Las barreras ordinarias actúan sobre Liberada Apta, Disponible y reservas
  generales. La reserva exclusiva autóloga puede existir durante cuarentena.
  El cambio directo a Despachada conserva el tratamiento de emergencia existente;
  este permiso no debe exponerse mediante un endpoint genérico de cambio de estado.
  No se reescribe ni se certifica todo el flujo clínico de Código Rojo en esta entrega.

## Bitácora sin duplicaciones

Para análisis, madre, componentes, pagos y bajas, los triggers de esta migración
son el único escritor del evento por fila. El backend abre una operación auditada
y aporta usuario, rol, origen e IP con configuración local a la transacción.
No añade un segundo registrar_auditoria para la misma fila.

Las liberaciones identifican los análisis CU13 y CU14 utilizados. Los cambios de
estado incluyen el estado anterior y nuevo. Las correcciones de análisis registran
acción, identificador, usuario y fecha sin copiar resultados clínicos completos.
Los cambios sin contexto del backend se etiquetan BD directa y registran el rol
de conexión, con usuario de aplicación nulo: no se inventa una identidad.

Los pagos y bajas realizados por módulos todavía no conectados se auditan como
BD directa. Al conectar esos módulos, envolver su escritura así:

```python
from apps.laboratorio.services import operacion_auditada

with operacion_auditada(request):
    # Escritura del pago o baja; el trigger registra el evento.
    ...
```

Este contexto es para un backend de confianza; no es una prueba criptográfica de
identidad frente a alguien con acceso propietario a la BD. Los permisos y RLS
deben impedir a clientes anónimos escribir estas tablas o manipular la bitácora.
La migración no redefine permisos existentes ni convierte la bitácora en un
almacén inalterable frente al administrador de la BD.

## API

- GET `/api/laboratorio/madres/`: últimas 100 madres registradas.
- GET `/api/laboratorio/madres/{id}/`: estado, últimos análisis y componentes.
- POST `/api/laboratorio/madres/{id}/serologia/`: registrar CU13.
- PUT `/api/laboratorio/madres/{id}/serologia/{analisis_id}/`: corrección completa.
- POST `/api/laboratorio/madres/{id}/hematologia/`: registrar CU14.
- PUT `/api/laboratorio/madres/{id}/hematologia/{analisis_id}/`: corrección completa.
- POST `/api/laboratorio/madres/{id}/liberar/`: liberación ordinaria explícita.

Todas las rutas requieren JWT y rol activo autorizado. El backend deriva el
profesional de la identidad autenticada; no acepta un responsable arbitrario
en el cuerpo. Los formularios usan los nombres de campo del esquema actual.

## Alcance de la pantalla

La entrada de laboratorio muestra ahora la pantalla conectada al backend.
La vista local anterior se conserva en el código como referencia sin ruta
operativa; sus acciones de liberación por localStorage ya no son accesibles.
La pantalla nueva trabaja con madres ya registradas en PostgreSQL. No migra
datos de localStorage ni implementa el alta de colecta, el fraccionamiento,
el proceso completo de bajas, Stripe o CU24: son módulos distintos.

## Validación realizada

- Restauración del schema actual en PostgreSQL 18 local aislado.
- Aplicación y reaplicación de la migración 06.
- 8 pruebas de integración PostgreSQL: ambos dictámenes, bloqueos de escrituras
  directas, correcciones y reservas, despachadas, concurrencia, permisos,
  caducidad/grupo, auditoría de pagos/bajas y ausencia de eventos duplicados.
- 22 pruebas existentes de seguridad, inventario y donantes aprobadas.
- Django check sin incidencias nuevas y compilación Vite aprobada.
- TypeScript: 46 errores existentes tanto en el ZIP original como en esta versión;
  se compararon mensajes y archivos sin diferencias nuevas. No se declara el
  chequeo global de tipos como aprobado.

No se ejecutó la migración ni se desplegó código en tu Supabase o servidor real.

## Repetir las pruebas PostgreSQL

`backend/tests_liberacion_postgres.py` está restringido a una BD local llamada
hemo_liberacion_test en 127.0.0.1:55439, con usuario hemovida_test. Restaura en ella
una copia sin datos del esquema actual y aplica la migración 06. Después ejecuta:

```text
python tests_liberacion_postgres.py
```

Las pruebas vacían las tablas de esa BD local de pruebas. No ejecutar contra datos
reales ni modificar la restricción de conexión para apuntar a Supabase.
