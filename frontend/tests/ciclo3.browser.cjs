// API controlada de pruebas: nunca escribe en Supabase ni contacta Stripe.
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
const session = {
  activeRole: "ADMIN",
  role: "ADMIN",
  usuarioId: 1,
  nombreCompleto: "Prueba local",
  username: "test",
  email: "test@example.test",
  token: "synthetic-ui-only",
  rolesDisponibles: [{ id: 1, codigo: "ADMIN", nombre: "Administrador" }],
  persona: { ci: "TEST", nombres: "Prueba" },
};
const clinical = {
  revision07: true,
  personas: [
    { idpersona: 2, ci: "PATIENT", nombres: "Paciente", apellidos: "Prueba" },
  ],
  citas: [],
  triajes: [],
  diferimientos: [],
  madres: [],
  componentes: [],
  autologas: [],
  incidencias: [],
  protocolos: [],
  grupos: [],
  ubicaciones: [],
};
async function open(handler, width = 1280) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    acceptDownloads: true,
  });
  await context.addInitScript((s) => {
    sessionStorage.setItem("hemovida_live_session", JSON.stringify(s));
    sessionStorage.setItem("hemovida_jwt_token", s.token);
  }, session);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    assert.equal(req.headers().authorization, "Bearer synthetic-ui-only");
    const response =
      url.pathname === "/api/clinica/operaciones/"
        ? { body: clinical }
        : await handler(url, req);
    if (!response)
      throw new Error("Solicitud inesperada de prueba: " + url.pathname);
    await route.fulfill({
      status: response.status || 200,
      contentType: response.type || "application/json",
      body:
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body),
    });
  });
  await page.goto(process.env.HEMOVIDA_UI_URL || "http://127.0.0.1:3000/");
  return { page, errors, close: () => context.close() };
}
function form(page, title) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
function finance() {
  return {
    moneda: "BOB",
    pais_cuenta: "US",
    stripe_configurado: true,
    solicitudes: [
      {
        idsolicitud: 1,
        numerosolicitud: "SOL-TEST",
        prioridadsolicitud: "Programada",
      },
    ],
    deudas: [
      {
        iddeuda: 1,
        saldopendiente: "100.00",
        moneda: "BOB",
        estado_actual: "Pendiente",
      },
    ],
    pagos: [],
    eventos: [],
    comprobantes: [],
  };
}
test("Un fallo de Checkout conserva el intento y no presenta un pago confirmado", async () => {
  const requests = [];
  const data = finance();
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/finanzas/catalogo/") return { body: data };
    if (url.pathname === "/api/finanzas/deudas/1/checkout/") {
      requests.push(req.postDataJSON());
      return requests.length === 1
        ? {
            status: 502,
            body: { detail: "Proveedor temporalmente no disponible" },
          }
        : {
            body: {
              idpago: 1,
              urlcheckout: "https://checkout.stripe.com/c/test",
            },
          };
    }
  });
  try {
    const p = ui.page;
    await p.getByRole("button", { name: "Finanzas", exact: true }).click();
    const f = form(p, "Crear pago por tarjeta en Stripe");
    await f.getByLabel("Obligación registrada").selectOption("1");
    await f.getByLabel("Importe a cobrar (BOB)").fill("25");
    await f.getByRole("button").click();
    await f.getByRole("alert").waitFor();
    assert.equal(
      await p
        .getByRole("link", { name: "Continuar en Stripe Checkout" })
        .count(),
      0,
    );
    await f.getByRole("button").click();
    await p
      .getByRole("link", { name: "Continuar en Stripe Checkout" })
      .waitFor();
    assert.equal(requests.length, 2);
    assert.equal(requests[0].idempotencia, requests[1].idempotencia);
    assert.equal(await p.getByText(/El saldo cambia únicamente/).count(), 1);
    assert.deepEqual(ui.errors, []);
    await p.screenshot({
      path: "../.venv/ciclo3-finanzas.png",
      fullPage: true,
    });
  } finally {
    await ui.close();
  }
});
test("Un abono rechazado conserva los datos y solo muestra éxito tras confirmación del backend", async () => {
  const data = finance();
  let count = 0;
  const ui = await open(async (url, req) => {
    if (url.pathname === "/api/finanzas/catalogo/") return { body: data };
    if (url.pathname === "/api/finanzas/deudas/1/abonos/") {
      count++;
      assert.equal(req.postDataJSON().referenciaexterna, "REF-LOCAL");
      if (count === 1)
        return { status: 400, body: { detail: "El abono excede el saldo." } };
      data.deudas[0].saldopendiente = "75.00";
      return { status: 201, body: { idpago: 1 } };
    }
  }, 390);
  try {
    const p = ui.page;
    await p.getByRole("button", { name: "Finanzas", exact: true }).click();
    const f = form(p, "Registrar abono recibido");
    await f.getByLabel("Obligación registrada").selectOption("1");
    await f.getByLabel("Importe recibido (BOB)").fill("150");
    await f.getByLabel("Método", { exact: true }).selectOption("Efectivo");
    await f.getByLabel("Referencia única del abono").fill("REF-LOCAL");
    await f.getByRole("button").click();
    await f.getByRole("alert").waitFor();
    assert.equal(
      await f.getByLabel("Referencia única del abono").inputValue(),
      "REF-LOCAL",
    );
    assert.equal(await p.getByRole("status").count(), 0);
    await f.getByLabel("Importe recibido (BOB)").fill("25");
    await f.getByRole("button").click();
    await p.getByRole("status").waitFor();
    assert.equal(await p.getByText("75.00", { exact: true }).count(), 1);
    await p.evaluate(() => document.fonts.ready.then(() => true));
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.deepEqual(ui.errors, []);
    await p.screenshot({
      path: "../.venv/ciclo3-finanzas-mobile.png",
      fullPage: true,
    });
  } finally {
    await ui.close();
  }
});
const catalog = {
  extracciones: {
    dimensiones: ["dia", "mes"],
    filtros: [],
    periodo: true,
    unidad: "ml",
    metricas: ["cantidad", "volumen"],
    opciones: {},
  },
  stock: {
    dimensiones: ["componente", "grupo"],
    filtros: ["grupo"],
    periodo: false,
    unidad: "ml",
    metricas: ["cantidad", "volumen"],
    opciones: { grupo: [{ valor: "1", etiqueta: "O Positivo" }] },
  },
  triajes: {
    dimensiones: ["estado"],
    filtros: [],
    periodo: true,
    unidad: "evaluaciones",
    metricas: ["cantidad", "porcentaje_aptitud"],
    opciones: {},
  },
};
test("CU24 envía filtros reales, exporta resultados y elimina resultados anteriores si falla la consulta", async () => {
  const queries = [];
  let fail = false;
  const ui = await open(async (url) => {
    if (url.pathname === "/api/reportes/catalogo/") return { body: catalog };
    if (url.pathname === "/api/reportes/consulta/") {
      queries.push(url.searchParams);
      if (url.searchParams.get("formato") === "csv")
        return { type: "text/csv", body: "dimension,cantidad\nGlobulos,2" };
      if (fail) return { status: 400, body: { detail: "Criterios inválidos" } };
      return {
        body: {
          fuente: "stock",
          dimension: "grupo",
          unidad: "ml",
          desde: null,
          hasta: null,
          actualizado: new Date().toISOString(),
          totales: { cantidad: 2 },
          filas: [{ dimension: "O Positivo", cantidad: 2 }],
          criterios: { stock: "Solo disponibles no autólogos" },
        },
      };
    }
  });
  try {
    const p = ui.page;
    await p
      .getByRole("button", { name: "Consultas y KPIs", exact: true })
      .click();
    await p.getByLabel("Fuente", { exact: true }).selectOption("stock");
    assert.equal(await p.getByLabel("Desde", { exact: true }).count(), 0);
    await p.getByLabel("Agrupar por").selectOption("grupo");
    await p.getByLabel("Grupo ABO/Rh", { exact: true }).selectOption("1");
    await p.getByRole("button", { name: "Consultar indicadores" }).click();
    await p.getByRole("button", { name: "Exportar CSV" }).waitFor();
    assert.equal(queries[0].get("fuente"), "stock");
    assert.equal(queries[0].get("grupo"), "1");
    assert.equal(queries[0].has("desde"), false);
    assert.equal(
      await p.getByRole("img", { name: "Cantidad por grupo" }).count(),
      1,
    );
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "Exportar CSV" }).click();
    assert.equal((await download).suggestedFilename(), "hemovida-stock.csv");
    assert.equal(queries[1].get("grupo"), "1");
    await p.screenshot({
      path: "../.venv/ciclo3-reportes.png",
      fullPage: true,
    });
    fail = true;
    await p.getByRole("button", { name: "Consultar indicadores" }).click();
    await p.getByRole("alert").waitFor();
    assert.equal(
      await p.getByRole("button", { name: "Exportar CSV" }).count(),
      0,
    );
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});
test("El protocolo sin agitación se envía como false y requiere confirmación del servidor", async () => {
  let received;
  const ui = await open(async (url, req) =>
    url.pathname === "/api/clinica/protocolos/"
      ? { status: 201, body: (received = req.postDataJSON()) }
      : undefined,
  );
  try {
    const p = ui.page;
    await p
      .getByRole("button", { name: "Atención clínica", exact: true })
      .click();
    const f = form(p, "CU15 · Aprobar protocolo institucional de conservación");
    await f
      .locator("select")
      .selectOption({ label: "Concentrado de Globulos Rojos" });
    await f.getByLabel("Temperatura mínima aprobada (°C)").fill("2");
    await f.getByLabel("Temperatura máxima aprobada (°C)").fill("6");
    await f.getByLabel("Días de conservación aprobados").fill("35");
    await f.getByRole("button").click();
    await p
      .getByText("Operación guardada en la base de datos.", { exact: true })
      .waitFor();
    assert.equal(received.requiereagitacion, false);
    assert.deepEqual(ui.errors, []);
  } finally {
    await ui.close();
  }
});
