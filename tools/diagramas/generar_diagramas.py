#!/usr/bin/env python3
"""Genera UML de HemoVida localmente. Python 3.10+ y Java 17+; sin acceso a BD."""
from __future__ import annotations
import argparse,csv,hashlib,html,json,shutil,subprocess,sys,textwrap,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
VERSION='1.2026.9'
JAR_URL=f'https://github.com/plantuml/plantuml/releases/download/v{VERSION}/plantuml-{VERSION}.jar'
# SHA-256 se fija después de comprobar el artefacto publicado por PlantUML.
JAR_SHA256='aa4a1d06f8911c4b842beff4828dd955be431692b631a312d04c0e9fab9581de'
KINDS=('casos_uso','actividades','secuencias','comunicacion','clases_analisis')
STYLE='''!pragma layout smetana
skinparam backgroundColor white
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 15
skinparam dpi 140
skinparam monochrome true
skinparam roundcorner 0
skinparam maxMessageSize 280
skinparam sequenceMessageAlign center
skinparam classAttributeIconSize 0
'''

def label(s,width=53):
    s=str(s).replace('"',"'").replace('\\','/').replace(';',',')
    return '\\n'.join(textwrap.wrap(s,width=width,break_long_words=False,break_on_hyphens=False))

def diagram(title,content,logical=True):
    footer='Modelo lógico del código y contrato revisados; no acredita pruebas ni despliegue.' if logical else 'HemoVida · alcance académico hasta ciclo 3'
    return '@startuml\n'+STYLE+'title '+label(title,75)+'\n'+content+'\nfooter '+footer+'\n@enduml\n'

def case_name(c):return f"CU{c['id']:02d} {c['titulo']}"

def usecase(c):
    actors='\n'.join(f'actor "{label(a,25)}" as A{i}' for i,a in enumerate(c['actores']))
    links='\n'.join(f'A{i} -- UC' for i in range(len(c['actores'])))
    return diagram(case_name(c),f'left to right direction\n{actors}\nrectangle "HemoVida" {{\nusecase "{label(case_name(c),38)}" as UC\n}}\n{links}\nnote bottom of UC\n{label(c["reglas"],75).replace(chr(92)+"n",chr(10))}\nend note')

def activity(c):
    lines=['start',':Identificar actor y operación,\nautenticar cuando corresponda,\ncomprobar permiso y precondiciones;', 'if (¿Precondiciones satisfechas?) then (sí)']
    for step in c['flujo']:lines.append(':'+label(step,60)+';')
    lines+=[':'+label(c['postcondicion'],60)+';','stop','else (no)',':Informar causa y conservar\nconsistencia de la operación;','stop','endif']
    lines.insert(2,'note right\n'+label(c['precondicion'],57).replace('\\n','\n')+'\nend note')
    lines+=['legend left','Alternativas y rechazos del contrato:']+[label(s,85).replace('\\n','\n') for s in c['excepciones']]+['endlegend']
    return diagram('Flujo principal · '+case_name(c),'\n'.join(lines))

def sequence(c):
    lines=['actor "Actor autorizado" as A','boundary "Interfaz React" as U',f'control "API / {c["modulo"]}" as S','database "PostgreSQL" as D']
    if c['id']==22:lines+=['participant "Stripe (test)" as X']
    lines+=['A -> U : Iniciar operación','U -> S : '+label(c['rutas'],65),'note right of S\n'+label(c['precondicion'],60).replace('\\n','\n')+'\nend note','alt Recorrido válido (reglas satisfechas)']
    for src,dst,msg in c['eventos']:lines.append(f'{src} -> {dst} : {label(msg,65)}')
    lines+=['U --> A : Mostrar resultado del recorrido','else Rechazo por permiso, precondición o validación']
    if c['id']==1:lines+=[r'S -> D : Persistir fallo y plazo si corresponde\nNo sumar intentos durante un bloqueo vigente']
    lines+=['S --> U : Rechazo y causa del contrato','U --> A : Mostrar causa sin simular éxito','end']
    return diagram(case_name(c),'\n'.join(lines))

def communication(c):
    lines=['left to right direction','object "actor : Rol autorizado" as A','object "pantalla : Interfaz React" as U <<boundary>>',f'object "api : {c["modulo"]}" as S <<control>>','object "persistencia : PostgreSQL" as D <<entity>>']
    if c['id']==22:lines+=['object "proveedor : Stripe test" as X']
    lines+=['A --> U : 1. iniciar','U --> S : 2. solicitar']
    grouped={}
    for i,(src,dst,msg) in enumerate(c['eventos'],3):grouped.setdefault((src,dst),[]).append(i)
    actions={('S','D'):'persistencia',('D','S'):'datos',('S','S'):'validar',('S','U'):'resultado',('U','S'):'confirmar acción',('U','U'):'presentar',('S','X'):'proveedor',('X','S'):'notificación / respuesta'}
    for (src,dst),numbers in grouped.items():
        action=actions.get((src,dst),'intercambio')
        lines.append(f'{src} --> {dst} : '+', '.join(map(str,numbers))+'. '+action)
    lines+=['legend left','Mensajes del recorrido válido:','1. Actor inicia la operación.','2. Interfaz solicita la operación a la API.']
    for i,(_,_,msg) in enumerate(c['eventos'],3):lines.append(str(i)+'. '+label(msg,85).replace('\\n','\n'))
    lines+=['endlegend']
    return diagram(case_name(c),'\n'.join(lines))

def classes(c):
    lines=['left to right direction','class "Interfaz '+f"CU{c['id']:02d}"+'" as U <<boundary>>',f'class "Control {c["modulo"]}" as S <<control>>','U --> S : solicita operación']
    for i,entity in enumerate(c['entidades']):lines +=[f'class "{entity}" as E{i} <<entity>>',f'S --> E{i} : consulta / coordina']
    lines+=['note bottom of S','Clases de análisis: responsabilidades lógicas.','Los controles no afirman clases Python homónimas.','Las dependencias no son claves foráneas.','end note']
    return diagram(case_name(c),'\n'.join(lines))

BUILDERS=dict(zip(KINDS,(usecase,activity,sequence,communication,classes)))

def overview(cycle,cases):
    actors=sorted({a for c in cases for a in c['actores']});lines=['left to right direction']
    lines += [f'actor "{label(a,23)}" as A{i}' for i,a in enumerate(actors)]
    lines+=['rectangle "HemoVida · ciclo '+str(cycle)+'" {']
    lines += [f'usecase "{label(case_name(c),33)}" as C{c["id"]}' for c in cases];lines+=['}']
    for c in cases:
        for a in c['actores']:lines.append(f'A{actors.index(a)} -- C{c["id"]}')
    lines+=['note bottom','Los permisos dependen de la operación y del rol activo.','Las asociaciones no autorizan todas las acciones del caso.','No se inventan relaciones include/extend.','end note']
    return diagram(f'Vista de casos de uso · ciclo {cycle}','\n'.join(lines))

def general_diagrams():
    yield 'despliegue','Despliegue físico', r'''node "Navegador" as browser
node "Cloudflare Workers" as cloud {
artifact "SPA React / Vite" as spa
}
node "Render" as render {
component "API Django REST" as api
}
node "Supabase" {
database "PostgreSQL" as db
}
cloud --> browser : HTTPS / recursos estáticos
browser --> api : HTTPS / JWT cuando corresponde
api --> db : PostgreSQL SSL\npooler transaccional 6543
cloud "Brevo" as mail
cloud "Stripe test" as stripe
api --> mail : HTTPS / correo transaccional
api --> stripe : HTTPS / Checkout y consulta de sesión
stripe --> api : HTTPS / webhook firmado'''
    yield 'arquitectura_logica','Arquitectura lógica', r'''package "Presentación" {
component "React / TypeScript" as ui
}
package "Backend Django" {
component "API REST" as api
component "Autenticación y permisos" as auth
component "Servicios transaccionales" as svc
component "Reportes permitidos por rol" as reports
}
database "PostgreSQL" as db
ui --> api : HTTPS
api --> auth
api --> svc
api --> reports
svc --> db
reports --> db : consultas parametrizadas
note bottom of ui : El frontend no accede directamente a la base.\nLas variables VITE se incorporan al compilar.'''
    yield 'paquetes','Paquetes y dependencias lógicas', r'''package "seguridad" as sec
package "donantes" as don
package "agenda" as ag
package "clinica" as cli
package "laboratorio" as lab
package "inventario" as inv
package "finanzas" as fin
package "reportes" as rep
ag ..> cli : servicios compartidos
lab ..> cli : validaciones compartidas
fin ..> cli : contexto de operación
rep ..> cli : permisos y persistencia
cli ..> sec : usuario y rol
ag ..> sec
lab ..> sec
inv ..> sec
don ..> sec
fin ..> sec
rep ..> lab : gestión de conflictos
note bottom : Son módulos del backend y dependencias relevantes,\nno microservicios independientes ni un grafo exhaustivo de imports.'''
    yield 'dominio','Modelo conceptual del dominio', r'''class Persona
class Usuario
class Rol
class Cita
class Triaje
class Diferimiento
class Consentimiento
class Extraccion
class Madre
class Componente
class AnalisisSerologico
class AnalisisInmunohematologico
class Ubicacion
class ProgramaAutologo
class Obligacion
class Pago
Persona -- Usuario
Usuario -- Rol
Persona -- Cita
Persona -- Triaje
Triaje -- Diferimiento
Triaje -- Extraccion
Consentimiento -- Extraccion
Extraccion -- Madre
Madre -- Componente
Madre -- AnalisisSerologico
Madre -- AnalisisInmunohematologico
Componente -- Ubicacion
Persona -- ProgramaAutologo
ProgramaAutologo -- Madre
Obligacion -- Pago
note bottom : Asociaciones del dominio; no representan un esquema físico completo.\nLas cardinalidades físicas se verifican en las migraciones y Supabase.'''
    yield 'liberacion','Estados de liberación conjunta', r'''[*] --> Cuarentena
state "En Cuarentena" as Cuarentena
state "Liberada Apta" as Liberada
state "Rechazada" as Rechazada
Cuarentena --> Liberada : BIOQ solicita liberación\nambos análisis aprobados y grupo concordante\nprograma/reserva autóloga válidos si aplica
Liberada --> Cuarentena : corrección que invalida aprobación
Cuarentena --> Rechazada : baja o rechazo explícito autorizado
Liberada --> Rechazada : baja explícita autorizada
note right of Liberada : Guardar un solo análisis no libera el lote.\nLa corrección conserva el historial.'''
    yield 'pago_stripe','Pago Checkout y notificación firmada', r'''actor ADMIN
boundary "Frontend" as UI
control "Finanzas Django" as API
database "PostgreSQL" as DB
participant "Stripe test" as Stripe
ADMIN -> UI : Iniciar Checkout
UI -> API : POST deudas/{id}/checkout/
API -> DB : Bloquear deuda y validar BOB/saldo\nPersistir intento e idempotencia
API -> Stripe : Crear sesión con idempotencia
Stripe --> API : Sesión y URL
API -> DB : Vincular sesión al intento
API --> UI : URL de Checkout
UI -> Stripe : Abrir Checkout
Stripe -> API : POST webhook con firma
API -> API : Verificar firma
API -> Stripe : Consultar estado real de sesión
Stripe --> API : Estado, referencia, moneda e importe
alt Evento válido y pago confirmado
API -> DB : Deduplificar evento y confirmar una sola vez\nActualizar saldo; comprobante según condiciones
API --> Stripe : Acuse de recibo
else Firma o datos inválidos
API --> Stripe : Rechazar o registrar para conciliación según causa
end
note over UI,API : El retorno del navegador no confirma un cobro.\nReintentos no deben crear pagos duplicados.'''

def acquire_jar(path,download):
    if not path.exists():
        if not download:raise RuntimeError('Falta PlantUML. Ejecuta con --descargar-plantuml o indica --jar RUTA.')
        path.parent.mkdir(parents=True,exist_ok=True)
        partial=path.with_suffix('.part')
        print('Descargando PlantUML oficial (solo la primera vez)...',flush=True)
        try:
            with urllib.request.urlopen(JAR_URL,timeout=120) as response,partial.open('wb') as target:shutil.copyfileobj(response,target)
            if hashlib.sha256(partial.read_bytes()).hexdigest()!=JAR_SHA256:raise RuntimeError('El SHA-256 de PlantUML no coincide. No se ejecutó el archivo.')
            partial.replace(path)
        finally:
            if partial.exists():partial.unlink()
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual!=JAR_SHA256:raise RuntimeError('PlantUML no coincide con la versión fijada y su SHA-256.')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--salida',type=Path,default=ROOT/'output/diagramas_hemovida')
    ap.add_argument('--ciclo',type=int,choices=[1,2,3])
    ap.add_argument('--tipo',choices=KINDS)
    ap.add_argument('--solo-fuentes',action='store_true',help='Generar .puml sin Java ni descarga')
    ap.add_argument('--descargar-plantuml',action='store_true')
    ap.add_argument('--jar',type=Path,default=ROOT/f'.venv/herramientas/plantuml/plantuml-{VERSION}.jar')
    ap.add_argument('--java',default='java')
    ap.add_argument('--formatos',nargs='+',choices=['png','svg'],default=['png','svg'])
    args=ap.parse_args();out=args.salida.resolve();out.mkdir(parents=True,exist_ok=True)
    cases=json.loads(Path(__file__).with_name('casos.json').read_text(encoding='utf-8'))
    if args.ciclo:cases=[c for c in cases if c['ciclo']==args.ciclo]
    files=[];index=[]
    def save(relative,title,source,section):
        file=out/relative;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(source,encoding='utf-8');files.append(file)
        index.append({'titulo':title,'seccion_documento':section,'fuente':str(file.relative_to(out)).replace('\\','/'),'png':str(file.relative_to(out).with_suffix('.png')).replace('\\','/'),'svg':str(file.relative_to(out).with_suffix('.svg')).replace('\\','/')})
    sections={'casos_uso':'2.3','actividades':'8. Modelo de negocio / apoyo de fichas','secuencias':'5.3.1','comunicacion':'3.2','clases_analisis':'3.3'}
    for c in cases:
        for kind,builder in BUILDERS.items():
            if args.tipo and args.tipo!=kind:continue
            save(f'ciclo_{c["ciclo"]}/{kind}/CU{c["id"]:02d}_{kind}.puml',case_name(c)+' · '+kind,builder(c),sections[kind]+('.'+str(c['ciclo']) if kind!='actividades' else ''))
    if not args.tipo:
        for cycle in sorted({c['ciclo'] for c in cases}):save(f'ciclo_{cycle}/vista_ciclo_{cycle}.puml',f'Vista del ciclo {cycle}',overview(cycle,[c for c in cases if c['ciclo']==cycle]),f'2.5.{cycle}')
        if not args.ciclo:
            for name,title,content in general_diagrams():save(f'generales/{name}.puml',title,diagram(title,content),'Arquitectura, dominio y reglas transversales')
    errors=[]
    if not args.solo_fuentes:
        if not shutil.which(args.java):raise RuntimeError('No se encontró Java. Instala Java 17+ o usa --solo-fuentes.')
        jar=args.jar.resolve();acquire_jar(jar,args.descargar_plantuml)
        for fmt in args.formatos:
            print(f'Renderizando {len(files)} diagramas en {fmt.upper()}...',flush=True)
            # Lotes cortos para no exceder el límite de argumentos de Windows.
            for start in range(0,len(files),12):
                batch=files[start:start+12]
                command=[args.java,'-Djava.awt.headless=true','-Xmx1024m','-jar',str(jar),'-charset','UTF-8','-failfast2',f'-t{fmt}']+[str(f) for f in batch]
                run=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=240)
                if run.returncode:errors.append(run.stdout+'\n'+run.stderr)
                for file in batch:
                    target=file.with_suffix('.'+fmt)
                    if not target.exists():errors.append('No se generó '+str(target))
                    elif fmt=='svg' and 'Syntax Error?' in target.read_text(encoding='utf-8',errors='replace'):errors.append('Error de sintaxis en '+str(target))
    (out/'indice.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
    with (out/'indice.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(index[0]));writer.writeheader();writer.writerows(index)
    cards=[]
    for entry in index:
        img=entry['svg'] if 'svg' in args.formatos else entry['png']
        cards.append('<article><h2>'+html.escape(entry['titulo'])+'</h2><p>'+html.escape(entry['seccion_documento'])+'</p><a href="'+html.escape(entry['fuente'])+'">Fuente editable</a>'+('' if args.solo_fuentes else '<a href="'+html.escape(img)+'"><img loading="lazy" src="'+html.escape(img)+'"></a>')+'</article>')
    (out/'galeria.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Diagramas HemoVida</title><style>body{font:16px Arial;margin:30px;max-width:1500px}article{border-top:1px solid #bbb;padding:24px 0}img{display:block;max-width:100%;max-height:850px;margin:20px 0}h2{font-size:19px}</style><h1>Diagramas HemoVida hasta ciclo 3</h1><p>Modelos de análisis y diseño. No son capturas ni evidencia de pruebas o despliegue.</p>'+''.join(cards)+'</html>',encoding='utf-8')
    if not errors and (out/'errores.txt').exists():
        (out/'errores.txt').unlink()
    if errors:
        (out/'errores.txt').write_text('\n'.join(errors),encoding='utf-8');raise RuntimeError(f'Falló la generación. Consulta {out / "errores.txt"}')
    print(f'OK: {len(files)} diagramas. Carpeta: {out}',flush=True)
    print('Abre galeria.html para revisarlos. Fuentes editables .puml y correspondencia en indice.csv.')

if __name__=='__main__':
    try:main()
    except (RuntimeError,OSError,subprocess.TimeoutExpired) as exc:print('ERROR: '+str(exc),file=sys.stderr);sys.exit(1)
