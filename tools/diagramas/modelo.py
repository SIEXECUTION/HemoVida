"""Escenarios conceptuales BCE, revisados según las guías del usuario.

No son clases Python ni tablas físicas. Cada entidad declara atributos,
responsabilidades y mensajes del escenario; las guardas preceden a sus efectos.
"""

ROLES = {
    'ADMIN': 'Administrador', 'BIOQ_INTEGRAL': 'Bioquímico integral',
    'TEC_LOGISTICA': 'Técnico de logística', 'DOC_TRIAJE': 'Médico de triaje',
    'PERS_COLECTA': 'Personal de colecta', 'MED_SOLICITANTE': 'Médico solicitante',
    'DONANTE': 'Donante', 'POSIBLE_DONADOR': 'Posible donador', 'RECEPTOR': 'Receptor',
}

# entidad(nombre, atributos, responsabilidades, consulta, efecto opcional)
def E(name, attrs, responsibility, read, write=None):
    return dict(name=name, attrs=attrs.split('|'), responsibility=responsibility,
                read=read, write=write)


def M(title, actor, boundary, control, request, guard, confirmation, result, entities):
    return dict(title=title, actor=actor, boundary=boundary, control=control,
                request=request, guard=guard, confirmation=confirmation,
                result=result, entities=entities)


MODELS = {
1: M('Iniciar sesión', 'Usuario registrado', 'Formulario de acceso', 'Control de acceso',
     'Iniciar sesión con usuario y contraseña', 'Cuenta habilitada, sin bloqueo vigente y credenciales válidas',
     'Seleccionar un rol asignado', 'Sesión y roles autorizados', [
         E('Cuenta de usuario', 'identificador|estado|fallos del día|fin del bloqueo',
           'Conservar estado de acceso', 'consultarEstado(usuario)', 'registrarAcceso(usuario)'),
         E('Asignación de rol', 'usuario|rol', 'Determinar roles asignados', 'obtenerRoles(usuario)'),
     ]),
2: M('Gestionar cuentas y roles', 'Administrador', 'Formulario de cuentas', 'Gestor de cuentas',
     'Solicitar alta o actualización de una cuenta', 'Identidad única y operación permitida para el perfil',
     'Confirmar datos y roles permitidos', 'Cuenta y asignaciones actualizadas', [
         E('Persona', 'documento|nombre|correo', 'Conservar identidad', 'buscarIdentidad(documento)', 'registrarIdentidad(datos)'),
         E('Cuenta de usuario', 'usuario|estado', 'Gestionar acceso', 'comprobarDuplicado(usuario)', 'guardarCuenta(datos)'),
         E('Asignación de rol', 'usuario|rol', 'Conservar perfiles permitidos', 'consultarRolesPermitidos(perfil)', 'asignarRoles(roles)'),
     ]),
3: M('Registrar y consultar bitácora', 'Administrador', 'Consulta de bitácora', 'Gestor de auditoría',
     'Solicitar eventos con filtros', 'Administrador autorizado y filtros válidos',
     'Consultar detalle de un evento', 'Eventos y contexto de auditoría', [
         E('Evento de auditoría', 'fecha|actor|acción|origen|cambio',
           'Conservar trazabilidad sin secretos', 'buscarEventos(filtros)'),
     ]),
4: M('Monitorear stock y caducidad', 'Técnico de logística', 'Panel de existencias', 'Control de stock',
     'Consultar existencias y alertas', 'Rol autorizado para inventario',
     'Examinar alertas por componente', 'Stock utilizable y alertas', [
         E('Componente sanguíneo', 'tipo|grupo|estado|caducidad', 'Determinar disponibilidad', 'consultarComponentes(fecha)'),
         E('Unidad de sangre total', 'estado|grupo|modalidad', 'Conservar condición de la madre', 'consultarLiberacionConjunta(unidades)'),
         E('Umbral de stock', 'tipo|grupo|mínimo', 'Definir nivel de alerta', 'consultarMinimos()'),
     ]),
5: M('Consultar carnet e historial', 'Donante o candidato', 'Carnet digital', 'Gestor de carnet',
     'Solicitar carnet de la persona', 'Titular o personal autorizado para consultar esa persona',
     'Visualizar carnet o verificar su QR', 'Carnet, historial y próxima fecha habilitada', [
         E('Persona', 'identificador|nombre|grupo', 'Identificar titular', 'resolverTitular(identificador)'),
         E('Extracción de donación', 'fecha|modalidad|volumen', 'Conservar historial de donación', 'consultarHistorial(persona)'),
     ]),
6: M('Gestionar postulantes y prefiltro', 'Posible donador', 'Formulario de prefiltro', 'Gestor de prefiltro',
     'Solicitar requisitos de donación', 'Respuestas completas y versión del catálogo vigente',
     'Responder requisitos y guardar borrador', 'Borrador guardado sin reservar turno', [
         E('Requisito de donación', 'versión|pregunta|vigencia', 'Definir catálogo versionado', 'consultarCatalogoActivo()'),
         E('Borrador de prefiltro', 'persona|versión|respuestas', 'Conservar respuestas sin reservar cupo', 'consultarBorrador(persona)', 'guardarBorrador(respuestas, version)'),
     ]),
7: M('Gestionar agenda y citas', 'Donante', 'Agenda de atención', 'Gestor de citas',
     'Solicitar disponibilidad de atención', 'Turno publicado, libre y sin cierre; prefiltro vigente',
     'Seleccionar modalidad y turno y confirmar cita', 'Cita confirmada y cupo actualizado', [
         E('Turno de agenda', 'fecha|hora|cupo|cierre', 'Controlar disponibilidad', 'consultarTurnos(fecha)', 'ocuparTurno(turno)'),
         E('Prefiltro de cita', 'versión|respuestas', 'Conservar evaluación histórica', 'validarPrefiltro(persona)', 'vincularPrefiltro(cita)'),
         E('Cita de donación', 'persona|modalidad|estado', 'Conservar reserva de atención', 'comprobarCitas(persona)', 'confirmarCita(datos)'),
     ]),
8: M('Admitir al donante', 'Personal de colecta', 'Formulario de admisión', 'Control de admisión',
     'Buscar persona y cita del día', 'Identidad, cita del día y prefiltro válidos',
     'Verificar identidad y confirmar asistencia', 'Persona admitida para evaluación', [
         E('Persona', 'documento|nombre', 'Identificar candidato', 'buscarPersona(documento)'),
         E('Cita de donación', 'fecha|estado|prefiltro', 'Conservar asistencia y admisión', 'consultarCitaDelDia(persona)', 'confirmarAdmision(cita)'),
     ]),
9: M('Registrar refrigerio e incentivos', 'Personal de colecta', 'Registro de refrigerio', 'Gestor de incentivos',
     'Consultar extracción y entrega', 'Extracción existente y transición de entrega permitida',
     'Indicar incentivo y estado real de entrega', 'Entrega pendiente o confirmada sin duplicación', [
         E('Extracción de donación', 'persona|fecha', 'Acreditar colecta realizada', 'consultarExtraccion(persona)'),
         E('Entrega de incentivo', 'incentivo|estado|fecha de entrega', 'Conservar entrega real', 'consultarEntrega(extraccion)', 'guardarEntrega(estado)'),
     ]),
10: M('Realizar triaje y dictamen', 'Médico de triaje', 'Formulario de triaje', 'Control de triaje',
      'Seleccionar candidato admitido', 'Profesional autorizado, cita vigente y parámetros coherentes',
      'Registrar mediciones y dictamen de aptitud', 'Evaluación guardada con dictamen', [
          E('Cita de donación', 'persona|fecha|admisión', 'Acreditar admisión vigente', 'comprobarAdmision(persona)'),
          E('Diferimiento', 'tipo|inicio|fin', 'Conservar restricciones', 'consultarRestricciones(persona)'),
          E('Triaje clínico', 'peso|presión|hemoglobina|temperatura|dictamen', 'Conservar evaluación profesional', 'consultarEvaluacion(cita)', 'guardarDictamen(mediciones, dictamen)'),
      ]),
11: M('Registrar diferimiento', 'Médico de triaje', 'Formulario de diferimiento', 'Gestor de diferimientos',
      'Seleccionar persona y evaluación de origen', 'Un único origen; motivo y duración válidos',
      'Indicar tipo, motivo, duración y comunicación real', 'Restricción y comunicación registradas', [
          E('Evaluación de origen', 'tipo de evaluación|persona|resultado', 'Identificar único origen clínico', 'comprobarOrigen(evaluacion)'),
          E('Diferimiento', 'tipo|motivo|inicio|fin|comunicación', 'Conservar restricción y comunicación', 'consultarDiferimiento(persona)', 'guardarDiferimiento(datos)'),
          E('Cita de donación', 'fecha|estado', 'Evitar citas incompatibles', 'buscarCitasIncompatibles(persona)', 'cancelarCitasIncompatibles(persona)'),
      ]),
12: M('Registrar consentimiento y colecta', 'Personal de colecta', 'Formulario de colecta', 'Control de colecta',
      'Seleccionar persona y triaje vigente', 'Triaje apto, descanso cumplido, consentimiento y volumen válidos',
      'Recabar consentimiento y registrar colecta de 300 a 450 ml', 'Colecta guardada y bolsa madre en cuarentena', [
          E('Triaje clínico', 'fecha|dictamen', 'Acreditar aptitud vigente', 'comprobarAptitud(persona)'),
          E('Consentimiento informado', 'persona|declaración|fecha', 'Conservar consentimiento expreso', 'comprobarDeclaracion(persona)', 'registrarConsentimiento(declaracion)'),
          E('Extracción de donación', 'fecha|volumen|brazo|modalidad', 'Conservar colecta realizada', 'consultarColectaPrevia(persona)', 'registrarExtraccion(datos)'),
          E('Unidad de sangre total', 'código|grupo|estado', 'Conservar trazabilidad de bolsa madre', None, 'registrarMadreEnCuarentena(extraccion)'),
      ]),
13: M('Registrar serología y liberar conjuntamente', 'Bioquímico integral', 'Registro de serología', 'Control de liberación',
      'Seleccionar madre y registrar panel serológico', 'Panel y dictamen válidos para la madre seleccionada',
      'Confirmar resultados serológicos', 'Análisis guardado; liberación requiere solicitud expresa', [
          E('Unidad de sangre total', 'código|grupo|estado', 'Conservar estado de liberación', 'consultarMadre(codigo)'),
          E('Análisis serológico', 'panel|dictamen|aprobación', 'Conservar evaluación serológica', 'consultarSerologia(madre)', 'guardarSerologia(panel, dictamen)'),
          E('Análisis inmunohematológico', 'ABO|Rh|dictamen|aprobación', 'Conservar evaluación de grupo', 'consultarInmunohematologia(madre)'),
      ]),
14: M('Registrar inmunohematología y corregir grupo', 'Bioquímico integral', 'Registro de inmunohematología', 'Control de inmunohematología',
      'Seleccionar madre y análisis', 'Resultados coherentes y operador autorizado para la operación',
      'Registrar ABO, Rh, Coombs y anticuerpos', 'Análisis guardado y concordancia comprobada', [
          E('Unidad de sangre total', 'grupo|estado|entrega', 'Controlar concordancia y cuarentena', 'consultarMadre(codigo)'),
          E('Análisis inmunohematológico', 'ABO|Rh|Coombs|anticuerpos|dictamen', 'Conservar determinación de grupo', 'consultarAnalisis(madre)', 'guardarAnalisis(resultados)'),
          E('Reserva sanguínea', 'unidad|grupo requerido|estado', 'Conservar compatibilidad de reservas', 'consultarReservas(madre)'),
      ]),
15: M('Fraccionar y conservar componentes', 'Técnico de logística', 'Registro de fraccionamiento', 'Control de conservación',
      'Seleccionar madre y componentes a obtener', 'Ventana de fraccionamiento, volumen y conservación válidos',
      'Registrar volúmenes y condiciones de custodia', 'Componentes y custodia registrados', [
          E('Unidad de sangre total', 'fecha de extracción|volumen|estado', 'Determinar origen y volumen disponible', 'consultarOrigen(madre)'),
          E('Protocolo de conservación', 'temperatura|días|agitación', 'Definir condiciones por componente', 'consultarProtocolo(tipo)'),
          E('Ubicación de almacén', 'capacidad|temperatura|agitación', 'Controlar condiciones y capacidad', 'comprobarUbicacion(ubicacion)'),
          E('Componente sanguíneo', 'tipo|volumen|caducidad|custodia', 'Conservar trazabilidad del componente', None, 'registrarComponentesYCustodia(datos)'),
      ]),
21: M('Gestionar programación autóloga', 'Médico solicitante', 'Formulario de programa autólogo', 'Gestor de programas autólogos',
      'Solicitar programa con indicación médica', 'Profesional vinculado e indicación completa',
      'Registrar referencia y fecha de cirugía', 'Programa pendiente de revisión biológica', [
          E('Receptor', 'persona|referencia clínica', 'Identificar receptor del programa', 'consultarReceptor(persona)'),
          E('Programa autólogo', 'indicación|cirugía|estado|versión', 'Controlar estado y exclusividad', 'consultarPrograma(receptor)', 'guardarProgramaPendiente(datos)'),
          E('Historial de programa', 'versión|actor|fecha|cambio', 'Conservar versiones y revisión', 'consultarVersionActual(programa)', 'registrarVersion(programa)'),
      ]),
22: M('Gestionar obligaciones y cobros', 'Administrador', 'Gestión de finanzas', 'Control financiero',
      'Solicitar Checkout para una deuda', 'Administrador autorizado, deuda en BOB y saldo pendiente',
      'Confirmar importe y abrir Checkout', 'Checkout iniciado; cobro pendiente de webhook válido', [
          E('Deuda financiera', 'importe|moneda|saldo', 'Conservar obligación y saldo', 'consultarSaldo(deuda)'),
          E('Intento de cobro', 'clave idempotente|sesión|estado', 'Conservar intento sin duplicar cobros', 'consultarIntento(deuda)', 'registrarIntento(deuda, importe)'),
          E('Pago confirmado', 'referencia|importe|moneda|fecha', 'Conservar cobro verificado', None),
      ]),
23: M('Consultar reportes estáticos', 'Administrador', 'Consulta de reportes', 'Gestor de reportes',
      'Solicitar catálogo de plantillas autorizadas', 'Plantilla, rol y parámetros permitidos',
      'Seleccionar plantilla, período y filtros', 'Filas y totales reales; exportación disponible', [
          E('Plantilla de reporte', 'nombre|fuente|parámetros|roles', 'Definir una consulta preestablecida', 'consultarPlantilla(plantilla)'),
          E('Fuente de información', 'dominio|campos permitidos', 'Aportar datos persistidos del dominio', 'consultarDatos(filtros)'),
      ]),
24: M('Construir consultas dinámicas', 'Administrador', 'Constructor de consultas', 'Control de consultas',
      'Solicitar fuentes y campos autorizados', 'Fuente, dimensiones, métricas y límites permitidos para el rol',
      'Elegir fuente, dimensiones, métricas y filtros', 'Resultado agregado y exportación autorizada', [
          E('Catálogo de consulta', 'fuentes|dimensiones|métricas|roles', 'Definir combinaciones permitidas', 'obtenerCamposPermitidos(rol)'),
          E('Fuente de información', 'dominio|datos persistidos', 'Aportar datos consultables por dominio', 'consultarAgregados(criterios)'),
      ]),
}

PACKAGES = {
    'Seguridad y auditoría': [1, 2, 3], 'Donantes y atención': [5, 6, 8, 9],
    'Agenda y programas autólogos': [7, 21], 'Evaluación y colecta': [10, 11, 12],
    'Laboratorio': [13, 14], 'Inventario y conservación': [4, 15],
    'Finanzas': [22], 'Reportes y consultas': [23, 24],
}

OPERATIONS = {
    1: 'iniciarSesion(credenciales)', 2: 'gestionarCuenta(datos)',
    3: 'consultarBitacora(filtros)', 4: 'consultarStock(criterios)',
    5: 'consultarCarnet(persona)', 6: 'guardarPrefiltro(respuestas, version)',
    7: 'confirmarCita(turno, prefiltro)', 8: 'admitirPersona(persona, cita)',
    9: 'registrarEntrega(extraccion, estado)', 10: 'registrarTriaje(datos)',
    11: 'registrarDiferimiento(datos)', 12: 'registrarColecta(datos, consentimiento)',
    13: 'registrarSerologia(panel, dictamen)', 14: 'registrarInmunohematologia(resultados)',
    15: 'registrarFraccionamiento(datos)', 21: 'indicarProgramaAutologo(datos)',
    22: 'iniciarCheckout(deuda, importe)', 23: 'consultarReporte(plantilla, filtros)',
    24: 'ejecutarConsulta(criterios)',
}
