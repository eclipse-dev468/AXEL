// AXEL - App senza 3D, solo voce. Così il clic funziona sempre.
import { rememberConversation, getMemorySummary } from "./memoria.mjs";
import {
  initAudio, speak, listen, stopListening,
  cycleVoice, listVoices, setVoiceByName, setVoiceByIndex, setRate, setPitch
} from "./audio.js";
import { getBrainAnswer } from "./cervello-gratis.mjs";
import { getTodayEvents } from "./calendar.mjs";
import { PHRASES } from "./phrases.js";
import { calc } from "./calcolo.mjs";

const $ = (s) => document.querySelector(s);
let listening = false;
let paused = false;
let busy = false;

function brainIsReady(){ return !!localStorage.getItem("axel-brain-type"); }
function updateStatus(t){ const el=$("#statusText"); if(el) el.textContent=t; }
function updateClock(){
  const n=new Date();
  const c=$("#clock"); const d=$("#date");
  if(c) c.textContent=n.toLocaleTimeString("it-IT");
  if(d) d.textContent=n.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
}
setInterval(updateClock,1000); updateClock();
function openSetup(){ $("#setup")?.classList.add("open"); }
function closeSetup(){ $("#setup")?.classList.remove("open"); }
function showSay(t){ const el=$("#says"); if(el) el.textContent=t; }
function showYou(t){ const el=$("#you"); if(el) el.textContent=t?"TU: "+t:""; }

function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), ms))]);
}

async function loadAgenda(){
  try{
    const ev = await withTimeout(getTodayEvents(), 5000, []);
    const list=$("#agenda"); if(!list) return;
    list.innerHTML="";
    if(!ev||!ev.length){ list.innerHTML="<li>Nessun impegno oggi</li>"; return; }
    ev.slice(0,8).forEach(e=>{
      const li=document.createElement("li");
      li.textContent=`${e.time||""} ${e.title||""}`.trim();
      list.appendChild(li);
    });
  }catch{
    const l=$("#agenda"); if(l) l.innerHTML="<li>Nessun impegno oggi</li>";
  }
}

// Comandi speciali "/..." per la voce
async function handleSpecialCommand(cmd) {
  const parts = cmd.slice(1).trim().split(/\s+/);
  const name = parts[0].toLowerCase();

  if (name === "voci" || name === "voices") {
    listVoices();
    showSay("Voci elencate in console (F12) e nel pannello debug (tasto D).");
    return true;
  }
  if (name === "voce" && parts.length >= 2) {
    const arg = parts.slice(1).join(" ");
    let v = null;
    if (/^\d+$/.test(arg)) v = setVoiceByIndex(parseInt(arg, 10));
    else v = setVoiceByName(arg);
    if (v) {
      showSay(`Voce cambiata: ${v.name}. ${await demoVoice(v.name)}`);
      await speak("Ciao, sono Axel. Come ti sembro?");
    } else {
      showSay(`Voce "${arg}" non trovata. Digita /voci per l'elenco.`);
    }
    return true;
  }
  if (name === "rate") {
    setRate(parts[1]); showSay(`Velocità impostata: ${localStorage.getItem("axel-voice-rate")||"1.0"}.`);
    await speak("Prova di velocità."); return true;
  }
  if (name === "pitch") {
    setPitch(parts[1]); showSay(`Tono impostato: ${localStorage.getItem("axel-voice-pitch")||"1.0"}.`);
    await speak("Prova di tono."); return true;
  }
  return false;
}
async function demoVoice() { return ""; }

async function handleUserText(text){
  if(!text||!text.trim()) return;
  if(busy) return;
  const clean=text.trim();

  if (clean.startsWith("/")) {
    showYou(clean);
    if (await handleSpecialCommand(clean)) return;
  }

  showYou(clean);
  rememberConversation("user",clean);
  updateStatus("ELABORO...");
  busy = true;
  try {
    const lower=clean.toLowerCase();
    if(lower.includes("che ore sono")||lower.includes("che ora")){
      const ans=`Sono le ${new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}.`;
      showSay(ans); await speak(ans); return;
    }
    if(/[0-9]+\s*[\+\-\*\/x]\s*[0-9]+/.test(lower)){
      try{ const r=calc(clean); if(r!==null){
        const ans=`Fa ${r}.`; showSay(ans); await speak(ans); return;
      }}catch{}
    }
    if(lower.includes("impegni")||lower.includes("agenda")){
      await loadAgenda();
      const ans="Ho aggiornato la tua agenda.";
      showSay(ans); await speak(ans); return;
    }
    let ans = null;
    try{
      const sum=getMemorySummary();
      ans = await withTimeout(getBrainAnswer(clean,sum), 20000, null);
    }catch(e){ console.warn("[axel] brain error:", e); }
    const f = ans && String(ans).trim() ? String(ans).trim() : PHRASES.fallback;
    showSay(f);
    rememberConversation("axel",f);
    await speak(f);
  } catch(e) {
    console.warn("[axel] handleUserText error:", e);
    showSay(PHRASES.error);
    try { await speak(PHRASES.error); } catch {}
  } finally {
    busy = false;
    updateStatus("IN ASCOLTO");
  }
}

async function start(){
  const g=$("#gate");
  if(g){ g.style.display="none"; }
  document.body.dataset.mode="live";
  updateStatus("IN ASCOLTO");
  try{ await initAudio(); }catch{}
  if(!listening){
    listening=true;
    listen({
      onResult:(t)=>handleUserText(t),
      onInterim:(t)=>{ const el=$("#you"); if(el) el.textContent="TU: "+t+"..."; }
    });
  }
  showSay("Ciao, sono Axel. Dimmi pure.");
  try{ await speak("Ciao, sono Axel. Dimmi pure."); }catch{}
}

window.__axelStart = start;

$("#gate")?.addEventListener("click", ()=>{ if(brainIsReady()) start(); else openSetup(); });
$("#setupBtn")?.addEventListener("click", openSetup);
$("#setupClose")?.addEventListener("click", closeSetup);
$("#pauseBtn")?.addEventListener("click", ()=>{
  paused=!paused;
  if(paused){ stopListening(); updateStatus("PAUSA"); }
  else { paused=false; listening=false; start(); }
  const el=$("#pauseBtn span"); if(el) el.textContent=paused?"RIPRENDI":"PAUSA";
});
$("#fsBtn")?.addEventListener("click", ()=>{
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(()=>{});
});
$("#setupForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const brain=document.querySelector('input[name="brain"]:checked')?.value||"free";
  const err=$("#setupError"); if(err) err.textContent="";
  try{
    if(brain==="openai"){
      const k=$("#openaiKey")?.value.trim();
      if(!k){ if(err) err.textContent="Metti la chiave OpenAI."; return; }
      localStorage.setItem("axel-brain-type","openai");
      localStorage.setItem("axel-brain-key",k);
    } else {
      const m=$("#freeKey")?.value.trim();
      localStorage.setItem("axel-brain-type","free");
      localStorage.setItem("axel-brain-key", m || "freellmapi-auto");
    }
    const v=document.querySelector('input[name="voice"]:checked')?.value||"free";
    localStorage.setItem("axel-voice",v);
    const cal=$("#calendarUrl")?.value.trim();
    if(cal) localStorage.setItem("axel-calendar-url",cal);
    closeSetup();
    start();
  }catch{
    if(err) err.textContent="Non sono riuscito ad attivare. Riprova.";
  }
});
$("#typeBox")?.addEventListener("submit",(e)=>{
  e.preventDefault();
  const inp=$("#typeBox input"); const v=inp.value; inp.value="";
  handleUserText(v);
});
document.addEventListener("keydown", async (e)=>{
  if (e.target.tagName === "INPUT") return;
  const k = e.key.toLowerCase();

  if (k === "t") $("#typeBox input")?.focus();

  // ⚡ V = cambia voce al volo e la fa ascoltare
  if (k === "v") {
    const v = cycleVoice();
    if (v) {
      showSay(`Voce: ${v.name} (${v.lang})`);
      await speak("Ciao, sono Axel. Come ti sembro?");
    } else {
      showSay("Voci non ancora caricate, riprova tra un istante.");
    }
  }

  if (k === "w" && brainIsReady()) start();
});
loadAgenda();
updateStatus(brainIsReady()?"PRONTO":"DA CONFIGURARE");
