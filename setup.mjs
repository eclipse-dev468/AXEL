// AXEL - Setup automatico
import { writeFile, access } from "node:fs/promises";
import { join } from "node:path";
console.log("Installazione di AXEL...");
const pkgPath = join(process.cwd(), "package.json");
try { await access(pkgPath); console.log("package.json trovato: OK"); }
catch { console.log("ATTENZIONE: package.json non trovato. Assicurati di essere nella cartella AXEL."); }
try {
  const bat = `@echo off\nchcp 65001 >nul\ntitle AXEL\ncd /d "%~dp0"\necho Avvio AXEL...\nnpm start\npause\n`;
  await writeFile(join(process.cwd(), "START-AXEL.bat"), bat, "utf8");
  console.log("START-AXEL.bat creato: OK");
} catch (e) { console.log("Non ho potuto creare START-AXEL.bat:", e.message); }
console.log("Fatto! Ora fai doppio clic su START-AXEL.bat");
