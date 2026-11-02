/* Capturas reales del frontend. No simula respuestas de API ni guarda operaciones clínicas. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../../frontend/node_modules/playwright');
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = path.resolve(process.env.HEMOVIDA_CAPTURE_OUTPUT || path.join(ROOT, 'output/capturas_frontend_' + new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Caracas' })));
const URL = process.env.HEMOVIDA_UI_URL || 'http://127.0.0.1:3000/';
const CREDENTIALS = path.resolve(process.env.HEMOVIDA_CAPTURE_CREDENTIALS || path.join(ROOT, '.venv/demo_integral/supabase/credenciales.json'));
let codeRevision = 'sin Git';
try { codeRevision = execFileSync('git', ['rev-parse','HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
const args = process.argv.slice(2);
const only = args.includes('--perfil') ? args[args.indexOf('--perfil') + 1] : null;
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS, 'utf8').replace(/^\uFEFF/, ''));
const manifestPath = path.join(OUTPUT, 'indice.json');
const manifest = only && fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const failures = [];
const apiErrors = [];
const blocked = [];
let role = 'PUBLICO';
fs.mkdirSync(OUTPUT, { recursive: true });
const cssSize = { width: 1440, height: 1000 };
let browser;
const pendingApi = new WeakMap();
function safeError(error) {
  let message = error.message || String(error);
  for (const account of Object.values(credentials)) if (account.clave) message = message.split(account.clave).join('[CLAVE OMITIDA]');
  return message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[TOKEN OMITIDO]');
}
function heading(page, title) { return page.getByRole('heading', { name: title, exact: true }); }
function form(page, title) { return page.locator('form').filter({ has: heading(page, title) }); }
async function settle(page) {
  await page.waitForTimeout(250);
  const deadline = Date.now() + 120000;
  let idleSince = 0;
  while (Date.now() < deadline) {
    if (!pendingApi.get(page)?.size) {
      if (!idleSince) idleSince = Date.now();
      if (Date.now() - idleSince >= 700) break;
    } else idleSince = 0;
    await page.waitForTimeout(200);
  }
  if (pendingApi.get(page)?.size) throw new Error('La API no terminó de cargar; no se captura una pantalla incompleta.');
  await page.evaluate(async () => { await document.fonts.ready; });
  const blockedNow = await page.evaluate(() => window.__hemovidaCaptureBlocked || []);
  if (blockedNow.length) { blocked.push(...blockedNow); throw new Error('Se evitó una escritura de negocio durante las capturas.'); }
  await page.waitForTimeout(300);
}
async function capture(page, cycle, cu, slug, title, locator = null, note = '') {
  await settle(page);
  const relative = `ciclo_${cycle}/CU${String(cu).padStart(2, '0')}_${slug}.png`;
  const destination = path.join(OUTPUT, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (locator) {
    await locator.waitFor({ state: 'visible', timeout: 45000 });
    const box = await locator.boundingBox();
    const height = Math.max(1000, Math.min(6000, Math.ceil((box?.height || 800) + 300)));
    await page.setViewportSize({ width: cssSize.width, height });
    await locator.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -130));
    await locator.screenshot({ path: destination, animations: 'disabled', timeout: 45000 });
    await page.setViewportSize(cssSize);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: destination, animations: 'disabled' });
  }
  const info = {
    ciclo: cycle, caso: `CU${String(cu).padStart(2, '0')}`, titulo: title,
    perfil: role, archivo: relative, origen: URL,
    entorno: 'Frontend y backend locales; PostgreSQL de Supabase',
    revision_codigo: codeRevision,
    fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Caracas' }) + ' America/Caracas',
    alcance: locator ? 'Recorte nativo del componente o formulario real' : 'Ventana del navegador',
    observacion: note || 'Pantalla consultada sin confirmar operaciones de negocio.'
  };
  const old = manifest.findIndex(m => m.archivo === relative);
  if (old >= 0) manifest[old] = info; else manifest.push(info);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('OK ' + relative);
}
async function task(name, work) {
  try { await work(); } catch (error) {
    failures.push({ tarea: name, perfil: role, error: safeError(error).split('\n').slice(0, 4).join(' ') });
    console.error('PENDIENTE ' + name + ': ' + safeError(error).split('\n')[0]);
  }
}
async function openPage(key) {
  const context = await browser.newContext({ viewport: cssSize, deviceScaleFactor: 1.5, locale: 'es-BO', timezoneId: 'America/Caracas' });
  await context.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.__hemovidaCaptureBlocked = [];
    window.fetch = (input, init) => {
      const url = new window.URL(typeof input === 'string' ? input : input.url || String(input), location.href);
      const method = (init?.method || input?.method || 'GET').toUpperCase();
      const allowed = ['GET','HEAD','OPTIONS'].includes(method) ||
        (method === 'POST' && /\/api\/(auth\/login|clinica\/perfil)\/$/.test(url.pathname));
      if (url.pathname.startsWith('/api/') && !allowed) {
        window.__hemovidaCaptureBlocked.push({ endpoint:url.pathname, metodo:method });
        return Promise.reject(new Error('La captura no permite guardar operaciones de negocio.'));
      }
      return realFetch(input, init);
    };
  });
  const page = await context.newPage();
  const pending = new Set();
  pendingApi.set(page, pending);
  page.on('request', request => { if(request.url().includes('/api/')) pending.add(request); });
  page.on('requestfinished', request => pending.delete(request));
  page.on('requestfailed', request => pending.delete(request));
  page.setDefaultTimeout(30000);
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 400)
      apiErrors.push({ perfil: role, ruta: new globalThis.URL(response.url()).pathname, status: response.status() });
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await settle(page);
  if (key) {
    const account = credentials[key];
    if (!account) throw new Error('No existe el perfil DEMO solicitado en el archivo privado.');
    const loginResponse = await context.request.post(new globalThis.URL('/api/auth/login/', URL).href, {
      data: { username: account.usuario, password: account.clave }, timeout: 60000
    });
    if (loginResponse.status() !== 200) {
      const detail = await loginResponse.json().catch(() => ({}));
      throw new Error('Inicio de sesión DEMO HTTP ' + loginResponse.status() + ': ' + (detail.detail || 'no aceptado') + '. No se reintenta la contraseña.');
    }
    const result = await loginResponse.json();
    const initialToken = result.token || result.tokens?.access;
    const selectedResponse = await context.request.post(new globalThis.URL('/api/clinica/perfil/', URL).href, {
      headers: { Authorization: 'Bearer ' + initialToken }, data: { rolActivo: account.rol }, timeout: 60000
    });
    if (!selectedResponse.ok()) throw new Error('El servidor rechazó seleccionar el rol asignado.');
    const tokens = await selectedResponse.json();
    const session = {
      activeRole: account.rol, role: account.rol, usuarioId: result.usuario.idUsuario,
      nombreCompleto: result.nombreCompleto, username: result.usuario.username,
      email: result.usuario.email, persona: result.usuario.persona,
      rolesDisponibles: result.rolesDisponibles, token: tokens.access
    };
    await page.evaluate(session => {
      sessionStorage.setItem('hemovida_live_session', JSON.stringify(session));
      sessionStorage.setItem('hemovida_jwt_token', session.token);
    }, session);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Módulos' }).waitFor({ timeout: 60000 });
    role = account.rol;
    await settle(page);
  } else role = 'PUBLICO';
  return { page, context };
}
async function nav(page, title) {
  await page.getByRole('navigation', { name: 'Módulos' }).getByRole('button', { name: title, exact: true }).click();
  await settle(page);
}
async function selectDemo(select, pattern = /DEMO-C23|DEMO-C3|demo/i) {
  const options = await select.locator('option').evaluateAll(els => els.map(el => ({ value: el.value, text: el.textContent, disabled: el.disabled })));
  const option = options.find(o => o.value && !o.disabled && pattern.test(o.text));
  if (!option) throw new Error('No hay una opción DEMO adecuada en el selector.');
  await select.selectOption(option.value);
  return option;
}
async function clinical(page, cu, title, slug = 'formulario') {
  await capture(page, 3, cu, slug, title, form(page, title));
}
async function publicScreens() {
  const { page, context } = await openPage();
  await capture(page, 1, 1, '01_portal_publico', 'Portal público HemoVida');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).first().click();
  await capture(page, 1, 1, '02_acceso', 'Inicio de sesión', page.locator('#account-selector-modal'));
  await page.getByRole('button', { name: /Olvidaste tu contraseña/ }).click();
  await capture(page, 1, 1, '03_recuperacion', 'Recuperación de contraseña por correo', page.locator('#account-selector-modal'), 'Formulario vacío; no se envió ningún correo.');
  await page.locator('#tab-mode-login').click();
  await page.getByRole('button', { name: 'Crear Nueva Cuenta', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 2400 });
  await capture(page, 1, 2, '01_autorregistro', 'Autorregistro del candidato', page.locator('#account-selector-modal'), 'Formulario real sin enviar ni crear cuentas.');
  await context.close();
}
async function adminScreens() {
  const { page, context } = await openPage('admin');
  await capture(page, 1, 1, '04_espacio_administrativo', 'Acceso con perfil de administración');
  await nav(page, 'Personal');
  await task('Alta de personal', () => capture(page, 1, 2, '02_alta_personal', 'Alta de personal por ADMIN', form(page, 'Alta de personal')));
  await task('Desbloqueo de cuentas', () => capture(page, 1, 2, '03_estado_desbloqueo', 'Estado y desbloqueo de cuenta', form(page, 'Estado y desbloqueo de cuenta')));
  await task('Umbrales de stock', () => capture(page, 1, 4, '02_umbrales', 'Actualización de umbrales de inventario', form(page, 'Actualizar umbral registrado')));
  await nav(page, 'Auditoría');
  await page.getByLabel('Buscar', { exact: true }).fill('DEMO');
  await page.getByRole('button', { name: 'Filtrar eventos', exact: true }).click();
  await capture(page, 1, 3, '01_bitacora', 'Bitácora filtrada por DEMO');
  await nav(page, 'Inventario');
  await page.getByRole('heading', { name: 'Inventario y alertas', exact: true }).waitFor();
  await capture(page, 1, 4, '01_inventario_alertas', 'Inventario y alertas consultados');
  await nav(page, 'Citas y recepción');
  await task('Publicación de turnos', () => capture(page, 2, 7, '03_publicar_agenda', 'Publicar agenda del día', form(page, 'Publicar agenda del día')));
  await page.getByText('Administrar cierres y requisitos', { exact: true }).click();
  await task('Cierres de agenda', () => capture(page, 2, 7, '04_cierres', 'Cierre y reapertura de agenda', form(page, 'Cerrar o reabrir día de atención')));
  await nav(page, 'Finanzas');
  await form(page, 'Crear obligación financiera').waitFor({ timeout: 60000 });
  await capture(page, 3, 22, '01_finanzas', 'Finanzas y pagos en BOB');
  await capture(page, 3, 22, '02_obligacion', 'Registro de obligación financiera', form(page, 'Crear obligación financiera'));
  await capture(page, 3, 22, '03_cartera', 'Cuentas por cobrar', heading(page, 'Cuentas por cobrar').locator('..'));
  await capture(page, 3, 22, '04_abono', 'Formulario de abono administrativo', form(page, 'Registrar abono recibido'));
  if (await form(page, 'Crear pago por tarjeta en Stripe').count()) {
    await capture(page, 3, 22, '05_stripe', 'Creación de Checkout Stripe', form(page, 'Crear pago por tarjeta en Stripe'), 'Formulario real; no se creó sesión Checkout ni se efectuaron cargos.');
  } else failures.push({ tarea: 'Formulario Stripe', perfil: role, error: 'El backend no muestra Stripe configurado en este entorno.' });
  await nav(page, 'Informes de gestión');
  const report = page.getByLabel('Informe');
  await report.locator('option').first().waitFor({ state: 'attached', timeout: 60000 });
  const reportOptions = await report.locator('option').evaluateAll(els => els.map(e => ({ value: e.value, text: e.textContent })));
  const reportChoice = reportOptions.find(o => /inventario|stock/i.test(o.text)) || reportOptions[0];
  await report.selectOption(reportChoice.value);
  await page.getByRole('button', { name: 'Consultar informe', exact: true }).click();
  await page.getByRole('region', { name: 'Informe generado' }).waitFor({ timeout: 60000 });
  await capture(page, 2, 23, '01_informe_estatico', 'Informe de gestión consultado con datos PostgreSQL');
  await capture(page, 2, 23, '02_resultado', 'Resultado y exportaciones del informe', page.getByRole('region', { name: 'Informe generado' }));
  await nav(page, 'Consultas y KPIs');
  const source = page.getByLabel('Fuente', { exact: true });
  await source.selectOption('cartera');
  await page.getByRole('button', { name: 'Consultar indicadores', exact: true }).click();
  await heading(page, 'Resultados').waitFor({ timeout: 60000 });
  await capture(page, 3, 24, '01_consulta_dinamica', 'Consulta dinámica de cartera en BOB');
  await capture(page, 3, 24, '02_resultados', 'Resultados y exportaciones de la consulta', heading(page, 'Resultados').locator('..').locator('..'));
  await source.selectOption('stock');
  await page.getByRole('button', { name: 'Consultar indicadores', exact: true }).click();
  await heading(page, 'Resultados').waitFor({ timeout: 60000 });
  await capture(page, 3, 24, '03_inventario', 'Consulta dinámica de inventario y sus indicadores', page.locator('.reference-screen > section'));
  await context.close();
}
async function donorScreens() {
  const { page, context } = await openPage('donante');
  await capture(page, 1, 5, '01_espacio_donante', 'Espacio del donante DEMO');
  await nav(page, 'Carnet e historial');
  await page.getByRole('img', { name: 'QR del carnet registrado' }).waitFor({ timeout: 60000 });
  await capture(page, 1, 5, '02_carnet', 'Carnet digital y QR del donante DEMO');
  await capture(page, 1, 5, '03_historial', 'Historial de donaciones DEMO', heading(page, 'Historial de donaciones').locator('..'));
  await nav(page, 'Citas y prefiltro');
  await form(page, 'Solicitar atención').waitFor({ timeout: 60000 });
  await capture(page, 2, 6, '01_prefiltro', 'Cuestionario y prefiltro de requisitos', form(page, 'Solicitar atención'));
  const slot = page.getByLabel('Turno disponible');
  const options = await slot.locator('option').evaluateAll(els => els.filter(e => e.value && !e.disabled).map(e => e.value));
  if (options.length) await slot.selectOption(options[0]);
  await capture(page, 2, 7, '01_solicitud_cita', 'Solicitud de cita y turno disponible');
  await capture(page, 2, 7, '05_turno_seleccionado', 'Formulario de cita con un turno disponible seleccionado', form(page, 'Solicitar atención'), 'Turno seleccionado solo en el formulario; la cita no se envió ni se reservó cupo.');
  await capture(page, 2, 7, '02_mis_citas', 'Citas y solicitudes del donante', heading(page, 'Mis citas y solicitudes').locator('..'));
  await context.close();
}
async function collectionScreens() {
  const { page, context } = await openPage('colecta');
  await nav(page, 'Citas y recepción');
  await form(page, 'Solicitar atención').waitFor({ timeout: 60000 });
  await page.getByLabel('Buscar por CI, carnet o nombre', { exact: true }).fill('DEMO-C23');
  await page.getByRole('button', { name: 'Buscar en la agenda', exact: true }).click();
  await settle(page);
  await capture(page, 2, 8, '01_agenda_recepcion', 'Agenda y recepción de candidatos DEMO', heading(page, 'Agenda y solicitudes').locator('..'));
  await nav(page, 'Atención clínica');
  await form(page, 'Confirmar identidad y admisión').waitFor({ timeout: 60000 });
  await task('Seleccionar candidato DEMO para admisión', () => selectDemo(form(page, 'Confirmar identidad y admisión').getByLabel('Persona verificada'), /DEMO-C23-POSTULANTE/i));
  await capture(page, 2, 8, '02_admision', 'Validación de identidad y admisión', form(page, 'Confirmar identidad y admisión'));
  await clinical(page, 12, 'Consentimiento y colecta', '01_consentimiento_colecta');
  await clinical(page, 12, 'Colecta interrumpida', '02_incidencia_colecta');
  await nav(page, 'Refrigerio e incentivos');
  await form(page, 'Registrar entrega postcolecta').waitFor({ timeout: 60000 });
  await capture(page, 2, 9, '01_refrigerio', 'Registro de refrigerio e incentivos postcolecta');
  await capture(page, 2, 9, '02_formulario_entrega', 'Formulario de entrega postcolecta', form(page, 'Registrar entrega postcolecta'));
  const cards = page.locator('article').filter({ hasText: /DEMO|Demo/ });
  if (await cards.count()) await capture(page, 2, 9, '03_entrega_demo', 'Estado persistido de un incentivo DEMO', cards.first());
  await context.close();
}
async function medicalScreens() {
  const { page, context } = await openPage('medico');
  await nav(page, 'Atención clínica');
  await form(page, 'Evaluación y dictamen').waitFor({ timeout: 60000 });
  await task('Candidato de triaje DEMO', () => selectDemo(form(page, 'Evaluación y dictamen').getByLabel('Persona verificada'), /DEMO-C23-POSTULANTE/i));
  await capture(page, 3, 10, '01_triaje', 'Evaluación clínica con perfil médico');
  await clinical(page, 10, 'Evaluación y dictamen', '02_formulario_triaje');
  await clinical(page, 11, 'Diferimiento', '01_diferimiento');
  await clinical(page, 11, 'Confirmar comunicación al candidato', '02_comunicacion');
  await capture(page, 3, 11, '03_registros', 'Diferimientos persistidos', heading(page, 'Diferimientos registrados').locator('..'));
  await nav(page, 'Programación autóloga');
  await form(page, 'Registrar indicación autóloga').waitFor({ timeout: 60000 });
  await capture(page, 2, 21, '01_indicacion_medica', 'Indicación médica autóloga', form(page, 'Registrar indicación autóloga'));
  await context.close();
}
async function bioScreens() {
  const { page, context } = await openPage('bioquimico');
  await nav(page, 'Laboratorio');
  const mother = page.getByLabel('Bolsa madre');
  await mother.locator('option').nth(1).waitFor({ state: 'attached', timeout: 60000 });
  await selectDemo(mother, /DEMO-C23.*laboratorio/i);
  await form(page, 'Inmunoserología').waitFor({ timeout: 60000 });
  await capture(page, 3, 13, '01_laboratorio', 'Lote DEMO en laboratorio y liberación conjunta');
  await capture(page, 3, 13, '02_serologia', 'Resultados serológicos persistidos', form(page, 'Inmunoserología'));
  await capture(page, 3, 13, '03_liberacion_conjunta', 'Liberación bloqueada mientras falta un análisis', page.locator('.reference-screen > section'), 'Lote DEMO con serología registrada e inmunohematología pendiente; no se liberó el lote.');
  await selectDemo(mother, /DEMO-C23.*DONANTE/i);
  await settle(page);
  await form(page, 'Inmunohematología').waitFor({ timeout: 60000 });
  await capture(page, 3, 14, '01_inmunohematologia', 'Resultados inmunohematológicos persistidos del lote DEMO donante', form(page, 'Inmunohematología'));
  await capture(page, 3, 13, '04_lote_aprobado', 'Lote DEMO con ambos análisis registrados', page.locator('.reference-screen > section'), 'Estado real consultado; no se ejecutó liberación durante la captura.');
  const group = page.getByLabel('Grupo ABO', { exact: true });
  const value = await group.inputValue();
  await group.selectOption(value === 'A' ? 'O' : 'A');
  await page.getByLabel('Motivo de corrección ABO/Rh', { exact: true }).waitFor({ timeout: 30000 });
  await capture(page, 3, 14, '02_correccion', 'Formulario de corrección ABO/Rh por BIOQ', form(page, 'Inmunohematología'), 'Edición local sin guardar, para mostrar el campo obligatorio de motivo; no cambia resultados ni grupo en la BD.');
  await nav(page, 'Programación autóloga');
  const program = page.getByLabel('Programación', { exact: true });
  await program.locator('option').nth(1).waitFor({ state: 'attached', timeout: 60000 });
  await selectDemo(program, /DEMO-C23/i);
  await capture(page, 2, 21, '02_revision_programa', 'Revisión biológica del programa autólogo', form(page, 'Revisión bioquímica de programación'));
  await capture(page, 2, 21, '03_programacion', 'Programación autóloga y su estado real');
  await context.close();
}
async function logisticsScreens() {
  const { page, context } = await openPage('logistica');
  await nav(page, 'Atención clínica');
  await heading(page, 'Fraccionamiento').waitFor({ timeout: 60000 });
  await capture(page, 3, 15, '01_fraccionamiento', 'Fraccionamiento de bolsa madre', heading(page, 'Fraccionamiento').locator('..'));
  await clinical(page, 15, 'Traslado de custodia', '02_custodia');
  await clinical(page, 15, 'Registrar condiciones verificadas del equipo', '03_condiciones_equipo');
  await clinical(page, 15, 'Configurar conservación académica', '04_protocolo_conservacion');
  await nav(page, 'Inventario');
  await heading(page, 'Inventario y alertas').waitFor({ timeout: 60000 });
  await capture(page, 3, 15, '05_inventario', 'Inventario consultado con perfil de logística');
  await context.close();
}
function finish() {
  manifest.sort((a,b) => a.ciclo-b.ciclo || a.caso.localeCompare(b.caso) || a.archivo.localeCompare(b.archivo));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const quote = s => '"' + String(s).replaceAll('"','""') + '"';
  fs.writeFileSync(path.join(OUTPUT, 'indice.csv'), '\uFEFF' + ['Ciclo,Caso,Título,Perfil,Archivo,Observación', ...manifest.map(m => [m.ciclo,m.caso,m.titulo,m.perfil,m.archivo,m.observacion].map(quote).join(','))].join('\r\n'));
  fs.writeFileSync(path.join(OUTPUT,'galeria.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><title>Capturas reales HemoVida</title><style>body{font:16px Arial;margin:30px;max-width:1500px}article{border-top:1px solid #bbb;padding:25px 0}img{display:block;max-width:100%;max-height:900px;margin:15px 0}h2{font-size:21px}</style><h1>Capturas reales del frontend HemoVida</h1><p>Entorno local conectado a PostgreSQL de Supabase. Consultas de pantallas y formularios; no acreditan ejecución completa de cada caso.</p>'+manifest.map(m=>'<article><h2>'+escape(m.caso+' · '+m.titulo)+'</h2><p>Ciclo '+m.ciclo+' · Perfil '+escape(m.perfil)+' · '+escape(m.fecha)+'</p><p>'+escape(m.observacion)+'</p><a href="'+escape(m.archivo)+'"><img loading="lazy" src="'+escape(m.archivo)+'"></a></article>').join('')+'</html>');
  fs.writeFileSync(path.join(OUTPUT,'revision.json'), JSON.stringify({fallos:failures,errores_http:apiErrors,escrituras_bloqueadas:blocked,capturas:manifest.length,casos:[...new Set(manifest.map(m=>m.caso))].sort()},null,2));
  fs.writeFileSync(path.join(OUTPUT,'LEEME.md'), '# Capturas reales del frontend HemoVida\n\nAbre `galeria.html` o `indice.csv` para localizar las imágenes. Cada archivo PNG corresponde a una vista real de la aplicación local conectada al backend Django y PostgreSQL de Supabase. Se utilizaron perfiles académicos DEMO.\n\nLos recortes se tomaron directamente de componentes del navegador para facilitar su inserción en Word. No se retocaron textos ni se sustituyeron respuestas de la API. Los formularios no se enviaron; las consultas y los informes sí se obtuvieron del backend. Las imágenes no certifican aceptación integral ni despliegue. En CU14 se indica expresamente una edición del formulario sin guardar para visualizar el motivo de corrección.\n\nNo se crearon usuarios, citas, resultados, liberaciones, pagos ni cargos. El inicio de sesión y la selección de perfil sí se efectuaron contra la API real y pueden registrar auditoría de acceso. No se incluyen contraseñas ni tokens. Los datos de pantallas administrativas pueden incluir registros anteriores a los DEMO.\n\nLas imágenes no se insertaron automáticamente en el Word. El índice utiliza la distribución actual: ciclo 1 CU01–CU05; ciclo 2 CU06–CU09, CU21, CU23; ciclo 3 CU10–CU15, CU22, CU24.\n');
}
(async () => {
  browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const works = {publico:publicScreens,admin:adminScreens,donante:donorScreens,colecta:collectionScreens,medico:medicalScreens,bioquimico:bioScreens,logistica:logisticsScreens};
    if(only && !works[only]) throw new Error('Perfil no reconocido.');
    for(const [key,work] of Object.entries(works)) if(!only || only===key) await task('Capturas del perfil '+key,work);
  } finally { await browser.close(); finish(); }
  console.log('Capturas guardadas: '+manifest.length+'; casos cubiertos: '+new Set(manifest.map(m=>m.caso)).size+'; pendientes: '+failures.length);
  if(failures.length || blocked.length) process.exitCode=1;
})().catch(error=>{console.error(safeError(error));process.exitCode=1;});
