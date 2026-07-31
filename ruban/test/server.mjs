/**
 * Serveur statique du harnais.
 *
 * Sert trois choses sur la meme origine, ce qui evite tout probleme de contexte
 * securise ou de CORS :
 *   /            le bundle de `ruban` (dist/)
 *   /oracle.html la page qui execute le projet d'origine
 *   /legacy/...  les fichiers du projet d'origine, tels quels
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rubanRoot = path.resolve(here, '..');
const legacyRoot = path.resolve(rubanRoot, '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

function resolveFile(urlPath) {
  if (urlPath === '/' || urlPath === '') return path.join(rubanRoot, 'dist', 'index.html');
  if (urlPath === '/oracle.html') return path.join(here, 'oracle.html');
  if (urlPath.startsWith('/legacy/')) return path.join(legacyRoot, urlPath.slice('/legacy/'.length));
  return path.join(rubanRoot, 'dist', urlPath);
}

export function startServer(port = 8123) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolveFile(urlPath);
    // Ne jamais sortir des deux racines servies.
    if (!file.startsWith(rubanRoot) && !file.startsWith(legacyRoot)) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.statusCode = 404;
        res.end(`introuvable: ${urlPath}`);
        return;
      }
      res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
      res.setHeader('cache-control', 'no-store');
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, port })));
}
