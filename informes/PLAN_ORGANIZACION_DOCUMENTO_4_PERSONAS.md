# Plan de organización del documento HemoVida para cuatro personas

Fecha de referencia: 1 de noviembre de 2026.
Documento de trabajo: HEMOVIDA_enEdicion.docx.
Referencia de presentación: Ciclo4-Grupo7-ProyecyoSI1.pdf.
Alcance: ciclos 1, 2 y 3 y secciones generales que los sustentan.

## 1 Criterio de trabajo

Corregir y completar el documento de HemoVida con sus índices existentes. El
Grupo 7 es una referencia de organización, profundidad y representación UML;
no se copian sus actores, reglas, tecnologías, numeración ni errores.
No se desarrolla el ciclo 4. Sus apartados existentes se conservan como trabajo
futuro y no se presentan como completados en esta entrega.

Distribución documental propuesta para congelar antes de dibujar:

| Ciclo | Casos incluidos |
| --- | --- |
| 1 | CU01, CU02, CU03, CU04, CU05 |
| 2 | CU06, CU07, CU08, CU09, CU21, CU23 |
| 3 | CU10, CU11, CU12, CU13, CU14, CU15, CU22, CU24 |

Son 19 casos. CU12 se conserva como consentimiento/colecta, según la ficha del
documento de trabajo. CU10 cubre triaje; CU11, diferimientos; CU15,
fraccionamiento/conservación/custodia. Los comentarios o rótulos anteriores del
código no determinan la numeración académica. Se debe añadir CU12 al suplemento
de 18 fichas que se generó anteriormente y corregir las referencias cruzadas.
CU22 y CU24 se incorporan al ciclo 3 del alcance trabajado. CU23 permanece en
ciclo 2 aunque su responsable sea la Persona 4. Esta distribución debe usarse
en catálogo, requisitos, priorización, diagramas, pruebas e índice.

## 2 Asignación de responsables

Los nombres Persona 1 a Persona 4 son espacios para los integrantes reales.
Cada persona entrega las fichas, diagramas, capturas y pruebas de sus casos.
La responsabilidad transversal complementa ese trabajo; no lo reemplaza.

| Responsable | Bloque funcional | Responsabilidad transversal | Revisor |
| --- | --- | --- | --- |
| Persona 1 | CU01–CU05 | Coordinación editorial, actores, catálogo, requisitos y trazabilidad | Persona 4 |
| Persona 2 | CU06–CU09 y CU21 | Agenda, captación, coherencia del flujo de atención y organización de capturas | Persona 3 |
| Persona 3 | CU10–CU15, incluido CU12 | Reglas académicas clínicas, laboratorio, conservación y modelo lógico de datos | Persona 2 |
| Persona 4 | CU22, CU23 y CU24 | Arquitectura, modelo físico, implementación, consolidación de pruebas y revisión técnica | Persona 1 |

La carga se reparte por complejidad: Persona 3 tiene seis casos relacionados;
Persona 4 tiene tres, pero concentra arquitectura, diseño físico e integración.
Si el inventario inicial descubre que un diagrama existente necesita reconstrucción
completa, se redistribuye ese diagrama, manteniendo un único responsable de contenido.

## 3 Trabajo detallado de la Persona 1

### Seguridad carnet y organización editorial

1. Inventariar títulos, tablas, figuras, referencias y apartados vacíos del Word.
2. Corregir la numeración repetida: ciclo 1 en 2.3.1, ciclo 2 en 2.3.2 y ciclo 3
   en 2.3.3. Revisar la correspondencia con el índice automático de Word.
3. Completar 2.1.1 Actores. Separar DOC_TRIAJE de MED_SOLICITANTE; unificar el
   laboratorio como BIOQ_INTEGRAL; distinguir PERS_COLECTA de TEC_LOGISTICA;
   mantener ADMIN, DONANTE, POSIBLE_DONADOR y RECEPTOR. No crear actores
   independientes de cajero, director o TI como perfiles implementados si no existen.
4. Actualizar 2.1.2 Casos de uso y los requisitos funcionales; incorporar CU24.
5. Actualizar 2.2 Priorización sin inventar validación del docente ni prioridades
   nuevas: conservar las aprobadas o marcar la propuesta para revisión del equipo.
6. CU01: describir fallos diarios y bloqueos 15/30/60/120 minutos, expiración,
   reinicio al siguiente acceso de un nuevo día de Bolivia, conservación del
   contador tras login correcto y diferencia con bloqueo manual. No prometer
   auditoría de cada intento fallido si esa escritura no está comprobada.
7. CU02: describir altas, roles, acreditación y rehabilitación según funciones
   existentes. Distinguir solicitud planteada de cargo de un flujo implementado.
8. CU03: precisar actor, rol, origen, transacción y consulta de bitácora. Evitar
   afirmar inmutabilidad absoluta frente al propietario de PostgreSQL.
9. CU04: stock utilizable, exclusión de cuarentena/caducidad/autólogas y
   aprobación conjunta; diferenciar parámetros disponibles de métricas futuras.
10. CU05: código completo de carnet, QR con URL de verificación, historial y
    descanso calculado por el servidor. El carnet no certifica aptitud clínica.
11. Construir la matriz general de trazabilidad con aportes de las otras personas.
12. Integrar conclusiones, recomendaciones y bibliografía al final, sin inventar
    resultados que el equipo no haya entregado como evidencia.

Entregables: cinco fichas actualizadas; comunicación, clases de análisis y
secuencia para esos casos; capturas vigentes; pruebas positivas y negativas;
catálogo/actores/matriz consolidados; Word maestro integrado.

## 4 Trabajo detallado de la Persona 2

### Captación agenda admisión refrigerio y autóloga

1. CU06: catálogo activo versionado, una respuesta por requisito, snapshot,
   borradores parciales y ausencia de reserva de cupo al guardar borrador.
2. CU07: publicación de turnos de 15 minutos, un cupo, lunes a viernes,
   08:00–12:00 y 13:00–17:00, zona America/La_Paz; cupos concurrentes, cierres,
   reprogramación y cancelación. No exigir serología previa de forma general.
3. CU08: admisión antes de triaje, identidad, cita del día y atención presencial
   autorizada. La evaluación puede recibir requisitos pendientes para revisión.
4. CU09: extracción existente, entrega real o pendiente, confirmación posterior
   e idempotencia. No fijar refrigerioEntregado a TRUE por defecto.
5. CU21: indicación médica, revisión BIOQ, programa versionado, cirugía futura,
   paciente concordante y exclusividad. Documentar modificación, cancelación y
   cierre; cuarentena/revisión en vez de baja o liberación automáticas.
6. Revisar el diagrama de negocio del recorrido completo con Persona 3.
7. Coordinar el catálogo de capturas: rol, pantalla, acción, resultado, estado
   previo y caso cubierto. Evitar repetir una misma captura como evidencia de
   operaciones diferentes sin explicación.
8. Distribuir a los apartados 2.4, 3.2, 3.3 y 5.3.1 los artefactos de sus casos.
9. Revisar las clases de AgendaTurno, CitaDonacion, PrefiltroCita,
   PrefiltroBorrador, CierreAgenda y ProgramacionAutologa con Persona 3.

Entregables: cinco fichas con artefactos y pruebas; recorrido de ciclo 2;
catálogo de capturas; validación cruzada del bloque clínico de Persona 3.

## 5 Trabajo detallado de la Persona 3

### Triaje colecta laboratorio y conservación

1. CU10: evaluación del candidato admitido y dictamen. Documentar mayoría de
   edad y parámetros académicos verificados; peso estrictamente mayor de 50 kg.
   No afirmar que el sistema inventa diagnósticos o aprueba automáticamente.
2. CU11: origen en triaje o análisis, motivo, temporal/definitivo, días, fechas
   y comunicación. No convertir un plazo mayor de 365 días automáticamente en
   definitivo ni confundir diferimiento clínico con bloqueo de usuario.
3. CU12: consentimiento y colecta asociados al último triaje Apto vigente del
   día, identidad, descanso, volumen 300–450 ml e incidencia si se interrumpe.
   La firma DEMO de los ensayos debe identificarse como sintética.
4. CU13 y CU14: resultados de serología e inmunohematología, concordancia ABO/Rh,
   aprobación conjunta y acción explícita de liberación de BIOQ_INTEGRAL.
   Incluir correcciones con motivo, concurrencia, cuarentena y reservas.
5. Separar promoción de perfil DONANTE por triggers heredados de la aprobación
   biológica de componentes: tener rol DONANTE no prueba que un lote esté liberado.
6. CU15: relación madre/derivados, balance de volumen, capacidad, presentación,
   caducidad, ventana de fraccionamiento, equipos, custodia y baja autorizada.
7. Registrar parámetros como referencias académicas: rojos 2–6 °C/35 días;
   plaquetas 20–24 °C/5 días/con agitación; PFC y crio −30 a −18 °C/365 días.
8. Completar los apartados vacíos de ciclo 3: 2.4.3, 3.2.3, 3.3.3 y 5.3.1.3
   para sus seis casos; coordinar finanzas/reportes con Persona 4.
9. Actualizar el modelo de dominio, el diagrama lógico, mapeo y normalización
   de 5.1 con todas las entidades requeridas hasta migración 11.
10. Revisar con Persona 2 que admisión, triaje y colecta no formen una dependencia
    circular y que autóloga no termine en stock general.

Entregables: seis fichas y sus artefactos; reglas académicas coherentes;
modelo lógico/mapeo actualizados; lista de diferencias entre BD y diagramas.

## 6 Trabajo detallado de la Persona 4

### Finanzas reportes arquitectura datos físicos y pruebas

1. CU22: obligaciones, abonos, saldos, exoneración/convenio, Checkout, webhook,
   idempotencia, conciliación y comprobante. Moneda BOB y acceso financiero ADMIN.
   No describir un QR bancario interoperable o vencimiento fijo de diez minutos
   como si fueran prestaciones confirmadas de la integración Stripe.
2. CU23: ocho plantillas de informes fijos, filtros admitidos y CSV/PDF.
3. CU24: nueve fuentes autorizadas, dimensiones, métricas y filtros permitidos;
   límites de consulta; fechas Bolivia; tasas sin denominador nulas; stock y
   cartera sin historia temporal que la BD no conserva.
4. Documentar permisos de reportes: ADMIN todo; DOC_TRIAJE clínica; BIOQ clínica,
   laboratorio e inventario; TEC_LOGISTICA inventario.
5. Actualizar 4.1.1 y 4.1.2: navegador/Cloudflare Workers, Django REST en Render,
   PostgreSQL en Supabase con SSL y pooler 6543; JWT, CORS, Brevo y Stripe.
   No representar Supabase Auth como autenticación de la aplicación Django.
6. Completar 3.4 Análisis de paquete y 6.2/6.3 con componentes generales y de
   los paquetes reales: seguridad, donantes, agenda, clínica, laboratorio,
   inventario, finanzas y reportes. Confirmar dependencias con cada propietario.
7. Actualizar 5.2: esquema consolidado hasta 11, diccionario de datos, claves,
   restricciones, índices, SQL de consultas, triggers y procedimientos. Marcar
   los tres procedimientos clínicos heredados restringidos como tales, sin
   presentarlos como la ruta actual ni recomendar ejecutarlos.
8. Documentar población DEMO, finalidad de cada escenario y respaldo. No pegar
   un dump con personas reales, hashes, contraseñas, tokens o claves API.
9. Completar 6.1 con herramientas realmente usadas, diferenciando PostgreSQL
   local de la versión administrada en Supabase. Mantener datos verificados.
10. Consolidar pruebas del equipo y preparar un anexo dentro de Documentación,
    sin crear un capítulo nuevo que desplace los índices del documento actual.

Entregables: tres fichas con artefactos; arquitectura; diseño físico;
componentes; anexo de pruebas y revisión técnica de integración.

## 7 Plantilla obligatoria de entrega por caso de uso

Cada caso debe incluir los mismos campos del Word: nombre y código, propósito,
resumen, actores, actor iniciador, precondición, flujo principal numerado,
postcondición y excepciones. Añadir reglas/datos/referencias de manera uniforme
si el equipo adopta los campos ampliados del suplemento; no mezclar dos formatos.
No escribir una postcondición Apto si el caso también puede terminar Rechazado.

Artefactos por caso:

- Diagrama de CU asociado, dentro de su vista de ciclo o individual cuando haga
  falta, con el límite del sistema e include/extend correctamente justificados.
- Diagrama de comunicación: objetos y mensajes numerados del flujo documentado.
- Clases de análisis: interfaz, control y entidades, con relaciones pertinentes.
- Secuencia: actor, interfaz, API/servicio, persistencia y alternativas relevantes.
- Captura de la pantalla vigente y evidencia de una acción; explicar sus límites.
- Pruebas: al menos un flujo satisfactorio y una excepción significativa; agregar
  autorización y concurrencia donde el caso lo requiera.

Los diagramas existentes se revisan y reutilizan cuando sean válidos. No se
reconstruyen todos por apariencia. Cada mensaje de diagrama debe corresponder
al flujo y al proyecto; un ejemplo del Grupo 7 no prueba una función de HemoVida.

## 8 Mapa a los índices actuales

| Sección | Responsable principal | Aportes |
| --- | --- | --- |
| Perfil y tecnología/costos preliminares | Persona 1 | Persona 4 valida infraestructura; cada bloque valida alcance |
| Modelo de dominio y negocio del perfil | Persona 3 | Persona 2 valida recorrido; Persona 4 finanzas/reportes |
| 2.1 Actores casos y requisitos | Persona 1 | Todos validan sus actores y reglas |
| 2.2 Priorización y ciclos | Persona 1 | Acuerdo inicial de los cuatro |
| 2.3 Fichas de detalle | Cada dueño de CU | Persona 1 unifica formato e integra |
| 2.4 Prototipos/capturas hasta ciclo 3 | Persona 2 coordina | Cada dueño aporta sus pantallas |
| 2.5 Modelo de CU por ciclos | Persona 1 integra | Cada dueño valida sus asociaciones |
| 3.1 Arquitectura de análisis | Persona 4 | Todos validan paquetes/casos |
| 3.2 Comunicación y 3.3 Clases de análisis | Cada dueño de CU | Revisor cruzado asignado |
| 3.4 Análisis de paquete | Persona 4 | Revisión de los cuatro |
| 4.1 Arquitectura física/lógica | Persona 4 | Persona 1 comprueba consistencia editorial |
| 5.1 Datos lógicos | Persona 3 | Persona 2 agenda; Persona 4 finanzas/reportes |
| 5.2 Datos físicos | Persona 4 | Persona 3 comprueba relaciones y reglas |
| 5.3.1 Secuencias hasta ciclo 3 | Cada dueño de CU | Persona 1 coloca y actualiza referencias |
| 6.1 Plataforma y 6.2/6.3 Componentes | Persona 4 | Cada dueño valida su módulo |
| 7 Conclusión y 8 Recomendación | Persona 1 redacta | Todos entregan resultados y pendientes |
| 9 Bibliografía y anexos | Persona 1 integra | Persona 4 consolida pruebas; todos citan fuentes |

## 9 Orden de trabajo y calendario orientativo

Propuesta de cinco jornadas de trabajo, no una promesa de duración. La jornada
inicial debe medir la cantidad de diagramas reutilizables y ajustar el plazo.

| Jornada | Trabajo paralelo | Condición para cerrar |
| --- | --- | --- |
| 1 | Inventario, alcance de 19 casos, nomenclatura, roles, plantilla y matriz inicial | Catálogo y reglas acordados; cada vacío con responsable |
| 2 | Fichas por bloque; primeras correcciones de modelo de datos y arquitectura | Revisor acepta contenido antes de diagramar |
| 3 | Diagramas de CU, comunicación, análisis, secuencia, paquetes y datos | Correspondencia CU–flujo–mensajes–entidades revisada |
| 4 | Capturas y pruebas por rol; componentes e implementación; evidencias | Resultados obtenidos separados de lo esperado y de lo no ejecutado |
| 5 | Integración del Word, índices, figuras, tablas, referencias y conclusiones | PDF revisado completo por dos personas; lista final sin vacíos del alcance |

Dependencias: no cerrar diagramas antes de aprobar fichas; no cerrar secuencias
antes de confirmar servicios y transacciones; no escribir conclusiones antes
de reunir evidencias. Puede avanzarse en paralelo en bloques independientes.
Reunión breve al inicio y cierre de cada jornada: terminado, pendiente, bloqueo,
y cualquier cambio que afecte a otro bloque.

## 10 Organización de archivos y control de cambios

Conservar HEMOVIDA_enEdicion.docx original. Trabajar sobre una copia maestra con
versión y fecha. Persona 1 es la única integradora de la copia maestra para
evitar cuatro ediciones incompatibles del mismo archivo binario.

Cada integrante entrega una carpeta por CU, por ejemplo:

    CU14/
      ficha.docx
      comunicacion.drawio
      comunicacion.png
      clases.drawio
      clases.png
      secuencia.drawio
      secuencia.png
      captura_laboratorio.png
      pruebas.md
      cambios_y_referencias.md

Se puede usar Enterprise Architect u otra herramienta existente; lo importante
es entregar la fuente editable y la imagen legible. No entregar solo capturas
sin posibilidad de edición. Conservar nombres CU en archivos y documento,
aunque la interfaz del producto ya use títulos funcionales sin esos códigos.

Registro común: sección, CU, responsable, revisor, estado, archivo fuente,
observaciones y fecha. Estados: pendiente, en trabajo, en revisión, corregir,
aprobado e integrado. Solo el revisor marca aprobado; Persona 1 marca integrado.
Cambios a contratos de otro caso requieren avisar al dueño y actualizar la matriz.
No modificar código, esquema o datos compartidos solo para hacer coincidir un
texto: detectar la diferencia y resolverla con autorización y revisión técnica.

## 11 Pruebas y evidencias mínimas

| Área | Pruebas que deben documentarse |
| --- | --- |
| Seguridad | Login válido; rol incorrecto; tres fallos/15 min, siguiente bloque/30 min; expiración; reinicio diario; bloqueo manual preservado |
| QR y carnet | Código completo; enlace sin sesión; QR legible; código inexistente; no devolver otra persona por fragmento |
| Agenda | Horario/cupo; día cerrado; borrador sin reserva; catálogo cambiado; dos reservas concurrentes; cita ajena |
| Admisión | Cita del día; identidad correcta; evaluación sin triaje previo; rechazo de fecha/identidad incorrecta |
| Colecta | Triaje vigente; consentimiento; descanso; volumen; rechazo sin escrituras parciales |
| Diferimiento | Temporal con fecha; definitivo explícito; comunicación; citas incompatibles canceladas |
| Laboratorio | Una evaluación no libera; dos aprobadas permiten liberar por BIOQ; ADMIN no libera; corrección con motivo y cuarentena |
| Conservación | Sin protocolo; equipo incompatible; capacidad; balance de volumen; fecha de caducidad y ventana de fraccionamiento |
| Autóloga | Programa pendiente no autoriza; revisión BIOQ; cambio crea versión; exclusividad; cancelación no reasigna a terceros |
| Finanzas | Abono y saldo; rechazo de sobrepago; rol no ADMIN; idempotencia; webhook duplicado; firma inválida; modo test |
| Informes | Fuente por rol; filtros admitidos; exportación; vacío/tasa nula; stock solo aprobado; finanzas confirmadas |

Ficha de prueba: ID CP-CUxx-001, objetivo, prioridad, actor/rol, precondiciones,
entorno y versión, entradas sintéticas, pasos, salida esperada, salida obtenida,
estado, evidencia, fecha y responsable. Un fallo se conserva y se explica; no
se reemplaza por una captura que aparente éxito.

Distinguir pruebas unitarias, PostgreSQL local, navegador con API simulada,
lecturas del backend público y recorrido desplegado real. Un login HTTP 200
no demuestra por sí solo laboratorio, colecta o un webhook público exitosos.
La espera de bloqueos puede verificarse con reloj controlado en pruebas; no se
necesita bloquear cuentas reales. Usar únicamente datos y cuentas DEMO.

## 12 Detalles adicionales que no deben olvidarse

- Matriz de trazabilidad: CU, RF, ciclo, actor, pantalla, endpoint/servicio,
  entidades, diagramas, prueba y estado de verificación. Confirmar cada ruta
  con el repositorio; no copiar rutas ficticias del documento de referencia.
- Glosario de términos y estados: candidato, donante, receptor, aptitud,
  cuarentena, liberación, reserva y bloqueo de cuenta son conceptos diferentes.
- Diccionario de datos: tipo, nulabilidad, PK/FK, restricciones, significado y
  origen. Separar timestamp heredado UTC de la fecha operativa de Bolivia.
- Índices de tablas y figuras, pies, fuente, numeración y referencias internas.
  Marcar Elaboración propia solo para trabajo realmente elaborado por el equipo.
- Credenciales con hash compatible con Django, no cifrado reversible de claves;
  ninguna contraseña DEMO ni secreto se pega en el documento de entrega.
- Los correos example.test no reciben mensajes; no usarlos como prueba de Brevo.
- Conservación y criterios clínicos son referencias académicas, no aprobación
  institucional para atender pacientes. El proyecto no valida instrumental físico.
- Stripe test y endpoint público correcto; separar secreto local de Stripe CLI
  del secreto del webhook público. No publicar ninguno en anexos.
- La BD compartida contiene DEMO y datos anteriores: explicar cuándo un reporte
  suma ambos. No afirmar que todos los registros fueron creados por el nuevo flujo.
- Mantener el diseño de datos actual: el documento se adapta a lo implementado;
  si hay un error del sistema, registrarlo como corrección técnica pendiente.
- SQL heredado: clasificar vigente, compatibilidad o restringido. No afirmar que
  toda la lógica se ejecuta en SP si hoy la coordina Django con transacciones.
- No afirmar monitoreo automático de sensores, conexión a lectores físicos,
  facturación legal o reducción de tiempos medida sin evidencia correspondiente.
- No reutilizar diagramas del ciclo 4 como si validaran ciclos 1–3.

## 13 Lista de aceptación final

1. Los 19 casos están catalogados con la misma numeración y ciclo en todo el Word.
2. Hay 19 fichas revisadas, incluyendo CU12, CU22 y CU24 en el alcance acordado.
3. Cada CU tiene comunicación, análisis y secuencia, reutilizados o completados;
   las tres vistas de ciclo de 2.5 están desarrolladas. Toda excepción importante
   aparece en el flujo y se representa donde aporta información.
4. Los encabezados vacíos de ciclo 3 en 2.4.3, 3.2.3, 3.3.3 y 5.3.1.3 se completaron.
5. 3.4 y 6.1/6.2/6.3 contienen desarrollo y diagramas, no solo títulos.
6. Arquitectura, modelo lógico y esquema físico corresponden al proyecto hasta 11.
7. Capturas son legibles y actuales, con rol, acción y explicación; sin secretos.
8. Anexo de pruebas diferencia esperado/obtenido y local/desplegado, sin inventar éxitos.
9. Conclusiones/recomendaciones describen resultados y pendientes reales hasta ciclo 3.
10. Persona 1 actualiza índice y referencias; Personas 1 y 4 revisan toda la
    exportación PDF. Personas 2 y 3 validan el recorrido clínico completo.
11. El Word editable, PDF final y fuentes de diagramas se entregan ordenados;
    el original se conserva y el ciclo 4 queda fuera del desarrollo de esta entrega.

## 14 Primeras acciones concretas

Persona 1 abre la matriz y distribuye los 19 CU. Persona 2 revisa las cinco
fichas de agenda/admisión/autóloga y lista las capturas reemplazables. Persona 3
corrige CU12 y la liberación conjunta antes de dibujar el ciclo 3. Persona 4
inventaría las tablas nuevas y prepara arquitectura y plantilla de pruebas.
El equipo revisa juntos una ficha y una secuencia terminadas antes de producir
el resto, para acordar una única presentación y evitar rehacer todo al final.
