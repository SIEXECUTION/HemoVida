import React from "react";

const routes = [
  {title: "Ciclo 2 desde la cita hasta la atención", steps: [
    "Administración publica la agenda. Busca DEMO-C23 para distinguir los escenarios académicos.",
    "El postulante entra en Citas y prefiltro, responde los requisitos y confirma un turno libre. Puede guardar borrador, reprogramar o cancelar.",
    "Colecta revisa la identidad y confirma asistencia el día de la cita. La evaluación no requiere un triaje previo.",
    "Medicina registra el triaje. Un rechazo requiere motivo y diferimiento; el registro no debe transformarse automáticamente en una colecta.",
    "Colecta registra consentimiento y extracción si la persona cumple las condiciones. Después registra refrigerio e incentivo, indicando si están pendientes.",
    "Para donación autóloga, el médico solicitante crea el programa y Bioquímica lo revisa. La cita autóloga requiere programa aprobado y cirugía concordante.",
    "Los perfiles autorizados consultan Informes de gestión y exportan resultados. Finanzas pertenece exclusivamente a Administración."
  ]},
  {title: "Ciclo 3 desde el laboratorio hasta los informes", steps: [
    "Bioquímica abre Laboratorio y liberación conjunta. El lote DEMO-C23-MAD-LABORATORIO tiene serología y espera inmunohematología.",
    "Completa inmunohematología concordante con el grupo de la madre. Solo Bioquímica puede liberar después de las dos aprobaciones.",
    "El lote DEMO-C23-MAD-DONANTE ya tiene ambos análisis y un componente disponible como ejemplo académico. No representa sangre real.",
    "Logística revisa Inventario y conservación. Puede registrar condiciones del equipo y custodia; el volumen, la capacidad y la caducidad deben concordar.",
    "Administración abre Finanzas: DEMO-C23-SOL-1 tiene una deuda pendiente y DEMO-C23-SOL-2 tiene un abono sintético de efectivo.",
    "Para Stripe utiliza una deuda pendiente y el entorno de pruebas. Un retorno del navegador no confirma el pago: debe llegar el webhook o realizarse conciliación.",
    "Consulta los indicadores por rol y compara el resultado con Informes de gestión. La bitácora permite revisar las operaciones registradas."
  ]}
];
export function WalkthroughPage() {
  return <section className="bg-white border rounded-3xl p-6 space-y-6">
    <h1 className="text-2xl font-black">Guía de recorrido</h1>
    <p>Recorrido académico por los perfiles de atención, laboratorio, inventario y administración. Los registros DEMO son ficticios y se consultan en la misma base del proyecto.</p>
    {routes.map(route=><section key={route.title} className="space-y-3">
      <h2 className="text-xl font-bold">{route.title}</h2>
      <ol className="list-decimal pl-6 space-y-3">{route.steps.map(step=><li key={step}>{step}</li>)}</ol>
    </section>)}
    <p className="text-sm text-slate-600">Cada cuenta de demostración tiene permisos propios. Cierra sesión al pasar a otro perfil. Las credenciales se entregan por separado; no aparecen en esta guía.</p>
  </section>;
}
