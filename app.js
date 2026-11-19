// AXEL - App senza 3D, solo voce. Così il clic funziona sempre.
import { rememberConversation, getMemorySummary } from "./memoria.mjs";
import { initAudio, speak, listen, stopListening } from "./audio.js";
import { getBrainAnswer } from "./cervello-gratis.mjs";
import { getTodayEvents } from "./calendar.mjs";
import { PHRASES } from "./phrases.js";
import { calc } from "./calcolo.mjs";
const $ = (s) => document.querySelector(s);
let listening = false;
let paused = false;
function brainIsReady(){ return !!localStorage.getItem("axel-brain-type"); }
function updateStatus(t){ const el=$("#statusText"); if(el) el.textContent=t; }
function updateClock(){ const n=new Date(); const c=$("#clock"); const d=$("#date"); if(c) c.textContent=n.toLocaleTimeString("it-IT"); if(d) d.textContent=n.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"}); }
setInterval(updateClock,1000); updateClock();
function openSetup(){ $("#setup")?.classList.add("open"); }
function closeSetup(){ $("#setup")?.classList.remove("open"); }
function showSay(t){ const el=$("#says"); if(el) el.textContent=t; }
function showYou(t){ const el=$("#you"); if(el) el.textContent=t?"TU: "+t:""; }
async function loadAgenda(){ try{ const ev=await getTodayEvents(); const list=$("#agenda"); if(!list) return; list.innerHTML=""; if(!ev||!ev.length){ list.innerHTML="<li>Nessun impegno oggi</li>"; return; } ev.slice(0,8).forEach(e=>{ const li=document.createElement("li"); li.textContent=`${e.time||""} ${e.title||""}`.trim(); list.appendChild(li); }); }catch{ const l=$("#agenda"); if(l) l.innerHTML="<li>Nessun impegno oggi</li>"; } }
async function handleUserText(text){ if(!text||!text.trim()) return; const clean=text.trim(); showYou(clean); rememberConversation("user",clean); updateStatus("ELABORO..."); const lower=clean.toLowerCase(); if(lower.includes("che ore sono")||lower.includes("che ora")){ const ans=`Sono le ${new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}.`; showSay(ans); await speak(ans); updateStatus("IN ASCOLTO"); return; } if(/[0-9]+\s*[\+\-\*\/x]\s*[0-9]+/.test(lower)){ try{ const r=calc(clean); if(r!==null){ const ans=`Fa ${r}.`; showSay(ans); await speak(ans); updateStatus("IN ASCOLTO"); return; } }catch{} } if(lower.includes("impegni")||lower.includes("agenda")){ await loadAgenda(); const ans="Ho aggiornato la tua agenda."; showSay(ans); await speak(ans); updateStatus("IN ASCOLTO"); return; } try{ const sum=getMemorySummary(); const ans=await getBrainAnswer(clean,sum); const f=ans&&String(ans).trim()?String(ans).trim():PHRASES.fallback; showSay(f); rememberConversation("axel",f); await speak(f); }catch{ const f=PHRASES.fallback; showSay(f); await speak(f); } updateStatus("IN ASCOLTO"); }
async function start(){ const g=$("#gate"); if(g){ g.style.display="none"; } document.body.dataset.mode="live"; updateStatus("IN ASCOLTO"); try{ await initAudio(); }catch{} if(!listening){ listening=true; listen({ onResult:(t)=>handleUserText(t), onInterim:(t)=>{ const el=$("#you"); if(el) el.textContent="TU: "+t+"..."; } }); } showSay("Ciao, sono Axel. Dimmi pure."); try{ await speak("Ciao, sono Axel. Dimmi pure."); }catch{} }
// Rendo start cliccabile anche se il resto si rompe
window.__axelStart = start;
$("#gate")?.addEventListener("click", ()=>{ if(brainIsReady()) start(); else openSetup(); });
$("#setupBtn")?.addEventListener("click", openSetup);
$("#setupClose")?.addEventListener("click", closeSetup);
$("#pauseBtn")?.addEventListener("click", ()=>{ paused=!paused; if(paused){ stopListening(); updateStatus("PAUSA"); } else { start(); } $("#pauseBtn span").textContent=paused?"RIPRENDI":"PAUSA"; });
$("#fsBtn")?.addEventListener("click", ()=>{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(()=>{}); });
$("#setupForm")?.addEventListener("submit", async (e)=>{ e.preventDefault(); const brain=document.querySelector('input[name="brain"]:checked')?.value||"free"; const err=$("#setupError"); if(err) err.textContent=""; try{ if(brain==="openai"){ const k=$("#openaiKey")?.value.trim(); if(!k){ if(err) err.textContent="Metti la chiave OpenAI."; return; } localStorage.setItem("axel-brain-type","openai"); localStorage.setItem("axel-brain-key",k); } else { const m=$("#freeKey")?.value.trim(); localStorage.setItem("axel-brain-type","free"); if(m) localStorage.setItem("axel-brain-key",m); else localStorage.setItem("axel-brain-key","freellmapi-auto"); } const v=document.querySelector('input[name="voice"]:checked')?.value||"free"; localStorage.setItem("axel-voice",v); const cal=$("#calendarUrl")?.value.trim(); if(cal) localStorage.setItem("axel-calendar-url",cal); closeSetup(); start(); }catch{ if(err) err.textContent="Non sono riuscito ad attivare. Riprova."; } });
$("#typeBox")?.addEventListener("submit",(e)=>{ e.preventDefault(); const inp=$("#typeBox input"); const v=inp.value; inp.value=""; handleUserText(v); });
document.addEventListener("keydown",(e)=>{ if(e.key.toLowerCase()==="t") $("#typeBox input")?.focus(); if(e.key.toLowerCase()==="w"&&brainIsReady()) start(); });
loadAgenda();
updateStatus(brainIsReady()?"PRONTO":"DA CONFIGURARE");
