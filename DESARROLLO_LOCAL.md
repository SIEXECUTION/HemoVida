# Desarrollo local con Supabase (puerto 6543)

El código se ejecuta localmente. La base PostgreSQL permanece en Supabase y se accede únicamente desde Django mediante DATABASE_URL. El frontend nunca recibe esta credencial.

## Git

Rama de trabajo: `codex/ciclo3-desarrollo-local`, creada desde la `main` real de https://github.com/SIEXECUTION/HemoVida (origin/main en 44068007a834794091daa96fa55beee6d8e9ba8d). La rama main local sigue origin/main. Clínica, laboratorio, bitácora, preparación local y adaptación visual ya tienen commits en esta rama. La continuación de ciclo 3 permanece en esta misma rama secundaria.

La versión del paquete agregaba laboratorio y migración 06 que aún no estaban en esa main. Se conservaron junto con los cambios nuevos. El commit anterior e1f2357 permanece únicamente en codex/ciclo3-clinica como respaldo; no pertenece al historial de esta rama. También se conservó un stash de respaldo de la transferencia. No se hicieron pushes.

## Entorno ya preparado en esta máquina

- Python aislado en `.venv`, dependencias backend y npm instaladas.
- `backend/.env`: secreto local aleatorio, DEBUG=True, USE_SQLITE=False, SUPABASE_TRANSACTION_POOLER=True. DATABASE_URL ya está configurada localmente y su conexión se verificó sin mostrar las credenciales.
- `frontend/.env.development.local`: VITE_API_BASE_URL=/api; Vite envía las peticiones al backend en 127.0.0.1:8000. Este archivo se aplica solo al desarrollo.
- Los archivos privados .env están excluidos de Git. No pegar contraseñas en código, terminales compartidas ni documentación.

## Configurar y arrancar

1. En Supabase, abrir Connect y copiar la URI del Transaction pooler, puerto 6543, para la base que se utilizará durante el desarrollo.
2. Pegar esa URI como DATABASE_URL en `backend/.env`. Usar usuario y host exactos entregados por Supabase; no sustituir el host del pooler por db.PROJECT.supabase.co. Si la contraseña tiene caracteres especiales, codificarlos en la URI; el backend no los reescribe ni elimina corchetes.
3. Ejecutar `verificar_conexion.bat`. Hace SELECT y comprueba tablas, función de migración 06 y columnas/tablas de 07. No crea tablas ni modifica datos. El diagnóstico no imprime credenciales.
4. Ejecutar `iniciar_backend.bat` y `iniciar_frontend.bat` en dos terminales. Abrir http://localhost:3000. Backend: http://127.0.0.1:8000.

En otra máquina Windows, ejecutar primero `powershell -ExecutionPolicy Bypass -File .\preparar_local.ps1` desde esta carpeta. El script crea el entorno y archivos privados solo si faltan, instala dependencias y no conecta a Supabase ni ejecuta SQL. Requiere Python y Node/npm.

El puerto 6543 corresponde a pooling de transacciones. Django usa psycopg2, SSL obligatorio, conexiones con duración 0 y DISABLE_SERVER_SIDE_CURSORS=True. Las operaciones auditadas existentes conservan su contexto SQL dentro de cada transacción. Una URI ausente o inválida genera un error explícito; no se activa SQLite automáticamente. SQLite se conserva únicamente cuando se solicita expresamente para pruebas.

## Estado de la base y comprobaciones

La migración financiera CU22 ya pertenece al esquema de referencia y no se vuelve a ejecutar. El usuario ya aplicó las migraciones 06 y 07 en Supabase y se verificó su estructura desde el backend. Las nuevas escrituras clínicas la exigen. Ninguno de los scripts de arranque aplica migraciones Django, restaura el schema, importa datos ni ejecuta SQL maestro.

Pruebas de configuración, sin conexión remota:

```
.venv\Scripts\python.exe backend\tests_database_config.py
.venv\Scripts\python.exe backend\manage.py test apps.seguridad apps.donantes apps.inventario --noinput
```

Las pruebas PostgreSQL de clínica/laboratorio siguen restringidas a su base desechable local hemo_liberacion_test en 127.0.0.1:55439. No utilizan la cadena de Supabase.

La conexión remota está verificada. Los cambios siguientes, las variables de Stripe y las pruebas actuales se describen en [CICLO3_IMPLEMENTACION.md](CICLO3_IMPLEMENTACION.md). No se realizaron pushes ni despliegues.

Referencias: https://supabase.com/docs/guides/database/connecting-to-postgres y https://docs.djangoproject.com/en/5.2/ref/databases/#transaction-pooling-and-server-side-cursors


## Variables de Render y Brevo

El backend lee ALLOWED_HOSTS, DATABASE_URL, DEBUG y SECRET_KEY desde las variables de Render o backend/.env. PYTHON_VERSION selecciona el runtime de Render; no se procesa como ajuste Django ni cambia el Python local.

BREVO_API_KEY y BREVO_SENDER_EMAIL están declaradas en render.yaml como valores privados y en backend/.env.example. También se añadieron entradas vacías a backend/.env sin cambiar credenciales existentes. Completar allí los valores reales si se necesitan correos locales por Brevo. Con API key configurada, Brevo tiene prioridad sobre EMAIL_BACKEND y se utiliza HTTPS, no hacen falta credenciales SMTP. El remitente debe estar verificado en Brevo. Un fallo de Brevo devuelve envío no confirmado; no se disimula como envío por consola.

Sin API key se conserva EMAIL_BACKEND, que localmente muestra correos en terminal. Reiniciar el backend después de cambiar backend/.env. No se enviaron correos reales durante las pruebas ni se cambiaron variables en el panel remoto de Render.


Recuperación: el código ya no se devuelve en la API ni se muestra/autocompleta en LoginModal o ChangePasswordModal. El fallo de envío devuelve 503 y elimina el código pendiente. Los backends de consola/dummy/locmem no habilitan recuperación sin Brevo. Pruebas de recuperación usan envío simulado, sin correos reales.


## Stripe en desarrollo

Las dos claves test están configuradas y se verificó el flujo externo en sandbox. Ejecutar `iniciar_stripe_local.bat` en una tercera terminal para recibir notificaciones en el backend local (puerto 8000), además de los lanzadores de backend y frontend. El secreto de CLI permanece privado y debe coincidir con backend/.env. El lanzador no aplica SQL ni permite modo live. La validación de pagos se hizo sobre PostgreSQL local aislado, sin operaciones financieras de prueba en Supabase. Ver CICLO3_IMPLEMENTACION.md para el despliegue y el secreto diferente del endpoint de Render.


## Cloudflare Workers desde la rama secundaria

Rama de producción: `codex/ciclo3-desarrollo-local`.
Directorio raíz: `frontend`.
Comando de compilación: `npm ci && npm run build`.
Comando de despliegue de producción: `npx wrangler deploy`.
La configuración `frontend/wrangler.jsonc` declara el Worker `hemovidax`,
los archivos compilados en `dist` y el fallback de rutas de React como SPA.
Para una Preview, `npx wrangler preview --worker-name hemovidax` apunta al
mismo Worker, pero publica una URL de vista previa. Para actualizar la URL
habitual se debe desplegar producción desde la rama seleccionada.
Configurar `VITE_API_BASE_URL=https://hemovidax.onrender.com/api` como variable
de compilación en Cloudflare. El proxy de Vite solo funciona en desarrollo.
