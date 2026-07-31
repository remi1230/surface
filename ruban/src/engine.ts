/**
 * Le moteur : device, surface, rendu, camera, et une horloge qu'on peut geler.
 *
 * L'horloge gelee et la boucle de rendu arretable ne sont pas des commodites de
 * debogage ajoutees apres coup : le §6 de `ruban-nouveau-projet.md` les rend
 * non negociables des la phase 1, parce que c'est cette discipline — et non le
 * code — qui a fait la qualite des deux notes precedentes. Une mesure qui ne se
 * rejoue pas a l'identique n'est pas une mesure.
 */

import { initGpu, pumped, readBuffer, type GpuContext } from './core/gpu';
import { SurfacePass, VERTEX_STRIDE, type SurfaceDomain } from './core/surface';
import type { SurfaceSpec } from './core/formula/wgsl';
import type { FormDef } from './core/forms';
import { SurfaceRenderPass } from './render/surfacePass';
import { OrbitCamera } from './game/orbitCamera';

export interface LoadOptions {
  spec: SurfaceSpec;
  domain: SurfaceDomain;
  params?: Record<string, number>;
  firstPoint?: [number, number, number];
}

/**
 * Ou va l'image.
 *
 * `offscreen` n'est pas une commodite : dans le conteneur headless qui sert aux
 * mesures, presenter une texture de canvas WebGPU coupe le canal GPU — device
 * perdu, « a valid external Instance reference no longer exists » — quel que
 * soit le jeu de drapeaux Chromium essaye. Une cible hors ecran de taille fixe
 * evite le compositeur, et c'est de toute facon ce qu'il faut pour comparer
 * deux rejeux au pixel pres.
 */
export type RenderTarget =
  | { kind: 'canvas'; canvas: HTMLCanvasElement }
  | { kind: 'offscreen'; width: number; height: number }
  | { kind: 'none' };

/** Horloge : soit elle avance d'un pas fixe qu'on lui donne, soit elle ne bouge pas. */
export class FrozenClock {
  t = 0;
  frozen = true;
  speed = 0.001;

  advance(dtMs: number): void {
    if (!this.frozen) this.t += dtMs * this.speed;
  }

  /** Pas de temps fixe, quelle que soit la duree reelle de la frame. */
  step(dt: number): void {
    this.t += dt;
  }
}

export class Ruban {
  readonly camera = new OrbitCamera();
  readonly clock = new FrozenClock();
  surface: SurfacePass | null = null;
  private render: SurfaceRenderPass | null = null;
  private context: GPUCanvasContext | null = null;
  private offscreen: GPUTexture | null = null;
  private colorFormat: GPUTextureFormat = 'rgba8unorm';
  private rafHandle: number | null = null;
  private lastFrameMs = 0;
  private loadOptions: LoadOptions | null = null;
  /** Nombre de frames rendues depuis le chargement — sert aux rejeux. */
  frameCount = 0;
  /** Active la verification croisee scalaire / dual dans la passe de surface. */
  crossCheck = false;
  /** Coupe la passe de rendu sans toucher a la passe de calcul, pour les mesurer separement. */
  renderEnabled = true;

  private constructor(readonly gpu: GpuContext, readonly target: RenderTarget) {}

  static async create(target: RenderTarget): Promise<Ruban> {
    const gpu = await initGpu();
    const r = new Ruban(gpu, target);
    if (target.kind === 'canvas') {
      const ctx = target.canvas.getContext('webgpu');
      if (!ctx) throw new Error('contexte webgpu indisponible sur ce canvas');
      r.colorFormat = gpu.format;
      ctx.configure({
        device: gpu.device,
        format: gpu.format,
        alphaMode: 'opaque',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      r.context = ctx;
    } else if (target.kind === 'offscreen') {
      r.colorFormat = 'rgba8unorm';
      r.offscreen = gpu.device.createTexture({
        size: { width: target.width, height: target.height },
        format: r.colorFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        label: 'offscreen',
      });
    }
    return r;
  }

  /** Taille de la cible de rendu, ou null s'il n'y en a pas. */
  private renderSize(): [number, number] | null {
    if (this.target.kind === 'canvas') return [this.target.canvas.width, this.target.canvas.height];
    if (this.target.kind === 'offscreen') return [this.target.width, this.target.height];
    return null;
  }

  private colorView(): GPUTextureView | null {
    if (this.context) return this.context.getCurrentTexture().createView();
    if (this.offscreen) return this.offscreen.createView();
    return null;
  }

  /** Charge une forme du catalogue avec son domaine et sa pose de camera d'origine. */
  loadForm(def: FormDef, params?: Record<string, number>): void {
    this.load({
      spec: {
        name: def.name,
        coords: def.coords,
        fx: def.fx,
        fy: def.fy,
        fz: def.fz,
        alpha: def.alpha,
        beta: def.beta,
        theta: def.theta,
      },
      domain: {
        minU: -def.udef, maxU: def.udef,
        minV: -def.vdef, maxV: def.vdef,
        stepsU: def.stepsU, stepsV: def.stepsV,
      },
      params,
    });
    if (def.orient) {
      this.camera.pin({ alpha: def.orient.alpha, beta: def.orient.beta, distance: def.orient.distance });
    }
  }

  load(options: LoadOptions): void {
    this.surface?.destroy();
    this.surface = new SurfacePass(this.gpu.device, options.spec, options.domain);
    this.loadOptions = options;
    this.frameCount = 0;
    if (this.target.kind !== 'none') {
      if (!this.render) {
        this.render = new SurfaceRenderPass(this.gpu.device, this.colorFormat, this.surface.vertexBuffer);
      } else {
        this.render.rebind(this.surface.vertexBuffer);
      }
    }
  }

  /** Une frame : uniformes, passe de calcul, puis rendu si un canvas est branche. */
  frame(): void {
    const surface = this.surface;
    if (!surface) return;
    surface.writeUniforms({
      t: this.clock.t,
      params: this.loadOptions?.params,
      firstPoint: this.loadOptions?.firstPoint,
      crossCheck: this.crossCheck,
    });

    const encoder = this.gpu.device.createCommandEncoder({ label: 'frame' });
    surface.encode(encoder);

    const size = this.renderEnabled ? this.renderSize() : null;
    const view = size ? this.colorView() : null;
    if (this.render && size && view) {
      this.render.setCamera(this.camera.viewProjection(size[0] / size[1]), this.camera.eye());
      this.render.encode(encoder, view, size, surface.indexBuffer, surface.indexCount);
    }
    this.gpu.device.queue.submit([encoder.finish()]);
    this.frameCount++;
  }

  /** Avance l'horloge d'un pas fixe puis rend une frame. Une entree scriptee, un pas. */
  step(dt = 0): void {
    if (dt !== 0) this.clock.step(dt);
    this.frame();
  }

  startLoop(): void {
    if (this.rafHandle !== null) return;
    this.lastFrameMs = performance.now();
    const tick = (now: number) => {
      this.clock.advance(now - this.lastFrameMs);
      this.lastFrameMs = now;
      this.frame();
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  stopLoop(): void {
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = null;
  }

  get running(): boolean {
    return this.rafHandle !== null;
  }

  /** Lit tout le tampon de sommets. Bloquant : reserve au harnais. */
  async readVertices(): Promise<Float32Array> {
    if (!this.surface) throw new Error('aucune surface chargee');
    const bytes = this.surface.vertexCount * VERTEX_STRIDE;
    return new Float32Array(await readBuffer(this.gpu.device, this.surface.vertexBuffer, bytes));
  }

  /** Lit l'image rendue, en RGBA8. Sert a comparer deux rejeux au pixel pres. */
  async readPixels(): Promise<{ width: number; height: number; data: Uint8Array }> {
    const size = this.renderSize();
    if (!size) throw new Error('aucune cible de rendu');
    const source = this.offscreen ?? this.context?.getCurrentTexture();
    if (!source) throw new Error('aucune texture de couleur');
    const [width, height] = size;
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const staging = this.gpu.device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const enc = this.gpu.device.createCommandEncoder();
    enc.copyTextureToBuffer({ texture: source }, { buffer: staging, bytesPerRow }, { width, height });
    this.gpu.device.queue.submit([enc.finish()]);
    await pumped(staging.mapAsync(GPUMapMode.READ));
    const src = new Uint8Array(staging.getMappedRange());
    const out = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      out.set(src.subarray(y * bytesPerRow, y * bytesPerRow + width * 4), y * width * 4);
    }
    staging.unmap();
    staging.destroy();
    return { width, height, data: out };
  }
}
