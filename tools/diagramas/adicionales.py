"""Ocho categorías complementarias PUDS, con datos y código verificables."""
from __future__ import annotations
import ast
import hashlib
import json
import re
from pathlib import Path
from arquitectura_datos import MODULES, TABLES, FRONTENDS, LOGICAL, PACKAGE_EDGES, DOMAIN, DOMAIN_EDGES
from notacion import diagram, label, case_name

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = Path(__file__).with_name('catalogo_supabase.json')
KINDS = ('dominio', 'paquetes_analisis', 'despliegue', 'capas', 'clases_diseno',
         'relacional', 'componentes_principal', 'componentes_paquete')


def render(title, body, graphviz=False):
    source = diagram(title, body)
    if graphviz:
        source = source.replace('!pragma layout smetana\n', "' Graphviz: enrutamiento de relaciones de datos\n")
    return source


def catalog():
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8'))['tables']


def keys(table, kind):
    return [c for c in table['constraints'] if c['kind'] == kind]


def ends(table, fk):
    names = set(fk['columns'])
    required = all(c['not_null'] for c in table['columns'] if c['name'] in names)
    unique = any(set(c['columns']) <= names for k in ('p', 'u') for c in keys(table, k))
    unique |= any(i['unique'] and i['valid'] and not i['expression'] and not i['predicate'] and set(i['columns']) <= names for i in table.get('indexes', []))
    # IE: mínimo de hijos cero. Una FK no obliga a que exista un hijo.
    return ('1' if required else '0..1', '0..1' if unique else '0..*')


def domain():
    lines = ['left to right direction', 'hide circle', 'hide empty methods',
             'skinparam nodesep 30', 'skinparam ranksep 40']
    aliases = {name: f'D{i}' for i, name in enumerate(DOMAIN)}
    for group in dict.fromkeys(value[0] for value in DOMAIN.values()):
        lines += [f'package "{group}" {{']
        for name, (g, attrs) in DOMAIN.items():
            if g == group:
                lines += [f'class "{label(name, 28)}" as {aliases[name]} {{', *attrs.split('|'), '}']
        lines += ['}']
    for src, left, dst, right, verb in DOMAIN_EDGES:
        lines += [f'{aliases[src]} "{left}" -- "{right}" {aliases[dst]} : {verb}']
    return '\n'.join(lines)


def packages(cases):
    lines = ['left to right direction', 'skinparam packageStyle package']
    for module, (name, ids) in MODULES.items():
        lines += [f'package "{label(name, 36)}" as P_{module} {{']
        for c in cases:
            if c['id'] in ids:
                lines += [f'usecase "{label(case_name(c), 34)}" as UC{c["id"]}']
        lines += ['}']
    lines += [f'P_{src} ..> P_{dst} : <<use>>' for src, dst in PACKAGE_EDGES]
    return '\n'.join(lines)


def relational(selected=None):
    tables = catalog()
    own = set(tables if selected is None else selected)
    missing = own - tables.keys()
    if missing:
        raise ValueError('Tablas fuera del catálogo: ' + ', '.join(sorted(missing)))
    visible = own | {fk['references'] for name in own for fk in keys(tables[name], 'f')}
    aliases = {name: f'T{i}' for i, name in enumerate(sorted(visible))}
    lines = ['left to right direction', 'hide circle', 'skinparam linetype ortho',
             'skinparam nodesep 38', 'skinparam ranksep 55']
    for name in sorted(visible):
        table = tables[name]
        pks = {col for constraint in keys(table, 'p') for col in constraint['columns']}
        fks = {col for constraint in keys(table, 'f') for col in constraint['columns']}
        display = name if name in own else name + r'\n(referencia: solo clave)'
        lines += [f'entity "{display}" as {aliases[name]} {{']
        for c in table['columns']:
            if c['name'] in pks:
                marks = ' <<PK>>' + (' <<FK>>' if c['name'] in fks else '')
                lines += [f'* {c["name"]} : {c["type"]}{marks}']
        lines += ['--']
        if name in own:
            for c in table['columns']:
                if c['name'] not in pks:
                    mark = ' <<FK>>' if c['name'] in fks else ''
                    lines += [f'{"* " if c["not_null"] else ""}{c["name"]} : {c["type"]}{mark}']
            printed_unique = set()
            for constraint in keys(table, 'u'):
                lines += ['--', 'UNIQUE (' + ', '.join(constraint['columns']) + ')']
                printed_unique.add(tuple(constraint['columns']))
            for idx in table.get('indexes', []):
                if idx['unique'] and not idx['primary'] and idx['valid'] and not idx['expression']:
                    if idx['predicate'] or tuple(idx['columns']) not in printed_unique:
                        text = 'UNIQUE ('+', '.join(idx['columns'])+')'+(' WHERE '+idx['predicate'] if idx['predicate'] else '')
                        lines += ['--', label(text, 62)]
        lines += ['}']
    for name in sorted(own):
        for fk in keys(tables[name], 'f'):
            parent, child = ends(tables[name], fk)
            left, right = ('||' if parent == '1' else '|o'), ('o|' if child == '0..1' else 'o{')
            lines += [f'{aliases[fk["references"]]} {left}--{right} {aliases[name]} : {label(", ".join(fk["columns"]), 30)}']
    return '\n'.join(lines)


FIELD_TYPES = {'AutoField':'Integer', 'BigAutoField':'Integer', 'IntegerField':'Integer',
               'PositiveIntegerField':'Integer', 'BigIntegerField':'Integer',
               'CharField':'String', 'EmailField':'String', 'TextField':'String',
               'BooleanField':'Boolean', 'FloatField':'Float', 'DecimalField':'Decimal',
               'DateField':'Date', 'DateTimeField':'DateTime', 'JSONField':'dict',
               'UUIDField':'UUID', 'ListField':'list', 'DictField':'dict'}


def parsed(path):
    return ast.parse(path.read_text(encoding='utf-8-sig'))


def signature(node):
    # Las anotaciones existentes se conservan. object indica tipo no anotado:
    # no se atribuye a una función una firma tipada que el código no declara.
    values = []
    args = node.args.posonlyargs + node.args.args
    defaults = {arg.arg:value for arg,value in zip(args[len(args)-len(node.args.defaults):],node.args.defaults)}
    for arg in args:
        if arg.arg in ('self', 'cls'):
            continue
        values += [arg.arg + ': ' + (ast.unparse(arg.annotation) if arg.annotation else 'object') + (' = '+ast.unparse(defaults[arg.arg]) if arg.arg in defaults else '')]
    if node.args.vararg:
        values += ['*' + node.args.vararg.arg + ': object']
    for arg in node.args.kwonlyargs:
        values += [arg.arg + ': ' + (ast.unparse(arg.annotation) if arg.annotation else 'object')]
    if node.args.kwarg:
        values += ['**' + node.args.kwarg.arg + ': object']
    result = ast.unparse(node.returns) if node.returns else 'object'
    return f'{node.name}(' + ', '.join(values) + '): ' + result


def classifiers(module):
    result = []
    for filename, selected in LOGICAL[module].items():
        path = ROOT/'backend/apps'/module/filename
        tree = parsed(path)
        classes = [n for n in tree.body if isinstance(n, ast.ClassDef) and (selected is None or n.name in selected)]
        functions = [n for n in tree.body if isinstance(n, ast.FunctionDef) and selected is not None and n.name in selected]
        found = {n.name for n in classes + functions}
        if selected is not None and set(selected) - found:
            raise ValueError(f'Selección no existente en {path.relative_to(ROOT)}: {set(selected)-found}')
        for node in classes:
            attrs, rels = [], []
            for statement in node.body:
                if not isinstance(statement, ast.Assign):
                    continue
                if not isinstance(statement.value,ast.Call):
                    for target in statement.targets:
                        if isinstance(target,ast.Name):
                            if isinstance(statement.value,ast.Attribute):
                                attrs += ['+ '+target.id+': type['+ast.unparse(statement.value)+']']
                            elif isinstance(statement.value,(ast.List,ast.Tuple,ast.Dict)):
                                attrs += ['+ '+target.id+': '+('dict' if isinstance(statement.value,ast.Dict) else 'list')]
                    continue
                call = statement.value
                kind = ast.unparse(call.func).split('.')[-1]
                for target in statement.targets:
                    if not isinstance(target, ast.Name):
                        continue
                    if kind in ('ForeignKey','OneToOneField','ManyToManyField'):
                        typ = ast.unparse(call.args[0]).strip("'\"")
                        relation = '0..*' if kind=='ManyToManyField' else ('0..1' if any(k.arg=='null' and isinstance(k.value,ast.Constant) and k.value.value for k in call.keywords) else '1')
                        rels += [(target.id,typ,relation,kind=='OneToOneField')]
                    elif kind in FIELD_TYPES:
                        typ = FIELD_TYPES[kind]
                    elif kind=='staticmethod':
                        typ = 'Callable'
                    else:
                        continue
                    attrs += ['+ ' + target.id + ': ' + (f'list[{typ}]' if kind=='ManyToManyField' else typ)]
            properties = [n for n in node.body if isinstance(n,ast.FunctionDef) and any(ast.unparse(d)=='property' for d in n.decorator_list)]
            attrs += ['+ '+n.name+': '+(ast.unparse(n.returns) if n.returns else 'object') for n in properties]
            methods = ['+ ' + signature(n) for n in node.body if isinstance(n,ast.FunctionDef) and not n.name.startswith('__') and n not in properties]
            result += [dict(name=node.name, path=str(path.relative_to(ROOT)).replace('\\','/'),
                            key=f'{module}.{filename}.{node.name}', attrs=attrs, methods=methods,
                            bases=[ast.unparse(b) for b in node.bases], rels=rels, module=False)]
        if functions or not selected and filename!='models.py':
            constants = ['+ '+n.targets[0].id+': object' for n in tree.body if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id.isupper()][:4]
            result += [dict(name=module+'.'+filename[:-3], path=str(path.relative_to(ROOT)).replace('\\','/'),
                            key=f'{module}.{filename}',attrs=constants,methods=['+ '+signature(n) for n in functions],
                            bases=[],rels=[],module=True)]
    return result


def logical(module=None):
    modules = list(MODULES) if module is None else [module]
    items = [(m,c) for m in modules for c in classifiers(m)]
    aliases = {c['key']:f'C{i}' for i,(_,c) in enumerate(items)}
    by_name = {c['name']:aliases[c['key']] for _,c in items if not c['module']}
    lines = ['left to right direction', 'set namespaceSeparator none', 'hide circle', 'skinparam nodesep 30', 'skinparam ranksep 36']
    for m in modules:
        lines += [f'package "apps.{m}" {{']
        for mm,c in items:
            if mm!=m:
                continue
            name = c['name'] if not c['module'] else c['name'] + r'\n(módulo Python)'
            lines += [f'class "{name}" as {aliases[c["key"]]} {{']
            if module is not None:
                lines += c['attrs'] + ['--'] + [label(x,70) for x in c['methods']]
            lines += ['}']
        lines += ['}']
    for m,c in items:
        own = aliases[c['key']]
        for base in c['bases']:
            if base in by_name and base!=c['name']:
                lines += [f'{by_name[base]} <|-- {own}']
        for field, typ, mult, unique in c['rels']:
            if typ in by_name:
                lines += [f'{own} "{("0..1" if unique else "0..*")}" -- "{mult}" {by_name[typ]} : {field}']
    # Un módulo Python depende de los módulos que importa realmente.
    for m,c in items:
        if c['module']:
            imports = imported_files(ROOT/c['path'])
            for mm,other in items:
                if other['module'] and other['path'] in imports and other['key']!=c['key']:
                    lines += [f'{aliases[c["key"]]} ..> {aliases[other["key"]]} : importa']
    if module is not None and not any(c['methods'] for _,c in items):
        lines += ['hide empty methods']
    return '\n'.join(lines)


def imported_files(path):
    """Resuelve importaciones del proyecto sin importar ni ejecutar su código."""
    origin = path.relative_to(ROOT/'backend').with_suffix('')
    base = list(origin.parts[:-1])
    found = set()
    for node in ast.walk(parsed(path)):
        candidates = []
        if isinstance(node, ast.Import):
            candidates = [n.name.split('.') for n in node.names]
        elif isinstance(node, ast.ImportFrom):
            prefix = base[:len(base)-node.level+1] if node.level else []
            target = prefix + (node.module.split('.') if node.module else [])
            candidates = [target] + [target+n.name.split('.') for n in node.names]
        for parts in candidates:
            candidate = ROOT/'backend'/Path(*parts).with_suffix('.py')
            if candidate.is_file():
                found.add(candidate.relative_to(ROOT).as_posix())
    return found


def package_components(module):
    folder = ROOT/'backend/apps'/module
    paths = sorted(p for p in folder.glob('*.py') if p.name not in ('__init__.py','apps.py') and not p.name.startswith('test'))
    own = {p.relative_to(ROOT).as_posix() for p in paths}
    dependencies = {(p.relative_to(ROOT).as_posix(),dep) for p in paths for dep in imported_files(p) if dep!=p.relative_to(ROOT).as_posix()}
    outside = sorted({dst for src,dst in dependencies} - own)
    all_paths = sorted(own) + outside
    aliases = {p:f'F{i}' for i,p in enumerate(all_paths)}
    lines = ['left to right direction', 'skinparam componentStyle uml2',
             f'package "{label(MODULES[module][0],36)} - apps.{module}" {{',
             '() "Rutas del paquete" as I']
    for p in sorted(own):
        lines += [f'component "{Path(p).name}" as {aliases[p]}']
    urls = f'backend/apps/{module}/urls.py'
    lines += [f'I -- {aliases[urls]}', '}']
    if outside:
        lines += ['package "Dependencias de código compartido" {']
        for p in outside:
            lines += [f'component "{label(p.removeprefix("backend/"),38)}" as {aliases[p]}']
        lines += ['}']
    lines += ['component "hemovida_project/urls.py" as Router', 'Router ..> I : incluye rutas']
    for src,dst in sorted(dependencies):
        lines += [f'{aliases[src]} ..> {aliases[dst]} : importa']
    lines += ['package "Frontend asociado" {']
    client_paths = {'frontend/src/services/api.ts','frontend/src/services/liveApi.ts'}
    direct = set()
    for i,name in enumerate(FRONTENDS[module]):
        path = ROOT/'frontend/src/components'/name
        if not path.is_file():
            raise ValueError('Componente inexistente: '+str(path))
        lines += [f'component "{label(name,32)}" as UI{i}']
        imports = frontend_imports(path)
        if imports & client_paths:
            direct.add(i)
        else:
            lines += [f'note bottom of UI{i}', 'Datos y acciones recibidos', 'mediante propiedades de React.', 'end note']
    lines += ['}', 'component "services/api.ts y liveApi.ts" as Client',
              'Client ..> I : HTTPS / JSON']
    for i in sorted(direct):
        lines += [f'UI{i} ..> Client : solicitudes de interfaz']
    if module=='inventario':
        lines += ['note bottom of I', 'Fraccionamiento y custodia: servicios de apps.clinica.\nEsta app expone stock y parámetros.', 'end note']
    return '\n'.join(lines)


def frontend_imports(path):
    found = set()
    for target in re.findall(r'''\bfrom\s+["']([^"']+)["']''', path.read_text(encoding='utf-8-sig')):
        if not target.startswith('.'):
            continue
        base = path.parent/target
        for suffix in ('.ts','.tsx'):
            candidate = base.with_suffix(suffix).resolve()
            if candidate.is_file() and ROOT in candidate.parents:
                found.add(candidate.relative_to(ROOT).as_posix())
    return found


DEPLOYMENT = r'''left to right direction
node "Equipo del usuario" <<device>> as PC {
node "Navegador web" <<executionEnvironment>> {
artifact "SPA React / Vite\nJavaScript y CSS" as SPA
}
}
node "Cloudflare Workers\nActivos estáticos" <<executionEnvironment>> as CF {
artifact "frontend/dist" as DIST
}
node "Render\nServicio web Python" <<executionEnvironment>> as R {
artifact "Gunicorn + Django / DRF\nhemovida_project.wsgi" as API
}
node "Supabase\nPooler de transacciones" <<executionEnvironment>> as POOL
node "Supabase\nServidor de datos" <<executionEnvironment>> as PG {
database "PostgreSQL\nEsquema public existente" as DB
}
node "Brevo\nServicio de correo externo" <<executionEnvironment>> as B
node "Stripe\nCheckout y eventos" <<executionEnvironment>> as S
PC -- CF : HTTPS 443\ndescarga de la SPA
PC -- R : HTTPS 443\nAPI REST, JWT y CORS
R -- POOL : PostgreSQL sobre TLS / TCP 6543\nDATABASE_URL
POOL -- PG : conexión interna gestionada
R -- B : API de correo / HTTPS 443
R -- S : API Stripe / HTTPS 443\nwebhook de retorno firmado
PC -- S : HTTPS 443 / Checkout alojado'''

LAYERS = r'''top to bottom direction
skinparam packageStyle package
package "Capa de presentación" as UI {
component "React / Vite\nFormularios, paneles y reportes" as WEB
component "Cliente API\nservices/api.ts y liveApi.ts" as CLIENT
WEB ..> CLIENT : solicitudes
}
package "Capa de aplicación y negocio" as BUSINESS {
package "Entrada HTTP y autorización" {
component "urls.py y views.py\nDjango REST Framework" as VIEWS
component "serializers.py\nValidación de entradas" as SERIAL
component "seguridad\nJWT, roles y bloqueo diario" as AUTH
}
package "Reglas y operaciones de dominio" {
component "agenda\nservices, adjustments, autologous" as AGENDA
component "clinica\nservices" as CLINIC
component "laboratorio\nservices y corrections" as LAB
component "finanzas\nservices" as FIN
component "reportes\nservices y access" as REPORT
component "donantes e inventario\nLógica en views y consultas ORM" as LEGACY
}
VIEWS ..> SERIAL : valida entradas
VIEWS ..> AUTH : verifica permisos
VIEWS ..> AGENDA
VIEWS ..> CLINIC
VIEWS ..> LAB
VIEWS ..> FIN
VIEWS ..> REPORT
VIEWS ..> LEGACY
}
package "Capa de acceso a datos" as DATA {
component "Modelos ORM existentes\nseguridad, donantes, inventario" as ORM
component "django.db.connection\nCursores y SQL parametrizado" as SQL
component "Transacciones y contexto de auditoría" as TX
component "Configuración PostgreSQL\nhemovida_project/database_config.py" as CONF
component "Driver PostgreSQL\npsycopg2" as DRIVER
}
package "Datos persistidos" as STORAGE {
database "Supabase / PostgreSQL\nTablas, restricciones, funciones y triggers" as DB
}
CLIENT ..> VIEWS : HTTPS / JSON
AUTH ..> ORM
LEGACY ..> ORM
AGENDA ..> SQL
CLINIC ..> SQL
LAB ..> SQL
FIN ..> SQL
REPORT ..> SQL
SQL ..> TX
ORM ..> TX
TX ..> DRIVER
DRIVER ..> CONF : utiliza configuración
DRIVER ..> DB : PostgreSQL TLS / 6543'''

MAIN_COMPONENTS = r'''left to right direction
skinparam componentStyle uml2
component "Frontend SPA\nReact / Vite" as SPA
component "Enrutamiento y vistas API\nDjango REST Framework" as API
component "Autenticación y autorización\nseguridad" as AUTH
component "Servicios de aplicación\nAgenda, clínica, laboratorio, finanzas y reportes" as CORE
component "Persistencia\nORM y cursores SQL parametrizados" as DATA
component "Esquema PostgreSQL\nFunciones y auditoría transaccional" as DB
component "Brevo\nAPI externa" as MAIL
component "Stripe\nAPI y Checkout" as STRIPE
() "API REST / JSON" as REST
() "Validación de JWT y rol" as JWT
() "Operaciones del dominio" as OPS
() "Acceso PostgreSQL" as SQL
() "Envío de correo" as EMAIL
() "Stripe API" as PAY
() "Checkout alojado" as CHECKOUT
() "Webhook firmado" as WH
API -- REST
AUTH -- JWT
CORE -- OPS
DATA -- SQL
MAIL -- EMAIL
STRIPE -- PAY
STRIPE -- CHECKOUT
API -- WH
SPA ..> REST : consume
API ..> JWT : autoriza
API ..> OPS : invoca
CORE ..> SQL : consulta y guarda
AUTH ..> SQL : cuentas y auditoría
DATA ..> DB : conexión TLS / 6543
AUTH ..> EMAIL : envía correo
CORE ..> PAY : crea y verifica Checkout
STRIPE ..> WH : notifica eventos
SPA ..> CHECKOUT : abre URL de pago'''


def diagrams(cases):
    yield 'dominio', 'modelo_dominio', 'Modelo de dominio acumulado - Ciclos 1, 2 y 3', '7. Modelo de dominio', render('Modelo de dominio de HemoVida', domain(), True)
    yield 'paquetes_analisis', 'analisis_paquetes', 'Análisis de paquetes', '3.4. Análisis de paquetes', render('Análisis de paquetes - Ciclos 1, 2 y 3', packages(cases), True)
    yield 'despliegue', 'despliegue_fisico', 'Despliegue físico', '4.1.1. Diseño físico', render('Despliegue de referencia - Cloudflare, Render y Supabase', DEPLOYMENT)
    yield 'capas', 'arquitectura_capas', 'Arquitectura organizada en capas', '4.1.2. Diseño lógico', render('Arquitectura lógica por responsabilidades', LAYERS)
    yield 'clases_diseno', 'clases_panorama', 'Clases de diseño - Panorama', '5.1. Diseño de datos lógico', render('Clases y módulos del código - Panorama', logical(), True)
    yield 'relacional', 'esquema_completo', 'Esquema relacional completo - 49 tablas', '5.2. Diseño de datos físico', render('Esquema public de Supabase - Catálogo 2026-11-01', relational(), True)
    yield 'componentes_principal', 'componentes_sistema', 'Componentes principales del sistema', '6.2. Implementación de la arquitectura', render('Componentes principales de HemoVida', MAIN_COMPONENTS)
    for module,(title,_) in MODULES.items():
        yield 'clases_diseno', f'clases_{module}', f'Clases de diseño - {title}', '5.1. Diseño de datos lógico', render('Clases de diseño - '+title, logical(module), True)
        yield 'relacional', f'relacional_{module}', f'Datos físicos - {title}', '5.2. Diseño de datos físico', render('Esquema relacional - '+title, relational(TABLES[module]), True)
        yield 'componentes_paquete', f'componentes_{module}', f'Componentes - {title}', '6.3. Arquitectura del subsistema', render('Componentes físicos - '+title, package_components(module), True)


def traceability():
    """Procedencia verificable, sin código fuente ni variables de entorno."""
    paths = {CATALOG_PATH,Path(__file__),Path(__file__).with_name('arquitectura_datos.py'),
             Path(__file__).with_name('generar_diagramas.py'),Path(__file__).with_name('notacion.py')}
    for module in MODULES:
        paths |= {p for p in (ROOT/'backend/apps'/module).glob('*.py') if not p.name.startswith('test')}
        paths |= {ROOT/'frontend/src/components'/name for name in FRONTENDS[module]}
    paths |= {ROOT/'render.yaml', ROOT/'backend/hemovida_project/database_config.py'}
    return {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
