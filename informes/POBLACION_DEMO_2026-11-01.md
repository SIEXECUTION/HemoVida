# Población académica preparada — 1 de noviembre de 2026

Se actualizó `database/revision_poblacion/02_poblacion_demo_revision.sql` para
el esquema final de los ciclos 2 y 3. Se conservan seis escenarios identificados
por `DEMO-C3-*`, sin crear credenciales ni cambiar usuarios existentes.

Incluye 6 personas/candidaturas, 4 citas de evaluación con turno y prefiltro
versionado, 3 receptores, 1 programación autóloga pendiente con historial,
1 institución, 3 solicitudes con detalle, 2 deudas por 300 BOB y 1 equipo vacío.
Dos citas tienen una respuesta pendiente para evaluación profesional.
La carga no genera resultados médicos, liberaciones o pagos aprobados.

## Evidencia

- Consulta de Supabase de solo lectura: 0 personas y 0 citas DEMO-C3; 6 requisitos
  activos y perfiles existentes suficientes para el escenario.
- Dos pruebas integradas pasan en PostgreSQL local: SQL real, repetición,
  secuencias, integridad de prefiltro y horarios, días cerrados, programa,
  historial, solicitudes y cartera.
- API de agenda: 4 citas y 6 candidatos; programación: 1 pendiente; finanzas:
  2 deudas y 300 BOB sin pagos/comprobantes. Logística recibe 403 en finanzas.
- Los registros creados por las pruebas se revierten. Las secuencias locales
  sí pueden avanzar. No se insertaron datos ni ajustaron secuencias en Supabase.

## Próximo paso

Revisar y autorizar esta población concreta para Supabase. Después, respaldo
privado, ejecución transaccional con COMMIT y comprobación desde otra conexión.
El archivo del repositorio conserva ROLLBACK por la instrucción previa de
preparar SQL para revisión sin aplicarlo. Esta preparación no implica que la
base compartida ya esté poblada ni que todos los circuitos clínicos hayan sido
recorridos con los datos DEMO. El Word aún no se ha actualizado.
