// AXEL - Memoria
// Ricorda preferenze, conversazioni e routine. Tutto resta sul tuo PC.

const KEY = "axel-memory-v1";

const DEFAULT = {
  createdAt: new Date().toISOString(),
  userName: "",
  preferences: {
    voice: "free",
    language: "it",
  },
  facts: [],
  conversations: [],
  routines: [],
  notes: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...data };
  } catch {
    return structuredClone(DEFAULT);
  }
}

let memory = load();

function save() {
  try {
    memory.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {}
}

export function getMemory() {
  return memory;
}

export function rememberFact(fact) {
  if (!fact) return;
  const text = String(fact).trim();
  if (!text) return;
  if (memory.facts.includes(text)) return;
  memory.facts.push(text);
  if (memory.facts.length > 100) memory.facts = memory.facts.slice(-100);
  save();
}

export function rememberConversation(role, text) {
  if (!text) return;
  memory.conversations.push({
    role,
    text: String(text).slice(0, 2000),
    at: new Date().toISOString(),
  });
  if (memory.conversations.length > 200) memory.conversations = memory.conversations.slice(-200);
  save();
}

export function addNote(note) {
  if (!note) return;
  memory.notes.push({
    text: String(note).slice(0, 2000),
    at: new Date().toISOString(),
  });
  save();
}

export function getNotes() {
  return memory.notes;
}

export function setPreference(key, value) {
  memory.preferences[key] = value;
  save();
}

export function getPreferences() {
  return memory.preferences;
}

export function setUserName(name) {
  memory.userName = String(name || "").trim().slice(0, 50);
  save();
}

export function getUserName() {
  return memory.userName || "";
}

export function clearMemory() {
  memory = structuredClone(DEFAULT);
  try {
    localStorage.removeItem(KEY);
  } catch {}
  save();
  return memory;
}

// Serve ad app.js per ricordarsi chi sei e cosa ti piace
export function getMemorySummary() {
  const facts = memory.facts.slice(-10).join(" | ");
  const last = memory.conversations.slice(-6).map(c => `${c.role}: ${c.text}`).join("\n");
  return {
    userName: memory.userName,
    facts,
    lastConversations: last,
    notesCount: memory.notes.length,
  };
}

export default {
  getMemory,
  rememberFact,
  rememberConversation,
  addNote,
  getNotes,
  setPreference,
  getPreferences,
  setUserName,
  getUserName,
  clearMemory,
  getMemorySummary,
};
