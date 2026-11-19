// AXEL - Audio: voce + ascolto
// CORRETTO anti-eco: quando Axel parla, smette di ascoltare.
// Così non sente la sua stessa voce e non va in loop.

let audioCtx = null;
let recognition = null;
let listening = false;
let pausedForSpeech = false;
let lastListenArgs = null;

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
  return (
    voices.find(v => v.lang === "it-IT" && v.name.toLowerCase().includes("google")) ||
    voices.find(v => v.lang === "it-IT") ||
    voices.find(v => v.lang && v.lang.startsWith("it")) ||
    voices.find(v => v.lang && v.lang.startsWith("en-GB")) ||
    voices[0]
  );
}

function startRecognitionInternal() {
  if (!recognition) return;
  try { recognition.start(); } catch {}
}

function stopRecognitionInternal() {
  if (!recognition) return;
  try { recognition.stop(); } catch {}
}

export function speak(text) {
  return new Promise((resolve) => {
    if (!text) return resolve();
    const clean = String(text).replace(/[*#_<>]/g, "").slice(0, 1000);
    if (!("speechSynthesis" in window)) return resolve();

    // --- ANTI-ECO: chiudo le orecchie mentre parlo ---
    if (listening && !pausedForSpeech) {
      pausedForSpeech = true;
      stopRecognitionInternal();
    }

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

    const finish = () => {
      // --- Ho finito di parlare, riapro le orecchie ---
      if (pausedForSpeech) {
        pausedForSpeech = false;
        // Aspetta 400ms così non sente la coda della sua voce
        setTimeout(() => {
          if (listening) startRecognitionInternal();
        }, 400);
      }
      resolve();
    };

    u.onend = finish;
    u.onerror = finish;

    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v2 = pickItalianVoice();
        if (v2) u.voice = v2;
        window.speechSynthesis.speak(u);
      };
      setTimeout(() => finish(), 1000);
      return;
    }

    window.speechSynthesis.speak(u);
    setTimeout(() => finish(), 15000);
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch {}
}

export function listen({ onResult, onInterim } = {}) {
  lastListenArgs = { onResult, onInterim };
  if (listening) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const engEl = document.getElementById("debugEngine");

  if (!SR) {
    if (engEl) engEl.textContent = "NON SUPPORTATO - Usa Chrome";
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
      // Se sto parlando io, ignora tutto quello che sente
      if (pausedForSpeech) return;
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
      // Riparti da solo se deve ancora ascoltare E non sto parlando
      if (listening && !pausedForSpeech) {
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
  pausedForSpeech = false;
  try { recognition?.stop(); } catch {}
  const rec = document.getElementById("debugRec");
  if (rec) rec.textContent = "OFF";
}

export function isListening() {
  return listening;
}

export default { initAudio, speak, stopSpeaking, listen, stopListening, isListening };
