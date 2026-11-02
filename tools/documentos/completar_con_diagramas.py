from pathlib import Path
from copy import deepcopy
from io import BytesIO
import json,re,hashlib
from docx import Document
from docx.text.paragraph import Paragraph
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches,Pt,RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.opc.part import Part
from docx.opc.packuri import PackURI
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from lxml import etree
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'output/documentos/HEMOVIDA_DOCUMENTO_CORREGIDO_HASTA_CICLO_3.docx'
OUT=ROOT/'output/documentos/HEMOVIDA_COMPLETO_CON_135_DIAGRAMAS.docx'
TMP=ROOT/'.venv/documento_cierre';TMP.mkdir(parents=True,exist_ok=True)
D=Document(SRC);body=D._element.body
for name in ['Caption','Heading 5']:
 if name not in D.styles:
  st=D.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH);st.base_style=D.styles['Normal']
  st.font.size=Pt(10 if name=='Caption' else 11)
  if name=='Heading 5':
   st.font.bold=True;level=OxmlElement('w:outlineLvl');level.set(qn('w:val'),'4');st.element.get_or_add_pPr().append(level)
original_headings=[p.text for p in D.paragraphs if p.style.name=='Heading 1']
index=json.loads((ROOT/'output/diagramas_hemovida/indice.json').read_text(encoding='utf-8'))
cases=json.loads((ROOT/'tools/diagramas/casos.json').read_text(encoding='utf-8'));cases={c['id']:c for c in cases}
entries={x['fuente']:x for x in index};used={};pictures=[]
baseparas=list(D.paragraphs)

def pnew(text='',style='Normal'):
 p=Paragraph(OxmlElement('w:p'),D._body);p.style=style;p.text=text
 p.paragraph_format.space_after=Pt(6);p.paragraph_format.line_spacing=1.05
 return p

def put(anchor,text,style='Normal'):
 p=pnew(text,style);anchor.addnext(p._p);return p._p

def h(text):
 return next(p for p in D.paragraphs if p.text.strip()==text)

def addtable(anchor,headers,rows,widths=None):
 t=D.add_table(rows=1,cols=len(headers));t.autofit=False
 for i,text in enumerate(headers):t.cell(0,i).text=str(text)
 for row in rows:
  cells=t.add_row().cells
  for c,text in zip(cells,row):c.text=str(text)
 for i,row in enumerate(t.rows):
  trpr=row._tr.get_or_add_trPr();trpr.append(OxmlElement('w:cantSplit'))
  if i==0:trpr.append(OxmlElement('w:tblHeader'))
  for j,c in enumerate(row.cells):
   if widths:c.width=Inches(widths[j])
   tcpr=c._tc.get_or_add_tcPr();margins=OxmlElement('w:tcMar')
   for side in ['top','left','bottom','right']:
    e=OxmlElement('w:'+side);e.set(qn('w:w'),'90');e.set(qn('w:type'),'dxa');margins.append(e)
   tcpr.append(margins)
   borders=OxmlElement('w:tcBorders')
   for side in ['top','left','bottom','right']:
    e=OxmlElement('w:'+side);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
   tcpr.append(borders)
   shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E7E6E6' if i==0 else 'FFFFFF');tcpr.append(shade)
   for p in c.paragraphs:
    p.paragraph_format.space_after=Pt(4);p.paragraph_format.space_before=Pt(3);p.paragraph_format.line_spacing=1.05
    for r in p.runs:r.font.name='Arial';r.font.size=Pt(10);r.font.bold=i==0
 anchor.addnext(t._tbl);return t._tbl

def picture(anchor,path,title,svg=None,kind='diagrama'):
 cap=pnew(title,'Caption');cap.paragraph_format.keep_with_next=True;cap.alignment=WD_ALIGN_PARAGRAPH.CENTER
 for r in cap.runs:r.font.size=Pt(10);r.bold=True;r.font.color.rgb=RGBColor(0,0,0)
 anchor.addnext(cap._p)
 p=pnew();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
 w,hh=Image.open(path).size
 scale=min(6.05/w,7.05/hh)
 run=p.add_run();shape=run.add_picture(str(path),width=Inches(w*scale),height=Inches(hh*scale))
 shape._inline.docPr.set('descr',title)
 if svg and svg.exists():
  part=Part(PackURI('/word/media/hemovida_vector_'+str(len(pictures)+1)+'.svg'),'image/svg+xml',svg.read_bytes(),D.part.package)
  rel=D.part.relate_to(part,RT.IMAGE)
  blip=shape._inline.xpath('.//a:blip')[0];extlst=OxmlElement('a:extLst');ext=OxmlElement('a:ext');ext.set('uri','{96DAC541-7B7A-43D3-8B79-37D633B846F1}')
  e=etree.Element('{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip',nsmap={'asvg':'http://schemas.microsoft.com/office/drawing/2016/SVG/main'});e.set(qn('r:embed'),rel);ext.append(e);extlst.append(ext);blip.append(extlst)
 cap._p.addnext(p._p);pictures.append({'titulo':title,'tipo':kind,'archivo':str(path.relative_to(ROOT))})
 return p._p

def fig(anchor,key):
 if key in used:return anchor
 e=entries[key];used[key]=len(used)+1
 return picture(anchor,ROOT/'output/diagramas_hemovida'/e['png'],f'Figura {len(used)}. '+e['titulo'],ROOT/'output/diagramas_hemovida'/e['svg'])

def extra(anchor,kind,stem):return fig(anchor,f'complementarios/{kind}/{stem}.puml')

# Retirar reservas técnicas que se van a sustituir; conservar los originales.
for p in baseparas:
 if p.text.strip().startswith('Insertar '):
  prev=p._p.getprevious()
  if prev is not None and prev.tag==qn('w:p'):
   pp=Paragraph(prev,D._body)
   if not pp.text.strip() and not pp._p.xpath('.//w:drawing | .//w:sectPr') and pp.paragraph_format.space_after and pp.paragraph_format.space_after.pt>=60:
    prev.getparent().remove(prev)
  p._p.getparent().remove(p._p)
# Jerarquía consistente sin cambiar el orden de capítulos.
area='';cycle=None
for p in D.paragraphs:
 t=p.text.strip()
 if not t and p.style.name.startswith('Heading'):p.style='Normal'
 if t.startswith('2.3. DETALLES'):area='casos'
 elif t.startswith('2.4. PROTOTIPAR'):area='pantallas'
 elif t.startswith('3.2. ANÁLISIS'):area='comunicacion'
 elif t.startswith('3.3. ANÁLISIS'):area='clases_analisis'
 elif t.startswith('5.3.1 Diagramas'):area='secuencias'
 elif p.style.name=='Heading 1':area=''
 if re.match(r'^(3\.2\.[1234]|3\.3\.[1234])\s',t):p.style='Heading 3'
 if re.match(r'^CU\s*\d+\s*[:.\-]',t) and area:p.style='Heading 5' if area=='secuencias' else 'Heading 4'
# Fichas y diagramas individuales de casos de uso, sin el error antiguo CU11/CU15.
for table in list(D.tables):
 if len(table.rows)==10 and table.cell(0,0).text.strip()=='Atributo':
  m=re.search(r'CU\s*(\d+)',table.cell(1,1).text)
  if m and int(m.group(1)) in cases:
   c=cases[int(m.group(1))];fig(table._tbl,f'ciclo_{c["ciclo"]}/casos_uso/CU{c["id"]:02d}_casos_uso.puml')
# Representaciones por caso, ubicadas en el apartado de cada ciclo.
put(h('3.2.1. Ciclo #1')._p,'CU01: '+cases[1]['titulo'],'Heading 4')
area=''
for p in list(D.paragraphs):
 t=p.text.strip()
 if t.startswith('3.2. ANÁLISIS'):area='comunicacion'
 elif t.startswith('3.3. ANÁLISIS'):area='clases_analisis'
 elif t.startswith('5.3.1 Diagramas'):area='secuencias'
 elif p.style.name in ('Heading 1','Heading 2'):area=''
 m=re.match(r'^CU\s*(\d+)\s*[:.\-]',t)
 if m and area and int(m.group(1)) in cases:
  c=cases[int(m.group(1))]
  at=put(p._p,c['precondicion']+' '+c['postcondicion'])
  fig(at,f'ciclo_{c["ciclo"]}/{area}/CU{c["id"]:02d}_{area}.puml')
# Modelo de dominio, negocio y actividades de los 19 casos.
at=h('7. MODELO DE DOMINIO')._p
at=put(at,'El modelo de dominio reúne conceptos del negocio y sus multiplicidades, sin convertirlos en clases de programación. Identidad, atención, materiales sanguíneos, obligaciones e informes se relacionan para explicar el alcance acumulado hasta el ciclo 3. La existencia de un concepto no equivale a una tabla nueva.')
extra(at,'dominio','modelo_dominio')
at=h('DIAGRAMA DE ACTIVIDADES')._p
at=put(at,'Los carriles distinguen responsabilidades humanas y del sistema; las decisiones muestran condiciones de continuidad o rechazo. Se presenta el circuito general y después las actividades de cada caso implementado.')
at=fig(at,'generales/modelo_negocio.puml')
for cyc in (1,2,3):
 at=put(at,f'Actividades del ciclo {cyc}','Heading 3')
 for c in cases.values():
  if c['ciclo']==cyc:at=fig(at,f'ciclo_{cyc}/actividades/CU{c["id"]:02d}_actividades.puml')
# Vistas por ciclo, consolidado y estructuras funcionales.
for cyc in (1,2,3):fig(h(f'2.5.{cyc}. Ciclo #{cyc}')._p,f'ciclo_{cyc}/vista_ciclo_{cyc}.puml')
at=h('2.5 Estructurar Modelo de Casos de Uso')._p
at=put(at,'El consolidado muestra los actores principales; las vistas por ciclo y las fichas conservan el detalle de participación. Las relaciones include y extend se reservan a comportamientos obligatorios o extensiones justificadas, sin representar simples dependencias de datos.')
fig(at,'generales/consolidado_ciclos_1_2_3.puml')
at=h('3.1.1. Identificar Paquete')._p
at=put(at,'Se distinguen responsabilidades funcionales y módulos físicos. Los grupos P1 a P7 del documento se conservan: P2 reúne donantes y agenda, P3 clínica y laboratorio, P4 inventario, P6 finanzas y P7 reportes. P5 corresponde a demanda y despacho del ciclo posterior. Esta agrupación no impone un servidor independiente por paquete.')
for cyc in (1,2,3):at=fig(at,f'generales/estructura_ciclo_{cyc}.puml')
extra(h('3.4. ANÁLISIS DE PAQUETE')._p,'paquetes_analisis','analisis_paquetes')
# Completar relación de paquetes sin dejar encabezados vacíos.
pmap={'P1.':'Seguridad y auditoría: CU01, CU02 y CU03; cuentas, roles y trazabilidad.', 'P2.':'Donantes, agenda y admisión: CU05, CU06, CU07, CU08, CU09 y CU21; identidad, prefiltro, turnos y programas.', 'P3.':'Clínica y laboratorio: CU10 a CU14; evaluación, diferimiento, consentimiento, colecta, análisis y liberación.', 'P4.':'Inventario: CU04 y CU15; stock, fraccionamiento, custodia y caducidad.', 'P5.':'Diseño futuro de solicitudes, compatibilidad, despacho y reposición; fuera del cierre funcional hasta ciclo 3.', 'P6.':'Finanzas: CU22; obligación, abono, Checkout, webhook y comprobante. Acceso exclusivo ADMIN.', 'P7.':'Analítica: CU23 y CU24; plantillas fijas y consulta dinámica con permisos, PDF y CSV.'}
for p in list(D.paragraphs):
 if p.text.strip().startswith(tuple(pmap)) and 1180 < next((i for i,x in enumerate(baseparas) if x._p is p._p),0) <1270:
  put(p._p,pmap[p.text.strip()[:3]])
# Arquitectura y datos.
fig(h('4.1 Diseño de Arquitectura')._p,'generales/general_sistema.puml')
extra(h('4.1.1 Diseño Físico')._p,'despliegue','despliegue_fisico')
extra(h('4.1.2 Diseño Lógico')._p,'capas','arquitectura_capas')
at=h('Diagrama de Clase')._p
at=put(at,'El panorama reúne clases y módulos seleccionados del código. Los detalles conservan sus atributos y operaciones; los módulos de funciones se identifican expresamente. Los tipos object indican ausencia de anotación, no una nueva entidad del dominio. El ORM cubre parte del esquema; los servicios restantes usan SQL parametrizado.')
at=extra(at,'clases_diseno','clases_panorama')
mods=['seguridad','donantes','agenda','clinica','laboratorio','inventario','finanzas','reportes']
for mod in mods:at=extra(at,'clases_diseno','clases_'+mod)
at=h('Mapeo')._p
at=addtable(at,['Responsabilidad','Persistencia principal','Implementación'],[
 ['Acceso y perfiles','persona, usuario, rol, usuariorol','Modelos ORM de seguridad; RBAC y JWT'],
 ['Agenda','agendaturno, citadonacion, prefiltrocita','Servicios SQL y serializers de agenda'],
 ['Autóloga','programacionautologa e historial','Indicación, revisión y versiones en agenda'],
 ['Colecta','triajeclinico, extracciondonacion, consentimiento','Servicios clínicos y transacción conjunta'],
 ['Laboratorio','analisisinmunoserologico e inmunohematologico','Servicios de análisis, corrección y liberación'],
 ['Conservación','unidadsangretotal, ejemplarbolsa, protocolos','Fraccionamiento y custodia en clínica; stock en inventario'],
 ['Cobro','deudafinanciera, pagofinanciero, checkoutstripe','Servicios financieros y notificaciones firmadas'],
 ['Reportes','Fuentes autorizadas del esquema existente','Consultas agregadas; no crea una tabla por reporte']],[1.2,2.6,2.2])
at=h('Normalización')._p
put(at,'La revisión identifica claves y dependencias por entidad: los atributos de persona dependen de su identidad; la asignación de rol relaciona usuario y rol; las respuestas históricas pertenecen a una cita y versión; los pagos dependen de su obligación. Los snapshots JSON y los saldos derivados requieren tratamiento explícito. Estas decisiones no equivalen a certificar BCNF para todo el esquema.')
at=h('Tabla de volumen')._p
vol=json.loads((Path(__file__).with_name('volumen_bd_2026-11-01.json')).read_text(encoding='utf-8'))
at=put(at,'Medición agregada de solo lectura en Supabase con fecha '+vol['fecha'][:10]+'. Filas y tamaños son una fotografía del entorno académico, no una proyección de demanda institucional. Los tamaños incluyen las estructuras existentes y no se deducen del número de columnas.')
at=addtable(at,['Tabla','Filas','Datos KiB','Índices KiB'],[[r['tabla'],r['filas'],round(r['datos_bytes']/1024,1),round(r['indices_bytes']/1024,1)] for r in vol['tablas']],[2.8,.7,1.2,1.3])
at=h('Script')._p
addtable(at,['Versión','Finalidad','Aplicación'],[
 ['Base 01 a 05','Esquema y objetos heredados','Referencia; no reinstalar sobre Supabase desplegado'],
 ['06','Liberación conjunta y auditoría','Validar funciones y triggers'],['07','Trazabilidad clínica y financiera','Validar tablas y columnas añadidas'],['08','Agenda y prefiltro','Validar turnos y respuestas históricas'],['09','Programación autóloga y ajustes','Validar revisión y versiones'],['10','Conservación y calendario académico','Validar contexto académico y fechas'],['11','Bloqueo progresivo diario','Validar contador y reinicio local']],[.9,2.3,2.8])
at=h('Diagrama Relacional')._p
at=put(at,'El catálogo verificado contiene 49 tablas, 375 columnas, 79 claves foráneas y 95 índices. El panorama incluye tablas ya existentes del circuito posterior, sin afirmar que el ciclo 4 esté implementado. Las vistas por módulo muestran sus columnas y claves externas de referencia. Para ampliar sin pixelación, las figuras incluyen su versión vectorial en Word cuando el visor la admite.')
at=extra(at,'relacional','esquema_completo')
for mod in mods:at=extra(at,'relacional','relacional_'+mod)
# Arquitectura física de implementación.
extra(h('6.2. Implementación de la Arquitectura del Sistema')._p,'componentes_principal','componentes_sistema')
for mod,title in zip(mods,['Seguridad','Donantes','Agenda','Clínica','Laboratorio','Inventario','Finanzas','Reportes']):
 extra(h(title)._p,'componentes_paquete','componentes_'+mod)
# Prototipos: capturas reales existentes, no pantallas inventadas.
captures=json.loads((ROOT/'output/capturas_frontend_2026-11-01/indice.json').read_text(encoding='utf-8'))
area=False;capused=set()
for p in list(D.paragraphs):
 t=p.text.strip()
 if t.startswith('2.4. PROTOTIPAR'):area=True
 elif t.startswith('2.5 Estructurar'):area=False
 if area:
  m=re.search(r'CU\s*(\d+)',t)
  if m and len(t)<220 and int(m.group(1)) in cases and int(m.group(1)) not in capused:
   ident=int(m.group(1));options=[x for x in captures if x['caso']==f'CU{ident:02d}']
   if options:
    # Última captura del caso suele mostrar el resultado operativo o formulario.
    chosen=options[-1];capused.add(ident)
    p.text=f'CU{ident:02d}: '+cases[ident]['titulo'];p.style='Heading 4'
    picture(p._p,ROOT/'output/capturas_frontend_2026-11-01'/chosen['archivo'],'Interfaz '+chosen['caso']+'. '+chosen['titulo']+' — captura local académica.',kind='captura')
# Estado de verificación y pruebas: dentro del índice original de anexos.
at=h('Pruebas funcionales y aceptación del alcance académico')._p
at=put(at,'La organización de pruebas sigue el criterio del ejemplo del Grupo 7: funcionalidad de caja negra, planificación, escenarios y evidencia. Se conserva la ubicación en Documentación del índice de HemoVida para no renumerar capítulos. El corte de evidencias corresponde al 1 de noviembre de 2026.')
at=put(at,'Planificación de las pruebas','Heading 3')
at=put(at,'Se separan tres entornos: PostgreSQL local desechable para escrituras de ensayo; frontend y backend locales conectados a Supabase para lecturas y exportaciones; Stripe test para Checkout y notificaciones. La aceptación exige entradas válidas, rechazo de operaciones no autorizadas, consistencia transaccional y trazabilidad. La aceptación remota necesita además comprobar el despliegue y sus variables.')
at=addtable(at,['Área','Prueba y entorno','Resultado registrado'],[
 ['Backend','Suite de ciclos 2 y 3, configuración y CORS; BD local','112 pruebas correctas'],['Frontend','Comprobaciones estáticas y compilación TypeScript/Vite','2 pruebas correctas; compilación correcta'],['Navegador controlado','Suite de interfaz con respuestas de API controladas','15/16 en conjunto; el caso restante pasó aislado tras cierre de Edge'],['Integración real','Navegador local → API → Supabase; CU23 y CU24','JSON, CSV y PDF: HTTP 200 en ambos'],['Stripe test','Pago externo de 100 BOB y webhook a backend aislado','HTTP 200; pago confirmado, saldo cero, un comprobante'],['Idempotencia','Reenvío firmado del mismo evento','Reconocido como repetido, sin segundo cobro'],['Render','Destino Stripe test creado y ruta pública accesible','Pendiente aplicar secreto del destino y verificar despliegue']],[1.0,2.5,2.5])
at=put(at,'Casos de prueba y criterios de aceptación','Heading 3')
for cyc in (1,2,3):
 at=put(at,f'Escenarios del ciclo {cyc}','Heading 4')
 rows=[]
 for c in cases.values():
  if c['ciclo']==cyc:rows.append([f'CP-CU{c["id"]:02d}',c['precondicion'],c['postcondicion']])
 at=addtable(at,['Caso','Preparación y condición de entrada','Resultado esperado'],rows,[.8,2.6,2.6])
at=put(at,'Los escenarios anteriores son especificaciones de aceptación. El resultado de una suite no se atribuye automáticamente a cada variante manual: cada ejecución debe identificar rol, datos, fecha y evidencia. Las pantallas consultadas no equivalen a ejecutar una colecta o un pago.')
at=put(at,'Evidencia de la prueba integral de Stripe','Heading 3')
at=put(at,'Se creó Checkout de prueba desde el endpoint del backend aislado y se completó con un medio de prueba. Stripe CLI entregó checkout.session.completed al puerto 8010; el backend respondió 200, consultó la sesión en Stripe y confirmó 100 BOB. La BD desechable registró saldo 0, un comprobante y un evento. El reenvío firmado devolvió repetido=true. No se realizó un cargo real ni se modificó Supabase para obtener ese resultado.')
at=put(at,'Para nube se creó el destino HTTPS de Render con los cuatro eventos de Checkout. En la última comprobación el secreto nuevo todavía no estaba aplicado en Render; por ello no se declara validado el pago remoto. El secreto de CLI se conserva localmente y el del destino público se configura en Render, sin incluir ninguno en este documento.')
at=put(at,'Reportes y límites del cierre','Heading 3')
at=put(at,'CU23 conserva ocho plantillas fijas y CU24 permite construir consultas desde catálogos autorizados. Ambos exportan CSV y PDF; no se incorpora XLSX. ADMIN consulta todas las áreas, médico las clínicas, bioquímico clínica/laboratorio/inventario y logística inventario. Las consultas financieras permanecen exclusivas de ADMIN. El backend valida nuevamente los permisos al exportar.')
at=put(at,'Trazabilidad de figuras y evidencias','Heading 3')
at=put(at,'Las 135 figuras UML se generaron con PlantUML a partir de los casos, selecciones del código y catálogo físico. La matriz de inserción conserva nombre de fuente y número de figura para regenerarlas. Las capturas proceden de la aplicación local y se identifican por caso; los proveedores y el estado de despliegue se describen con su evidencia separada.')
# Actualizaciones concretas y limpieza de afirmaciones antiguas.
put(h('1.5. ANÁLISIS DE PROBLEMAS')._p,'Las causas se agrupan por registro y atención, evaluación y colecta, laboratorio, inventario, administración y acceso a la información. El problema central es la fragmentación de registros y controles, que dificulta seguir la relación entre persona, evaluación, unidad, disponibilidad y cobro. Los propietarios y los problemas depurados del apartado anterior constituyen la referencia para priorizar soluciones.')
put(h('1.9. DISEÑAR EL DIAGRAMA DE ISHIKAWA')._p,'La relación causa efecto parte de la gestión fragmentada del banco de sangre. Sus ramas reúnen personas y responsabilidades, métodos de registro, información disponible, controles de laboratorio, almacenamiento y administración financiera. El análisis utiliza los problemas depurados del documento; su prioridad no se interpreta como una medición clínica ni como una mejora porcentual demostrada.')
addtable(h('2. IDENTIFICAR LAS PRINCIPALES CATEGORÍAS')._p,['Categoría','Causas observadas en el diagnóstico','Consecuencia que se busca controlar'],[
 ['Registro y atención','Formularios separados y transcripción de datos','Duplicidad y demoras de identificación'],
 ['Clínica y laboratorio','Evaluación y resultados en registros no vinculados','Dificultad para reconstruir decisiones'],
 ['Inventario','Inspección manual de ubicación y caducidad','Disponibilidad y custodia difíciles de verificar'],
 ['Administración','Cobros y referencias registrados por separado','Seguimiento incompleto de obligaciones'],
 ['Personas y responsabilidades','Accesos y funciones sin trazabilidad uniforme','Dificultad para atribuir cambios'],
 ['Información de gestión','Consulta manual de múltiples documentos','Retraso en informes e indicadores']],[1.1,2.45,2.45])
put(h('3. IDENTIFICAR LAS CAUSAS')._p,'Se contrastan las causas con las entrevistas y la lista depurada, diferenciando falta de integración, registro manual, control insuficiente y consulta dispersa. La asignación de cada causa se utiliza para justificar requisitos, no para atribuir responsabilidad clínica individual. Las propuestas se evalúan después mediante casos y evidencias; no se considera que un diagrama demuestre una mejora operativa.')
for p in D.paragraphs:
 if p.text.startswith('La demostración debe conservar sus límites:'):
  p.text='Se validó el pago externo Stripe test con recepción de webhook en el entorno local aislado, actualización de saldo e idempotencia. La configuración del secreto del destino de Render y la aceptación financiera remota continúan pendientes. El ciclo 4 permanece fuera del cierre funcional.'
 if p.text.strip()=='O':p.text=''
area='';seen=set()
for p in list(D.paragraphs):
 if p.style.name in ('Heading 1','Heading 2','Heading 3'):area=p.text;seen=set()
 if p.style.name=='Heading 4' and re.match(r'^CU\d+',p.text):
  if p.text in seen:p._p.getparent().remove(p._p)
  else:seen.add(p.text)
for t in D.tables:
 for row in t.rows:
  for cell in row.cells:
   if cell.text.strip().startswith('Insertar QR'):cell.text='Repositorio de HemoVida'
# Normalizar títulos y conservar blancos solo cuando son separadores reales.
for p in D.paragraphs:
 if p.style.name.startswith('Heading'):
  p.paragraph_format.keep_with_next=True
  for r in p.runs:r.font.color.rgb=RGBColor(0,0,0)
 if not p.text.strip() and not p._p.xpath('.//w:drawing | .//w:sectPr | .//w:fldChar | .//w:instrText'):
  p.paragraph_format.space_after=Pt(0);p.paragraph_format.space_before=Pt(0)
  if p.paragraph_format.line_spacing is None:p.paragraph_format.line_spacing=1
# El índice conserva su ubicación y sus campos, con más niveles cuando corresponda.
bytitle={e['titulo']:key for key,e in entries.items()}
counter=0
for p in D.paragraphs:
 m=re.match(r'^Figura \d+\. (.+)$',p.text)
 if m:
  counter+=1;title=m.group(1);p.text=f'Figura {counter}. {title}'
  used[bytitle[title]]=counter
  p.paragraph_format.keep_with_next=True
  for r in p.runs:r.bold=True;r.font.size=Pt(10)
assert counter==135
for item in pictures:
 if item['tipo']=='diagrama':
  title=re.sub(r'^Figura \d+\. ','',item['titulo'])
  item['titulo']=f'Figura {used[bytitle[title]]}. {title}'
for el in D._element.iter(qn('w:instrText')):
 if 'TOC ' in (el.text or ''):el.text=re.sub(r'\\o "[^"]+"','\\\\o "1-5"',el.text)
for el in D._element.iter(qn('w:fldSimple')):
 if 'TOC ' in el.get(qn('w:instr'),''):el.set(qn('w:instr'),re.sub(r'\\o "[^"]+"','\\\\o "1-5"',el.get(qn('w:instr'))))
D.settings.element.append(OxmlElement('w:updateFields'));D.settings.element[-1].set(qn('w:val'),'true')
assert len(used)==135,sorted(set(entries)-set(used))
assert original_headings==[p.text for p in D.paragraphs if p.style.name=='Heading 1'],'Se alteró el índice principal'
assert not any(p.text.startswith('Insertar ') for p in D.paragraphs)
D.save(OUT)
(TMP/'insercion_135.json').write_text(json.dumps({'fuente':str(SRC),'salida':str(OUT),'diagramas':used,'imagenes':pictures,'capturas':sorted(capused),'capitulos_conservados':original_headings},ensure_ascii=False,indent=2),encoding='utf-8')
(TMP/'artifact.md').write_text('Referencia: '+str(SRC)+'\nSHA256: '+hashlib.sha256(SRC.read_bytes()).hexdigest()+'\nConservar portada, entrevistas, capítulos y numeración. Completar texto, sustituir reservas por 135 diagramas únicos; añadir capturas reales. Índice Word actualizado por COM. Figuras con PNG y SVG; no secretos ni registros de datos exportados.\n',encoding='utf-8')
print('OK:',OUT,'diagramas',len(used),'capturas',len(capused),'tablas',len(D.tables))
