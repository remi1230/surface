/**
 * L'API de rejeu deterministe, exposee sur `window.__ruban`.
 *
 * Elle existe des la premiere ligne du projet, et pas apres, parce que le §6 de
 * la note en fait une condition : horloge gelee, entrees scriptees, boucle de
 * rendu arretee, camera epinglee. Le corollaire appris a ses depens y est
 * ecrit noir sur blanc — « un resultat trop propre est un test a relire avant
 * d'etre une victoire » — donc le harnais doit pouvoir tout relire.
 */

import { Ruban } from './engine';
import { FORMS, formByName, type FormDef } from './core/forms';
import { decodeVertex, VERTEX_STRIDE, type SurfaceDomain } from './core/surface';
import { evalSurface, finiteDiffTangents, DEFAULT_ENV, type Env } from './core/formula/evalJs';
import { parseSurface, type SurfaceSpec } from './core/formula/wgsl';

export interface LoadRequest {
  form?: string;
  spec?: SurfaceSpec;
  domain?: Partial<SurfaceDomain>;
  params?: Record<string, number>;
  t?: number;
  camera?: { alpha?: number; beta?: number; distance?: number };
}

function resolve(req: LoadRequest): { spec: SurfaceSpec; domain: SurfaceDomain; def?: FormDef } {
  if (req.form) {
    const def = formByName(req.form);
    const domain: SurfaceDomain = {
      minU: -def.udef, maxU: def.udef,
      minV: -def.vdef, maxV: def.vdef,
      stepsU: def.stepsU, stepsV: def.stepsV,
      ...req.domain,
    };
    return {
      def,
      domain,
      spec: {
        name: def.name, coords: def.coords,
        fx: def.fx, fy: def.fy, fz: def.fz,
        alpha: def.alpha, beta: def.beta, theta: def.theta,
      },
    };
  }
  if (!req.spec) throw new Error('load: il faut soit form, soit spec');
  const d = req.domain ?? {};
  return {
    spec: req.spec,
    domain: {
      minU: d.minU ?? -Math.PI, maxU: d.maxU ?? Math.PI,
      minV: d.minV ?? -Math.PI, maxV: d.maxV ?? Math.PI,
      stepsU: d.stepsU ?? 32, stepsV: d.stepsV ?? 32,
    },
  };
}

export function installTestApi(ruban: Ruban): void {
  const api = {
    ruban,
    forms: () => FORMS.map((f) => f.name),

    /** Charge une forme, gele l'horloge, arrete la boucle et epingle la camera. */
    load(req: LoadRequest) {
      const { spec, domain, def } = resolve(req);
      ruban.stopLoop();
      ruban.clock.frozen = true;
      ruban.clock.t = req.t ?? 0;
      ruban.load({ spec, domain, params: req.params });
      if (def?.orient) {
        ruban.camera.pin({ alpha: def.orient.alpha, beta: def.orient.beta, distance: def.orient.distance });
      }
      if (req.camera) ruban.camera.pin(req.camera);
      return { spec, domain, vertexCount: ruban.surface!.vertexCount, indexCount: ruban.surface!.indexCount };
    },

    wgsl: () => ruban.surface?.wgsl ?? '',

    setTime(t: number) {
      ruban.clock.t = t;
    },

    stopLoop: () => ruban.stopLoop(),
    startLoop: () => {
      ruban.clock.frozen = false;
      ruban.startLoop();
    },

    /** Un pas fixe, une frame. Aucune horloge murale n'intervient. */
    step(dt = 0) {
      ruban.step(dt);
      return ruban.frameCount;
    },

    pinCamera(state: { alpha?: number; beta?: number; distance?: number }) {
      ruban.camera.pin(state);
      return ruban.camera.snapshot();
    },

    /** Le tampon de sommets brut, tel que le GPU l'a ecrit. */
    async vertices(): Promise<number[]> {
      const data = await ruban.readVertices();
      return Array.from(data);
    },

    /** Positions seules, en tableau plat — le format que compare le harnais. */
    async positions(): Promise<number[]> {
      const data = await ruban.readVertices();
      const n = data.length / (VERTEX_STRIDE / 4);
      const out = new Array<number>(n * 3);
      for (let k = 0; k < n; k++) {
        const v = decodeVertex(data, k);
        out[k * 3] = v.pos[0];
        out[k * 3 + 1] = v.pos[1];
        out[k * 3 + 2] = v.pos[2];
      }
      return out;
    },

    /** Repere complet par sommet : normale, tangentes, element d'aire, controles. */
    async frames(): Promise<{
      nrm: number[]; tu: number[]; tv: number[];
      area: number[]; degenerate: number[]; scalarDelta: number[];
    }> {
      const data = await ruban.readVertices();
      const n = data.length / (VERTEX_STRIDE / 4);
      const nrm: number[] = [];
      const tu: number[] = [];
      const tv: number[] = [];
      const area: number[] = [];
      const degenerate: number[] = [];
      const scalarDelta: number[] = [];
      for (let k = 0; k < n; k++) {
        const v = decodeVertex(data, k);
        nrm.push(...v.nrm);
        tu.push(...v.tu);
        tv.push(...v.tv);
        area.push(v.area);
        degenerate.push(v.degenerate ? 1 : 0);
        scalarDelta.push(v.scalarDelta);
      }
      return { nrm, tu, tv, area, degenerate, scalarDelta };
    },

    setCrossCheck(on: boolean) {
      ruban.crossCheck = on;
    },

    setRenderEnabled(on: boolean) {
      ruban.renderEnabled = on;
    },

    async frame(): Promise<{ width: number; height: number; data: number[] }> {
      const px = await ruban.readPixels();
      return { width: px.width, height: px.height, data: Array.from(px.data) };
    },

    /**
     * Reference CPU sur la meme grille : l'oracle du test differentiel GPU/CPU
     * annonce au §5 de la note.
     */
    cpu(req: LoadRequest & { f32?: boolean }) {
      const { spec, domain } = resolve(req);
      const parsed = parseSurface(spec);
      const env: Env = {
        ...DEFAULT_ENV,
        t: req.t ?? 0,
        params: { ...DEFAULT_ENV.params, ...(req.params ?? {}) },
        f32: req.f32 === true,
      };
      const stepU = (domain.maxU - domain.minU) / domain.stepsU;
      const stepV = (domain.maxV - domain.minV) / domain.stepsV;
      const cols = domain.stepsV + 1;
      const n = (domain.stepsU + 1) * cols;
      const pos = new Array<number>(n * 3);
      const tu = new Array<number>(n * 3);
      const tv = new Array<number>(n * 3);
      for (let i = 0; i <= domain.stepsU; i++) {
        for (let j = 0; j <= domain.stepsV; j++) {
          const k = i * cols + j;
          // Meme calcul de (u, v) que le shader, et meme arrondi f32 si demande.
          const u = req.f32 ? Math.fround(domain.minU + Math.fround(i * Math.fround(stepU))) : domain.minU + i * stepU;
          const v = req.f32 ? Math.fround(domain.minV + Math.fround(j * Math.fround(stepV))) : domain.minV + j * stepV;
          const r = evalSurface(parsed, u, v, env);
          pos[k * 3] = r.pos[0]; pos[k * 3 + 1] = r.pos[1]; pos[k * 3 + 2] = r.pos[2];
          tu[k * 3] = r.du[0]; tu[k * 3 + 1] = r.du[1]; tu[k * 3 + 2] = r.du[2];
          tv[k * 3] = r.dv[0]; tv[k * 3 + 1] = r.dv[1]; tv[k * 3 + 2] = r.dv[2];
        }
      }
      return { pos, tu, tv, stepU, stepV };
    },

    /** Tangentes par differences finies centrees d'ordre 4, en f64. */
    finiteDiff(req: LoadRequest & { u: number; v: number; h: number }) {
      const { spec } = resolve(req);
      const parsed = parseSurface(spec);
      const env: Env = {
        ...DEFAULT_ENV,
        t: req.t ?? 0,
        params: { ...DEFAULT_ENV.params, ...(req.params ?? {}) },
      };
      const fd = finiteDiffTangents(parsed, req.u, req.v, req.h, env);
      const exact = evalSurface(parsed, req.u, req.v, env);
      return { fd, exact: { du: exact.du, dv: exact.dv } };
    },
  };

  (window as unknown as { __ruban: typeof api }).__ruban = api;
}
