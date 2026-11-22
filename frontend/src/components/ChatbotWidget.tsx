import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, MicOff, X } from "lucide-react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { API_BASE_URL } from "../services/api";
import { liveRequest } from "../services/liveApi";

const STOCK = "¿Cuántas unidades de glóbulos rojos hay disponibles y cuántas vencen en 7 días?";
const TRIAGE = "Resume la aptitud en los triajes de los últimos 30 días.";
const DEMAND = "Muestra las solicitudes hospitalarias del último mes por estado.";
const SUGGESTIONS: Record<string, string[]> = {
  ADMIN: [STOCK, "¿Cuál es el saldo de las deudas pendientes en bolivianos?"],
  DOC_TRIAJE: [TRIAGE, "Resume la asistencia a citas de los últimos 30 días."],
  BIOQ_INTEGRAL: ["¿Cuántas bolsas madre siguen en cuarentena?", TRIAGE],
  TEC_LOGISTICA: [STOCK, DEMAND],
};
type Reply = {
  respuesta: string;
  columnas: { clave: string; etiqueta: string }[];
  filas: Record<string, string | number | null>[];
  totales?: Record<string, number | string | null>;
  total_filas?: number;
  consulta_exportacion: string | null;
};
type Turn = { message: string; reply?: Reply; error?: string };

export function ChatbotWidget({ token, role }: { token: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const suggestions = SUGGESTIONS[role];
  if (!suggestions) return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {open && <ChatPanel token={token} suggestions={suggestions} close={() => setOpen(false)}
        turns={turns} setTurns={setTurns} />}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full bg-rose-800 px-4 py-3 text-sm font-bold text-white shadow-lg">
        <MessageCircle size={18} aria-hidden="true" />
        Asistente HemoVida
      </button>
    </div>
  );
}

function ChatPanel({ token, suggestions, close, turns, setTurns }: {
  token: string;
  suggestions: string[];
  close(): void;
  turns: Turn[];
  setTurns: React.Dispatch<React.SetStateAction<Turn[]>>;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const last = useRef<HTMLDivElement>(null);
  const active = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechRecognition((text) => setMessage(text.slice(0, 600)));
  useEffect(() => {
    input.current?.focus();
    return () => active.current?.abort();
  }, []);
  useEffect(() => {
    last.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy || speech.listening) return;
    const controller = new AbortController();
    active.current = controller;
    setMessage("");
    setBusy(true);
    try {
      const reply = await liveRequest<Reply>("reportes/chatbot/", token, {
        mensaje: text,
        historial: turns.filter((turn) => turn.reply).slice(-4).map((turn) => turn.message),
      }, controller.signal);
      setTurns((previous) => [...previous.slice(-19), { message: text, reply }]);
    } catch (e) {
      if (!controller.signal.aborted) {
        setTurns((previous) => [...previous.slice(-19), { message: text, error: (e as Error).message }]);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function download(ticket: string, format: "csv" | "pdf") {
    setExportError("");
    try {
      const params = new URLSearchParams({ consulta: ticket, formato: format });
      const response = await fetch(`${API_BASE_URL}/reportes/chatbot/exportar/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "No se pudo exportar el reporte.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hemovida-cu25.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError((error as Error).message);
    }
  }

  return (
    <section aria-label="Asistente HemoVida"
      className="flex max-h-[min(70vh,42rem)] w-[32rem] max-w-full flex-col overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-xl">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-bold">Asistente HemoVida</h2>
        <button type="button" aria-label="Cerrar asistente" onClick={close} className="rounded p-1">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div role="log" aria-label="Conversación" className="min-h-24 space-y-3 overflow-auto p-4 text-sm">
        {!turns.length && <div className="grid gap-2">
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => setMessage(suggestion)}
              className="rounded-xl border p-2 text-left hover:bg-slate-50">{suggestion}</button>
          ))}
        </div>}
        {turns.map((turn, index) => (
          <div key={index} className="space-y-2">
            <p className="ml-6 break-words rounded-xl bg-rose-50 p-3">{turn.message}</p>
            {turn.error && <p role="alert" className="text-rose-800">{turn.error}</p>}
            {turn.reply && <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <p>{turn.reply.respuesta}</p>
              {turn.reply.totales && (
                <dl className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  {turn.reply.columnas.filter(({ clave }) => clave in turn.reply!.totales!).map(({ clave, etiqueta }) => (
                    <div key={clave}><dt>{etiqueta}</dt><dd className="font-bold">{turn.reply!.totales![clave] ?? "—"}</dd></div>
                  ))}
                </dl>
              )}
              {turn.reply.filas.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead><tr>{turn.reply.columnas.map(({ clave, etiqueta }) => (
                      <th key={clave} scope="col" className="p-2">{etiqueta}</th>
                    ))}</tr></thead>
                    <tbody>{turn.reply.filas.map((row, i) => (
                      <tr key={i} className="border-t">{turn.reply!.columnas.map(({ clave }) => (
                        <td key={clave} className="p-2">{row[clave] ?? "—"}</td>
                      ))}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {(turn.reply.total_filas ?? 0) > turn.reply.filas.length && <p>Vista previa de 50 grupos. Descarga el reporte completo.</p>}
              {turn.reply.consulta_exportacion && (
                <div className="flex flex-wrap gap-2">
                  {(["pdf", "csv"] as const).map((format) => (
                    <button key={format} type="button" className="rounded-lg border px-3 py-1"
                      onClick={() => void download(turn.reply!.consulta_exportacion!, format)}>
                      Exportar {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>}
          </div>
        ))}
        {busy && <p role="status">Consultando el reporte…</p>}
        <div ref={last} />
      </div>
      <form onSubmit={send} className="space-y-2 border-t p-3">
        <p className="text-xs text-slate-600">Escribe preguntas generales sobre reportes. Evita nombres, documentos y otros datos personales.</p>
        <textarea ref={input} aria-label="Consulta del asistente" value={message} maxLength={600} rows={2}
          onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl border p-2 text-sm"
          placeholder="¿Qué indicador quieres consultar?" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={speech.toggle} disabled={!speech.supported || busy}
            aria-pressed={speech.listening} aria-label={speech.listening ? "Detener dictado" : "Dictar consulta"}
            className="rounded-lg border p-2 disabled:opacity-40">
            {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button type="submit" disabled={!message.trim() || busy || speech.listening}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Enviar</button>
          {speech.listening && <span role="status" className="text-xs">Escuchando…</span>}
        </div>
        {!speech.supported && <p className="text-xs text-slate-600">Dictado no disponible en este navegador.</p>}
        {speech.error && <p className="text-xs text-rose-800" role="alert">{speech.error}</p>}
        {exportError && <p className="text-xs text-rose-800" role="alert">{exportError}</p>}
      </form>
    </section>
  );
}
