# Desarrollo local de HemoVida

El frontend y Django se ejecutan en el equipo de desarrollo. Django se conecta a PostgreSQL en Supabase mediante la variable privada `DATABASE_URL`.

## Preparación en Windows

1. Instala Python 3.12 y Node.js 22.12 o posterior dentro de la serie 22.
2. Ejecuta `powershell -ExecutionPolicy Bypass -File .\preparar_local.ps1` desde la raíz. El script instala dependencias y prepara los archivos de entorno que falten a partir de [backend/.env.example](backend/.env.example).
3. En Supabase, abre **Connect** y copia la cadena del **Transaction pooler**, puerto **6543**. Guárdala en `backend/.env` como `DATABASE_URL`, con `sslmode=require`. Si la contraseña contiene caracteres especiales, codifícalos en la URI.
4. Ejecuta `verificar_conexion.bat`. El diagnóstico consulta metadatos de PostgreSQL en modo de solo lectura.
5. Ejecuta `iniciar_backend.bat` e `iniciar_frontend.bat` en terminales separadas. Abre [la aplicación local](http://localhost:3000) o [el estado de la API local](http://127.0.0.1:8000/api/health/).

El proxy de Vite dirige `/api` a Django en el puerto 8000. Los lanzadores usan el esquema existente. Administra los cambios de esquema por separado con los scripts de [database/](database/). Los archivos privados de entorno están excluidos de Git.

## Integraciones de demostración

- **Brevo.** Para enviar correos, configura `BREVO_API_KEY` y un `BREVO_SENDER_EMAIL` verificado. El backend de consola no habilita el envío de códigos de recuperación a usuarios.
- **Stripe.** Usa `STRIPE_MODE=test` y la clave de prueba de tu cuenta. `iniciar_stripe_local.bat` reenvía eventos al backend local. Guarda el secreto del listener local en `STRIPE_WEBHOOK_SECRET`. La URL pública de Render usa el secreto de su propio destino.
- **Gemini.** Configura `GEMINI_API_KEY` y `GEMINI_MODEL` en Django para habilitar la interpretación de preguntas del CU25.

Ejecuta las pruebas con una base aislada. GitHub Actions ejecuta comprobaciones con SQLite, sin usar la conexión de Supabase. Para configurar los servicios de producción, sigue [la guía de despliegue](DESPLIEGUE.md).
