# Corrección del QR del carnet CU05

El carnet operativo codificaba solo su identificador. El escaneo no abría una
consulta y la aplicación no procesaba el parámetro carnet de los enlaces.
Ahora codifica la URL del origen actual con el código completo, incluye margen
QR y ofrece abrir la verificación. El enlace funciona sin sesión y al recargar.
Las consultas públicas no envían un encabezado Bearer vacío.

Se eliminaron las búsquedas por fragmentos numéricos de CI o carnet para evitar
que un código incompleto devolviera otra persona. Se mantienen códigos y CI
completos y sus normalizaciones existentes. El componente de carnet anterior,
que no es el recorrido operativo actual, también deja de usar un proveedor QR
externo como alternativa y usa primero el código de carnet.

Validación local: compilación TypeScript/Vite, 8 pruebas de donantes y una
prueba de navegador que abre el enlace sin sesión, comprueba el QR y vuelve
a cargar. La prueba del navegador usa respuestas controladas de la API; no
representa una prueba física de cámara ni una validación del despliegue.

La cuenta consultada por solicitud del usuario ya tiene registro de donante,
rol DONANTE y carnet asignado. No se duplicaron registros ni se modificó su
estado clínico. No tiene extracciones registradas; no se fabricó historial.
La consulta y el respaldo previo de los datos de asignación permanecen privados
en .venv. Para actualizar perfiles visibles, cerrar sesión y volver a entrar.

La verificación pública conserva el contrato preexistente de consulta del
carnet; el registro no sustituye triaje, pruebas ni autorización de colecta.
Desplegar la rama secundaria en Cloudflare y Render para usar las correcciones.
