/**
 * La passe de surface : un thread par sommet, la formule appelee directement.
 *
 * C'est le changement qui justifie tout le reste (§3.1 de la note). Dans le
 * projet d'origine, le CPU ne pouvait pas evaluer une formule qui vit dans un
 * shader : d'ou la sonde, le patch de 16 echantillons, l'interpolation
 * bicubique et le plafond de deplacement. Ici le shader appelle
 * `surfaceFrame(u, v)` et obtient position et tangentes exactes. Il n'y a plus
 * de patch, plus d'interpolation, plus de plafond.
 */

import { createBuffer } from './gpu';
import type { SurfaceSpec } from './formula/wgsl';
import { compileSurfaceWgsl, type ParsedSurface } from './formula/wgsl';

/** Domaine et resolution de la grille. Meme convention que le projet d'origine. */
export interface SurfaceDomain {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
  stepsU: number;
  stepsV: number;
}

export interface SurfaceUniforms {
  t: number;
  /** Curseurs A..M. Absents = 0. */
  params?: Record<string, number>;
  firstPoint?: [number, number, number];
  /**
   * Verification croisee : evalue aussi la version scalaire de la formule et
   * range l'ecart maximal par composante dans `scalarDelta`. Les deux versions
   * partagent l'AST et devraient rendre exactement la meme position ; un ecart
   * non nul designe l'emission, pas la formule. Hors campagne de mesure, la
   * branche est uniforme et ne coute rien.
   */
  crossCheck?: boolean;
}

/** Taille d'un sommet dans le tampon de stockage, en octets. */
export const VERTEX_STRIDE = 64;

/** Champs d'un sommet, en nombre de f32 depuis le debut de l'enregistrement. */
export const VERTEX_LAYOUT = {
  pos: 0,
  area: 3,
  nrm: 4,
  degenerate: 7,
  tu: 8,
  scalarDelta: 11,
  tv: 12,
} as const;

const UNIFORM_BYTES = 112;

/**
 * Le module WGSL de la passe. Le corps de la formule est injecte devant : il
 * fournit `surfacePoint` et `surfaceFrame`, et suppose l'uniforme `P` declare
 * ici.
 */
function computeModule(formulaWgsl: string): string {
  return `
struct SurfaceParams {
  minU       : f32,
  minV       : f32,
  stepU      : f32,
  stepV      : f32,
  stepsU     : u32,
  stepsV     : u32,
  t          : f32,
  crossCheck : u32,
  firstPoint : vec4<f32>,
  uservars   : array<vec4<f32>, 4>,
};

struct Vertex {
  pos         : vec3<f32>,
  area        : f32,
  nrm         : vec3<f32>,
  degenerate  : f32,
  tu          : vec3<f32>,
  scalarDelta : f32,
  tv          : vec3<f32>,
  _pad2       : f32,
};

@group(0) @binding(0) var<uniform> P : SurfaceParams;
@group(0) @binding(1) var<storage, read_write> verts : array<Vertex>;

${formulaWgsl}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let cols = P.stepsV + 1u;
  let total = (P.stepsU + 1u) * cols;
  let idx = gid.x;
  if (idx >= total) { return; }

  // Meme parcours que le maillage d'origine : j varie le plus vite,
  // sommet = i * (stepsV + 1) + j. La comparaison se fait sommet a sommet.
  let i = idx / cols;
  let j = idx % cols;
  let u = P.minU + f32(i) * P.stepU;
  let v = P.minV + f32(j) * P.stepV;

  let f = surfaceFrame(u, v);

  let n = cross(f.du, f.dv);
  let area = length(n);

  // Element d'aire exact : sqrt(EG - F^2) = |dP/du x dP/dv|. Sans les nombres
  // duaux il faudrait le tirer d'un patch interpole ; ici il est juste.
  var nrm = vec3<f32>(0.0, 1.0, 0.0);
  var degenerate = 1.0;
  if (area > 0.0) {
    nrm = n / area;
    degenerate = 0.0;
  } else {
    // Point degenere (pole d'une sphere, pincement). On ne fabrique pas une
    // normale credible : on la marque, et l'appelant decide. Le repli
    // moindres carres de rang 1 vit dans la passe d'agents (phase 2).
    let r = length(f.pos);
    if (r > 1e-6) { nrm = f.pos / r; }
  }

  verts[idx].pos = f.pos;
  verts[idx].area = area;
  verts[idx].nrm = nrm;
  verts[idx].degenerate = degenerate;
  verts[idx].tu = f.du;
  verts[idx].tv = f.dv;

  // Verification croisee scalaire / dual, sous branche uniforme.
  var delta = 0.0;
  if (P.crossCheck == 1u) {
    let sp = surfacePoint(u, v);
    let d = abs(sp - f.pos);
    delta = max(d.x, max(d.y, d.z));
  }
  verts[idx].scalarDelta = delta;
}
`;
}

export class SurfacePass {
  readonly wgsl: string;
  readonly parsed: ParsedSurface;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly vertexBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;

  private readonly uniformBuffer: GPUBuffer;
  private readonly uniformData = new Float32Array(UNIFORM_BYTES / 4);
  private readonly uniformInts = new Uint32Array(this.uniformData.buffer);
  private readonly pipeline: GPUComputePipeline;
  private readonly bindGroup: GPUBindGroup;

  constructor(
    private readonly device: GPUDevice,
    readonly spec: SurfaceSpec,
    readonly domain: SurfaceDomain,
  ) {
    const compiled = compileSurfaceWgsl(spec);
    this.parsed = compiled.parsed;
    this.wgsl = computeModule(compiled.wgsl);

    this.vertexCount = (domain.stepsU + 1) * (domain.stepsV + 1);
    this.vertexBuffer = createBuffer(
      device,
      this.vertexCount * VERTEX_STRIDE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      'surface.vertices',
    );

    const indices = buildIndices(domain.stepsU, domain.stepsV);
    this.indexCount = indices.length;
    this.indexBuffer = createBuffer(
      device,
      indices.byteLength,
      GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      'surface.indices',
    );
    device.queue.writeBuffer(this.indexBuffer, 0, indices);

    this.uniformBuffer = createBuffer(
      device,
      UNIFORM_BYTES,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      'surface.params',
    );

    const module = device.createShaderModule({ code: this.wgsl, label: 'surface.compute' });
    this.pipeline = device.createComputePipeline({
      label: 'surface.compute',
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
    this.bindGroup = device.createBindGroup({
      label: 'surface.bind',
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.vertexBuffer } },
      ],
    });
  }

  /** Ecrit les uniformes. Les pas sont calcules ici, une fois, comme dans l'original. */
  writeUniforms(u: SurfaceUniforms): void {
    const d = this.domain;
    const f = this.uniformData;
    const n = this.uniformInts;
    f[0] = d.minU;
    f[1] = d.minV;
    f[2] = (d.maxU - d.minU) / d.stepsU;
    f[3] = (d.maxV - d.minV) / d.stepsV;
    n[4] = d.stepsU;
    n[5] = d.stepsV;
    f[6] = u.t;
    n[7] = u.crossCheck ? 1 : 0;
    const fp = u.firstPoint ?? [1, 0, 0];
    f[8] = fp[0]; f[9] = fp[1]; f[10] = fp[2]; f[11] = 0;
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    for (let k = 0; k < 16; k++) f[12 + k] = k < names.length ? (u.params?.[names[k]!] ?? 0) : 0;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);
  }

  /** Encode la passe de calcul. Un seul appel par frame, pour tous les sommets. */
  encode(encoder: GPUCommandEncoder): void {
    const pass = encoder.beginComputePass({ label: 'surface' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.vertexCount / 64));
    pass.end();
  }

  destroy(): void {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
    this.uniformBuffer.destroy();
  }
}

/**
 * Triangulation de la grille, dans l'ordre exact du projet d'origine
 * (`GPUShaderMesh.js:createIndexMesh`) : (00, 10, 01) puis (01, 10, 11).
 */
export function buildIndices(stepsU: number, stepsV: number): Uint32Array<ArrayBuffer> {
  const out = new Uint32Array(new ArrayBuffer(stepsU * stepsV * 6 * 4));
  let k = 0;
  for (let i = 0; i < stepsU; i++) {
    for (let j = 0; j < stepsV; j++) {
      const i00 = i * (stepsV + 1) + j;
      const i10 = (i + 1) * (stepsV + 1) + j;
      const i01 = i * (stepsV + 1) + (j + 1);
      const i11 = (i + 1) * (stepsV + 1) + (j + 1);
      out[k++] = i00; out[k++] = i10; out[k++] = i01;
      out[k++] = i01; out[k++] = i10; out[k++] = i11;
    }
  }
  return out;
}

/** Vue lisible d'un sommet lu depuis le tampon de stockage. */
export interface VertexRecord {
  pos: [number, number, number];
  nrm: [number, number, number];
  tu: [number, number, number];
  tv: [number, number, number];
  area: number;
  degenerate: boolean;
  /** Ecart entre la version scalaire et la version duale, si la verification etait active. */
  scalarDelta: number;
}

export function decodeVertex(data: Float32Array, index: number): VertexRecord {
  const o = index * (VERTEX_STRIDE / 4);
  const v3 = (k: number): [number, number, number] => [data[o + k]!, data[o + k + 1]!, data[o + k + 2]!];
  return {
    pos: v3(VERTEX_LAYOUT.pos),
    area: data[o + VERTEX_LAYOUT.area]!,
    nrm: v3(VERTEX_LAYOUT.nrm),
    degenerate: data[o + VERTEX_LAYOUT.degenerate] !== 0,
    tu: v3(VERTEX_LAYOUT.tu),
    tv: v3(VERTEX_LAYOUT.tv),
    scalarDelta: data[o + VERTEX_LAYOUT.scalarDelta]!,
  };
}
