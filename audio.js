// AXEL - Audio: voce + ascolto
// Usa la voce del browser (gratis) e il riconoscimento vocale di Chrome.

let audioCtx = null;
let recognition = null;
let listening = false;
let currentUtterance = null;

export async function initAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  } catch {}
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const mic = document.getElementById("debugMic");
    if (mic) mic.textContent = "OK";
  } catch {
    const mic = document.getElementById("debugMic");
    if (mic) mic.textContent = "BLOCCATO - Consenti il microfono";
  }
  return true;
}

function pickItalianVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Preferisci voce italiana
  return (
    voices.find(v => v.lang === "it-IT" && v.name.toLowerCase().includes("google")) ||
    voices.find(v => v.lang === "it-IT") ||
    voices.find(v => v.lang && v.lang.startsWith("it")) ||
    voices.find(v => v.lang && v.lang.startsWith("en-GB")) ||
    voices[0]
  );
}

export function speak(text) {
  return new Promise((resolve) => {
    if (!text) return resolve();
    const clean = String(text).replace(/[*#_<>]/g, "").slice(0, 1000);
    if (!("speechSynthesis" in window)) return resolve();

    try { window.speechSynthesis.cancel(); } catch {}

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "it-IT";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;

    const voice = pickItalianVoice();
    if (voice) u.voice = voice;

    const voiceEl = document.getElementById("debugVoice");
    if (voiceEl) voiceEl.textContent = voice ? voice.name : "Browser";

    u.onend = () => resolve();
    u.onerror = () => resolve();
    currentUtterance = u;

    // Se le voci non sono ancora caricate, riprova
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v2 = pickItalianVoice();
        if (v2) u.voice = v2;
        window.speechSynthesis.speak(u);
      };
      setTimeout(() => resolve(), 1000);
      return;
    }

    window.speechSynthesis.speak(u);
    // Sicurezza: se non finisce, sblocca dopo 15s
    setTimeout(() => resolve(), 15000);
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch {}
}

export function listen({ onResult, onInterim } = {}) {
  if (listening) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const engEl = document.getElementById("debugEngine");

  if (!SR) {
    if (engEl) engEl.textContent = "NON SUPPORTATO - Usa Chrome";
    // Fallback: usa solo la scrittura
    const typeBox = document.getElementById("typeBox");
    if (typeBox) typeBox.style.display = "flex";
    return null;
  }

  try {
    recognition = new SR();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listening = true;
      if (engEl) engEl.textContent = "ATTIVO";
      const rec = document.getElementById("debugRec");
      if (rec) rec.textContent = "ON";
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      const debugText = document.getElementById("debugText");
      if (interim && onInterim) onInterim(interim.trim());
      if (finalText) {
        const t = finalText.trim();
        if (debugText) debugText.textContent = t;
        // Se non hai detto "Axel", risponde lo stesso se il cancello è già aperto
        // Per attivazione vocale stretta, decommenta sotto:
        // if (!t.toLowerCase().includes("axel")) return;
        if (onResult) onResult(t);
      }
    };

    recognition.onerror = (e) => {
      if (engEl) engEl.textContent = "ERRORE: " + (e.error || "");
      if (e.error === "not-allowed") {
        const err = document.getElementById("debugError");
        if (err) err.textContent = "Microfono bloccato: clicca il lucchetto in alto e consenti il microfono.";
      }
    };

    recognition.onend = () => {
      // Riparti da solo se deve ancora ascoltare
      if (listening) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    return recognition;
  } catch (e) {
    if (engEl) engEl.textContent = "ERRORE AVVIO";
    return null;
  }
}

export function stopListening() {
  listening = false;
  try { recognition?.stop(); } catch {}
  const rec = document.getElementById("debugRec");
  if (rec) rec.textContent = "OFF";
}

export function isListening() {
  return listening;
}

export default { initAudio, speak, stopSpeaking, listen, stopListening, isListening };
