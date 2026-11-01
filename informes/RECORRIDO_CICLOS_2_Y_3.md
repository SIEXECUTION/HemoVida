# Recorrido académico de los ciclos 2 y 3

## Entorno y accesos

Frontend: https://hemovida-banco-de-sangre.siexecution2026.workers.dev
Backend: https://hemovida-backend.onrender.com

Se añadieron 12 cuentas sintéticas `demo.c23.*`, con correos `example.test` que
no reciben mensajes. Las contraseñas aleatorias están únicamente en el archivo
privado `.venv/demo_integral/supabase/ACCESOS_DEMO_PRIVADOS.md`. No subirlo a Git.
Cada cuenta permite iniciar sesión con el nombre de usuario indicado abajo.
Cerrar sesión al cambiar de perfil. No modificar los permisos de cuentas reales.

| Usuario | Función |
| --- | --- |
| demo.c23.admin | Usuarios, agenda, finanzas, informes y auditoría |
| demo.c23.medico | Triaje, diferimientos e informes clínicos |
| demo.c23.bioquimico | Análisis, correcciones, liberación y revisión autóloga |
| demo.c23.logistica | Inventario, custodia y conservación |
| demo.c23.colecta | Recepción, colecta, refrigerio e incentivos |
| demo.c23.solicitante | Indicación médica autóloga |
| demo.c23.donante | Carnet e historial de un caso ya procesado |
| demo.c23.postulante | Cita futura y cuestionario para el recorrido nuevo |
| demo.c23.receptor | Consulta del programa autólogo y agenda tras aprobación |
| demo.c23.laboratorio | Paciente del lote que espera inmunohematología |
| demo.c23.temporal | Candidato con diferimiento temporal académico |
| demo.c23.definitivo | Candidato con diferimiento definitivo académico |

Los roles reales asignados, incluidos cambios automáticos de triggers heredados,
se reflejan en el archivo privado de accesos. La etiqueta DEMO identifica nombres,
CI, referencias, códigos de bolsa, resultados y movimientos sintéticos.

## Ciclo 2 desde una cita nueva

1. Con Administración abrir Citas y recepción. Seleccionar la fecha publicada
   indicada en el resumen inferior. Comprobar turnos de 15 minutos, un cupo,
   lunes a viernes de 08:00–12:00 y 13:00–17:00. Se reutilizan días ya publicados.
2. Con Postulante abrir Citas y prefiltro. Ya tiene una cita de evaluación para
   la fecha del resumen. Revisar cuestionario, guardar borrador o probar
   reprogramación/cancelación y nueva reserva con el catálogo vigente.
3. El día de la cita, con Colecta buscar la CI `DEMO-C23-POSTULANTE`, verificar
   identidad y confirmar asistencia. No se admite una cita de otro día.
4. Con Medicina abrir Atención clínica y registrar signos y dictamen del mismo
   candidato. Parámetros sintéticos de ensayo: 70 kg, 120/80, Hb 14 y 36,5 °C.
   El dictamen sigue siendo una decisión explícita del operador del proyecto.
5. Con Colecta registrar consentimiento académico rotulado como sintético y
   colecta, solo con triaje Apto vigente del día. Luego registrar refrigerio e
   incentivo. Si no se entregó, dejarlo pendiente y confirmar después.
6. Abrir los candidatos DEMO Temporal y Definitivo para observar restricciones
   ya guardadas. Sus motivos son ficticios y no diagnostican a una persona real.
7. Para el circuito autólogo entrar con Médico solicitante y revisar el programa
   `DEMO-C23-AUTO`. Bioquímica lo revisa y confirma la aprobación. Solo entonces
   Receptor puede reservar atención autóloga antes de la cirugía. Una modificación
   médica obliga a una nueva revisión y conserva versiones.
8. Consultar Informes de gestión con cada rol. Medicina accede a clínica;
   Bioquímica a clínica, laboratorio e inventario; Logística a inventario;
   Administración a todas las fuentes y finanzas.

## Ciclo 3 con escenarios precargados

1. Con Donante abrir Carnet e historial: hay una extracción académica histórica
   y un QR verificable. El descanso impide volver a usarlo inmediatamente para
   otra extracción; usar Postulante para el recorrido nuevo del ciclo 2.
2. Con Bioquímica abrir Laboratorio y liberación conjunta, seleccionar
   `DEMO-C23-MAD-LABORATORIO`. Ya tiene serología; completar inmunohematología
   con grupo O, Rh Positivo, resultados negativos y dictamen Apto para el ensayo.
   Revisar ambos resultados y ejecutar Liberar. Una sola evaluación no basta.
3. `DEMO-C23-MAD-DONANTE` ya tiene ambos análisis y un componente Disponible.
   Es un ejemplo académico que permite contrastar el estado final con cuarentena.
4. Con Logística abrir Inventario y Atención clínica. Revisar las ubicaciones
   `DEMO-C23-FRIO-*`, capacidad, temperatura y custodia. No se alteraron los
   protocolos de conservación existentes. Fraccionar una extracción nueva solo
   dentro de su ventana permitida; el historial importado no se refracciona hoy.
5. Para probar correcciones, usar exclusivamente un lote DEMO con Bioquímica,
   registrar motivo y confirmación. La corrección devuelve a cuarentena y exige
   revisión/liberación explícita; no altera datos de donantes ajenos al ensayo.
6. Con Administración abrir Finanzas. `DEMO-C23-SOL-1` tiene 100 BOB pendientes.
   `DEMO-C23-SOL-2` tiene obligación de 200 BOB y un abono DEMO de efectivo de
   50 BOB, saldo 150. El comprobante es sintético y no acredita dinero real.
7. Para Stripe crear un Checkout de prueba desde una deuda pendiente. La carga
   no invocó Stripe, no fabricó eventos ni confirmó pagos Stripe. Comprobar modo
   test y el webhook del backend público; la confirmación requiere notificación
   firmada o conciliación, no solo volver desde el navegador.
8. Abrir Consultas y KPIs, seleccionar fuente, dimensiones, métricas y filtros;
   comparar con Informes de gestión y exportar CSV/PDF. Los totales incluyen los
   demás datos de la base compartida y los DEMO cargados anteriormente.
9. Con Administración consultar Auditoría y localizar operaciones de los perfiles
   DEMO. Los registros históricos se cargaron como escenario académico importado;
   no constituyen evidencia de una atención humana ni de pruebas de cámara física.

## Resumen de los registros de esta carga

Fecha de la cita futura: **2026-11-02**.

- donante: `{"madre": 505, "componente": 10, "extraccion": 1007, "incentivo": 5}`
- laboratorio: `{"madre": 506, "componente": 11, "extraccion": 1008, "incentivo": 6}`
- deuda_1: `5`
- deuda_2: `6`


## Validación y alcance

La carga se ensayó en PostgreSQL local antes de Supabase. Incluye citas y
prefiltros completos, triajes y extracciones históricas sintéticas, consentimientos
rotulados DEMO, componentes con caducidad, serología y liberación conjunta,
diferimientos, refrigerios, programación e historial autólogo y finanzas.
Los análisis y la liberación, diferimientos, citas futuras, programas y cobros
se registran mediante las vistas reales del backend con perfiles sintéticos.
Las citas y colectas históricas se importan como fixtures relacionales completos;
no se simula que una persona haya ejecutado ese flujo hoy desde el navegador.
No se crearon despachos ni transfusiones: corresponden a otros ciclos.

El ejecutor protege la transacción, toma bloqueos y sincroniza secuencias
adelantándolas cuando corresponde. Si detecta usuarios demo.c23 existentes,
se detiene sin duplicar, regenerar claves ni reiniciar estados. Los contadores
de secuencias pueden avanzar incluso si una carga falla y se revierte.

Respaldo privado de estructura y datos del esquema public y manifiesto de carga:
`.venv/demo_integral/supabase/`. El índice del respaldo se debe comprobar antes
de intentar restauración; la restauración no se ejecuta durante la población.

La guía también está disponible en la pestaña Guía de recorrido del frontend
al desplegar la rama secundaria. Los títulos visibles usan nombres funcionales
en lugar de códigos CU. Los documentos académicos conservan sus códigos.


## Evidencia de esta entrega

Carga confirmada en Supabase el 1 de noviembre de 2026. Respaldo privado previo:
`.venv/demo_integral/supabase/antes_20261101T170914Z.dump`, 263389 bytes, índice
legible mediante pg_restore. No se realizó una restauración.
Doce accesos contra el endpoint de login público respondieron HTTP 200 con sus
roles reales; no se imprimieron tokens ni contraseñas. Consulta independiente:
un componente Disponible con aprobación conjunta, otro En Cuarentena sin
aprobación conjunta, y saldos financieros 100/150 BOB.

Validación del frontend: compilación TypeScript/Vite y dos pruebas de estructura
correctas; 15 pruebas de navegador existentes y la nueva prueba de la guía
pasaron en sus ejecuciones. Las pruebas de interfaz usan respuestas controladas.
La reejecución local de la carga se detuvo antes de duplicar o reiniciar datos.
Los efectos completos en la web publicada se revisan después del despliegue.
