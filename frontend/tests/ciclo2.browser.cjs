// Respuestas de API controladas; no contacta Supabase.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
let browser;
before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
});
after(async () => {
  await browser?.close();
});

const catalog = () => ({
  versioncatalogo: "synthetic-version",
  requisitos: [
    { idrequisito: 1, nombrerequisito: "Requisito sintético A" },
    { idrequisito: 2, nombrerequisito: "Requisito sintético B" },
  ],
  personas: [
    { idpersona: 2, ci: "TEST", nombres: "Paciente", apellidos: "Prueba" },
  ],
  turnos: [
    {
      idturno: 1,
      inicio: "2026-11-02T12:00:00Z",
      fin: "2026-11-02T12:15:00Z",
      cupo: 1,
      disponibles: 1,
    },
  ],
  citas: [],
  paginacion: { pagina: 1, total: 0, tamano: 50 },
  personas_paginacion: { pagina: 1, total: 1, tamano: 50 },
  turnos_paginacion: { pagina: 1, total: 1, tamano: 50 },
});
async function open(
  handler,
  width = 390,
  role = "ADMIN",
  tab = "Citas y recepción",
) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  await context.addInitScript((role) => {
    const s = {
      activeRole: role,
      role,
      usuarioId: 1,
      nombreCompleto: "Prueba",
      token: "synthetic-only",
      rolesDisponibles: [{ id: 1, codigo: role, nombre: role }],
    };
    sessionStorage.setItem("hemovida_live_session", JSON.stringify(s));
  }, role);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const result =
      url.pathname === "/api/clinica/operaciones/"
        ? {
            body: {
              personas: [],
              citas: [],
              triajes: [],
              diferimientos: [],
              madres: [],
              componentes: [],
              protocolos: [],
            },
          }
        : await handler(url, route.request());
    assert.ok(result, `Solicitud inesperada ${url.pathname}`);
    await route.fulfill({
      status: result.status || 200,
      contentType: result.type || "application/json",
      body: result.raw ?? JSON.stringify(result.body),
    });
  });
  await page.goto(process.env.HEMOVIDA_UI_URL || "http://127.0.0.1:3000/");
  if (tab) await page.getByRole("button", { name: tab, exact: true }).click();
  return { page, errors, close: () => context.close() };
}

test("CU06/CU07 conserva respuestas al fallar y muestra prefiltro pendiente sin afirmar cita confirmada", async () => {
  const data = catalog();
  let attempts = 0;
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/agenda/catalogo/") return { body: data };
    if (url.pathname === "/api/agenda/citas/") {
      const body = req.postDataJSON();
      attempts++;
      assert.equal(body.idpersona, 2);
      assert.equal(body.versioncatalogo, "synthetic-version");
      assert.equal(body.tipoatencion, "Donacion");
      assert.deepEqual(body.respuestas, [
        { idrequisito: 1, cumple: true },
        { idrequisito: 2, cumple: false },
      ]);
      if (attempts === 1)
        return {
          status: 400,
          body: { detail: "El cuestionario cambió. Actualiza." },
        };
      data.citas = [
        {
          idcita: 10,
          idpersona: 2,
          ci: "TEST",
          nombres: "Paciente",
          apellidos: "Prueba",
          fechahoraprogramada: "2026-11-02T12:00:00",
          tipoatencion: "Donacion",
          estadocita: "Pendiente",
          prefiltroaprobado: false,
          asistenciaconfirmada: false,
          respuestas: body.respuestas,
          requisitos_registrados: data.requisitos,
        },
      ];
      return {
        body: {
          mensaje:
            "Respuestas guardadas. La cita no fue confirmada; consulta al personal para evaluación.",
        },
      };
    }
  });
  try {
    const p = ui.page;
    const f = p
      .locator("form")
      .filter({
        has: p.getByRole("heading", {
          name: "Solicitar atención",
          exact: true,
        }),
      });
    await f.getByLabel("Postulante", { exact: true }).selectOption("2");
    await f.getByLabel("Tipo de atención").selectOption("Donacion");
    await f.getByLabel("Turno disponible").selectOption("1");
    await f
      .getByRole("group", { name: "Requisito sintético A", exact: true })
      .getByLabel("Cumplo", { exact: true })
      .check();
    await f
      .getByRole("group", { name: "Requisito sintético B", exact: true })
      .getByLabel("No cumplo", { exact: true })
      .check();
    await f
      .getByRole("button", { name: "Guardar prefiltro y solicitar cita" })
      .click();
    await p.getByRole("alert").waitFor();
    assert.equal(
      await f
        .getByRole("group", { name: "Requisito sintético B", exact: true })
        .getByLabel("No cumplo", { exact: true })
        .isChecked(),
      true,
    );
    await f
      .getByRole("button", { name: "Guardar prefiltro y solicitar cita" })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "La cita no fue confirmada" })
      .waitFor();
    await p.getByText("Donacion · Pendiente", { exact: false }).waitFor();
    await p.getByText("Ver prefiltro registrado").click();
    await p
      .getByText("Requisito sintético B: No cumple", { exact: true })
      .waitFor();
    await p.evaluate(() => document.fonts.ready);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});

test("ADMIN publica el día seleccionado sin enviar horarios ni cupos inventados", async () => {
  let published = false;
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/agenda/catalogo/") return { body: catalog() };
    if (url.pathname === "/api/agenda/turnos/") {
      assert.deepEqual(req.postDataJSON(), { fecha: "2026-11-02" });
      published = true;
      return {
        body: {
          mensaje:
            "Agenda publicada: 32 turnos nuevos de 15 minutos. Un cupo por turno.",
        },
      };
    }
  }, 1280);
  try {
    const f = ui.page
      .locator("form")
      .filter({
        has: ui.page.getByRole("heading", {
          name: "Publicar agenda del día",
          exact: true,
        }),
      });
    await f
      .getByLabel("Fecha de atención (lunes a viernes)")
      .fill("2026-11-02");
    await f.getByRole("button").click();
    await ui.page
      .getByRole("status")
      .filter({ hasText: "32 turnos nuevos" })
      .waitFor();
    assert.equal(published, true);
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});

test("CU09 guarda refrigerio no entregado como false y confirma solo después de la entrega", async () => {
  const row = {
    idextraccion: 1,
    nombres: "Paciente",
    apellidos: "Prueba",
    idincentivo: null,
    tipoarticulo: null,
    refrigerioentregado: null,
  };
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/agenda/catalogo/") return { body: catalog() };
    if (url.pathname === "/api/agenda/incentivos/" && req.method() === "GET")
      return { body: [row] };
    if (url.pathname === "/api/agenda/incentivos/") {
      const body = req.postDataJSON();
      assert.equal(body.refrigerioentregado, false);
      Object.assign(row, {
        idincentivo: 1,
        tipoarticulo: body.tipoarticulo,
        refrigerioentregado: false,
      });
      return { body: row };
    }
    if (url.pathname === "/api/agenda/incentivos/1/confirmar-refrigerio/") {
      assert.deepEqual(req.postDataJSON(), { confirmada: true });
      row.refrigerioentregado = true;
      return { body: row };
    }
  });
  try {
    const p = ui.page;
    await p
      .getByRole("button", { name: "Refrigerio e incentivos", exact: true })
      .click();
    const f = p
      .locator("form")
      .filter({
        has: p.getByRole("heading", {
          name: "Registrar entrega postcolecta",
          exact: true,
        }),
      });
    await f.getByLabel("Extracción sin entrega registrada").selectOption("1");
    await f
      .getByLabel("Artículo realmente entregado (o indicar Sin artículo)")
      .fill("Sin artículo");
    await f.getByRole("button").click();
    await p
      .getByText("Sin artículo · Refrigerio pendiente de entrega", {
        exact: true,
      })
      .waitFor();
    p.on("dialog", (d) => d.accept());
    await p
      .getByRole("button", {
        name: "Confirmar refrigerio entregado #1",
        exact: true,
      })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "Refrigerio entregado y confirmado" })
      .waitFor();
    await p
      .getByText("Sin artículo · Refrigerio entregado", { exact: true })
      .waitFor();
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});

test("El borrador incompleto guarda solo respuestas contestadas y recupera el estado del servidor", async () => {
  let draft = null;
  const data = catalog();
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/agenda/catalogo/") return { body: data };
    if (url.pathname === "/api/agenda/borrador/" && req.method() === "POST") {
      draft = req.postDataJSON();
      assert.equal(draft.respuestas.length, 1);
      assert.equal(draft.respuestas[0].cumple, true);
      return {
        body: {
          mensaje: "Borrador guardado. No confirma una cita ni reserva cupo.",
        },
      };
    }
    if (url.pathname === "/api/agenda/borrador/") return { body: draft };
  });
  try {
    const p = ui.page;
    const f = p
      .locator("form")
      .filter({
        has: p.getByRole("heading", {
          name: "Solicitar atención",
          exact: true,
        }),
      });
    await f.getByLabel("Postulante", { exact: true }).selectOption("2");
    const a = f.getByRole("group", {
      name: "Requisito sintético A",
      exact: true,
    });
    await a.getByLabel("Cumplo", { exact: true }).check();
    await f
      .getByRole("button", { name: "Guardar borrador incompleto", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "No confirma una cita" })
      .waitFor();
    await a.getByLabel("No cumplo", { exact: true }).check();
    await f
      .getByRole("button", { name: "Recuperar borrador guardado", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "Borrador recuperado" })
      .waitFor();
    assert.equal(
      await a.getByLabel("Cumplo", { exact: true }).isChecked(),
      true,
    );
    assert.equal(
      await f
        .getByRole("group", { name: "Requisito sintético B", exact: true })
        .getByRole("radio", { checked: true })
        .count(),
      0,
    );
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});

test("BIOQ revisa CU21 con confirmación, conserva el motivo ante un fallo y no afirma liberar unidades", async () => {
  let attempts = 0;
  const program = {
    idprograma: 1,
    idreceptor: 2,
    ci: "TEST",
    nombres: "Paciente",
    apellidos: "Prueba",
    fechacirugia: "2026-11-20",
    indicacion: "Indicación sintética de prueba",
    referenciamedica: "ORD-TEST",
    estado: "PendienteRevision",
    version: 1,
    colectas: 0,
  };
  const ui = await open(
    async (url, req) => {
      if (url.pathname === "/api/agenda/programas/")
        return { body: { programas: [program], receptores: [] } };
      if (url.pathname === "/api/agenda/programas/1/revision/") {
        const d = req.postDataJSON();
        assert.equal(d.version, 1);
        assert.equal(d.confirmada, true);
        assert.equal(d.accion, "Aprobar");
        if (++attempts === 1)
          return {
            status: 400,
            body: { detail: "Revisa la fecha quirúrgica." },
          };
        program.estado = "Aprobada";
        program.version = 2;
        return { body: program };
      }
    },
    390,
    "BIOQ_INTEGRAL",
    "Programación autóloga",
  );
  try {
    const p = ui.page;
    await p.getByLabel("Programación", { exact: true }).selectOption("1");
    const f = p
      .locator("form")
      .filter({
        has: p.getByRole("heading", {
          name: "Revisión bioquímica de programación",
          exact: true,
        }),
      });
    await f.getByLabel("Decisión profesional").selectOption("Aprobar");
    await f
      .getByLabel("Fundamento de la revisión")
      .fill("Orden y paciente contrastados");
    await f
      .getByLabel("Verifiqué indicación, paciente y unidades vinculadas")
      .check();
    await f.getByRole("button").click();
    await f.getByRole("alert").waitFor();
    assert.equal(
      await f.getByLabel("Fundamento de la revisión").inputValue(),
      "Orden y paciente contrastados",
    );
    await f.getByRole("button").click();
    await p
      .getByRole("status")
      .filter({ hasText: "Programación actualizada" })
      .waitFor();
    await p
      .getByRole("heading", { name: "Paciente Prueba · Aprobada", exact: true })
      .waitFor();
    assert.deepEqual(ui.errors, []);
    await p.evaluate(() => document.fonts.ready);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  } finally {
    await ui.close();
  }
});

test("CU23 ofrece plantillas fijas autorizadas, descarga PDF y borra resultados cuando falla", async () => {
  let fail = false;
  const ui = await open(
    async (url) => {
      if (url.pathname === "/api/reportes/estaticos/catalogo/")
        return {
          body: {
            inventario_actual: {
              titulo: "Inventario actual por componente",
              periodo: false,
              columnas: ["dimension", "cantidad"],
            },
          },
        };
      if (url.pathname === "/api/reportes/estaticos/informe/") {
        assert.equal(url.searchParams.get("plantilla"), "inventario_actual");
        assert.equal(url.searchParams.has("dimension"), false);
        if (url.searchParams.get("formato") === "pdf")
          return { raw: "%PDF-1.4\n%%EOF", type: "application/pdf" };
        if (fail)
          return {
            status: 500,
            body: { detail: "Error de generación de prueba" },
          };
        return {
          body: {
            titulo: "Inventario actual por componente",
            actualizado: "2026-10-31T16:00:00Z",
            columnas: ["dimension", "cantidad"],
            filas: [{ dimension: "Plasma", cantidad: 2 }],
            totales: { cantidad: 2 },
            criterios: { stock: "Estado actual" },
          },
        };
      }
    },
    1280,
    "TEC_LOGISTICA",
    "Informes de gestión",
  );
  try {
    const p = ui.page;
    await p
      .getByRole("button", { name: "Consultar informe", exact: true })
      .click();
    await p.getByRole("cell", { name: "Plasma", exact: true }).waitFor();
    assert.equal(await p.getByLabel("Desde", { exact: true }).count(), 0);
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "Descargar PDF", exact: true }).click();
    assert.equal(
      (await download).suggestedFilename(),
      "hemovida-inventario_actual.pdf",
    );
    fail = true;
    await p
      .getByRole("button", { name: "Consultar informe", exact: true })
      .click();
    await p.getByRole("alert").waitFor();
    assert.equal(await p.getByRole("table").count(), 0);
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});


test("La guía muestra el recorrido de los dos ciclos sin ejecutar operaciones", async () => {
 const ui=await open(async()=>({body:{}}),390,'ADMIN','Guía de recorrido');
 try {
  await ui.page.getByRole('heading',{name:'Guía de recorrido',exact:true}).waitFor();
  await ui.page.getByRole('heading',{name:'Ciclo 2 desde la cita hasta la atención'}).waitFor();
  await ui.page.getByRole('heading',{name:'Ciclo 3 desde el laboratorio hasta los informes'}).waitFor();
  assert.deepEqual(ui.errors,[]);
 } finally {await ui.close();}
});
