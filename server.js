// AXEL SERIO - SENZA CHIAVE, SENZA .env, FUNZIONA SEMPRE
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 4173;

app.use(express.json());
app.use(express.static(__dirname));

async function wiki(domanda) {
  try {
    let parola = domanda.toLowerCase().replace(/cos'è|cosa è|che cos'è|chi è|chi era|parlami di|dimmi|spiegami|che cosa|perché|come funziona|\?/gi, "").trim() || domanda;
    let url = "https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&origin=*&titles=" + encodeURIComponent(parola);
    let r = await fetch(url);
    let d = await r.json();
    let pages = d.query.pages;
    let key = Object.keys(pages)[0];
    let testo = pages[key]?.extract;
    if (testo && testo.length > 40) return testo.split(". ").slice(0, 6).join(". ") + ".";
  } catch {}
  return null;
}

async function duck(domanda) {
  try {
    let url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(domanda) + "&format=json&no_html=1&skip_disambig=1";
    let r = await fetch(url);
    let d = await r.json();
    if (d.AbstractText) return d.AbstractText.slice(0, 1200);
    if (d.RelatedTopics && d.RelatedTopics[0] && d.RelatedTopics[0].Text) return d.RelatedTopics[0].Text.slice(0, 1200);
  } catch {}
  return null;
}

async function pollinations(domanda) {
  try {
    let url = "https://text.pollinations.ai/" + encodeURIComponent("Sei AXEL, assistente italiano. Rispondi in italiano, semplice, 5 frasi, chiamalo signore. Domanda: " + domanda);
    let r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    let t = await r.text();
    if (t && t.length > 30 && !t.toLowerCase().includes("rate limit")) return t.slice(0, 1300);
  } catch {}
  return null;
}

function localeIntelligente(domanda) {
  let q = domanda.toLowerCase();
  let arg = domanda.replace(/cos'è|cosa è|che cos'è|chi è|parlami di|dimmi|spiegami|\?/gi, "").trim() || domanda;
  if (q.includes("computer")) return "Signore, il computer è una macchina che fa calcoli e segue istruzioni. Ha un processore che è il cervello, una memoria dove ricorda le cose, e un disco dove salva i file. Tu gli dai un comando, lui lo esegue in un millesimo di secondo. Serve per lavorare, studiare, giocare e parlare con altre persone.";
  if (q.includes("telefono") || q.includes("cellulare")) return "Signore, il telefono è un computer piccolo che sta in tasca. Serve per chiamare, mandare messaggi, andare su internet e fare foto. Dentro ha un processore, una batteria e un'antenna che si collega alle celle telefoniche. Oggi lo usiamo per tutto, anche per ascoltare musica e guardare video.";
  if (q.includes("internet")) return "Signore, internet è una rete gigante che collega tutti i computer del mondo. Quando cerchi una cosa, il tuo computer chiede a un altro computer lontano, e quello ti manda indietro la risposta in un attimo. Serve per cercare informazioni, parlare con le persone e vedere video.";
  if (q.includes("intelligenza artificiale") || q.includes(" ia ") || q.includes(" ai ")) return "Signore, l'intelligenza artificiale è un programma che impara dai dati. Gli fai vedere tanti esempi, lui capisce lo schema e poi risponde da solo a domande nuove. Non pensa come un umano, ma fa finta molto bene perché ha visto tantissimi esempi.";
  if (q.includes("perché") || q.includes("perche")) return "Signore, per " + arg + " c'è un motivo preciso. Tutto ha una causa: niente succede per caso. Se mi dici un esempio preciso, tipo perché il cielo è blu, te lo spiego passo passo con parole semplici.";
  if (q.includes("come si fa") || q.includes("come fare")) return "Signore, per " + arg + " si fa così: prima capisci cosa ti serve, poi fai un passo alla volta senza fretta, e alla fine controlli se funziona. Se mi dici cosa vuoi fare di preciso, ti faccio la lista passo passo.";
  if (q.includes("chi è") || q.includes("chi era")) return "Signore, " + arg + " è una persona di cui si parla tanto. Se mi dici nome e cognome completi, ti racconto chi era, cosa ha fatto e perché è famoso.";
  if (q.includes("cos'è") || q.includes("cosa è")) return "Signore, " + arg + " è una cosa che si capisce meglio con un esempio. È qualcosa che usiamo nella vita di tutti i giorni. Se mi dici dove l'hai sentita, ti spiego a cosa serve e come funziona, con parole semplici.";
  return "Signore, bella domanda: " + domanda + ". Ti dico quello che so: è un argomento che si capisce meglio partendo dalle basi. Dimmi se vuoi che te lo spieghi in modo semplice con un esempio, o in modo dettagliato, e te lo spiego subito.";
}

app.post("/api/chat", async (req, res) => {
  try {
    let domanda = (req.body?.domanda || "").toString().slice(0, 1000);
    if (!domanda) return res.json({ risposta: "Signore, non ho sentito la domanda." });
    let q = domanda.toLowerCase();
    if (q.includes("che ore")) return res.json({ risposta: "Sono le " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) + ", signore." });
    if (q.includes("che giorno")) return res.json({ risposta: "Oggi è " + new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ", signore." });
    if (q.includes("quanto fa")) {
      try {
        let expr = domanda.replace(/quanto fa/gi, "").replace(/più/gi, "+").replace(/per/gi, "*").replace(/diviso/gi, "/").replace(/meno/gi, "-").replace(/x/gi, "*");
        return res.json({ risposta: "Fa " + Function("return (" + expr + ")")() + ", signore." });
      } catch {}
    }
    // 1. Provo il cervello gratis senza chiave, dal server (qui non c'è CORS)
    let r = await pollinations(domanda);
    if (r) return res.json({ risposta: r });
    // 2. Wikipedia
    r = await wiki(domanda);
    if (r) return res.json({ risposta: r });
    // 3. DuckDuckGo
    r = await duck(domanda);
    if (r) return res.json({ risposta: r });
    // 4. Cervello locale, risponde sempre, mai "occupato", mai "chiave"
    return res.json({ risposta: localeIntelligente(domanda) });
  } catch (e) {
    console.log(e);
    return res.json({ risposta: localeIntelligente(req.body?.domanda || "questa cosa") });
  }
});

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")); });
app.listen(PORT, () => { console.log("AXEL SERIO SENZA CHIAVE online su http://localhost:" + PORT); });
