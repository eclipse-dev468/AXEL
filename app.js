// AXEL - App principale
import { getMemory, rememberConversation, getMemorySummary } from "./memoria.mjs";
import { initScene, setMood } from "./scene.js";
import { initAudio, speak, listen, stopListening } from "./audio.js";
import { getBrainAnswer } from "./cervello-gratis.mjs";
import { getTodayEvents } from "./calendar.mjs";
import { PHRASES } from "./phrases.js";
import { calc } from "./calcolo.mjs";

const $ = (s) => document.querySelector(s);

let brainReady = false;
let brainType = localStorage.getItem("axel-brain-type") || "";
let listening = false;
let paused = false;

function brainIsReady() {
  return !!localStorage.getItem("axel-brain-key") || brainType === "free";
}

function updateStatus(text) {
  const el = $("#statusText");
  if (el) el.textContent = text;
}

function updateClock() {
  const now = new Date();
  const c = $("#clock");
  const d = $("#date");
  if (c) c.textContent = now.toLocaleTimeString("it-IT");
  if (d) d.textContent = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}
setInterval(updateClock, 1000);
updateClock();

function openSetup() {
  $("#setup")?.classList.add("open");
}
function closeSetup() {
  $("#setup")?.classList.remove("open");
}

function showSay(text) {
  const el = $("#says");
  if (el) el.textContent = text;
}

function showYou(text) {
  const el = $("#you");
  if (el) el.textContent = text ? "TU: " + text : "";
}

async function loadAgenda() {
  try {
    const events = await getTodayEvents();
    const list = $("#agenda");
    if (!list) return;
    list.innerHTML = "";
    if (!events || !events.length) {
      list.innerHTML = "<li>Nessun impegno oggi</li>";
      return;
    }
    events.slice(0, 8).forEach(ev => {
      const li = document.createElement("li");
      li.textContent = `${ev.time || ""} ${ev.title || ev.summary || ""}`.trim();
      list.appendChild(li);
    });
  } catch {
    const list = $("#agenda");
    if (list) list.innerHTML = "<li>Nessun impegno oggi</li>";
  }
}

async function handleUserText(text) {
  if (!text || !text.trim()) return;
  const clean = text.trim();
  showYou(clean);
  rememberConversation("user", clean);
  updateStatus("ELABORO...");
  setMood("thinking");

  const lower = clean.toLowerCase();

  // Comandi veloci locali
  if (lower.includes("che ore sono") || lower.includes("che ora è")) {
    const ans = `Sono le ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}.`;
    showSay(ans);
    await speak(ans);
    updateStatus("IN ASCOLTO");
    setMood("idle");
    return;
  }
  if (lower.includes("quanto fa") || /[0-9]+\s*[\+\-\*\/x]\s*[0-9]+/.test(lower)) {
    try {
      const res = calc(clean);
      if (res !== null && res !== undefined) {
        const ans = `Fa ${res}.`;
        showSay(ans);
        await speak(ans);
        updateStatus("IN ASCOLTO");
        setMood("idle");
        return;
      }
    } catch {}
  }
  if (lower.includes("impegni") || lower.includes("agenda") || lower.includes("calendario")) {
    await loadAgenda();
    const ans = "Ho aggiornato la tua agenda qui a sinistra.";
    showSay(ans);
    await speak(ans);
    updateStatus("IN ASCOLTO");
    setMood("idle");
    return;
  }

  // Cervello AI
  try {
    const summary = getMemorySummary();
    const answer = await getBrainAnswer(clean, summary);
    const finalText = answer && String(answer).trim() ? String(answer).trim() : PHRASES.fallback;
    showSay(finalText);
    rememberConversation("axel", finalText);
    await speak(finalText);
  } catch (e) {
    const fallback = PHRASES.fallback;
    showSay(fallback);
    await speak(fallback);
  }
  updateStatus("IN ASCOLTO");
  setMood("idle");
}

async function start() {
  $("#gate")?.classList.add("hide");
  document.body.dataset.mode = "live";
  updateStatus("IN ASCOLTO");
  setMood("idle");
  try {
    await initAudio();
  } catch {}
  if (!listening) {
    listening = true;
    listen({
      onResult: (t) => handleUserText(t),
      onInterim: (t) => { const el = $("#you"); if (el) el.textContent = "TU: " + t + "..."; },
    });
  }
  showSay("Ciao, sono Axel. Dimmi pure.");
  try { await speak("Ciao, sono Axel. Dimmi pure."); } catch {}
}

async function boot() {
  try { initScene(); } catch {}
  try { await loadAgenda(); } catch {}
  brainReady = brainIsReady();
  const chip = $("#brainChip");
  const name = $("#brainName");
  if (brainReady && chip && name) {
    chip.hidden = false;
    name.textContent = brainType === "openai" ? "OpenAI" : "FreeLLMAPI";
  }
  const gateText = $("#gateText");
  if (gateText) gateText.textContent = brainReady ? "CLICCA PER INIZIALIZZARE" : "CLICCA PER CONFIGURARE";
  updateStatus(brainReady ? "PRONTO" : "DA CONFIGURARE");
}

$("#gate")?.addEventListener("click", () => {
  if (brainIsReady()) start();
  else openSetup();
});

$("#setupBtn")?.addEventListener("click", openSetup);
$("#setupClose")?.addEventListener("click", closeSetup);
$("#setup")?.addEventListener("click", (e) => {
  if (e.target.id === "setup") closeSetup();
});

$("#pauseBtn")?.addEventListener("click", () => {
  paused = !paused;
  if (paused) { stopListening(); updateStatus("PAUSA"); }
  else { start(); }
  $("#pauseBtn span").textContent = paused ? "RIPRENDI" : "PAUSA";
});

$("#fsBtn")?.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});

$("#setupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const brain = document.querySelector('input[name="brain"]:checked')?.value || "free";
  const err = $("#setupError");
  if (err) err.textContent = "";
  try {
    if (brain === "openai") {
      const key = $("#openaiKey")?.value.trim();
      if (!key) { if (err) err.textContent = "Metti la chiave OpenAI."; return; }
      localStorage.setItem("axel-brain-type", "openai");
      localStorage.setItem("axel-brain-key", key);
    } else {
      const manual = $("#freeKey")?.value.trim();
      localStorage.setItem("axel-brain-type", "free");
      if (manual) localStorage.setItem("axel-brain-key", manual);
      else localStorage.setItem("axel-brain-key", "freellmapi-auto");
    }
    const voice = document.querySelector('input[name="voice"]:checked')?.value || "free";
    localStorage.setItem("axel-voice", voice);
    if (voice === "eleven") {
      const ek = $("#elevenKey")?.value.trim();
      if (ek) localStorage.setItem("axel-eleven-key", ek);
    }
    const cal = $("#calendarUrl")?.value.trim();
    if (cal) localStorage.setItem("axel-calendar-url", cal);
    brainReady = true;
    closeSetup();
    await boot();
    start();
  } catch (e2) {
    if (err) err.textContent = "Non sono riuscito ad attivare. Riprova.";
  }
});

// Scrittura da tastiera
$("#typeBox")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#typeBox input");
  const v = input.value;
  input.value = "";
  handleUserText(v);
});

// Scorciatoie
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "t") { $("#typeBox input")?.focus(); }
  if (e.key.toLowerCase() === "w" && brainIsReady()) start();
  if (e.key.toLowerCase() === "r" && confirm("Resettare Axel?")) {
    localStorage.clear();
    location.reload();
  }
});

boot();
