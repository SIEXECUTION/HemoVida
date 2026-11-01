import React, { useState } from "react";
import { Form } from "./clinical/ClinicalCircuit";
import { liveRequest } from "../services/liveApi";
type Rule = {
  idrequisito: number;
  nombrerequisito: string;
  tiporequisito: string;
  esexcluyentedefinitivo: boolean;
  activo: boolean;
};
export function AgendaAdministration({
  token,
  onUpdate,
}: {
  token: string;
  onUpdate: () => Promise<void>;
}) {
  const [rules, setRules] = useState<Rule[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setRules(await liveRequest<Rule[]>("agenda/requisitos/", token));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await liveRequest(`agenda/requisitos/${id ? `${id}/` : ""}`, token, {
        nombrerequisito: fd.get("nombre"),
        tiporequisito: fd.get("tipo"),
        activo: fd.has("activo"),
        esexcluyentedefinitivo: fd.has("excluyente"),
      });
      setMessage(
        "Catálogo actualizado; los prefiltros anteriores requieren revisión.",
      );
      await load();
      await onUpdate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function ruleForm(rule?: Rule) {
    return (
      <form
        key={
          rule
            ? `${rule.idrequisito}-${rule.nombrerequisito}-${rule.activo}`
            : "nuevo"
        }
        className="border rounded-xl p-4 space-y-3"
        onSubmit={(e) => void save(e, rule?.idrequisito)}
      >
        <h3 className="font-bold">
          {rule
            ? `Requisito #${rule.idrequisito}`
            : "Añadir requisito aprobado"}
        </h3>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block">
            Requisito que debe cumplirse
            <input
              name="nombre"
              className="w-full border rounded-xl p-3"
              required
              maxLength={120}
              defaultValue={rule?.nombrerequisito}
            />
          </label>
          <label className="block">
            Categoría
            <input
              name="tipo"
              className="w-full border rounded-xl p-3"
              required
              maxLength={40}
              defaultValue={rule?.tiporequisito}
            />
          </label>
          <label className="flex gap-2">
            <input
              name="activo"
              type="checkbox"
              defaultChecked={rule?.activo ?? true}
            />
            Vigente en el cuestionario
          </label>
          <label className="flex gap-2">
            <input
              name="excluyente"
              type="checkbox"
              defaultChecked={rule?.esexcluyentedefinitivo ?? false}
            />
            Clasificación de exclusión definitiva del catálogo (requiere
            dictamen médico)
          </label>
          <button className="bg-slate-900 text-white p-3 rounded-xl">
            Guardar requisito
          </button>
        </fieldset>
      </form>
    );
  }
  return (
    <details className="bg-white border rounded-3xl p-6 space-y-4">
      <summary className="font-bold cursor-pointer">
        Administrar cierres y requisitos
      </summary>
      <p>
        Registra únicamente requisitos aprobados. Desactivar conserva el
        historial; guardar cambia la versión del cuestionario.
      </p>
      {error && (
        <p role="alert" className="bg-rose-50 p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-emerald-50 p-3">
          {message}
        </p>
      )}
      <Form
        title="Cerrar o reabrir día de atención"
        fields={[
          { name: "fecha", label: "Día de atención", type: "date" },
          {
            name: "decision",
            label: "Acción sobre la agenda",
            options: [
              ["cerrar", "Cerrar día"],
              ["reabrir", "Reabrir día"],
            ],
          },
          {
            name: "motivo",
            label: "Motivo del cierre o reapertura",
            minLength: 10,
            maxLength: 250,
          },
        ]}
        submit={async (d) => {
          const r = await liveRequest<{ mensaje: string }>(
            "agenda/cierres/",
            token,
            {
              fecha: d.fecha,
              cerrado: d.decision === "cerrar",
              motivo: d.motivo,
            },
          );
          setMessage(r.mensaje);
          await onUpdate();
        }}
      />
      <button className="p-3 border rounded-xl" onClick={() => void load()}>
        Cargar requisitos vigentes e históricos
      </button>
      {rules.map((r) => ruleForm(r))}
      {ruleForm()}
    </details>
  );
}
