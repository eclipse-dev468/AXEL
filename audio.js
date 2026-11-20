// AXEL - Audio: voce + ascolto (con selezione voce, rate e pitch)

const VOICE_NAME_KEY  = "axel-voice-name";
const VOICE_RATE_KEY  = "axel-voice-rate";
const VOICE_PITCH_KEY = "axel-voice-pitch";

let audioCtx = null;
let recognition = null;
let listening = false;
let pausedForSpeech = 0;
let currentUtterance = null;
let recognitionRunning = false;
let watchdogTimer = null;
let lastListenArgs = null;
let voiceCycleIndex = -1;

export async function initAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
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

// ---------------- VOCI ----------------

export function getAllVoices() {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function listVoices() {
  const voices = getAllVoices();
  const current = pickVoice();
  const lines = voices.map((v, i) =>
    `${String(i).padStart(2, "0")} · ${v.name} · ${v.lang}${v === current ? "  ← IN USO" : ""}`
  );
  console.log("=== VOCI DISPONIBILI ===");
  lines.forEach((l) => console.log(l));
  const dbg = document.getElementById("debugVoice");
  if (dbg) dbg.textContent = `${voices.length} voci · ${current?.name || "?"}`;
  return voices;
}

export function setVoiceByName(name) {
  const v = getAllVoices().find((x) => x.name === name);
  if (!v) {
    console.warn(`[axel] voce "${name}" non trovata. Usa listVoices() per vederle.`);
    return null;
  }
  localStorage.setItem(VOICE_NAME_KEY, v.name);
  console.log(`[axel] voce impostata: ${v.name} (${v.lang})`);
  return v;
}

export function setVoiceByIndex(i) {
  const voices = getAllVoices();
  if (i < 0 || i >= voices.length) return null;
  return setVoiceByName(voices[i].name);
}

export function cycleVoice() {
  const voices = getAllVoices();
  if (!voices.length) return null;
  if (voiceCycleIndex < 0) {
    voiceCycleIndex = voices.findIndex((v) => v.name === pickVoice()?.name);
    if (voiceCycleIndex < 0) voiceCycleIndex = 0;
  }
  voiceCycleIndex = (voiceCycleIndex + 1) % voices.length;
  const v = voices[voiceCycleIndex];
  localStorage.setItem(VOICE_NAME_KEY, v.name);
  console.log(`[axel] voce ${voiceCycleIndex + 1}/${voices.length}: ${v.name} (${v.lang})`);
  const dbg = document.getElementById("debugVoice");
  if (dbg) dbg.textContent = `${v.name} (${v.lang})`;
  return v;
}

export function setRate(r) {
  const v = parseFloat(r);
  if (Number.isFinite(v) && v > 0.3 && v < 3) localStorage.setItem(VOICE_RATE_KEY, String(v));
}
export function setPitch(p) {
  const v = parseFloat(p);
  if (Number.isFinite(v) && v >= 0 && v <= 2) localStorage.setItem(VOICE_PITCH_KEY, String(v));
}
function getRate()  { const v = parseFloat(localStorage.getItem(VOICE_RATE_KEY));  return Number.isFinite(v) ? v : 1.0; }
function getPitch() { const v = parseFloat(localStorage.getItem(VOICE_PITCH_KEY)); return Number.isFinite(v) ? v : 1.0; }

function pickVoice() {
  const voices = getAllVoices();
  if (!voices.length) return null;
  const preferred = localStorage.getItem(VOICE_NAME_KEY);
  if (preferred) {
    const found = voices.find((v) => v.name === preferred);
    if (found) return found;
  }
  return (
    voices.find((v) => v.lang === "it-IT" && v.name.toLowerCase().includes("google")) ||
    voices.find((v) => v.lang === "it-IT") ||
    voices.find((v) => v.lang && v.lang.startsWith("it")) ||
    voices.find((v) => v.lang && v.lang.startsWith("en-GB")) ||
    voices[0]
  );
}

// ---------------- RICONOSCIMENTO ----------------

function actuallyStartRecognition() {
  if (!recognition || recognitionRunning) return;
  try { recognition.start(); recognitionRunning = true; } catch {}
}
function actuallyStopRecognition() {
  if (!recognition) return;
  recognitionRunning = false;
  try { recognition.abort(); } catch { try { recognition.stop(); } catch {} }
}
function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    if (listening && pausedForSpeech === 0 && !recognitionRunning) {
      console.log("[audio] watchdog: riavvio riconoscimento");
      actuallyStartRecognition();
    }
  }, 3000);
}

// ---------------- PARLATO ----------------

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
    u.rate = getRate();
    u.pitch = getPitch();
    u.volume = 1.0;
    const voice = pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang || "it-IT"; }

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
          const v2 = pickVoice();
          if (v2) u.voice = v2;
          try { window.speechSynthesis.speak(u); } catch { finish(); }
        };
      } else {
        window.speechSynthesis.speak(u);
      }
    } catch { finish(); return; }
    setTimeout(finish, 20000);
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch {}
}

export function listen({ onResult, onInterim } = {}) {
  lastListenArgs = { onResult, onInterim };
  if (recognition) {
    if (!recognitionRunning && listening && pausedForSpeech === 0) actuallyStartRecognition();
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
      listening = true; recognitionRunning = true;
      if (engEl) engEl.textContent = "ATTIVO";
      const rec = document.getElementById("debugRec"); if (rec) rec.textContent = "ON";
    };
    recognition.onresult = (event) => {
      if (pausedForSpeech > 0) return;
      let interim = "", finalText = "";
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
        setTimeout(() => { if (listening && pausedForSpeech === 0) actuallyStartRecognition(); }, 300);
      }
    };
    recognition.onend = () => {
      recognitionRunning = false;
      if (listening && pausedForSpeech === 0) {
        setTimeout(() => { if (listening && pausedForSpeech === 0) actuallyStartRecognition(); }, 200);
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
  const rec = document.getElementById("debugRec"); if (rec) rec.textContent = "OFF";
}
export function isListening() { return listening; }

export default { initAudio, speak, stopSpeaking, listen, stopListening, isListening,
  getAllVoices, listVoices, setVoiceByName, setVoiceByIndex, cycleVoice, setRate, setPitch };
