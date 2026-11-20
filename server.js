// AXEL - Server con LLM vero (Groq / OpenAI / OpenRouter / Gemini / FreeLLMAPI)
// Rileva in automatico quale provider usare in base alla chiave nel .env.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 4173;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

// ----------------------------------------------------------------
// SAPERE LOCALE (offline, risposta istantanea, senza AI)
// Tiene i 20 oggetti semplici che già conoscevi + comandi diretti.
// ----------------------------------------------------------------
const SAPERE = {
  "tenda": "Signore, la tenda è fatta così. Il materiale è tessuto: cotone, lino, poliestere o velluto. In alto c'è la fettuccia, una striscia rinforzata dove si attaccano gli anelli, gli occhielli o i ganci. Poi c'è il telo, il pezzo grande di stoffa, tagliato a misura della finestra. In basso c'è l'orlo, la piega cucita per dare peso e farla cadere dritta. Si appende a un bastone o a un binario sopra la finestra. Serve per non far entrare la luce, per privacy e per decorare.",
  "computer": "Signore, il computer è fatto così. Fuori c'è il case. Dentro c'è la scheda madre, il processore (il cervello), la RAM (memoria veloce), il disco (memoria permanente) e l'alimentatore. Fuori ci sono schermo, tastiera e mouse. Tu gli dai un comando, lui lo esegue in un millesimo di secondo.",
  "telefono": "Signore, il telefono è un computer piccolo che sta in tasca. Fuori c'è lo schermo touch e la scocca. Dentro batteria, processore, memoria e antenna. Serve per chiamare, mandare messaggi, andare su internet, fare foto.",
  "internet": "Signore, internet è una rete gigante che collega tutti i computer del mondo con cavi e antenne. Quando cerchi una cosa, il tuo telefono chiede a un server lontano, e quello ti manda la risposta in un attimo.",
  "macchina": "Signore, la macchina ha il motore che brucia benzina o gasolio e fa girare le ruote, il cambio, 4 ruote con le gomme, i freni, lo sterzo e la carrozzeria. Dentro ci sono volante, pedali e sedili. Serve per spostarsi velocemente.",
  "casa": "Signore, la casa ha le fondamenta, i muri, il tetto, finestre e porta. Dentro ci sono cucina, bagno, camera e salotto. Ci sono i tubi per l'acqua, i fili per la corrente e il riscaldamento.",
  "tavolo": "Signore, il tavolo ha un piano (legno, vetro o plastica) e 4 gambe collegate tra loro. Serve per mangiare, lavorare e appoggiare le cose.",
  "sedia": "Signore, la sedia ha la seduta, lo schienale, 4 gambe e a volte i braccioli. È di legno, plastica o metallo. Serve per sedersi.",
  "pizza": "Signore, la pizza è impasto di farina, acqua, lievito e sale steso tondo, con passata di pomodoro, mozzarella e olio. Va in forno a 250 gradi per 7-8 minuti. La Margherita ha solo pomodoro, mozzarella e basilico.",
  "pasta": "Signore, la pasta è fatta con farina di grano duro e acqua, o con uova. Si cuoce in acqua bollente salata per 8-10 minuti. Si condisce con sugo, olio o burro.",
  "cane": "Signore, il cane è un animale domestico con 4 zampe, coda, orecchie e un naso che sente odori molto meglio del nostro. Mangia carne, crocchette e dorme tanto. È intelligente e fa compagnia.",
  "gatto": "Signore, il gatto è un animale domestico con 4 zampe, coda lunga, orecchie a punta e occhi che vedono al buio. È agile, salta alto, si pulisce da solo leccandosi. È indipendente ma vuole le coccole.",
  "sole": "Signore, il sole è una stella, una palla gigante di gas caldissimo al centro del sistema solare. Manda luce e calore sulla Terra. Senza di lui non ci sarebbe vita.",
  "luna": "Signore, la luna è il satellite della Terra. Non ha luce sua, riflette quella del sole. Cambia forma ogni notte perché il sole la illumina diversamente. Fa le maree.",
  "acqua": "Signore, l'acqua è fatta di due atomi di idrogeno e uno di ossigeno. È liquida, trasparente, senza odore. Serve per bere, lavarsi, cucinare. Se fa freddo diventa ghiaccio, se fa caldo vapore."
};

function trovaSapere(domanda) {
  const q = domanda.toLowerCase();
  for (const chiave in SAPERE) {
    if (q.includes(chiave)) return SAPERE[chiave];
  }
  return null;
}

// ----------------------------------------------------------------
// RILEVAMENTO PROVIDER LLM
// ----------------------------------------------------------------
function detectProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.AXEL_MODEL || "llama-3.3-70b-versatile",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.AXEL_MODEL || "gpt-4o-mini",
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.AXEL_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: process.env.AXEL_MODEL || "gemini-1.5-flash",
    };
  }
  if (process.env.FREELLM_API_KEY) {
    return {
      name: "freellmapi",
      url: (process.env.FREELLM_URL || "http://localhost:3001") + "/v1/chat/completions",
      key: process.env.FREELLM_API_KEY,
      model: process.env.AXEL_MODEL || "auto",
    };
  }
  return null;
}

const PROVIDER = detectProvider();

// ----------------------------------------------------------------
// PROMPT DI SISTEMA
// ----------------------------------------------------------------
function buildSystemPrompt() {
  const now = new Date().toLocaleString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return `Sei AXEL, assistente personale in stile Iron Man. Parli italiano.
Tono: calmo, brillante, elegante, con un filo di ironia britannica. Dai del tu, chiama l'utente "signore". Mai servile, mai prolisso.

REGOLE:
- Rispondi in modo diretto e concreto. Frasi brevi e scorrevoli.
- Di norma 1-3 frasi (max ~60 parole). Approfondisci solo se te lo chiede ("spiegami", "nel dettaglio").
- Niente elenchi puntati, markdown, emoji, simboli o parentesi. Se devi elencare, fallo a voce: "primo..., poi..., infine...".
- Numeri, orari e date scritti come si pronunciano naturalmente.
- Se non sai qualcosa, dillo con eleganza. Non inventare mai fatti, date, nomi o numeri.
- Non hai accesso a internet in tempo reale: per notizie, meteo o prezzi recenti dillo chiaramente.
- Usa il contesto della conversazione e la memoria che ricevi.
- Adesso è ${now}.`;
}

// ----------------------------------------------------------------
// CHIAMATA AL PROVIDER (OpenAI-compatibile)
// ----------------------------------------------------------------
async function askLLM(domanda, memoria) {
  if (!PROVIDER) {
    return null; // segnala "nessuna chiave configurata"
  }

  const messages = [{ role: "system", content: buildSystemPrompt() }];
  if (memoria && (memoria.userName || memoria.facts || memoria.lastConversations)) {
    const ctx = [];
    if (memoria.userName) ctx.push(`Nome utente: ${memoria.userName}.`);
    if (memoria.facts) ctx.push(`Cose che sa: ${memoria.facts}.`);
    if (memoria.lastConversations) ctx.push(`Conversazioni recenti:\n${memoria.lastConversations}`);
    if (ctx.length) messages.push({ role: "system", content: "MEMORIA:\n" + ctx.join("\n") });
  }
  messages.push({ role: "user", content: domanda });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const r = await fetch(PROVIDER.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PROVIDER.key}`,
        ...(PROVIDER.name === "openrouter" && {
          "HTTP-Referer": "http://localhost:4173",
          "X-Title": "AXEL",
        }),
      },
      body: JSON.stringify({
        model: PROVIDER.model,
        messages,
        temperature: 0.7,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const err = await r.text();
      console.error(`[LLM ${PROVIDER.name}] HTTP ${r.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      console.warn(`[LLM ${PROVIDER.name}] risposta vuota`);
      return null;
    }
    console.log(`[LLM ${PROVIDER.name} · ${PROVIDER.model}] ok (${answer.length} char)`);
    return answer;
  } catch (e) {
    if (e.name === "AbortError") console.warn(`[LLM ${PROVIDER.name}] timeout`);
    else console.error(`[LLM ${PROVIDER.name}] errore:`, e.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------------------
// API
// ----------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const domanda = String(req.body?.domanda || "").slice(0, 2000).trim();
    const memoria = req.body?.memoria || null;
    if (!domanda) return res.json({ risposta: "Signore, non ho sentito la domanda." });

    const q = domanda.toLowerCase();

    // 1) Comandi locali (istantanei, senza AI)
    if (q.includes("che ore") || q.includes("che ora")) {
      return res.json({
        risposta: "Sono le " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) + ", signore.",
      });
    }
    if (q.includes("che giorno") || q.includes("che data")) {
      return res.json({
        risposta: "Oggi è " + new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ", signore.",
      });
    }
    if (q.includes("quanto fa")) {
      try {
        const expr = domanda
          .replace(/quanto fa/gi, "")
          .replace(/più/gi, "+").replace(/per/gi, "*")
          .replace(/diviso/gi, "/").replace(/meno/gi, "-").replace(/x/gi, "*");
        const result = Function("return (" + expr + ")")();
        return res.json({ risposta: "Fa " + result + ", signore." });
      } catch {}
    }

    // 2) Sapere locale (istantaneo, senza AI)
    const locale = trovaSapere(domanda);
    if (locale) return res.json({ risposta: locale, fonte: "locale" });

    // 3) LLM (Groq/OpenAI/etc.)
    const answer = await askLLM(domanda, memoria);
    if (answer) return res.json({ risposta: answer, fonte: PROVIDER.name });

    // 4) Nessuna chiave configurata
    return res.json({
      risposta: `Signore, per rispondere a "cosa" che va oltre il mio sapere locale mi serve una chiave API. Apri il file .env nella cartella di AXEL e incolla la chiave gratuita di Groq (la ottieni in 30 secondi su console.groq.com/keys). Poi riavvia con "npm start".`,
      fonte: "no-key",
    });
  } catch (e) {
    console.error("[api/chat] error:", e);
    return res.json({ risposta: "Signore, c'è stato un problema. Riprova." });
  }
});

// Endpoint di salute (utile per debug)
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    provider: PROVIDER ? PROVIDER.name : null,
    model: PROVIDER ? PROVIDER.model : null,
  });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(PORT, () => {
  console.log("─────────────────────────────────────");
  console.log(`AXEL online → http://localhost:${PORT}`);
  if (PROVIDER) {
    console.log(`🧠  Cervello: ${PROVIDER.name.toUpperCase()} · ${PROVIDER.model}`);
  } else {
    console.log("⚠️  Nessuna chiave API configurata nel .env");
    console.log("    AXEL userà solo il sapere locale (20 oggetti).");
    console.log("    Per farlo sapere TUTTO: https://console.groq.com/keys");
    console.log("    (gratis, incolla la chiave nel file .env, riavvia)");
  }
  console.log("─────────────────────────────────────");
});
