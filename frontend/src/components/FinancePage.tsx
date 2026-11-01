import React, { useEffect, useRef, useState } from "react";
import { Form, Field } from "./clinical/ClinicalCircuit";
import { DataContent } from "./ApiRecords";
import { liveRequest } from "../services/liveApi";
type Row = Record<string, any>;
export function FinancePage({ token }: { token: string }) {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [checkoutUrl, setCheckoutUrl] = useState("");
  const attempts = useRef(new Map<string, string>());
  async function load(signal?: AbortSignal) {
    setError("");
    try {
      const d = await liveRequest(
        "finanzas/catalogo/",
        token,
        undefined,
        signal,
      );
      setData(d);
      for (const [key, id] of attempts.current) {
        const previous = (d.pagos || []).find(
          (p: Row) => p.idempotencia === id,
        );
        if (previous && previous.estadotransaccion !== "Pendiente")
          attempts.current.delete(key);
      }
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [token]);
  async function save(path: string, d: Row) {
    setNotice("");
    const r = await liveRequest(`finanzas/${path}`, token, d);
    await load();
    setNotice("Operación confirmada por el servidor.");
    return r;
  }
  async function paymentAction(id: string, cancel = false) {
    setBusy(true);
    setError("");
    try {
      const r = await save(
        `pagos/${id}/${cancel ? "anular-checkout" : "conciliar"}/`,
        {},
      );
      if (r.requiere_conciliacion)
        setNotice(
          "Stripe registra fondos recibidos que requieren conciliación administrativa; no se aplicaron automáticamente al saldo.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function link(url: unknown) {
    if (typeof url !== "string")
      throw new Error("Stripe no devolvió un enlace válido.");
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "checkout.stripe.com")
      throw new Error("El enlace de pago no corresponde a Stripe Checkout.");
    setCheckoutUrl(url);
  }
  const choices = (
    key: string,
    id: string,
    label: (r: Row) => string,
  ): [string, string][] =>
    (data?.[key] || []).map((r: Row) => [String(r[id]), label(r)]);
  const order: Field = {
    name: "idsolicitud",
    label: "Solicitud hospitalaria",
    options: choices(
      "solicitudes",
      "idsolicitud",
      (r) => `${r.numerosolicitud} · ${r.prioridadsolicitud}`,
    ),
  };
  const debt: Field = {
    name: "deuda",
    label: "Obligación registrada",
    options: choices(
      "deudas",
      "iddeuda",
      (r) =>
        `#${r.iddeuda} · Saldo ${r.saldopendiente} ${r.moneda || "sin moneda confirmada"} · ${r.estado_actual}`,
    ),
  };
  return (
    <section className="space-y-6">
      <header className="p-6 bg-white rounded-3xl border">
        <h1 className="text-2xl font-black">Finanzas y pagos</h1>
        <p>
          Importes en bolivianos (BOB). Los pagos no condicionan la atención de
          una emergencia.
        </p>
        <button
          className="mt-3 border rounded-xl p-2"
          onClick={() => void load()}
        >
          Actualizar saldos
        </button>
      </header>
      {error && (
        <p role="alert" className="bg-rose-50 p-4 rounded-xl text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="bg-teal-50 p-4 rounded-xl">
          {notice}
        </p>
      )}
      {!data && !error && <p>Cargando finanzas…</p>}
      {data && (
        <>
          {!data.stripe_configurado && (
            <p className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              Stripe requiere su configuración en el backend. Los abonos
              administrativos siguen disponibles.
            </p>
          )}
          <Form
            title="Crear obligación financiera"
            fields={[
              order,
              {
                name: "montooriginal",
                label: "Importe original (BOB)",
                type: "number",
                step: "0.01",
              },
              {
                name: "motivodeuda",
                label: "Concepto o motivo",
                maxLength: 2000,
              },
              {
                name: "fechavencimiento",
                label: "Vencimiento",
                type: "datetime-local",
                required: false,
              },
              {
                name: "pagoposteriorautorizado",
                label: "Pago posterior autorizado",
                type: "checkbox",
                required: false,
              },
              {
                name: "observacionautorizacion",
                label: "Motivo de autorización (si corresponde)",
                required: false,
                maxLength: 2000,
              },
            ]}
            submit={async (d) => {
              await save("deudas/", d);
            }}
          />
          <div className="bg-white rounded-3xl border p-6 space-y-4">
            <h2 className="text-xl font-bold">Cuentas por cobrar</h2>
            <p className="text-sm text-slate-500">
              Últimas 200 obligaciones. Usa Consultas y KPIs para los totales y
              el análisis del período.
            </p>
            <DataContent value={data.deudas} />
          </div>
          <Form
            title="Registrar abono recibido"
            fields={[
              debt,
              {
                name: "montopagado",
                label: "Importe recibido (BOB)",
                type: "number",
                step: "0.01",
              },
              {
                name: "metodopago",
                label: "Método",
                options: [
                  ["Efectivo", "Efectivo"],
                  ["Deposito", "Depósito"],
                  ["Transferencia QR", "Transferencia QR"],
                  ["Transferencia bancaria", "Transferencia bancaria"],
                ],
              },
              {
                name: "referenciaexterna",
                label: "Referencia única del abono",
                maxLength: 150,
              },
            ]}
            submit={async ({ deuda, ...d }) => {
              await save(`deudas/${deuda}/abonos/`, d);
            }}
          />
          {data.stripe_configurado && (
            <Form
              title="Crear pago por tarjeta en Stripe"
              fields={[
                debt,
                {
                  name: "montopagado",
                  label: "Importe a cobrar (BOB)",
                  type: "number",
                  step: "0.01",
                },
              ]}
              submit={async ({ deuda, ...d }) => {
                const key = `${deuda}:${d.montopagado}`;
                let id = attempts.current.get(key);
                if (!id) {
                  id = crypto.randomUUID();
                  attempts.current.set(key, id);
                }
                const r = await save(`deudas/${deuda}/checkout/`, {
                  ...d,
                  idempotencia: id,
                });
                link(r.urlcheckout);
                setNotice(
                  "Checkout creado. El saldo cambia únicamente después de confirmar el pago con Stripe.",
                );
              }}
            />
          )}
          {checkoutUrl && (
            <a
              className="inline-flex bg-teal-800 text-white rounded-xl p-4 font-bold"
              href={checkoutUrl}
            >
              Continuar en Stripe Checkout
            </a>
          )}
          <div className="p-6 bg-white rounded-3xl border space-y-4">
            <h2 className="text-xl font-bold">Intentos y abonos</h2>
            <DataContent
              value={(data.pagos || []).map(
                ({ urlcheckout, idempotencia, ...r }: Row) => r,
              )}
            />
            {(data.pagos || [])
              .filter((p: Row) => p.proveedorpasarela === "Stripe")
              .map((p: Row) => (
                <div
                  key={p.idpago}
                  className="border rounded-2xl p-4 flex flex-wrap gap-3 items-center"
                >
                  <span>
                    Intento #{p.idpago} · {p.estadotransaccion}
                  </span>
                  <button
                    disabled={busy}
                    className="border rounded-xl p-2"
                    onClick={() => void paymentAction(String(p.idpago))}
                  >
                    Conciliar con Stripe
                  </button>
                  {p.estadotransaccion === "Pendiente" && (
                    <>
                      <button
                        disabled={busy}
                        className="border rounded-xl p-2"
                        onClick={() =>
                          void paymentAction(String(p.idpago), true)
                        }
                      >
                        Anular checkout abierto
                      </button>
                      <button
                        disabled={busy}
                        className="border rounded-xl p-2"
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            const r = await save(
                              `deudas/${p.iddeuda}/checkout/`,
                              {
                                montopagado: p.montopagado,
                                idempotencia: p.idempotencia,
                              },
                            );
                            link(r.urlcheckout);
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Reintentar / continuar el mismo pago
                      </button>
                    </>
                  )}
                </div>
              ))}
          </div>
          {(data.deudas || []).some((r: Row) => !r.moneda) && (
            <Form
              title="Confirmar moneda de una obligación histórica"
              fields={[
                debt,
                {
                  name: "confirmada",
                  label:
                    "Verifiqué que el importe original está expresado en BOB. No se realiza conversión.",
                  type: "checkbox",
                },
              ]}
              submit={async ({ deuda, ...d }) => {
                await save(`deudas/${deuda}/moneda/`, d);
              }}
            />
          )}
          <Form
            title="Registrar exoneración o convenio sin ingreso"
            fields={[
              order,
              {
                name: "estadopago",
                label: "Tratamiento",
                options: [
                  ["Exonerado SUS", "Exonerado SUS"],
                  ["Convenio Institucional", "Convenio institucional"],
                ],
              },
              {
                name: "conceptoservicio",
                label: "Fundamento del tratamiento",
                maxLength: 150,
              },
              {
                name: "numerorecibofactura",
                label: "Número de documento administrativo",
                maxLength: 35,
              },
            ]}
            submit={async ({ idsolicitud, ...d }) => {
              await save(`solicitudes/${idsolicitud}/tratamiento/`, d);
            }}
          />
          <div className="bg-white border rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Comprobantes</h2>
            <DataContent value={data.comprobantes} />
          </div>
          <div className="bg-white border rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold">
              Confirmaciones y conciliación de Stripe
            </h2>
            <DataContent value={data.eventos} />
          </div>
        </>
      )}
    </section>
  );
}
