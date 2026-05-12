// Controlador de dictado por voz (Web Speech API). Conecta el micrófono
// del navegador con un input/textarea, pasando por normalizeDictation
// del parser para limpiar el texto antes de appendear.
//
// Uso típico:
//   const dict = createDictation({
//     target: textareaEl,
//     button: micButtonEl,        // opcional, se le pone clase 'recording'
//     wave:   waveContainerEl,    // opcional, las 5 barritas
//     lang:   "es-PE",            // default
//   });
//   onClick(button, () => dict.toggle());
//   onDestroy(() => dict.dispose());

import { normalizeDictation } from "./parser.js";
import { toast } from "./toast.js";
import { ensureMicStyles } from "./mic_styles.js";

const setBtnRecording = (btn, on) => {
  if (!btn) return;
  btn.classList.toggle("recording", on);
  btn.style.background = on ? "var(--danger)" : "";
  btn.style.color = on ? "white" : "";
};

export const createDictation = ({ target, button, wave, lang = "es-PE" }) => {
  ensureMicStyles();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let mic = null;

  const setWaveOn = (on) => wave?.classList.toggle("on", !!on);
  const flashWave = () => {
    if (!wave) return;
    wave.classList.add("loud");
    setTimeout(() => wave.classList.remove("loud"), 220);
  };

  const stop = () => {
    if (!mic) return;
    try { mic.stop(); } catch {}
    mic = null;
    setBtnRecording(button, false);
    setWaveOn(false);
  };

  const start = () => {
    if (!SR) {
      toast("Tu browser no soporta dictado (probá Chrome o Edge)", { type: "err" });
      return;
    }
    if (mic) return stop();
    mic = new SR();
    mic.lang = lang;
    mic.continuous = true;
    mic.interimResults = true; // dispara onresult aunque la frase no esté cerrada → wave reactivo

    mic.onresult = (event) => {
      flashWave();
      if (!target) return;
      const finals = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finals.push(event.results[i][0].transcript.trim());
      }
      if (!finals.length) return;
      const text = normalizeDictation(finals.join("\n"));
      const sep = target.value && !target.value.endsWith("\n") ? "\n" : "";
      target.value = target.value + sep + text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    };
    mic.onspeechstart = flashWave;
    mic.onsoundstart = flashWave;
    mic.onerror = (e) => { toast(`Mic: ${e.error || "error"}`, { type: "err" }); stop(); };
    mic.onend = stop;

    try {
      mic.start();
      setBtnRecording(button, true);
      setWaveOn(true);
    } catch (err) {
      console.error(err);
      stop();
      toast("No pude arrancar el mic", { type: "err" });
    }
  };

  return { start, stop, toggle: start, dispose: stop };
};
