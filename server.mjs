// AXEL - Server locale
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".ico": "image/x-icon" };
const PORT = process.env.PORT || 4173;

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (urlPath === "/") urlPath = "/index.html";
    // Sicurezza: resta dentro la cartella
    const safe = normalize(join(root, urlPath)).startsWith(root) ? normalize(join(root, urlPath)) : join(root, "index.html");
    // node_modules per Three.js
    let filePath = safe;
    if (urlPath.startsWith("/node_modules/")) filePath = join(process.cwd(), urlPath);
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Non trovato");
  }
});
server.listen(PORT, () => console.log(`AXEL online -> http://localhost:${PORT}`));
