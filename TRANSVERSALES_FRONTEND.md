# Cierre transversal: operaciones ficticias y frontend

Rama: codex/ciclo3-desarrollo-local. No se modificaron claves de Render, Brevo, hashes Django ni datos de Supabase.

## Cambios

- App ya no importa mockData ni lee/escribe cuentas, citas, donaciones, stock, reposiciones, incentivos, autólogos, análisis o auditoría desde localStorage.
- Sesión nueva en sessionStorage, sin contraseñas; las sesiones antiguas no habilitan el nuevo recorrido. Login y cambio de perfil requieren respuesta de la API.
- Se conservan portada y barra institucional. El acceso operativo utiliza clínica, laboratorio, stock y umbrales, personal, auditoría con filtros, carnet/QR e historial de la API. Alta de personal, desbloqueo y umbrales exigen confirmación del servidor. No se crean cargos ni solicitudes locales.
- Las pantallas antiguas sin API no están enrutadas. Se mantienen en código como referencia para integrar sus funciones posteriormente. Citas/prefiltro y centros muestran estado pendiente. Despachos, reposiciones, incentivos, autólogos y reportes de demostración no se presentan como operaciones reales. Esto no completa esos casos de uso.
- Se elimina el mensaje de urgencia de stock fijo y el grupo O positivo inventado. El carnet muestra grupo solo del último análisis postextracción aprobado; sin resultado aparece sin registro. No se inventan turnos, credenciales o donaciones al iniciar sesión.
- Cambiar contraseña requiere respuesta de la API; se retiró la aceptación local con backend desconectado.
- TypeScript global pasa. El build ahora ejecuta tsc antes de Vite, por lo que errores de tipos bloquean compilación. Se corrigieron propiedades y campos reales de componentes antiguos, sin silenciar el chequeo.

## Verificación

- npm test: dos pruebas de arquitectura del recorrido activo (sin mocks ni registros operativos locales) y bloqueo del build ante errores de tipos.
- npm run build: TypeScript y Vite aprobados.
- Navegador Edge headless, API interceptada con datos sintéticos: sesión antigua ignorada, credenciales rechazadas sin acceso, login confirmado, fallo de API sin falso éxito, triaje solo tras respuesta confirmada, inventario local intacto, revisión móvil de 390 px y cierre de sesión. No se realizaron escrituras en Supabase para esta prueba.
- Regresiones del backend: carnet sin grupo inventado y resultado del último análisis aprobado o pendiente, además de las pruebas existentes de seguridad, donantes e inventario.

## Límites conservados

La migración 06 y el resto de pendientes de CU10/CU11/CU15, CU22 y CU24 no se resuelven por retirar la demostración. Las rutas clínicas continúan validando esa migración. El código de demostración se conserva sin ruta operativa para reutilizar su diseño cuando existan las APIs correspondientes. La recuperación de contraseña entre varios workers sigue fuera de esta tarea, conforme al alcance acordado. No se desplegó esta versión.
