
// AXEL - Server AI con DeepSeek, Groq, OpenAI, OpenRouter, Gemini e FreeLLMAPI

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

// --------------------------------------------------
// SAPERE LOCALE
// --------------------------------------------------

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

// --------------------------------------------------
// RILEVAMENTO AUTOMATICO DEL PROVIDER AI
// --------------------------------------------------

function detectProvider() {

  // DEEPSEEK
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: "deepseek",
      url: "https://api.deepseek.com/chat/completions",
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.AXEL_MODEL || "deepseek-flash"
    };
  }

  // GROQ
  if (process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.AXEL_MODEL || "llama-3.3-70b-versatile"
    };
  }

  // OPENAI
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.AXEL_MODEL || "gpt-4o-mini"
    };
  }

  // OPENROUTER
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.AXEL_MODEL || "meta-llama/llama-3.3-70b-instruct:free"
    };
  }

  // GEMINI
  if (process.env.GEMINI_API_KEY) {
    return {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: process.env.AXEL_MODEL || "gemini-1.5-flash"
    };
  }

  // FREELLMAPI
  if (process.env.FREELLM_API_KEY) {
    return {
      name: "freellmapi",
      url: (process.env.FREELLM_URL || "http://localhost:3001") + "/v1/chat/completions",
      key: process.env.FREELLM_API_KEY,
      model: process.env.AXEL_MODEL || "auto"
    };
  }

  return null;
}

const PROVIDER = detectProvider();

// --------------------------------------------------
// PERSONALITÀ DI AXEL
// --------------------------------------------------

function buildSystemPrompt() {

  const now = new Date().toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `Sei AXEL, assistente personale ispirato a JARVIS di Iron Man.

Parli esclusivamente italiano.

PERSONALITÀ:
- Sei intelligente, educato, elegante e sicuro.
- Hai un tono calmo e professionale.
- Hai un pizzico di ironia britannica.
- Chiami l'utente "signore".
- Sei un assistente personale, non un semplice chatbot.

COMPORTAMENTO:
- Rispondi direttamente alla domanda.
- Usa frasi naturali e facili da comprendere.
- Normalmente rispondi con 1-3 frasi.
- Approfondisci quando il signore te lo chiede.
- Non inventare informazioni.
- Se non conosci una risposta, ammettilo.
- Ricorda il contesto delle conversazioni quando viene fornito.
- Non dichiarare di aver eseguito azioni sul computer se non hai realmente ricevuto conferma.

DATA E ORA:
${now}

Sei AXEL. Il tuo compito è assistere il signore nel modo migliore possibile.`;
}

// --------------------------------------------------
// COLLEGAMENTO CON L'INTELLIGENZA ARTIFICIALE
// --------------------------------------------------

async function askLLM(domanda, memoria) {

  if (!PROVIDER) {
    return null;
  }

  const messages = [
    {
      role: "system",
      content: buildSystemPrompt()
    }
  ];

  // MEMORIA
  if (memoria && (
    memoria.userName ||
    memoria.facts ||
    memoria.lastConversations
  )) {

    const ctx = [];

    if (memoria.userName) {
      ctx.push(`Nome utente: ${memoria.userName}.`);
    }

    if (memoria.facts) {
      ctx.push(`Informazioni conosciute: ${memoria.facts}.`);
    }

    if (memoria.lastConversations) {
      ctx.push(`Conversazioni recenti:\n${memoria.lastConversations}`);
    }

    if (ctx.length) {
      messages.push({
        role: "system",
        content: "MEMORIA DELL'ASSISTENTE:\n" + ctx.join("\n")
      });
    }
  }

  messages.push({
    role: "user",
    content: domanda
  });

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 25000);

  try {

    console.log(`[AXEL] Richiesta inviata a ${PROVIDER.name.toUpperCase()}...`);

    const r = await fetch(PROVIDER.url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PROVIDER.key}`,

        ...(PROVIDER.name === "openrouter" && {
          "HTTP-Referer": "http://localhost:4173",
          "X-Title": "AXEL"
        })
      },

      body: JSON.stringify({
        model: PROVIDER.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),

      signal: controller.signal
    });

    if (!r.ok) {

      const err = await r.text();

      console.error(
        `[LLM ${PROVIDER.name}] HTTP ${r.status}:`,
        err.slice(0, 500)
      );

      return null;
    }

    const data = await r.json();

    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.warn("[AXEL] Risposta AI vuota.");
      return null;
    }

    console.log(
      `[AXEL] ${PROVIDER.name.toUpperCase()} ha risposto correttamente.`
    );

    return answer;

  } catch (e) {

    if (e.name === "AbortError") {
      console.warn("[AXEL] Richiesta AI scaduta.");
    } else {
      console.error("[AXEL] Errore AI:", e.message);
    }

    return null;

  } finally {
    clearTimeout(timeout);
  }
}

// --------------------------------------------------
// API PRINCIPALE DI AXEL
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {

  try {

    const domanda = String(req.body?.domanda || "")
      .slice(0, 2000)
      .trim();

    const memoria = req.body?.memoria || null;

    if (!domanda) {
      return res.json({
        risposta: "Signore, non ho sentito la domanda."
      });
    }

    const q = domanda.toLowerCase();

    // ORA
    if (q.includes("che ore") || q.includes("che ora")) {

      return res.json({
        risposta:
          "Sono le " +
          new Date().toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit"
          }) +
          ", signore."
      });
    }

    // DATA
    if (q.includes("che giorno") || q.includes("che data")) {

      return res.json({
        risposta:
          "Oggi è " +
          new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }) +
          ", signore."
      });
    }

    // SAPERE LOCALE
    const locale = trovaSapere(domanda);

    if (locale) {
      return res.json({
        risposta: locale,
        fonte: "locale"
      });
    }

    // INTELLIGENZA ARTIFICIALE
    const answer = await askLLM(domanda, memoria);

    if (answer) {
      return res.json({
        risposta: answer,
        fonte: PROVIDER.name
      });
    }

    // NESSUNA CHIAVE API
    if (!PROVIDER) {

      return res.json({
        risposta:
          "Signore, non ho ancora un motore di intelligenza artificiale configurato. Controlla il file .env e la tua chiave API DeepSeek.",
        fonte: "no-key"
      });
    }

    // ERRORE DEL PROVIDER
    return res.json({
      risposta:
        "Signore, al momento non riesco a collegarmi al mio cervello artificiale. Controlli la connessione e la configurazione API.",
      fonte: "error"
    });

  } catch (e) {

    console.error("[AXEL API] Errore:", e);

    return res.json({
      risposta: "Signore, si è verificato un problema. Riprovi."
    });
  }
});

// --------------------------------------------------
// CONTROLLO STATO DEL CERVELLO
// --------------------------------------------------

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    provider: PROVIDER ? PROVIDER.name : null,
    model: PROVIDER ? PROVIDER.model : null,
    configured: !!PROVIDER
  });

});

// --------------------------------------------------
// PAGINA PRINCIPALE
// --------------------------------------------------

app.get("/", (req, res) => {

  res.sendFile(path.join(__dirname, "index.html"));

});

// --------------------------------------------------
// AVVIO DEL SERVER
// --------------------------------------------------

app.listen(PORT, () => {

  console.log("");
  console.log("======================================");
  console.log("          AXEL SYSTEM ONLINE");
  console.log("======================================");

  console.log(`Server: http://localhost:${PORT}`);

  if (PROVIDER) {

    console.log(`Cervello AI: ${PROVIDER.name.toUpperCase()}`);
    console.log(`Modello: ${PROVIDER.model}`);

  } else {

    console.log("ATTENZIONE: nessuna API configurata.");
    console.log("AXEL userà solamente il sapere locale.");

  }

  console.log("======================================");
  console.log("");

});
