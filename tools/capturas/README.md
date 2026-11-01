# Capturas del frontend para el documento

El script abre el frontend real en Microsoft Edge mediante Playwright y guarda PNG por ciclo y caso de uso. No genera interfaces ficticias ni reemplaza las respuestas de la API.

## Requisitos y ejecución

1. Inicia el backend y el frontend con los lanzadores del proyecto. URL predeterminada: `http://127.0.0.1:3000/`.
2. Deben existir las cuentas DEMO y el archivo privado `.venv/demo_integral/supabase/credenciales.json`, con claves `admin`, `donante`, `colecta`, `medico`, `bioquimico` y `logistica`. Cada registro tiene `usuario`, `clave` y `rol`. No copies este archivo a Git ni al documento.
3. Ejecuta desde la raíz:

```powershell
node tools/capturas/capturar_frontend.cjs
```

Se utilizan las dependencias Playwright ya declaradas en `frontend/package.json`. En una instalación nueva, primero ejecuta `npm ci` dentro de `frontend`. Microsoft Edge debe estar instalado.

La carpeta predeterminada es `output/capturas_frontend_AAAA-MM-DD`, con fecha de America/Caracas. Contiene `ciclo_1`, `ciclo_2`, `ciclo_3`, `galeria.html`, `indice.csv`, `indice.json`, `revision.json` y `LEEME.md`. Las imágenes se capturan a una escala de 1,5 para conservar detalle al insertarlas en Word. Se combinan vistas generales con recortes nativos de formularios y resultados.

## Opciones

```powershell
# Repetir un perfil conservando el índice de la carpeta elegida
node tools/capturas/capturar_frontend.cjs --perfil bioquimico

# Elegir otra carpeta y otro archivo privado
$env:HEMOVIDA_CAPTURE_OUTPUT = 'C:\Users\Sebas\Desktop\Capturas HemoVida'
$env:HEMOVIDA_CAPTURE_CREDENTIALS = 'C:\ruta\privada\credenciales.json'
node tools/capturas/capturar_frontend.cjs
```

Los perfiles admitidos son `publico`, `admin`, `donante`, `colecta`, `medico`, `bioquimico` y `logistica`. Para cambiar la URL se utiliza `HEMOVIDA_UI_URL`. El origen elegido debe exponer la API mediante `/api/`, como hace el proxy local de Vite, y apuntar al backend y la BD que se desean documentar.

## Alcance de las capturas

Los formularios de acceso, recuperación y autorregistro se muestran vacíos. Para las pantallas internas, el script autentica realmente las cuentas DEMO contra `/api/auth/login/`, selecciona el rol asignado mediante `/api/clinica/perfil/` y carga en la sesión del navegador los tokens devueltos por el servidor. No se fabrican identidades ni tokens. Esto es preparación de sesión para capturas y no una prueba completa del formulario de inicio de sesión.

La navegación y las consultas usan la aplicación normal. No se envían formularios de negocio. Una protección de `fetch` rechaza escrituras desde la interfaz distintas de autenticación/selección de perfil. No se crean usuarios, citas, extracciones, resultados, liberaciones, pagos o sesiones Checkout. El acceso y las consultas pueden generar la auditoría normal del backend.

En CU14 se cambia el grupo únicamente en el formulario sin guardar, para mostrar el motivo obligatorio de corrección. El índice identifica ese estado pendiente. En CU22 se muestra el formulario real de Stripe sin crear Checkout ni efectuar cargos. Las capturas incluyen registros académicos existentes; las pantallas administrativas también pueden mostrar datos anteriores.

Una pantalla no acredita la aceptación integral del caso de uso ni el despliegue en Cloudflare/Render. Los archivos describen el entorno utilizado y el índice relaciona los casos según la organización vigente hasta ciclo 3. No se insertan automáticamente en el Word.

Las capturas y los archivos privados se mantienen fuera de Git. Las claves se leen del archivo privado, no se incluyen en el código ni se imprimen en los errores. La ejecución devuelve error cuando quedan capturas pendientes; consulta `revision.json`. Los archivos con el mismo nombre se sobrescriben y no se borran imágenes anteriores automáticamente.

## Incidencia del entorno durante esta captura

El DNS utilizado por libpq presentó un fallo temporal al resolver el pooler de Supabase. Se volvió a iniciar únicamente el servidor Django local de esta tarea con `PGHOSTADDR` resuelto para ese mismo host. Se conservó la conexión SSL y el puerto 6543; no se modificaron `.env`, la cadena guardada, los datos ni los servicios desplegados. Esa dirección temporal no se fija en el código. Referencia: [variables de conexión de PostgreSQL](https://www.postgresql.org/docs/current/libpq-envars.html).

## Resultado de esta ejecución

Se guardaron y revisaron 55 PNG para los 19 casos de los ciclos 1 a 3: 13 imágenes del ciclo 1, 16 del ciclo 2 y 26 del ciclo 3. Los PNG se abrieron correctamente, se verificaron sus referencias en el índice y se comprobó la integridad del ZIP. Los índices y la galería se revisaron para evitar contraseñas o tokens. Los formularios de negocio permanecieron sin enviar.

Entrega local: `output/capturas_frontend_2026-11-01/` y `output/capturas_frontend_2026-11-01.zip`. El archivo `INSERTAR_EN_DOCUMENTO.md` relaciona imágenes con los apartados 2.4.1, 2.4.2 y 2.4.3. Las imágenes y el ZIP están excluidos de Git; el repositorio conserva el script para repetir las capturas.
