/**
 * Le harnais : un navigateur, deux pages, aucune horloge murale.
 *
 * WebGPU logiciel (SwiftShader) est le pire cas, comme SwiftShader WebGL l'etait
 * pour le projet d'origine. Les chiffres mesures ici sont donc des planchers.
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './server.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** WebGPU n'est expose en headless qu'avec ce drapeau, et l'adaptateur est logiciel. */
export const CHROME_ARGS = ['--enable-unsafe-webgpu', '--enable-unsafe-swiftshader'];

export async function openHarness({ port = 8123, viewport = { width: 640, height: 480 } } = {}) {
  const { server } = await startServer(port);
  const browser = await chromium.launch({ executablePath: CHROME, args: CHROME_ARGS });
  const context = await browser.newContext({ viewport });

  const errors = [];
  const app = await context.newPage();
  app.on('pageerror', (e) => errors.push(`app: ${e.message}`));
  app.on('console', (m) => {
    if (m.type() === 'error') errors.push(`app console: ${m.text()}`);
  });
  await app.goto(`http://localhost:${port}/?offscreen=640x480`);
  await app.waitForFunction('window.__ruban !== undefined', null, { timeout: 30000 });

  const oracle = await context.newPage();
  oracle.on('pageerror', (e) => errors.push(`oracle: ${e.message}`));
  await oracle.goto(`http://localhost:${port}/oracle.html`);
  await oracle.waitForFunction('typeof window.legacyProbe === "function"', null, { timeout: 30000 });

  return {
    app,
    oracle,
    errors,
    async close() {
      await browser.close();
      server.close();
    },
  };
}

/** Ecart maximal composante a composante, et fraction de composantes identiques au bit pres. */
export function compare(a, b) {
  if (a.length !== b.length) throw new Error(`longueurs differentes: ${a.length} vs ${b.length}`);
  let max = 0;
  let sum = 0;
  let exact = 0;
  let worstIndex = -1;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (a[i] === b[i]) exact++;
    if (d > max) { max = d; worstIndex = i; }
    sum += d;
  }
  return { max, mean: sum / a.length, exactFraction: exact / a.length, worstIndex, n: a.length };
}

/** Diagonale de la boite englobante : l'echelle a laquelle rapporter un ecart. */
export function meshScale(positions) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const x = positions[i + c];
      if (!Number.isFinite(x)) continue;
      if (x < lo[c]) lo[c] = x;
      if (x > hi[c]) hi[c] = x;
    }
  }
  return Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
}

export function pct(x) {
  return `${(x * 100).toFixed(4)} %`;
}
