# Diagramas complementarios de HemoVida hasta el ciclo 3

Referencia: `C:\Users\Sebas\Desktop\DIAGRAMAS\demas diagramas\instrucciones_de_diagramas_plantuml_sistemas_de_informaci_n_1.md`.

La guía define ocho categorías de PUDS/UML. Sus ejemplos son plantillas: se sustituyeron por las entidades, rutas, módulos, archivos e infraestructura de HemoVida. No se crearon tablas o clases del backend para hacerlas coincidir con los ejemplos.

| Categoría | Cantidad | Sección orientativa |
|---|---:|---|
| Modelo de dominio conceptual | 1 | 7 |
| Análisis de paquetes | 1 | 3.4 |
| Despliegue físico | 1 | 4.1.1 |
| Arquitectura organizada en capas | 1 | 4.1.2 |
| Clases de diseño: panorama y ocho módulos | 9 | 5.1 |
| Esquema relacional: completo y ocho vistas | 9 | 5.2 |
| Componentes principales del sistema | 1 | 6.2 |
| Componentes de cada paquete | 8 | 6.3 |
| **Nuevos diagramas** | **31** | PNG, SVG y PlantUML |

Se añaden a los 104 anteriores: **135 diagramas** en la entrega completa. Las ocho vistas de módulos corresponden a seguridad, donantes, agenda, clínica, laboratorio, inventario, finanzas y reportes.

## Fuentes y fidelidad

El catálogo físico procede de una transacción de **solo lectura** contra los metadatos del esquema `public` de Supabase el 2026-11-01: **49 tablas, 375 columnas y 79 claves foráneas**. No se exportaron filas de negocio, credenciales ni cadenas de conexión. `catalogo_supabase.json` fija esa referencia; regenerar imágenes no conecta a la BD. La copia `catalogo_relacional.json` acompaña la entrega.

El esquema completo incluye tablas de soporte y del circuito posterior ya presentes en la BD. Que una tabla aparezca no significa que los CU16–CU20 estén implementados. Las vistas por módulo muestran todas sus columnas y las claves de tablas externas necesarias para seguir las relaciones; esas tablas se rotulan como referencia. No se dibujan relaciones inferidas por coincidencia de nombres: solo las FK del catálogo.

Las cardinalidades físicas se obtienen de nulabilidad, PK y restricciones UNIQUE. Un padre no está obligado a tener hijos por existir una FK: el extremo hijo comienza en cero. Las restricciones CHECK y acciones referenciales completas se conservan en el catálogo; no todas se imprimen dentro de las cajas. No se afirma una certificación de 3FN/BCNF sin un análisis de dependencias funcionales.

Las clases y firmas se extraen mediante AST del código real, sin importar Django ni ejecutar servicios. Los modelos ORM conservan campos públicos (`+`), como en Python/Django; no se finge encapsulación privada que el código no posee. Las operaciones sin anotación conservan `object` como tipo documental no determinado. Los módulos de funciones se rotulan **módulo Python**, no como clases Python inexistentes. No se añaden métodos CRUD ficticios a las entidades: las operaciones del framework se heredan y las transacciones del proyecto están en servicios o vistas. El panorama omite miembros para facilitar la lectura; los ocho detalles muestran atributos y operaciones seleccionadas.

La guía separa modelo de dominio (conceptos sin tecnología ni métodos), análisis de paquetes (dependencias conceptuales sin ciclos), diseño de clases (elementos del código) y físico (tablas reales). Las clases ORM solo cubren parte de las 49 tablas: el resto se accede mediante SQL parametrizado. No se fuerza una equivalencia de una clase Python por tabla.

Los componentes por paquete muestran archivos existentes y dependencias de importación obtenidas del AST, incluidas importaciones diferidas. Este grafo de implementación puede tener acoplamientos recíprocos; no debe confundirse con el DAG conceptual de análisis. Los archivos externos se agrupan como código compartido. El frontend asociado indica las pantallas representativas y su comunicación mediante el cliente HTTP, con las dependencias de interfaz resumidas.

El fraccionamiento y la conservación pertenecen funcionalmente a inventario, pero sus operaciones están implementadas en `apps/clinica/services.py`. El diagrama del paquete inventario lo indica; no se inventa un `inventario/services.py` ni una capa Repository/DAO ausente. La arquitectura en capas es una separación por responsabilidades: no asegura que el código esté físicamente dividido en capas puras.

El despliegue representa la configuración de referencia Cloudflare/Render/Supabase, no una comprobación de despliegues Live. La conexión del backend es PostgreSQL sobre TLS al pooler de transacciones **6543**; el navegador consume la API por HTTPS y no accede directamente a la BD. Brevo y Stripe aparecen como servicios externos. Checkout alojado y API Stripe son interfaces distintas; el webhook firmado se expone en el backend.

## Generación y uso

Ejecutar `generar_diagramas.bat` para los **135**, o `generar_demas_diagramas.bat` para los **31 nuevos** en `output/diagramas_complementarios`. También:

```powershell
python tools/diagramas/generar_diagramas.py --grupo adicionales
python tools/diagramas/generar_diagramas.py --tipo relacional --salida .venv/solo_relacional
python tools/diagramas/generar_diagramas.py --grupo base --salida .venv/base_104
```

Los complementarios consolidan los ciclos 1, 2 y 3; no admiten `--ciclo`. El generador requiere Python 3.10+, Java 17+ y PlantUML 1.2026.9. Las vistas grandes usan Graphviz para relaciones y distribución. En esta instalación Windows, PlantUML dispone de Graphviz y `-testdot` funciona; en otro sistema debe estar disponible `dot` o el ejecutable integrado por PlantUML.

Abrir `galeria.html`. Para Word usar las vistas detalladas por módulo; reservar el esquema de 49 tablas y el panorama general como anexos SVG ampliables. Las rutas del índice son orientativas y deben respetar la numeración final del documento. La generación no edita automáticamente el Word.

`procedencia.json` contiene SHA-256 de los archivos de referencia. Los diagramas no certifican pruebas funcionales, corrección de datos clínicos ni despliegue en producción.
