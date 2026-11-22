import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function useSpeechRecognition(onTranscript: (text: string) => void, lang = "es-BO") {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const RecognitionAPI = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  const supported = window.isSecureContext && Boolean(RecognitionAPI);
  const active = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    const recognition = active.current;
    if (recognition) {
      recognition.onend = recognition.onerror = recognition.onresult = null;
      active.current = null;
      recognition.abort();
    }
  }, []);

  function toggle() {
    if (active.current) {
      active.current.stop();
      return;
    }
    if (!supported || !RecognitionAPI) return;
    setError("");
    const recognition = new RecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.onresult = ({ results }) => {
      onTranscript(Array.from(results, (result) => result[0]?.transcript || "").join(" "));
    };
    recognition.onend = () => {
      active.current = null;
      setListening(false);
    };
    recognition.onerror = ({ error }) => {
      setError(error === "not-allowed"
        ? "El navegador denegó el micrófono. Puedes escribir la consulta."
        : "El dictado no está disponible en este momento. Puedes escribir la consulta.");
      setListening(false);
    };
    try {
      recognition.start();
      active.current = recognition;
      setListening(true);
    } catch {
      setError("No se pudo iniciar el dictado. Puedes escribir la consulta.");
    }
  }
  return { supported, listening, error, toggle };
}
