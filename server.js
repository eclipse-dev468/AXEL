// AXEL - Server serio - tiene la chiave al sicuro, non nel browser
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4173;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// se i tuoi file sono nella root e non in public, usa anche questo:
app.use(express.static(__dirname));

// --- CERVELLO SERIO: Groq gratis, lato server, senza CORS, senza esporre chiave ---
app.post("/api/chat", async (req, res) => {
  try {
    const domanda = (req.body?.domanda || "").toString().slice(0, 1000);
    if (!domanda) return res.json({ risposta: "Signore, non ho sentito la domanda." });

    const q = domanda.toLowerCase();
    if (q.includes("che ore")) return res.json({ risposta: "Sono le " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) + ", signore." });
    if (q.includes("che giorno")) return res.json({ risposta: "Oggi è " + new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ", signore." });

    const chiave = process.env.GROQ_API_KEY || "";
    if (!chiave) {
      // Se non c'è chiave, usa 【entity-Wikipedia¦canonical_name=Wikipedia】, non dice "occupato"
      try {
        const parola = domanda.replace(/cos'è|cosa è|chi è|parlami di|dimmi|spiegami|\?/gi, "").trim() || domanda;
        const url = "https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&origin=*&titles=" + encodeURIComponent(parola);
        const r = await fetch(url);
        const d = await r.json();
        const pages = d.query.pages;
        const key = Object.keys(pages)[0];
        const testo = pages[key]?.extract;
        if (testo) return res.json({ risposta: testo.split(". ").slice(0, 5).join(". ") + "." });
      } catch {}
      return res.json({ risposta: "Signore, metti la chiave Groq gratis nel file .env sul PC. Senza quella uso solo 【entity-Wikipedia¦canonical_name=Wikipedia】. Il file è .env e dentro scrivi: GROQ_API_KEY=gsk_..." });
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + chiave },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Sei AXEL, assistente personale italiano come Jarvis. Sai tutto. Rispondi in italiano, semplice, max 6 frasi. Chiamalo sempre e solo signore." },
          { role: "user", content: domanda }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.log("Groq errore:", r.status, err.slice(0, 300));
      if (r.status === 401) return res.json({ risposta: "Signore, la chiave Groq nel file .env non è giusta. Controlla che inizi con gsk_ e che sia intera." });
      if (r.status === 429) return res.json({ risposta: "Signore, hai fatto troppe domande in un minuto. Aspetta 20 secondi e riprova." });
      return res.json({ risposta: "Signore, Groq non ha risposto. Riprova tra poco." });
    }
    const d = await r.json();
    const testo = d?.choices?.[0]?.message?.content?.trim();
    if (!testo) return res.json({ risposta: "Signore, il cervello non ha risposto. Riprova." });
    return res.json({ risposta: testo.slice(0, 1500) });
  } catch (e) {
    console.log("Errore server:", e);
    return res.json({ risposta: "Signore, c'è un problema di connessione. Controlla che il PC sia online e riprova." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("AXEL serio online su http://localhost:" + PORT);
  console.log("Chiave Groq presente:", !!process.env.GROQ_API_KEY ? "SI" : "NO - mettila in .env");
});
