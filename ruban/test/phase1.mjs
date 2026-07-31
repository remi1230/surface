/**
 * Campagne de mesure de la phase 1.
 *
 * « Chaque phase se termine par une mesure, jamais par une affirmation. »
 * Recette annoncee : *le maillage coincide avec celui de l'application actuelle
 * pour la meme formule.* Les autres mesures sont la parce qu'une seule
 * comparaison ne dit pas si l'accord vient de la justesse ou d'une coincidence.
 *
 * Sortie : un JSON sur stdout et un resume lisible sur stderr.
 * Usage : node test/phase1.mjs [--json fichier]
 */

import fs from 'node:fs';
import { openHarness, compare, meshScale } from './harness.mjs';

const CASES = [
  { form: 'Sphere' },
  { form: 'Torus' },
  { form: 'Plan' },
  { form: 'Saddle' },
  { form: 'Moebius' },
  { form: 'Catenoid' },
  { form: 'Klein Bottle' },
  { form: 'Twisted Torus', params: { G: 1 } },
  { form: 'Waves', t: 0.7 },
  { form: 'Sphere meridians' },
  { form: 'Cylinder' },
  { form: 'Pseudosphere' },
];

const log = (...a) => process.stderr.write(a.join(' ') + '\n');
const fmt = (x, d = 6) => (Number.isFinite(x) ? x.toExponential(d) : String(x));

async function loadCase(app, c) {
  return app.evaluate((req) => window.__ruban.load(req), c);
}

/** Mesure 1 — coincidence de maillage avec l'application actuelle. */
async function measureCoincidence(h, c, forms) {
  const def = forms[c.form];
  const info = await loadCase(h.app, { form: c.form, params: c.params, t: c.t ?? 0 });
  await h.app.evaluate(() => window.__ruban.step(0));
  const gpu = await h.app.evaluate(() => window.__ruban.positions());

  const legacy = await h.oracle.evaluate((req) => window.legacyProbe(req), {
    coords: def.coords,
    fx: def.fx, fy: def.fy, fz: def.fz,
    alpha: def.alpha ?? '', beta: def.beta ?? '', theta: def.theta ?? '',
    udef: def.udef, vdef: def.vdef,
    stepsU: def.stepsU, stepsV: def.stepsV,
    t: c.t ?? 0,
    params: c.params ?? {},
  });

  const cmp = compare(gpu, legacy.positions);
  const scale = meshScale(legacy.positions);
  return {
    form: c.form,
    t: c.t ?? 0,
    vertices: info.vertexCount,
    grid: `${def.stepsU}x${def.stepsV}`,
    scale,
    maxAbs: cmp.max,
    maxRelative: cmp.max / scale,
    meanAbs: cmp.mean,
    bitIdentical: cmp.exactFraction,
    components: cmp.n,
    legacyGlslLength: legacy.glsl.length,
  };
}

/** Mesure 2 — differentiel GPU contre reference CPU. */
async function measureDifferential(h, c) {
  await loadCase(h.app, { form: c.form, params: c.params, t: c.t ?? 0 });
  await h.app.evaluate(() => window.__ruban.step(0));
  const gpu = await h.app.evaluate(() => window.__ruban.positions());
  const cpu32 = await h.app.evaluate(
    (req) => window.__ruban.cpu({ ...req, f32: true }).pos,
    { form: c.form, params: c.params, t: c.t ?? 0 },
  );
  const cpu64 = await h.app.evaluate(
    (req) => window.__ruban.cpu({ ...req, f32: false }).pos,
    { form: c.form, params: c.params, t: c.t ?? 0 },
  );
  const scale = meshScale(gpu);
  return {
    form: c.form,
    scale,
    vsCpuF32: { ...compare(gpu, cpu32), relative: compare(gpu, cpu32).max / scale },
    vsCpuF64: { ...compare(gpu, cpu64), relative: compare(gpu, cpu64).max / scale },
  };
}

/** Mesure 3 — tangentes duales contre differences finies, et normale contre celle d'origine. */
async function measureTangents(h, c, forms) {
  const def = forms[c.form];
  await loadCase(h.app, { form: c.form, params: c.params, t: c.t ?? 0 });
  await h.app.evaluate(() => window.__ruban.step(0));
  const frames = await h.app.evaluate(() => window.__ruban.frames());
  const cpu = await h.app.evaluate(
    (req) => window.__ruban.cpu({ ...req, f32: false }),
    { form: c.form, params: c.params, t: c.t ?? 0 },
  );

  const scale = meshScale(await h.app.evaluate(() => window.__ruban.positions()));

  // Tangentes GPU (duales, f32) contre tangentes CPU (duales, f64).
  const tuCmp = compare(frames.tu, cpu.tu);
  const tvCmp = compare(frames.tv, cpu.tv);

  // Tangentes duales CPU contre differences finies centrees d'ordre 4, en
  // quelques points interieurs : deux methodes independantes.
  //
  // Les fractions sont asymetriques a dessein. Prendre le centre du domaine
  // tombait sur (0, 0), ou `h(u, v)` de la forme Waves n'est pas derivable et
  // ou la tangente en u de la pseudosphere s'annule : le rapport d'erreur
  // relative y explosait sans que rien ne soit faux.
  const samples = [];
  const stepU = (2 * def.udef) / def.stepsU;
  const stepV = (2 * def.vdef) / def.stepsV;
  for (const [fi, fj] of [[0.31, 0.27], [0.44, 0.56], [0.73, 0.61], [0.19, 0.83]]) {
    const u = -def.udef + fi * 2 * def.udef;
    const v = -def.vdef + fj * 2 * def.vdef;
    const h4 = Math.min(stepU, stepV) * 0.25;
    const r = await h.app.evaluate(
      (req) => window.__ruban.finiteDiff(req),
      { form: c.form, params: c.params, t: c.t ?? 0, u, v, h: h4 },
    );
    const err = (a, b) => Math.max(...[0, 1, 2].map((k) => Math.abs(a[k] - b[k])));
    const norm = (a) => Math.hypot(a[0], a[1], a[2]);
    const duNorm = norm(r.exact.du);
    const dvNorm = norm(r.exact.dv);
    const duAbs = err(r.fd.du, r.exact.du);
    const dvAbs = err(r.fd.dv, r.exact.dv);
    samples.push({
      u, v, h: h4, duNorm, dvNorm, duAbs, dvAbs,
      // Nul quand la tangente est nulle : un rapport n'y voudrait rien dire.
      duRel: duNorm > 1e-9 ? duAbs / duNorm : null,
      dvRel: dvNorm > 1e-9 ? dvAbs / dvNorm : null,
    });
  }

  // Normale exacte contre celle du projet d'origine (differences finies avant,
  // eps = 0.001). L'ecart attendu est en O(eps) : c'est l'ampleur du gain.
  const legacy = await h.oracle.evaluate((req) => window.legacyProbe(req), {
    coords: def.coords,
    fx: def.fx, fy: def.fy, fz: def.fz,
    alpha: def.alpha ?? '', beta: def.beta ?? '', theta: def.theta ?? '',
    udef: def.udef, vdef: def.vdef, stepsU: def.stepsU, stepsV: def.stepsV,
    t: c.t ?? 0, params: c.params ?? {},
  });
  let maxAngle = 0;
  let sumAngle = 0;
  let counted = 0;
  for (let k = 0; k < frames.degenerate.length; k++) {
    if (frames.degenerate[k]) continue;
    const a = [frames.nrm[3 * k], frames.nrm[3 * k + 1], frames.nrm[3 * k + 2]];
    const b = [legacy.normals[3 * k], legacy.normals[3 * k + 1], legacy.normals[3 * k + 2]];
    const nb = Math.hypot(b[0], b[1], b[2]);
    if (!Number.isFinite(nb) || nb < 0.5) continue;
    let d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / nb;
    d = Math.max(-1, Math.min(1, Math.abs(d)));
    const ang = Math.acos(d);
    if (ang > maxAngle) maxAngle = ang;
    sumAngle += ang;
    counted++;
  }

  return {
    form: c.form,
    scale,
    tangentGpuVsCpu: { maxAbs: Math.max(tuCmp.max, tvCmp.max), relative: Math.max(tuCmp.max, tvCmp.max) / scale },
    finiteDiffSamples: samples,
    normalVsLegacyDegrees: { max: (maxAngle * 180) / Math.PI, mean: ((sumAngle / Math.max(1, counted)) * 180) / Math.PI, counted },
    degenerateVertices: frames.degenerate.reduce((s, x) => s + x, 0),
    maxScalarDualDelta: Math.max(...frames.scalarDelta),
  };
}

/** Mesure 4 — rejeu deterministe, bit a bit, positions et image. */
async function measureReplay(h, c) {
  const script = [0.013, 0.017, 0.023, 0.031, 0.041];
  const run = async () => {
    await loadCase(h.app, { form: c.form, params: c.params, t: 0 });
    await h.app.evaluate((cam) => window.__ruban.pinCamera(cam), { alpha: 0.7, beta: -0.31, distance: 9 });
    for (const dt of script) await h.app.evaluate((dt) => window.__ruban.step(dt), dt);
    const pos = await h.app.evaluate(() => window.__ruban.positions());
    const img = await h.app.evaluate(() => window.__ruban.frame());
    return { pos, img };
  };
  const a = await run();
  // Entre les deux rejeux, on bouge la camera et on charge autre chose : le
  // rejeu doit repartir d'un etat pose, pas d'un etat herite.
  await loadCase(h.app, { form: 'Torus' });
  await h.app.evaluate(() => window.__ruban.pinCamera({ alpha: 2.2, beta: 0.4, distance: 3 }));
  await h.app.evaluate(() => window.__ruban.step(0.5));
  const b = await run();

  const posCmp = compare(a.pos, b.pos);
  let pixelDiff = 0;
  for (let i = 0; i < a.img.data.length; i++) {
    pixelDiff = Math.max(pixelDiff, Math.abs(a.img.data[i] - b.img.data[i]));
  }
  // Une image entierement au fond se comparerait a elle-meme sans rien prouver :
  // on compte les pixels reellement couverts par la surface.
  const bg = [a.img.data[0], a.img.data[1], a.img.data[2]];
  let nonBackground = 0;
  for (let p = 0; p < a.img.width * a.img.height; p++) {
    const o = p * 4;
    if (a.img.data[o] !== bg[0] || a.img.data[o + 1] !== bg[1] || a.img.data[o + 2] !== bg[2]) nonBackground++;
  }
  return {
    form: c.form,
    steps: script.length,
    positionMaxDelta: posCmp.max,
    positionBitIdentical: posCmp.exactFraction,
    pixelMaxDelta: pixelDiff,
    imageSize: `${a.img.width}x${a.img.height}`,
    nonBackgroundPixels: nonBackground,
  };
}

/**
 * Mesure 5 — l'element d'aire exact.
 *
 * On integre sqrt(EG - F^2) sur le domaine parametrique et on compare a l'aire
 * analytique de la sphere de rayon 2, soit 16 pi. Ce n'est pas la recette de la
 * phase 3 — la peinture n'existe pas — mais c'est le controle qui dit si E, F
 * et G sont exacts, donc si les nombres duaux tiennent leur promesse.
 *
 * Deux integrales, pas une : la meme regle appliquee aux aires du GPU (f32,
 * transcendantes du rasteriseur logiciel) et aux aires de la reference CPU
 * (f64, transcendantes justes). L'ecart a 16 pi de la seconde mesure la regle
 * de quadrature et les tangentes ; l'ecart entre les deux mesure la plateforme.
 * Melangees, ces deux erreurs donnent un plancher qu'on prendrait a tort pour
 * une non-convergence.
 */
function trapezoid(areas, steps, du, dv) {
  const cols = steps + 1;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const a00 = areas[i * cols + j];
      const a10 = areas[(i + 1) * cols + j];
      const a01 = areas[i * cols + j + 1];
      const a11 = areas[(i + 1) * cols + j + 1];
      sum += ((a00 + a10 + a01 + a11) / 4) * du * dv;
    }
  }
  return sum;
}

async function measureAreaElement(h) {
  const rows = [];
  const exact = 16 * Math.PI;
  for (const steps of [64, 128, 256, 512]) {
    await h.app.evaluate((s) => window.__ruban.load({ form: 'Sphere', domain: { stepsU: s, stepsV: s } }), steps);
    await h.app.evaluate(() => window.__ruban.step(0));
    const frames = await h.app.evaluate(() => window.__ruban.frames());
    const cpu = await h.app.evaluate(
      (s) => window.__ruban.cpu({ form: 'Sphere', domain: { stepsU: s, stepsV: s }, f32: false }),
      steps,
    );
    const du = (2 * Math.PI) / steps;
    const dv = Math.PI / steps;
    const cpuAreas = [];
    for (let k = 0; k < cpu.tu.length; k += 3) {
      const a = cpu.tu.slice(k, k + 3);
      const b = cpu.tv.slice(k, k + 3);
      cpuAreas.push(Math.hypot(
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ));
    }
    const gpuIntegral = trapezoid(frames.area, steps, du, dv);
    const cpuIntegral = trapezoid(cpuAreas, steps, du, dv);
    rows.push({
      steps,
      gpuIntegral,
      cpuIntegral,
      exact,
      cpuRelativeError: Math.abs(cpuIntegral - exact) / exact,
      gpuRelativeError: Math.abs(gpuIntegral - exact) / exact,
      gpuVsCpu: Math.abs(gpuIntegral - cpuIntegral) / exact,
    });
  }
  return rows;
}

/**
 * Mesure 0 — la precision des transcendantes de la plateforme.
 *
 * A faire avant de lire quoi que ce soit d'autre. Sous SwiftShader, `sin` et
 * `cos` ne sont pas a l'ulp : mesurer leur ecart chiffre le plancher de toutes
 * les autres comparaisons, et explique pourquoi le maillage peut coincider au
 * bit pres avec celui du projet d'origine tout en s'ecartant d'une reference
 * f64. Les deux API partagent la meme bibliotheque mathematique.
 */
async function measureTranscendentals(h) {
  const xs = [];
  for (let k = 0; k < 512; k++) xs.push(-Math.PI + (2 * Math.PI * k) / 511);

  const gpu = await h.app.evaluate(async (xs) => {
    const dev = window.__ruban.ruban.gpu.device;
    const n = xs.length;
    const inBuf = dev.createBuffer({ size: n * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    dev.queue.writeBuffer(inBuf, 0, new Float32Array(xs));
    const outBuf = dev.createBuffer({ size: n * 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const mod = dev.createShaderModule({ code: `
      @group(0) @binding(0) var<storage, read> xs : array<f32>;
      @group(0) @binding(1) var<storage, read_write> ys : array<vec2<f32>>;
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3<u32>) {
        if (g.x >= arrayLength(&xs)) { return; }
        ys[g.x] = vec2<f32>(cos(xs[g.x]), sin(xs[g.x]));
      }` });
    const pipe = dev.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
    const bg = dev.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: inBuf } }, { binding: 1, resource: { buffer: outBuf } }],
    });
    const enc = dev.createCommandEncoder();
    const p = enc.beginComputePass();
    p.setPipeline(pipe); p.setBindGroup(0, bg); p.dispatchWorkgroups(Math.ceil(n / 64)); p.end();
    const stg = dev.createBuffer({ size: n * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyBufferToBuffer(outBuf, 0, stg, 0, n * 8);
    dev.queue.submit([enc.finish()]);
    let done = false;
    const pr = stg.mapAsync(GPUMapMode.READ).then(() => { done = true; });
    const tick = () => { if (!done) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await pr;
    const out = Array.from(new Float32Array(stg.getMappedRange()));
    stg.unmap();
    return out;
  }, xs);

  const wgl = await h.oracle.evaluate((xs) => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const mk = (t, s) => {
      const sh = gl.createShader(t);
      gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, mk(gl.VERTEX_SHADER, `#version 300 es
precision highp float;
in float x; out vec2 y;
void main(){ y = vec2(cos(x), sin(x)); }`));
    gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; out vec4 c; void main(){ c = vec4(0.0); }`));
    gl.transformFeedbackVaryings(pr, ['y'], gl.SEPARATE_ATTRIBS);
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.bindVertexArray(gl.createVertexArray());
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(xs), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'x');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 0, 0);
    const tb = gl.createBuffer();
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tb);
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, xs.length * 8, gl.STATIC_READ);
    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tb);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, xs.length);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    const out = new Float32Array(xs.length * 2);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tb);
    gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, out);
    return Array.from(out);
  }, xs);

  let webgpuMax = 0;
  let webglMax = 0;
  let sameBits = 0;
  for (let k = 0; k < xs.length; k++) {
    const x32 = Math.fround(xs[k]);
    webgpuMax = Math.max(webgpuMax, Math.abs(gpu[2 * k] - Math.cos(x32)), Math.abs(gpu[2 * k + 1] - Math.sin(x32)));
    webglMax = Math.max(webglMax, Math.abs(wgl[2 * k] - Math.cos(x32)), Math.abs(wgl[2 * k + 1] - Math.sin(x32)));
    if (wgl[2 * k] === gpu[2 * k] && wgl[2 * k + 1] === gpu[2 * k + 1]) sameBits++;
  }
  return {
    samples: xs.length,
    webgpuMaxAbsError: webgpuMax,
    webglMaxAbsError: webglMax,
    f32Epsilon: 1.1920929e-7,
    bitIdenticalBetweenApis: sameBits / xs.length,
  };
}

/**
 * Mesure 6 — cout, separement calcul et rendu.
 *
 * Les deux ensemble ne diraient rien : sous SwiftShader la rasterisation d'un
 * demi-million de triangles domine tout. Ce qui interesse la suite du projet,
 * c'est le prix de la passe de surface par sommet, parce que c'est lui qui
 * decide de la resolution jouable — pas le rasteriseur logiciel, qui n'existera
 * pas sur la machine d'un joueur.
 */
async function measureCost(h) {
  const rows = [];
  const bench = async (frames) => h.app.evaluate(async (frames) => {
    window.__ruban.step(0); // chauffe
    await window.__ruban.ruban.gpu.device.queue.onSubmittedWorkDone();
    const t0 = performance.now();
    for (let k = 0; k < frames; k++) window.__ruban.step(0);
    await window.__ruban.ruban.gpu.device.queue.onSubmittedWorkDone();
    return (performance.now() - t0) / frames;
  }, frames);

  for (const steps of [128, 256, 512]) {
    await h.app.evaluate((s) => window.__ruban.load({ form: 'Sphere', domain: { stepsU: s, stepsV: s } }), steps);
    await h.app.evaluate(() => window.__ruban.setRenderEnabled(false));
    const computeOnly = await bench(20);
    await h.app.evaluate(() => window.__ruban.setRenderEnabled(true));
    const withRender = await bench(20);
    const vertices = (steps + 1) ** 2;
    rows.push({
      grid: `${steps}x${steps}`,
      vertices,
      computeMs: computeOnly,
      computePlusRenderMs: withRender,
      nsPerVertex: (computeOnly * 1e6) / vertices,
    });
  }
  await h.app.evaluate(() => window.__ruban.setRenderEnabled(true));
  return rows;
}

async function main() {
  const h = await openHarness({ port: 8123 });
  const out = { generatedAt: new Date().toISOString(), adapter: null, coincidence: [], differential: [], tangents: [], replay: null, areaElement: null, cost: null, errors: [] };
  try {
    out.adapter = await h.app.evaluate(() => {
      const a = window.__ruban.ruban.gpu.adapter;
      return { vendor: a.info?.vendor ?? null, architecture: a.info?.architecture ?? null, description: a.info?.description ?? null };
    });

    const forms = await h.app.evaluate(() => {
      const mod = window.__ruban;
      const names = mod.forms();
      const out = {};
      for (const n of names) {
        const info = mod.load({ form: n });
        out[n] = {
          coords: info.spec.coords, fx: info.spec.fx, fy: info.spec.fy, fz: info.spec.fz,
          alpha: info.spec.alpha ?? '', beta: info.spec.beta ?? '', theta: info.spec.theta ?? '',
          udef: -info.domain.minU, vdef: -info.domain.minV,
          stepsU: info.domain.stepsU, stepsV: info.domain.stepsV,
        };
      }
      return out;
    });

    await h.app.evaluate(() => window.__ruban.setCrossCheck(true));

    log('== 0. precision des transcendantes de la plateforme ==');
    out.transcendentals = await measureTranscendentals(h);
    log(`  sin/cos WebGPU ecart max ${fmt(out.transcendentals.webgpuMaxAbsError, 3)}  ` +
      `WebGL2 ${fmt(out.transcendentals.webglMaxAbsError, 3)}  ` +
      `(epsilon f32 ${fmt(out.transcendentals.f32Epsilon, 3)})  ` +
      `identiques entre API ${(out.transcendentals.bitIdenticalBetweenApis * 100).toFixed(1)} %`);

    log('== 1. coincidence avec le maillage de l application actuelle ==');
    for (const c of CASES) {
      const r = await measureCoincidence(h, c, forms);
      out.coincidence.push(r);
      log(`  ${r.form.padEnd(18)} ${r.grid.padEnd(9)} ${String(r.vertices).padStart(7)} sommets  ` +
        `max ${fmt(r.maxAbs, 3)}  rel ${fmt(r.maxRelative, 3)}  identiques ${(r.bitIdentical * 100).toFixed(3)} %`);
    }

    log('== 2. differentiel GPU contre reference CPU ==');
    for (const c of CASES) {
      const r = await measureDifferential(h, c);
      out.differential.push(r);
      log(`  ${r.form.padEnd(18)} f32 ${fmt(r.vsCpuF32.max, 3)} (rel ${fmt(r.vsCpuF32.relative, 3)})  ` +
        `f64 ${fmt(r.vsCpuF64.max, 3)} (rel ${fmt(r.vsCpuF64.relative, 3)})`);
    }

    log('== 3. tangentes exactes ==');
    for (const c of CASES) {
      const r = await measureTangents(h, c, forms);
      out.tangents.push(r);
      const rels = r.finiteDiffSamples.flatMap((s) => [s.duRel, s.dvRel]).filter((x) => x !== null);
      const worstFd = rels.length ? Math.max(...rels) : NaN;
      log(`  ${r.form.padEnd(18)} dual/df ${fmt(worstFd, 2)}  tang. GPU/CPU ${fmt(r.tangentGpuVsCpu.relative, 2)}  ` +
        `normale vs origine max ${r.normalVsLegacyDegrees.max.toFixed(4)} deg ` +
        `moy ${r.normalVsLegacyDegrees.mean.toFixed(5)} deg  degeneres ${r.degenerateVertices}  scal/dual ${r.maxScalarDualDelta}`);
    }

    log('== 4. rejeu deterministe ==');
    out.replay = await measureReplay(h, { form: 'Waves' });
    log(`  ${out.replay.form} : positions identiques ${(out.replay.positionBitIdentical * 100).toFixed(3)} %, ` +
      `ecart max ${out.replay.positionMaxDelta}, image ${out.replay.imageSize} ecart pixel max ${out.replay.pixelMaxDelta}`);

    log('== 5. element d aire (sphere de rayon 2, aire exacte 16 pi) ==');
    out.areaElement = await measureAreaElement(h);
    for (const r of out.areaElement) {
      log(`  ${String(r.steps).padStart(4)}x${String(r.steps).padEnd(4)} CPU f64 ${r.cpuIntegral.toFixed(6)} (ecart ${fmt(r.cpuRelativeError, 3)})  ` +
        `GPU f32 ${r.gpuIntegral.toFixed(6)} (ecart ${fmt(r.gpuRelativeError, 3)})  GPU-CPU ${fmt(r.gpuVsCpu, 3)}`);
    }

    log('== 6. cout, calcul et rendu separes (rasteriseur logiciel) ==');
    out.cost = await measureCost(h);
    for (const r of out.cost) {
      log(`  ${r.grid.padEnd(9)} ${String(r.vertices).padStart(7)} sommets  calcul ${r.computeMs.toFixed(3)} ms  ` +
        `(${r.nsPerVertex.toFixed(1)} ns/sommet)  calcul+rendu ${r.computePlusRenderMs.toFixed(3)} ms`);
    }

    out.errors = h.errors.filter((e) => !e.includes('404') && !e.includes('appendChild'));
    if (out.errors.length) log('erreurs page :', JSON.stringify(out.errors));
  } finally {
    await h.close();
  }

  const jsonIndex = process.argv.indexOf('--json');
  const json = JSON.stringify(out, null, 2);
  if (jsonIndex >= 0 && process.argv[jsonIndex + 1]) {
    fs.writeFileSync(process.argv[jsonIndex + 1], json);
    log(`json ecrit dans ${process.argv[jsonIndex + 1]}`);
  } else {
    process.stdout.write(json);
  }
}

await main();
