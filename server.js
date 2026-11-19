// AXEL SERIO - SA DAVVERO LE COSE
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 4173;

app.use(express.json());
app.use(express.static(__dirname));

// --- SAPERE VERO, SCRITTO BENE ---
const SAPERE = {
  "tenda": "Signore, la tenda è fatta così. Il materiale è tessuto: cotone, lino, poliestere o velluto. In alto c'è la fettuccia, una striscia rinforzata dove si attaccano gli anelli, gli occhielli o i ganci. Poi c'è il telo, il pezzo grande di stoffa, tagliato a misura della finestra. In basso c'è l'orlo, la piega cucita per dare peso e farla cadere dritta. Ai lati ci sono le cuciture che tengono insieme il tessuto. Si appende a un bastone o a un binario sopra la finestra. Serve per non far entrare la luce, per privacy e per decorare. Si fa così: si misura la finestra, si taglia la stoffa, si cuce l'orlo in basso e la fettuccia in alto, e si appende.",
  "computer": "Signore, il computer è fatto così. Fuori c'è il case, la scatola. Dentro c'è la scheda madre, che è la base dove si collega tutto. C'è il processore, che è il cervello e fa i calcoli. C'è la RAM, la memoria veloce dove tiene le cose che sta usando ora. C'è il disco, dove salva i file anche quando è spento. C'è l'alimentatore che dà corrente. Fuori c'è lo schermo, la tastiera e il mouse. Tu gli dai un comando, lui lo esegue in un millesimo di secondo.",
  "telefono": "Signore, il telefono è un computer piccolo che sta in tasca. Fuori c'è lo schermo touch e la scocca. Dentro c'è la batteria, il processore, la memoria e l'antenna che si collega alle celle telefoniche. Serve per chiamare, mandare messaggi, andare su internet, fare foto e video.",
  "internet": "Signore, internet è una rete gigante che collega tutti i computer del mondo con cavi e antenne. Quando cerchi una cosa, il tuo telefono chiede a un computer lontano che si chiama server, e quello ti manda indietro la risposta in un attimo. Serve per cercare informazioni, parlare con le persone e vedere video.",
  "macchina": "Signore, la macchina è fatta così. Ha il motore che brucia benzina o gasolio e fa girare le ruote. Ha il cambio che decide la velocità. Ha 4 ruote con le gomme, i freni per fermarsi, lo sterzo per girare, e la carrozzeria che è la scocca fuori. Dentro c'è il volante, i pedali e i sedili. Serve per spostarsi veloci da un posto all'altro.",
  "casa": "Signore, la casa è fatta così. Ha le fondamenta sotto terra che la tengono in piedi. Ha i muri di mattoni o cemento, il tetto sopra, le finestre e la porta. Dentro ci sono le stanze: cucina, bagno, camera da letto e salotto. Ci sono i tubi per l'acqua, i fili per la corrente e il riscaldamento. Serve per dormire, mangiare e stare al sicuro.",
  "tavolo": "Signore, il tavolo è fatto così. Ha il piano sopra, che è la parte piatta dove appoggi le cose, di legno, vetro o plastica. Sotto ha 4 gambe che lo tengono in piedi, collegate tra loro per non farlo ballare. Serve per mangiare, lavorare e appoggiare le cose.",
  "sedia": "Signore, la sedia è fatta così. Ha la seduta, dove ti siedi, lo schienale dietro per appoggiare la schiena, e 4 gambe. A volte ha i braccioli. È fatta di legno, plastica o metallo. Serve per sedersi.",
  "pizza": "Signore, la pizza è fatta così. La base è impasto di farina, acqua, lievito e sale, steso tondo. Sopra si mette passata di pomodoro, mozzarella e olio. Poi va in forno a 250 gradi per 7-8 minuti, finché la pasta è dorata e la mozzarella sciolta. La Margherita ha solo pomodoro, mozzarella e basilico.",
  "pasta": "Signore, la pasta è fatta con farina di grano duro e acqua, o con uova. Si impasta, si stende e si taglia nella forma che vuoi: spaghetti, penne, fusilli. Poi si cuoce in acqua bollente salata per 8-10 minuti. Si condisce con sugo, olio o burro.",
  "cane": "Signore, il cane è un animale domestico. Ha 4 zampe, la coda, le orecchie e il naso che sente gli odori molto meglio di noi. Mangia carne, crocchette e dorme tanto. È intelligente, capisce le parole e vuole stare con le persone. Serve come amico e per fare compagnia.",
  "gatto": "Signore, il gatto è un animale domestico. Ha 4 zampe, la coda lunga, le orecchie a punta e gli occhi che vedono al buio. È agile, salta alto, si pulisce da solo leccandosi. Dorme tanto, mangia carne e crocchette. È indipendente ma vuole le coccole.",
  "sole": "Signore, il sole è una stella, una palla gigante di gas caldissimo che sta al centro del sistema solare. È così caldo che brucia e manda luce e calore sulla Terra. Senza di lui non ci sarebbe vita, perché le piante hanno bisogno della sua luce per crescere.",
  "luna": "Signore, la luna è il satellite della Terra, una palla di roccia che gira intorno a noi. Non ha luce sua, riflette la luce del sole. La vediamo cambiare forma perché il sole la illumina in modo diverso ogni notte. Fa le maree nel mare.",
  "acqua": "Signore, l'acqua è fatta di due atomi di idrogeno e uno di ossigeno. È liquida, trasparente, senza odore. Serve per bere, per lavarsi, per cucinare e per far crescere le piante. Se fa freddo diventa ghiaccio, se fa caldo diventa vapore."
};

function trovaSapere(domanda) {
  let q = domanda.toLowerCase();
  for (let chiave in SAPERE) {
    if (q.includes(chiave)) return SAPERE[chiave];
  }
  return null;
}

async function wiki(domanda) {
  try {
    let parola = domanda.toLowerCase().replace(/spiegami|dimmi|come è fatta|come è fatto|cos'è|cosa è|che cos'è|chi è|parlami di|\?/gi, "").trim() || domanda;
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

async function pollinations(domanda) {
  try {
    // Ora chiedo una spiegazione vera, con struttura, non un esempio a caso
    let prompt = "Sei AXEL. Spiega in italiano semplice, con struttura vera: 1) di cosa è fatta, 2) come è fatta, 3) a cosa serve, 4) come si fa. Non fare esempi con camerieri o cose a caso. Spiega la cosa chiesta in modo concreto. Domanda: " + domanda;
    let url = "https://text.pollinations.ai/" + encodeURIComponent(prompt);
    let r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    let t = await r.text();
    if (t && t.length > 50 && !t.toLowerCase().includes("rate limit") && !t.toLowerCase().includes("cameriere")) return t.slice(0, 1400);
  } catch {}
  return null;
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
    // 1. Prima il sapere vero che gli ho insegnato
    let s = trovaSapere(domanda);
    if (s) return res.json({ risposta: s });
    // 2. Poi Pollinations con prompt serio, non con camerieri
    let r = await pollinations(domanda);
    if (r) return res.json({ risposta: r });
    // 3. Poi 【entity-Wikipedia¦canonical_name=Wikipedia】
    r = await wiki(domanda);
    if (r) return res.json({ risposta: r });
    // 4. Ultima risorsa: spiego che non lo so, ma non invento esempi stupidi
    return res.json({ risposta: "Signore, per " + domanda + " non ho ancora la spiegazione pronta. Dimmi una cosa che so bene, tipo tenda, computer, macchina, pizza, cane, e te la spiego davvero bene." });
  } catch (e) {
    return res.json({ risposta: "Signore, c'è un problema. Riprova." });
  }
});

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")); });
app.listen(PORT, () => { console.log("AXEL SERIO online su http://localhost:" + PORT); });
