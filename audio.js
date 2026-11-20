// AXEL - Audio: voce + ascolto (versione robusta, anti-eco + watchdog)

let audioCtx = null;
let recognition = null;
let listening = false;
let pausedForSpeech = 0;
let currentUtterance = null;
let recognitionRunning = false;
let watchdogTimer = null;
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

function actuallyStartRecognition() {
  if (!recognition) return;
  if (recognitionRunning) return;
  try {
    recognition.start();
    recognitionRunning = true;
  } catch (e) {
    if (!/InvalidStateError|already started/i.test(e.message)) {
      console.warn("[audio] start error:", e);
    }
  }
}

function actuallyStopRecognition() {
  if (!recognition) return;
  recognitionRunning = false;
  try { recognition.abort(); } catch {
    try { recognition.stop(); } catch {}
  }
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    if (!listening) return;
    if (pausedForSpeech > 0) return;
    if (!recognitionRunning) {
      console.log("[audio] watchdog: riconoscimento fermo, riavvio");
      actuallyStartRecognition();
    }
  }, 3000);
}

export function speak(text) {
  return new Promise((resolve) => {
    if (!text) return resolve();
    const clean = String(text).replace(/[*#_<>]/g, "").slice(0, 1000);
    if (!("speechSynthesis" in window)) return resolve();

    try { window.speechSynthesis.cancel(); } catch {}
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance = null;
    }

    pausedForSpeech++;
    if (pausedForSpeech === 1) actuallyStopRecognition();

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "it-IT";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    const voice = pickItalianVoice();
    if (voice) u.voice = voice;

    const voiceEl = document.getElementById("debugVoice");
    if (voiceEl) voiceEl.textContent = voice ? voice.name : "Browser";

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (currentUtterance === u) currentUtterance = null;
      pausedForSpeech = Math.max(0, pausedForSpeech - 1);
      if (pausedForSpeech === 0) {
        setTimeout(() => {
          if (listening && pausedForSpeech === 0) actuallyStartRecognition();
        }, 500);
      }
      resolve();
    };

    u.onend = finish;
    u.onerror = finish;

    currentUtterance = u;
    try {
      if (!window.speechSynthesis.getVoices().length) {
        window.speechSynthesis.onvoiceschanged = () => {
          const v2 = pickItalianVoice();
          if (v2) u.voice = v2;
          try { window.speechSynthesis.speak(u); } catch { finish(); }
        };
      } else {
        window.speechSynthesis.speak(u);
      }
    } catch {
      finish();
      return;
    }
    setTimeout(finish, 20000);
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch {}
}

export function listen({ onResult, onInterim } = {}) {
  lastListenArgs = { onResult, onInterim };
  if (recognition) {
    if (!recognitionRunning && listening && pausedForSpeech === 0) {
      actuallyStartRecognition();
    }
    return recognition;
  }

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
      recognitionRunning = true;
      if (engEl) engEl.textContent = "ATTIVO";
      const rec = document.getElementById("debugRec");
      if (rec) rec.textContent = "ON";
    };

    recognition.onresult = (event) => {
      if (pausedForSpeech > 0) return;
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      const debugText = document.getElementById("debugText");
      if (interim && lastListenArgs?.onInterim) lastListenArgs.onInterim(interim.trim());
      if (finalText) {
        const t = finalText.trim();
        if (debugText) debugText.textContent = t;
        if (lastListenArgs?.onResult) lastListenArgs.onResult(t);
      }
    };

    recognition.onerror = (e) => {
      recognitionRunning = false;
      if (engEl) engEl.textContent = "ERRORE: " + (e.error || "");
      if (e.error === "not-allowed") {
        const err = document.getElementById("debugError");
        if (err) err.textContent = "Microfono bloccato: clicca il lucchetto e consenti il microfono.";
      }
      if (e.error === "no-speech" || e.error === "aborted") {
        setTimeout(() => {
          if (listening && pausedForSpeech === 0) actuallyStartRecognition();
        }, 300);
      }
    };

    recognition.onend = () => {
      recognitionRunning = false;
      if (listening && pausedForSpeech === 0) {
        setTimeout(() => {
          if (listening && pausedForSpeech === 0) actuallyStartRecognition();
        }, 200);
      }
    };

    listening = true;
    actuallyStartRecognition();
    startWatchdog();
    return recognition;
  } catch (e) {
    if (engEl) engEl.textContent = "ERRORE AVVIO";
    return null;
  }
}

export function stopListening() {
  listening = false;
  actuallyStopRecognition();
  const rec = document.getElementById("debugRec");
  if (rec) rec.textContent = "OFF";
}

export function isListening() {
  return listening;
}

export default { initAudio, speak, stopSpeaking, listen, stopListening, isListening };
