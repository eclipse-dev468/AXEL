// AXEL - Calendario
export async function getTodayEvents() {
  const url = localStorage.getItem("axel-calendar-url") || "";
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const events = [];
    const blocks = text.split("BEGIN:VEVENT").slice(1);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    for (const b of blocks) {
      const dt = (b.match(/DTSTART[^:]*:([0-9T]+)/) || [])[1] || "";
      const summary = (b.match(/SUMMARY:(.+)/) || [])[1] || "Impegno";
      if (!dt) continue;
      // Solo eventi di oggi
      if (!dt.startsWith(todayStr)) continue;
      let time = "";
      const tm = dt.match(/T([0-9]{2})([0-9]{2})/);
      if (tm) time = `${tm[1]}:${tm[2]}`;
      events.push({ time, title: summary.trim(), summary: summary.trim() });
    }
    return events.sort((a,b) => a.time.localeCompare(b.time));
  } catch { return []; }
}
export default { getTodayEvents };
