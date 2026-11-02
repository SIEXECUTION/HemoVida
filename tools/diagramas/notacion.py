"""Notación UML convencional basada en las referencias de Desktop/DIAGRAMAS."""
import textwrap
from collections import defaultdict
from modelo import MODELS, ROLES, PACKAGES, OPERATIONS

STYLE = '''!pragma layout smetana
skinparam backgroundColor white
skinparam shadowing false
skinparam monochrome true
skinparam defaultFontName Arial
skinparam defaultFontSize 14
skinparam dpi 140
skinparam roundcorner 0
skinparam classAttributeIconSize 0
skinparam maxMessageSize 250
skinparam sequenceMessageAlign center
'''


def label(value, width=43):
    value = str(value).replace('"', "'").replace('\\', '/').replace(';', ',')
    return r'\n'.join(textwrap.wrap(value, width, break_long_words=False, break_on_hyphens=False))


def diagram(title, content):
    return '@startuml\n' + STYLE + 'title ' + label(title, 88) + '\n' + content + '\n@enduml\n'


def case_name(c):
    return f"CU{c['id']:02d} - {MODELS[c['id']]['title']}"


def actors(c):
    return list(dict.fromkeys(ROLES.get(a, a) for a in c['actores']))


def usecase(c):
    m = MODELS[c['id']]
    lines = ['left to right direction']
    for n, name in enumerate(actors(c)):
        lines.append(f'actor "{label(name, 24)}" as A{n}')
    lines += ['rectangle "HemoVida" {', f'usecase "{label(case_name(c), 33)}" as UC']
    extra = {
        7: ('Comprobar disponibilidad', 'UC ..> AUX : <<include>>'),
        12: ('Registrar consentimiento', 'UC ..> AUX : <<include>>'),
        13: ('Liberar unidades conjuntamente', 'AUX ..> UC : <<extend>>\\n[solicitud del bioquímico y ambas evaluaciones aprobadas]'),
        14: ('Corregir grupo con trazabilidad', 'AUX ..> UC : <<extend>>\\n[corrección solicitada por bioquímico]'),
    }
    if c['id'] in extra:
        title, link = extra[c['id']]
        lines += [f'usecase "{label(title, 30)}" as AUX']
    lines += ['}']
    lines += [f'A{n} -- UC' for n in range(len(actors(c)))]
    if c['id'] in extra:
        lines += [extra[c['id']][1]]
        if c['id'] in (13, 14):
            n = actors(c).index('Bioquímico integral')
            lines += [f'A{n} -- AUX']
    return diagram(case_name(c) + ' - Caso de uso', '\n'.join(lines))


def declarations(c, kind):
    m = MODELS[c['id']]
    lines = ([] if kind == 'sequence' else ['allowmixing']) + [f'actor "{label(m["actor"], 24)}" as A']
    names = [('U', m['boundary'], 'boundary'), ('C', m['control'], 'control')]
    names += [(f'E{i}', e['name'], 'entity') for i, e in enumerate(m['entities'])]
    for alias, name, stereotype in names:
        if kind == 'sequence':
            lines += [f'participant ":{label(name, 24)}" as {alias} <<{stereotype}>>']
        elif kind == 'object':
            lines += [f'object "<u>:{label(name, 27)}</u>" as {alias} <<{stereotype}>>']
        else:
            if alias == 'U':
                attrs, responsibility = ['criterios de entrada', 'resultado visible'], 'Recibir datos y presentar resultado'
            elif alias == 'C':
                attrs, responsibility = ['contexto de la operación'], 'Coordinar validaciones y efectos del caso'
            else:
                e = m['entities'][int(alias[1:])]
                attrs, responsibility = e['attrs'], e['responsibility']
            lines += [f'class "{label(name, 28)}" as {alias} <<{stereotype}>> {{',
                      *[label(a, 34) for a in attrs], '--', label(responsibility, 35), '}']
    return lines


def calls(c):
    """Llamadas conceptuales compartidas por secuencia y comunicación."""
    m = MODELS[c['id']]
    result = [('A', 'U', '1', OPERATIONS[c['id']], None),
              ('U', 'C', '1.1', OPERATIONS[c['id']], None),
              ('C', 'C', '1.1.1', authorization(c), None)]
    n = 1
    for i, e in enumerate(m['entities']):
        if e['read']:
            n += 1
            result.append(('C', f'E{i}', f'1.1.{n}', e['read'], 'autorizado'))
    n += 1
    result.append(('C', 'C', f'1.1.{n}', 'validarReglas(datos)', 'autorizado'))
    for i, e in enumerate(m['entities']):
        if e['write']:
            n += 1
            result.append(('C', f'E{i}', f'1.1.{n}', e['write'], 'válido'))
    if c['id'] == 13:
        n += 1
        result.append(('C', 'E0', f'1.1.{n}', 'invalidarLiberacionYCuarentenar()', 'resultado incompatible'))
        n += 1
        result.append(('C', 'E0', f'1.1.{n}', 'liberarMadreYComponentes()', 'BIOQ solicita y ambos aprobados y concordantes'))
    if c['id'] == 14:
        for target, operation in [('E1', 'corregirGrupoConMotivo(datos)'), ('E0', 'invalidarLiberacionYCuarentenar()'), ('E2', 'cancelarReservasIncompatibles()')]:
            n += 1
            result.append(('C', target, f'1.1.{n}', operation, 'BIOQ solicita corrección válida y sin entrega'))
    return result


def authorization(c):
    return 'validarSolicitudAcceso(credenciales)' if c['id'] == 1 else 'autorizarOperacion(rol, contexto)'


def sequence(c):
    if c['id'] == 22:
        return stripe_sequence(c)
    m = MODELS[c['id']]
    lines = ['hide footbox'] + declarations(c, 'sequence')
    lines += [f'A -> U : {label(m["request"], 42)}', 'activate U',
              f'U -> C : {OPERATIONS[c["id"]]}', 'activate C',
              'C -> C : ' + authorization(c),
              'alt Solicitud de acceso permitida' if c['id'] == 1 else 'alt Actor autorizado y solicitud permitida']
    if c['id'] in (23, 24):
        lines += ['C -> C : validarCatalogoFiltrosYLimites(criterios)',
                  'note right of C', 'Validar antes de consultar datos.\nFinanzas exclusivamente para ADMIN.\nNo aceptar SQL libre del usuario.', 'end note']
    for src, dst, num, message, guard in calls(c)[2:]:
        if guard != 'autorizado':
            continue
        lines += [f'{src} -> {dst} : {message}']
        if dst != src:
            lines += [f'activate {dst}', f'{dst} --> {src} : datos consultados', f'deactivate {dst}']
    if c['id'] == 1:
        lines += ['note right of C', 'Reiniciar fallos si cambia el día de Bolivia.\nNo contar intentos durante un bloqueo vigente.', 'end note']
    lines += [f'alt {label(m["guard"], 65)}']
    writes = [(src, dst, msg, guard) for src, dst, num, msg, guard in calls(c) if guard == 'válido']
    if len(writes) > 1:
        lines += ['group Guardado conjunto; revertir si falla']
    for src, dst, message, guard in writes:
        lines += [f'{src} -> {dst} : {message}', f'activate {dst}', f'{dst} --> {src} : registro confirmado', f'deactivate {dst}']
    if len(writes) > 1:
        lines += ['end']
    if c['id'] == 13:
        lines += ['opt Resultado incompatible con liberación',
                  'C -> E0 : invalidarLiberacionYCuarentenar()', 'end',
                  'opt BIOQ solicita liberación; ambas evaluaciones aprobadas y grupo concordante',
                  'C -> E0 : liberarMadreYComponentes()', 'activate E0', 'E0 --> C : liberación confirmada', 'deactivate E0', 'end']
    elif c['id'] == 14:
        lines += ['opt Resultado incompatible con liberación',
                  'C -> E0 : invalidarLiberacionYCuarentenar()', 'end']
        lines += ['opt BIOQ solicita corrección con motivo, versión vigente y sin entrega',
                  'group Corrección trazable y guardado conjunto',
                  'C -> E1 : corregirGrupoConMotivo(datos)',
                  'C -> E0 : invalidarLiberacionYCuarentenar()',
                  'C -> E2 : cancelarReservasIncompatibles()', 'end', 'end']
    elif c['id'] == 21:
        lines += ['note over C,E2', 'La aprobación es posterior y exclusiva del bioquímico.\nLa indicación médica conserva estado pendiente.', 'end note']
    lines += [f'C --> U : {label(m["result"], 48)}', 'else Regla, permiso o precondición incumplida']
    if c['id'] == 1:
        lines += ['opt Credencial incorrecta y cuenta sin bloqueo vigente',
                  'C -> E0 : registrarFalloYPlazoProgresivo()',
                  'note right of E0', 'Cada 3 fallos: 15, 30, 60 minutos...\nTope 32 horas; reinicio al cambiar el día local.', 'end note', 'end']
    lines += ['C --> U : informarMotivoSinConfirmarOperacion()', 'end',
              'else Acceso no autorizado', 'C --> U : denegarAcceso()', 'end', 'deactivate C',
              'U --> A : mostrarResultado()', 'deactivate U']
    return diagram(case_name(c) + ' - Secuencia', '\n'.join(lines))


def communication(c):
    if c['id'] == 22:
        return stripe_communication(c)
    lines = ['left to right direction'] + declarations(c, 'object')
    grouped = defaultdict(list)
    for src, dst, num, message, guard in calls(c):
        text = '→ ' + f'{num}: ' + (f'[{guard}] ' if guard else '') + message
        grouped[(src, dst)].append(label(text, 58))
    for (src, dst), messages in grouped.items():
        # Un enlace no dirigido por pareja; flechas convencionales de mensaje
        # en la etiqueta. Smetana omite los triángulos de etiquetas multilínea.
        lines += [f'{src} -- {dst} : ' + r'\n'.join(messages)]
    return diagram(case_name(c) + ' - Comunicación', '\n'.join(lines))


def classes(c):
    lines = ['left to right direction', 'hide circle'] + declarations(c, 'class')
    lines += ['A -- U : interactúa', 'U --> C : solicita coordinación']
    for i, e in enumerate(MODELS[c['id']]['entities']):
        mutates = e['write'] or (c['id'] in (13, 14) and i == 0) or (c['id'] == 14 and i == 2)
        lines += [f'C --> E{i} : {"consulta y actualiza" if mutates else "consulta"}']
    if c['id'] == 22:
        lines += ['class "Interfaz de pagos" as P <<boundary>> {',
                  'sesión de Checkout', '--', 'Intercambiar sesión y notificaciones', '}',
                  'actor "Stripe" as X', 'C --> P : solicita y verifica', 'P -- X : intercambia mensajes']
    return diagram(case_name(c) + ' - Clases de análisis', '\n'.join(lines))


def action(text):
    return ':' + label(text, 49) + ';'


def activity(c):
    if c['id'] == 22:
        return stripe_activity(c)
    m = MODELS[c['id']]
    lines = ['skinparam roundcorner 18', 'skinparam conditionStyle diamond', f'|{m["actor"]}|',
             'start', action(m['request']), '|HemoVida|', action('Consultar antecedentes y permisos de la operación')]
    lines += [f'|{m["actor"]}|', action(m['confirmation']), '|HemoVida|',
              action('Validar datos y reglas del caso'), f'if ({label(m["guard"], 46)}?) then (sí)']
    for e in m['entities']:
        if e['write']:
            lines += [action(e['responsibility'])]
    if c['id'] == 13:
        lines += ['if (¿Resultado incompatible con liberación?) then (sí)',
                  action('Invalidar liberación y conservar unidades en cuarentena'), 'endif',
                  '|Bioquímico integral|', 'if (¿Solicita liberación conjunta?) then (sí)', '|HemoVida|',
                  'if (¿Ambos análisis aprobados y grupo concordante?) then (sí)',
                  action('Liberar madre y componentes en una transacción'), 'else (no)',
                  action('Rechazar liberación y conservar cuarentena'), 'endif', 'else (no)', '|HemoVida|',
                  action('Conservar análisis sin liberación automática'), 'endif']
    elif c['id'] == 14:
        lines += ['|Bioquímico integral|', 'if (¿Solicita corrección de grupo?) then (sí)', '|HemoVida|',
                  'if (¿Motivo y versión válidos y sin entrega?) then (sí)',
                  action('Corregir y auditar; invalidar liberación, poner en cuarentena y cancelar reservas incompatibles'),
                  'else (no)', action('Rechazar corrección y conservar datos'), 'endif', 'else (no)', '|HemoVida|',
                  action('Conservar registro sin corregir grupo'), 'endif']
    elif c['id'] == 21:
        lines += ['|Bioquímico integral|', action('Revisar indicación y versión del programa'),
                  'if (¿Aprueba revisión biológica?) then (sí)', '|HemoVida|',
                  action('Registrar aprobación e historial y habilitar agenda autóloga'), 'else (no)', '|HemoVida|',
                  action('Registrar observaciones e historial; exigir corrección médica'), 'endif']
    lines += [action(m['result'] if c['id'] != 21 else 'Conservar estado de revisión y versiones del programa'),
              f'|{m["actor"]}|', action('Consultar resultado de la operación'), 'stop', 'else (no)', '|HemoVida|']
    if c['id'] == 1:
        lines += [action('Si la clave es incorrecta y no hay bloqueo vigente, sumar fallo y aplicar plazo progresivo')]
    lines += [action('Informar motivo del rechazo sin confirmar la operación'), 'stop', 'endif']
    return diagram(case_name(c) + ' - Actividad', '\n'.join(lines))


def overview(cycle, cases):
    return diagram(f'HemoVida - Casos de uso del ciclo {cycle}', case_view(cases, False))


def case_view(cases, consolidated):
    # El consolidado resume actores principales; la matriz y las tres vistas
    # de ciclo conservan todas las participaciones del contrato.
    roles = {c['id']: ([MODELS[c['id']]['actor']] if consolidated else actors(c)) for c in cases}
    if consolidated:
        roles[21] += ['Bioquímico integral', 'Receptor']
        roles[22] += ['Stripe']
    names = list(dict.fromkeys(a for c in cases for a in roles[c['id']]))
    lines = ['left to right direction', 'skinparam packageStyle rectangle',
             'skinparam nodesep 25', 'skinparam ranksep 35']
    for i, name in enumerate(names):
        lines += [f'actor "{label(name, 23)}" as A{i}']
    lines += ['rectangle "HemoVida" {']
    for cycle in sorted({c['ciclo'] for c in cases}):
        if consolidated:
            lines += [f'package "Ciclo {cycle}" {{']
        for c in cases:
            if c['ciclo'] == cycle:
                lines += [f'usecase "{label(case_name(c), 33)}" as CU{c["id"]}']
        if consolidated:
            lines += ['}']
    lines += ['}']
    for c in cases:
        lines += [f'A{names.index(a)} -- CU{c["id"]}' for a in roles[c['id']]]
    return '\n'.join(lines)


def structure(cycle, cases):
    selected = [c for c in cases if c['ciclo'] == cycle]
    lines = ['left to right direction', 'skinparam packageStyle package']
    names = list(dict.fromkeys(a for c in selected for a in actors(c)))
    for i, name in enumerate(names):
        lines += [f'actor "{label(name, 23)}" as A{i}']
    present = {}
    for i, (name, ids) in enumerate(PACKAGES.items()):
        members = [c for c in selected if c['id'] in ids]
        if not members:
            continue
        present[name] = i
        lines += [f'package "{name}" as P{i} {{']
        lines += [f'usecase "{label(case_name(c), 31)}" as CU{c["id"]}' for c in members]
        lines += ['}']
    for c in selected:
        lines += [f'A{names.index(a)} -- CU{c["id"]}' for a in actors(c)]
    dependencies = {
        1: [],
        2: [('Agenda y programas autólogos', 'Donantes y atención', 'consulta prefiltro')],
        3: [('Laboratorio', 'Evaluación y colecta', 'consulta madre y colecta'),
            ('Inventario y conservación', 'Laboratorio', 'consulta condición de liberación'),
            ('Inventario y conservación', 'Evaluación y colecta', 'consulta origen y volumen')],
    }
    for src, dst, reason in dependencies[cycle]:
        lines += [f'P{present[src]} ..> P{present[dst]} : {reason}']
    return '\n'.join(lines)


def stripe_sequence(c):
    lines = ['hide footbox'] + declarations(c, 'sequence')
    lines += ['participant ":Interfaz de pagos" as P <<boundary>>', 'actor "Stripe" as X',
              'A -> U : solicitarCheckout(deuda, importe)', 'activate U',
              'U -> C : iniciarCobro(deuda, importe)', 'activate C',
              'C -> E0 : consultarSaldo(deuda)', 'activate E0', 'E0 --> C : saldo y moneda', 'deactivate E0',
              'alt ADMIN, deuda en BOB e importe permitido',
              'C -> E1 : registrarIntentoConIdempotencia()',
              'C -> P : crearCheckout(intento)', 'activate P',
              'P -> X : crearSesion(claveIdempotente)', 'activate X', 'X --> P : sesión y URL', 'deactivate X',
              'P --> C : sesión y URL', 'deactivate P',
              'C -> E1 : vincularSesion(sesion)', 'C --> U : URL de Checkout; sin pago confirmado',
              'else Datos o permiso inválidos', 'C --> U : rechazo del intento', 'end', 'deactivate C',
              'U --> A : presentarResultado()', 'deactivate U',
              '== Notificación posterior e independiente del navegador ==',
              'X -> P : notificarEvento(cuerpo, firma)', 'activate P',
              'P -> P : verificarFirma(cuerpo, secreto)',
              'alt Firma válida', 'P -> C : procesarEvento(evento)', 'activate C',
              'C -> P : consultarSesionReal(referencia)',
              'P -> X : recuperarSesion(referencia)', 'activate X',
              'X --> P : estado, modo, importe y moneda', 'deactivate X',
              'P --> C : sesión verificada',
              'alt Evento nuevo y cobro confirmado con datos concordantes',
              'group Confirmación única en una transacción',
              'C -> E1 : registrarEventoYConfirmacion()', 'C -> E2 : registrarPagoConfirmado(datos)',
              'C -> E0 : actualizarSaldoYComprobante()', 'end',
              'else Evento repetido, pago pendiente o discrepancia',
              'C -> E1 : conservarEstadoORegistrarConciliacion()', 'end',
              'C --> P : resultado del procesamiento', 'deactivate C', 'P --> X : acuse según resultado',
              'else Firma inválida', 'P --> X : rechazarNotificacion()', 'end', 'deactivate P']
    return diagram(case_name(c) + ' - Secuencia', '\n'.join(lines))


def stripe_communication(c):
    lines = ['left to right direction'] + declarations(c, 'object')
    lines += ['object "<u>:Interfaz de pagos</u>" as P <<boundary>>', 'actor "Stripe" as X',
              'A -- U : → 1: solicitarCheckout(deuda, importe)',
              'U -- C : → 1.1: iniciarCobro(deuda, importe)',
              'C -- C : → 1.1.1: autorizarOperacion(rol)',
              r'C -- E0 : → 1.1.2: [ADMIN] consultarSaldo(deuda)\n→ 2.2.4: [pago confirmado] actualizarSaldo()',
              r'C -- E1 : → 1.1.3: [válido] registrarIntento()\n→ 1.1.5: vincularSesion(sesion)\n→ 2.2.2: deduplicarEvento(evento)',
              r'C -- P : → 1.1.4: crearCheckout(intento)\n← 2.2: [firma válida] procesarEvento(evento)\n→ 2.2.1: consultarSesionReal(referencia)',
              r'P -- X : → 1.1.4.1: crearSesion(clave)\n← 2: notificarEvento(cuerpo, firma)\n→ 2.2.1.1: recuperarSesion(referencia)',
              'P -- P : → 2.1: verificarFirma(cuerpo, secreto)',
              'C -- E2 : → 2.2.3: [evento nuevo y cobro confirmado] registrarPago(datos)']
    return diagram(case_name(c) + ' - Comunicación', '\n'.join(lines))


def stripe_activity(c):
    content = '''skinparam roundcorner 18
skinparam conditionStyle diamond
|Administrador|
start
:Seleccionar deuda e importe;
|HemoVida|
:Validar rol, saldo e importe en BOB;
if (¿Solicitud válida?) then (sí)
:Registrar intento con idempotencia;
|Stripe|
:Crear sesión de Checkout;
|HemoVida|
:Vincular sesión y mostrar URL;
|Administrador|
:Abrir Checkout y realizar pago;
|Stripe|
:Enviar evento al webhook;
|HemoVida|
:Verificar firma y consultar sesión real;
if (¿Firma y datos concordantes?) then (sí)
if (¿Evento nuevo y pago confirmado?) then (sí)
:Registrar evento y pago una sola vez,
actualizar saldo y comprobante;
else (no)
:Conservar estado sin duplicar ni inventar cobro;
endif
:Acusar recibo del procesamiento;
else (no)
:Rechazar firma inválida o registrar discrepancia;
endif
else (no)
:Informar rechazo de la solicitud;
endif
stop'''
    return diagram(case_name(c) + ' - Actividad', content)


def general_diagrams(cases):
    for cycle in (1, 2, 3):
        yield (f'estructura_ciclo_{cycle}', f'Estructura del modelo de casos de uso - Ciclo {cycle}', structure(cycle, cases))
    yield ('consolidado_ciclos_1_2_3', 'HemoVida - Consolidado hasta ciclo 3 (actores principales)', case_view(cases, True))
    yield ('general_sistema', 'HemoVida - Trazabilidad general del sistema', r'''allowmixing
left to right direction
hide circle
skinparam componentStyle uml2
package "Requisitos" {
actor "Personal de colecta" as A
usecase "CU12\nRegistrar consentimiento y colecta" as CU
A -- CU
}
package "Análisis" {
class "Formulario de colecta" as B <<boundary>>
class "Control de colecta" as C <<control>>
class "Consentimiento informado" as E <<entity>>
B --> C
C --> E
C ..> CU : <<realize>>
}
package "Diseño lógico" {
component "Interfaz de colecta" as UI
component "Servicio de colecta" as API
component "Persistencia clínica" as DATA
UI --> API : solicita colecta
API --> DATA : guarda transacción
UI ..> B : <<trace>>
API ..> C : <<trace>>
DATA ..> E : <<trace>>
}
package "Implementación y despliegue previsto" {
node "Cloudflare" {
artifact "Frontend React / Vite" as FE
}
node "Render" {
artifact "Backend Django" as BE
}
node "Supabase" {
artifact "Esquema PostgreSQL existente" as DB
}
FE --> BE : HTTPS / API
BE --> DB : conexión PostgreSQL TLS\npuerto 6543
FE ..> UI : <<manifest>>
BE ..> API : <<manifest>>
DB ..> DATA : <<manifest>>
}''')
    yield ('modelo_negocio', 'HemoVida - Modelo de negocio hasta ciclo 3', '''skinparam roundcorner 18
skinparam conditionStyle diamond
|Donante o receptor|
start
:Completar identificación y prefiltro;
:Solicitar cita de atención;
|Personal de colecta|
:Verificar identidad y admitir;
|Médico de triaje|
:Evaluar y emitir dictamen;
if (¿Apto para donar?) then (sí)
|Donante o receptor|
:Otorgar consentimiento informado;
|Personal de colecta|
:Registrar colecta y bolsa madre;
:Registrar entrega real de refrigerio;
|Técnico de logística|
:Fraccionar dentro de la ventana permitida;
:Registrar condiciones de conservación;
|Bioquímico integral|
:Evaluar serología e inmunohematología;
if (¿Ambas aprobadas y grupo concordante?) then (sí)
:Solicitar liberación conjunta;
|Técnico de logística|
:Controlar stock liberado y caducidad;
else (no)
|Bioquímico integral|
:Mantener cuarentena y registrar acciones;
endif
|Administrador|
:Consultar reportes y obligaciones financieras;
stop
else (no)
|Médico de triaje|
:Registrar diferimiento cuando corresponda;
:Comunicar restricción al candidato;
stop
endif''')


BUILDERS = {'casos_uso': usecase, 'actividades': activity, 'secuencias': sequence,
            'comunicacion': communication, 'clases_analisis': classes}
