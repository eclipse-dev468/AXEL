// AXEL - Calcolo
// Capisce "quanto fa 25 per 4", "25 + 12", "quanto fa 100 diviso 4"

export function calc(input) {
  if (!input) return null;
  let text = String(input).toLowerCase().trim();

  // Pulisci la frase
  text = text
    .replace(/quanto fa/g, "")
    .replace(/quanto è/g, "")
    .replace(/calcola/g, "")
    .replace(/fammi/g, "")
    .replace(/\?/g, "")
    .trim();

  // Parole italiane -> simboli
  text = text
    .replace(/più/g, "+")
    .replace(/meno/g, "-")
    .replace(/per/g, "*")
    .replace(/x/g, "*")
    .replace(/moltiplicato/g, "*")
    .replace(/diviso/g, "/")
    .replace(/fratto/g, "/")
    .replace(/diviso per/g, "/")
    .replace(/,/g, ".");

  // Trova l'espressione matematica
  const match = text.match(/([0-9\.\s\+\-\*\/\(\)]+)/);
  if (!match) return null;
  let expr = match[0].trim();
  // Deve esserci almeno un operatore
  if (!/[\+\-\*\/]/.test(expr)) return null;
  // Solo caratteri sicuri
  if (!/^[0-9\.\s\+\-\*\/\(\)]+$/.test(expr)) return null;

  try {
    // Calcolo sicuro, senza eval pericoloso
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result !== "number" || !isFinite(result)) return null;
    // Arrotonda a 2 decimali se serve
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export function isCalcRequest(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return t.includes("quanto fa") || t.includes("calcola") || /[0-9]+\s*[\+\-\*\/x]\s*[0-9]+/.test(t);
}

export default { calc, isCalcRequest };
