// AXEL - Ponte tra il browser e il server LLM
// Non contiene logica: delega tutto a /api/chat.

export async function getBrainAnswer(question, memoria = null) {
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domanda: question, memoria }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return data.risposta || null;
  } catch (e) {
    console.error("[cervello-gratis] errore:", e);
    return null;
  }
}

export default { getBrainAnswer };
