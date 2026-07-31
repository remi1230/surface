/**
 * Prend une image de quelques formes, hors ecran, en PNG.
 * Sert de preuve visuelle que la passe de rendu fait ce qu'elle dit, et de
 * point de comparaison si une frame change sans qu'on l'ait voulu.
 *
 * Usage : node test/shots.mjs [dossier]
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { openHarness } from './harness.mjs';

/** Encodeur PNG minimal (RGBA8, sans filtre) — evite une dependance pour six images. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width * 4; x++) raw[y * (width * 4 + 1) + 1 + x] = rgba[y * width * 4 + x];
  }
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = process.argv[2] ?? 'mesures/images';
fs.mkdirSync(outDir, { recursive: true });

const SHOTS = [
  { form: 'Sphere' },
  { form: 'Torus' },
  { form: 'Klein Bottle' },
  { form: 'Moebius' },
  { form: 'Waves', t: 0.9 },
  { form: 'Pseudosphere' },
];

const h = await openHarness({ port: 8124, viewport: { width: 900, height: 640 } });
try {
  await h.app.evaluate(() => window.__ruban.load({ form: 'Sphere' }));
  for (const s of SHOTS) {
    await h.app.evaluate((req) => window.__ruban.load(req), { form: s.form, t: s.t ?? 0, params: { G: 1 } });
    await h.app.evaluate(() => window.__ruban.step(0));
    const img = await h.app.evaluate(() => window.__ruban.frame());
    const file = path.join(outDir, `${s.form.toLowerCase().replace(/\s+/g, '-')}.png`);
    fs.writeFileSync(file, encodePng(img.width, img.height, Uint8Array.from(img.data)));
    process.stderr.write(`${file}\n`);
  }
} finally {
  await h.close();
}
