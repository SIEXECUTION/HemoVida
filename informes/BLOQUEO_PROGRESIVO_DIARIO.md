# Bloqueo progresivo diario CU01

Cada tres fallos acumulados del día: 15, 30, 60, 120 minutos y sucesivas
multiplicaciones por dos. Los intentos durante un bloqueo vigente no se cuentan.
Al vencer el plazo se permite volver a probar; un login correcto conserva los
fallos acumulados ese día. El contador se reinicia al primer intento de acceso
del nuevo día de America/La_Paz, a partir de medianoche. El reinicio diario
levanta el bloqueo temporal aunque su plazo cruzara medianoche.

Los estados Bloqueado e Inactivo requieren intervención administrativa y no
se rehabilitan por el tiempo. Los bloqueos antiguos sin plazo no se convierten
a temporales automáticamente. La rehabilitación administrativa reinicia el
contador de fallos como antes. totalBloqueosRecibidos conserva el total histórico.

La migración 11 añade fechaintentosdia, nullable, sin modificar contraseñas,
usuarios o estados anteriores. Se debe aplicar antes de publicar este código.
El contador se protege con transacción y bloqueo de fila. El error de validación
se genera después de confirmar el incremento, para que el fallo persista.
El esquema heredado guarda fechabloqueohasta como timestamp sin zona en UTC;
se normaliza a UTC antes de compararlo y se informa el vencimiento en Bolivia.

Pruebas: progresión y expiración, intentos durante bloqueo, medianoche Bolivia,
login válido entre fallos, preservación de bloqueo manual y tres fallos
concurrentes en PostgreSQL local. No se ensayan contraseñas de cuentas reales.

Migración 11 aplicada y verificada en Supabase el 1 de noviembre de 2026.
Respaldo privado de esquema previo: `.venv/cierres/20261101T134127Z/`.
Se compararon los campos de seguridad antes y después: sin modificaciones.

Validación final: 5 pruebas PostgreSQL de la política y 19 pruebas de seguridad
pasaron. No se enviaron correos ni se probaron contraseñas en Supabase.
