const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
test('El enlace QR abre el carnet sin sesión y sin Authorization vacío', async () => {
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage();
  let requests=0;
  await page.route('**/api/donantes/**',async route=>{
   assert.equal(route.request().headers()['authorization'],undefined);
   assert.ok(route.request().url().includes('HEMO-TEST-025/carnet/'));
   requests++;
   await route.fulfill({json:{carnetDigitalCodigo:'HEMO-TEST-025',nombres:'Paciente',apellidos:'Prueba',estadoHabilitacion:'Pendiente de evaluación',totalDonacionesHistoricas:0,extraccionesRecientes:[]}});
  });
  await page.goto('http://127.0.0.1:3000/?carnet=HEMO-TEST-025');
  await page.getByRole('heading',{name:'Verificación de carnet'}).waitFor();
  await page.getByAltText('QR del carnet registrado').waitFor();
  assert.equal(await page.getByRole('link',{name:'Abrir verificación'}).getAttribute('href'),'/?carnet=HEMO-TEST-025');
  await page.reload();
  await page.getByAltText('QR del carnet registrado').waitFor();
  assert.ok(requests>=2);
 } finally {await browser.close();}
});
