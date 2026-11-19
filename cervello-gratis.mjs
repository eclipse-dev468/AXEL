// AXEL - Cervello gratis
// Prova prima FreeLLMAPI (localhost:3001), poi OpenAI se hai messo la chiave,
// se no risponde con risposte locali intelligenti.

import { PHRASES } from "./phrases.js";

const SYSTEM = `Sei AXEL, un assistente personale italiano, caldo, diretto e utile.
Parli sempre in italiano, in modo naturale, come un amico sveglio.
Rispondi in modo breve e chiaro, massimo 3-4 frasi, a meno che ti chiedano di spiegare meglio.
Non dire mai "undefined", non dire mai che sei un modello linguistico.
Se non sai una cosa, dillo onestamente e proponi un'alternativa.
Se ti chiedono chi sei, dici che sei Axel, l'assistente personale.`;

async function tryFreeLLMAPI(userText) {
  const key = localStorage.getItem("axel-brain-key") || "";
  // FreeLLMAPI gira su localhost:3001
  const urls = [
    "http://localhost:3001/v1/chat/completions",
    "http://127.0.0.1:3001/v1/chat/completions",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key && key !== "freellmapi-auto" ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          model: "auto",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userText },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch {}
  }
  return null;
}

async function tryOpenAI(userText) {
  const key = localStorage.getItem("axel-brain-key") || "";
  const type = localStorage.getItem("axel-brain-type") || "";
  if (type !== "openai" || !key || !key.startsWith("sk-")) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userText },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function localAnswer(text) {
  const t = text.toLowerCase();
  if (t.includes("ciao") || t.includes("buongiorno") || t.includes("buonasera")) {
    return PHRASES.greeting;
  }
  if (t.includes("come stai")) return "Sto benissimo, grazie! E tu come stai? Dimmi pure cosa ti serve.";
  if (t.includes("chi sei") || t.includes("come ti chiami")) return "Sono Axel, il tuo assistente personale. Sono qui per aiutarti con agenda, calcoli, idee e domande.";
  if (t.includes("grazie")) return "Di niente! Sono qui per questo. Hai bisogno di altro?";
  if (t.includes("che tempo") || t.includes("meteo")) return "Non ho ancora il meteo in tempo reale, ma se mi dici la città posso aiutarti a prepararti per la giornata. Vuoi che controlli gli impegni di oggi?";
  if (t.includes("racconta") && (t.includes("barzelletta") || t.includes("battuta"))) {
    return "Sai perché il computer è andato dal dottore? Perché aveva un virus! Dai, ne ho di migliori, chiedimene un'altra.";
  }
  if (t.includes("aiutami") || t.includes("aiuto")) return "Certo, dimmelo pure. Posso aiutarti con calcoli, agenda, idee, testi, promemoria e domande. Cosa ti serve?";
  if (t.includes("cosa puoi fare") || t.includes("cosa sai fare")) {
    return "Posso chiacchierare con te, aiutarti con calcoli, ricordarti gli impegni, darti idee e rispondere alle tue domande. Prova a dirmi: che ore sono, quanto fa 25 per 4, o cosa ho oggi in agenda.";
  }
  return PHRASES.fallback;
}

export async function getBrainAnswer(userText, memorySummary) {
  const text = String(userText || "").trim();
  if (!text) return PHRASES.fallback;

  const mindEl = document.getElementById("debugMind");
  if (mindEl) mindEl.textContent = "Penso...";

  const type = localStorage.getItem("axel-brain-type") || "free";

  // 1. Prova OpenAI se scelto
  if (type === "openai") {
    const openai = await tryOpenAI(text);
    if (openai) {
      if (mindEl) mindEl.textContent = "OpenAI";
      return openai;
    }
  }

  // 2. Prova FreeLLMAPI gratis
  if (type === "free") {
    const free = await tryFreeLLMAPI(text);
    if (free) {
      if (mindEl) mindEl.textContent = "FreeLLMAPI";
      return free;
    }
    if (mindEl) mindEl.textContent = "Locale (FreeLLMAPI non collegato)";
  }

  // 3. Fallback locale - mai undefined
  if (mindEl) mindEl.textContent = "Locale";
  return localAnswer(text);
}

export default { getBrainAnswer };
