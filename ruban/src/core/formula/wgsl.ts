/**
 * Emission WGSL : la meme formule, deux fois.
 *
 * `surfacePoint(u, v)` evalue la position en scalaires. `surfaceFrame(u, v)`
 * evalue exactement la meme expression en nombres duaux et rend, en une passe,
 * la position **et** les deux tangentes exactes.
 *
 * Les deux versions partagent l'AST : elles ne peuvent pas diverger sur le sens
 * de la formule, seulement sur l'arithmetique. La campagne de mesure verifie
 * qu'elles s'accordent au bit pres sur la position (mesures/phase-1).
 */

import type { Expr } from './ast';
import { isZero } from './ast';
import { parseFormula } from './parser';
import { DUAL_PRELUDE } from './prelude.wgsl';

export type CoordSystem = 'cartesian' | 'spheric' | 'cylindrical';

/**
 * Une forme : le systeme de coordonnees et les six expressions du projet
 * d'origine. Les noms suivent `forms.js` (fx/fy/fz + alpha/beta/theta) pour
 * qu'une forme se transcrive sans traduction.
 */
export interface SurfaceSpec {
  name?: string;
  coords: CoordSystem;
  fx: string;
  fy: string;
  fz: string;
  /** Rotation Z (cartesien) ou rotation Z secondaire (spherique, cylindrique). */
  alpha?: string;
  /** Rotation Y. */
  beta?: string;
  /** Rotation X. */
  theta?: string;
}

/** Nom WGSL des variables lues par la formule, dans la version scalaire. */
type VarMap = Record<string, string>;

/** Litteral f32 qui se relit tel qu'il s'ecrit. */
function lit(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`litteral non fini : ${x}`);
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return `${x}.0`;
  return String(x);
}

const SCALAR_FN: Record<string, string> = {
  cos: 'cos', sin: 'sin', tan: 'tan',
  acos: 'acos', asin: 'asin',
  cosh: 'cosh', sinh: 'sinh', tanh: 'tanh',
  exp: 'exp', log: 'log', sqrt: 'sqrt', abs: 'abs', sign: 'sign',
  floor: 'floor', ceil: 'ceil', fract: 'fract', trunc: 'trunc', round: 'round',
  min: 'min', max: 'max', pow: 'pow', step: 'step',
  clamp: 'clamp', smoothstep: 'smoothstep', mix: 'mix',
};

const DUAL_FN: Record<string, string> = {
  cos: 'dCos', sin: 'dSin', tan: 'dTan',
  acos: 'dAcos', asin: 'dAsin',
  cosh: 'dCosh', sinh: 'dSinh', tanh: 'dTanh',
  exp: 'dExp', log: 'dLog', sqrt: 'dSqrt', abs: 'dAbs', sign: 'dSign',
  floor: 'dFloor', ceil: 'dCeil', fract: 'dFract', trunc: 'dTrunc', round: 'dRound',
  min: 'dMin', max: 'dMax', step: 'dStep',
  clamp: 'dClamp', smoothstep: 'dSmoothstep', mix: 'dMix',
};

/** Emet l'expression en scalaires f32. */
export function emitScalar(e: Expr, vars: VarMap): string {
  switch (e.k) {
    case 'num':
      return lit(e.value);
    case 'var': {
      const w = vars[e.name];
      if (w === undefined) throw new Error(`variable non liee : ${e.name}`);
      return w;
    }
    case 'neg':
      return `(-${emitScalar(e.a, vars)})`;
    case 'bin':
      return `(${emitScalar(e.a, vars)} ${e.op} ${emitScalar(e.b, vars)})`;
    case 'call': {
      const a = e.args.map((x) => emitScalar(x, vars));
      switch (e.name) {
        case 'mod':
          return `gmod(${a[0]}, ${a[1]})`;
        case 'cpow':
          return `cpowf(${a[0]}, ${a[1]})`;
        case 'atan':
          return a.length === 2 ? `atan2(${a[0]}, ${a[1]})` : `atan(${a[0]})`;
        case 'h':
          return a.length === 2
            ? `length(vec2<f32>(${a[0]}, ${a[1]}))`
            : `length(vec3<f32>(${a[0]}, ${a[1]}, ${a[2]}))`;
        default: {
          const fn = SCALAR_FN[e.name];
          if (!fn) throw new Error(`fonction non emise en scalaire : ${e.name}`);
          return `${fn}(${a.join(', ')})`;
        }
      }
    }
  }
}

/** Emet la meme expression en nombres duaux. */
export function emitDual(e: Expr, vars: VarMap): string {
  switch (e.k) {
    case 'num':
      return `dk(${lit(e.value)})`;
    case 'var': {
      const w = vars[e.name];
      if (w === undefined) throw new Error(`variable non liee : ${e.name}`);
      return w;
    }
    case 'neg':
      return `dNeg(${emitDual(e.a, vars)})`;
    case 'bin': {
      const fn = { '+': 'dAdd', '-': 'dSub', '*': 'dMul', '/': 'dDiv' }[e.op];
      return `${fn}(${emitDual(e.a, vars)}, ${emitDual(e.b, vars)})`;
    }
    case 'call': {
      const a = e.args.map((x) => emitDual(x, vars));
      switch (e.name) {
        case 'mod':
          return `dMod(${a[0]}, ${a[1]})`;
        case 'pow':
          // Exposant constant : variante definie pour une base negative.
          return e.args[1]!.k === 'num'
            ? `dPowC(${a[0]}, ${lit((e.args[1] as { value: number }).value)})`
            : `dPow(${a[0]}, ${a[1]})`;
        case 'cpow':
          return e.args[1]!.k === 'num'
            ? `dCpowC(${a[0]}, ${lit((e.args[1] as { value: number }).value)})`
            : `dCpow(${a[0]}, ${a[1]})`;
        case 'atan':
          return a.length === 2 ? `dAtan2(${a[0]}, ${a[1]})` : `dAtan(${a[0]})`;
        case 'h':
          return a.length === 2 ? `dHypot2(${a[0]}, ${a[1]})` : `dHypot3(${a[0]}, ${a[1]}, ${a[2]})`;
        default: {
          const fn = DUAL_FN[e.name];
          if (!fn) throw new Error(`fonction non emise en dual : ${e.name}`);
          return `${fn}(${a.join(', ')})`;
        }
      }
    }
  }
}

/** Forme analysee : les six AST, prets a etre emis ou evalues sur CPU. */
export interface ParsedSurface {
  spec: SurfaceSpec;
  fx: Expr;
  fy: Expr;
  fz: Expr;
  alpha: Expr;
  beta: Expr;
  theta: Expr;
}

export function parseSurface(spec: SurfaceSpec): ParsedSurface {
  const rot = { allowPosition: true };
  return {
    spec,
    fx: parseFormula(spec.fx),
    fy: parseFormula(spec.fy),
    fz: parseFormula(spec.fz),
    alpha: parseFormula(spec.alpha ?? '', rot),
    beta: parseFormula(spec.beta ?? '', rot),
    theta: parseFormula(spec.theta ?? '', rot),
  };
}

/**
 * Variables de base.
 *
 * Contrat avec `surface.ts` : le module WGSL genere suppose declares un uniforme
 * `P` portant `A`..`M`, `t` et `firstPoint`. Rien d'autre.
 */
const SCALAR_VARS: VarMap = {
  u: 'u', v: 'v', t: 'P.t',
  A: 'P.uservars[0].x', B: 'P.uservars[0].y', C: 'P.uservars[0].z', D: 'P.uservars[0].w',
  E: 'P.uservars[1].x', F: 'P.uservars[1].y', G: 'P.uservars[1].z', H: 'P.uservars[1].w',
  I: 'P.uservars[2].x', J: 'P.uservars[2].y', K: 'P.uservars[2].z', L: 'P.uservars[2].w',
  M: 'P.uservars[3].x',
};

const DUAL_VARS: VarMap = Object.fromEntries(
  Object.entries(SCALAR_VARS).map(([k, w]) => [k, k === 'u' ? 'du_' : k === 'v' ? 'dv_' : `dk(${w})`]),
);

/**
 * Le projet d'origine a **deux** conventions de rotation, et il faut les deux.
 *
 * Les blocs explicites de `getPositionGLSL` (theta, beta, alpha) tournent dans
 * le sens direct. La fonction `rotateAxis`, utilisee par les rotations
 * primaires des systemes spherique et cylindrique, construit son `mat3` en
 * colonnes majeures a partir d'une ecriture rangee par lignes : elle rend donc
 * la **transposee** de la matrice de Rodrigues, c'est-a-dire une rotation
 * d'angle oppose.
 *
 * Ce n'est pas une supposition : sans cette distinction, la sphere spherique et
 * le cylindre s'ecartaient du maillage d'origine de 2,0 unites sur une forme de
 * rayon 1, avec 35 % seulement de composantes identiques. C'est exactement le
 * genre de detail que la recette « le maillage coincide » attrape et qu'une
 * relecture n'attrape pas.
 */
type RotConvention = 'direct' | 'transposed';

function rotationScalar(axis: 'x' | 'y' | 'z', angle: string, conv: RotConvention = 'direct'): string {
  const head = `  { let a = ${angle}; let c = cos(a); let s = sin(a);`;
  if (axis === 'x') {
    return conv === 'direct'
      ? `${head} let ty = py * c - pz * s; let tz = py * s + pz * c; py = ty; pz = tz; }`
      : `${head} let ty = py * c + pz * s; let tz = -py * s + pz * c; py = ty; pz = tz; }`;
  }
  if (axis === 'y') {
    return conv === 'direct'
      ? `${head} let tx = px * c + pz * s; let tz = -px * s + pz * c; px = tx; pz = tz; }`
      : `${head} let tx = px * c - pz * s; let tz = px * s + pz * c; px = tx; pz = tz; }`;
  }
  return conv === 'direct'
    ? `${head} let tx = px * c - py * s; let ty = px * s + py * c; px = tx; py = ty; }`
    : `${head} let tx = px * c + py * s; let ty = -px * s + py * c; px = tx; py = ty; }`;
}

function rotationDual(axis: 'x' | 'y' | 'z', angle: string, conv: RotConvention = 'direct'): string {
  const head = `  { let a = ${angle}; let c = dCos(a); let s = dSin(a);`;
  if (axis === 'x') {
    return conv === 'direct'
      ? `${head} let ty = dSub(dMul(py, c), dMul(pz, s)); let tz = dAdd(dMul(py, s), dMul(pz, c)); py = ty; pz = tz; }`
      : `${head} let ty = dAdd(dMul(py, c), dMul(pz, s)); let tz = dSub(dMul(pz, c), dMul(py, s)); py = ty; pz = tz; }`;
  }
  if (axis === 'y') {
    return conv === 'direct'
      ? `${head} let tx = dAdd(dMul(px, c), dMul(pz, s)); let tz = dSub(dMul(pz, c), dMul(px, s)); px = tx; pz = tz; }`
      : `${head} let tx = dSub(dMul(px, c), dMul(pz, s)); let tz = dAdd(dMul(px, s), dMul(pz, c)); px = tx; pz = tz; }`;
  }
  return conv === 'direct'
    ? `${head} let tx = dSub(dMul(px, c), dMul(py, s)); let ty = dAdd(dMul(px, s), dMul(py, c)); px = tx; py = ty; }`
    : `${head} let tx = dAdd(dMul(px, c), dMul(py, s)); let ty = dSub(dMul(py, c), dMul(px, s)); px = tx; py = ty; }`;
}

/**
 * Corps commun aux deux versions : construction du point selon le systeme de
 * coordonnees, puis les trois rotations secondaires.
 *
 * L'ordre — X (theta), Y (beta), Z (alpha) — et la convention de signe sont
 * repris tels quels de `GPUShaderMesh.js:2556-2584`, sans lesquels la
 * comparaison de maillage n'aurait aucun sens.
 *
 * Une difference assumee : le projet d'origine garde chaque rotation derriere
 * un `if (angle != 0.0)`. La rotation d'angle nul etant l'identite exacte en
 * virgule flottante (cos 0 = 1, sin 0 = 0), la retirer ne change pas la
 * position d'un bit — mais elle rend la derivee juste la ou l'angle s'annule
 * sans que sa derivee s'annule.
 */
function emitBody(p: ParsedSurface, dual: boolean): string {
  const vars = dual ? DUAL_VARS : SCALAR_VARS;
  const emit = dual ? emitDual : emitScalar;
  const lines: string[] = [];

  if (p.spec.coords === 'cartesian') {
    lines.push(`  var px = ${emit(p.fx, vars)};`);
    lines.push(`  var py = ${emit(p.fy, vars)};`);
    lines.push(`  var pz = ${emit(p.fz, vars)};`);
  } else if (p.spec.coords === 'spheric') {
    // R = fx, rotation Y = fy, rotation Z = fz, appliquees a firstPoint * R.
    lines.push(`  let sphR = ${emit(p.fx, vars)};`);
    lines.push(`  let rotY = ${emit(p.fy, vars)};`);
    lines.push(`  let rotZ = ${emit(p.fz, vars)};`);
    if (dual) {
      lines.push('  var px = dMul(dk(P.firstPoint.x), sphR);');
      lines.push('  var py = dMul(dk(P.firstPoint.y), sphR);');
      lines.push('  var pz = dMul(dk(P.firstPoint.z), sphR);');
    } else {
      lines.push('  var px = P.firstPoint.x * sphR;');
      lines.push('  var py = P.firstPoint.y * sphR;');
      lines.push('  var pz = P.firstPoint.z * sphR;');
    }
    lines.push(dual ? rotationDual('y', 'rotY', 'transposed') : rotationScalar('y', 'rotY', 'transposed'));
    lines.push(dual ? rotationDual('z', 'rotZ', 'transposed') : rotationScalar('z', 'rotZ', 'transposed'));
  } else {
    // Cylindrique : R = fx, rotation Z = fy, hauteur = fz.
    lines.push(`  let cylR = ${emit(p.fx, vars)};`);
    lines.push(`  let cylA = ${emit(p.fy, vars)};`);
    lines.push(`  let cylH = ${emit(p.fz, vars)};`);
    if (dual) {
      lines.push('  var px = dMul(dk(P.firstPoint.x), cylR);');
      lines.push('  var py = dMul(dk(P.firstPoint.y), cylR);');
      lines.push('  var pz = dMul(dk(P.firstPoint.z), cylR);');
    } else {
      lines.push('  var px = P.firstPoint.x * cylR;');
      lines.push('  var py = P.firstPoint.y * cylR;');
      lines.push('  var pz = P.firstPoint.z * cylR;');
    }
    lines.push(dual ? rotationDual('z', 'cylA', 'transposed') : rotationScalar('z', 'cylA', 'transposed'));
    lines.push('  pz = cylH;');
  }

  // x, y, z dans les expressions de rotation : la position avant rotation.
  const rotVars: VarMap = { ...vars, x: 'px0', y: 'py0', z: 'pz0' };
  const needsPos = !isZero(p.alpha) || !isZero(p.beta) || !isZero(p.theta);
  if (needsPos) {
    lines.push('  let px0 = px; let py0 = py; let pz0 = pz;');
  }

  if (!isZero(p.theta)) {
    lines.push(dual ? rotationDual('x', emitDual(p.theta, rotVars)) : rotationScalar('x', emitScalar(p.theta, rotVars)));
  }
  if (!isZero(p.beta)) {
    lines.push(dual ? rotationDual('y', emitDual(p.beta, rotVars)) : rotationScalar('y', emitScalar(p.beta, rotVars)));
  }
  if (!isZero(p.alpha)) {
    lines.push(dual ? rotationDual('z', emitDual(p.alpha, rotVars)) : rotationScalar('z', emitScalar(p.alpha, rotVars)));
  }

  return lines.join('\n');
}

/** Le module WGSL de la forme : prelude dual + `surfacePoint` + `surfaceFrame`. */
export function emitSurfaceModule(p: ParsedSurface): string {
  return `${DUAL_PRELUDE}
struct Frame {
  pos : vec3<f32>,
  du  : vec3<f32>,
  dv  : vec3<f32>,
};

// Version scalaire : la position seule.
fn surfacePoint(u: f32, v: f32) -> vec3<f32> {
${emitBody(p, false)}
  return vec3<f32>(px, py, pz);
}

// Version duale : la meme formule, chaque scalaire porte (valeur, d/du, d/dv).
// Les tangentes sont exactes, pas approchees.
fn surfaceFrame(u: f32, v: f32) -> Frame {
  let du_ = Dual(u, 1.0, 0.0);
  let dv_ = Dual(v, 0.0, 1.0);
${emitBody(p, true)}
  var f: Frame;
  f.pos = vec3<f32>(px.val, py.val, pz.val);
  f.du  = vec3<f32>(px.du,  py.du,  pz.du);
  f.dv  = vec3<f32>(px.dv,  py.dv,  pz.dv);
  return f;
}
`;
}

/** Raccourci : de la specification au module WGSL. */
export function compileSurfaceWgsl(spec: SurfaceSpec): { parsed: ParsedSurface; wgsl: string } {
  const parsed = parseSurface(spec);
  return { parsed, wgsl: emitSurfaceModule(parsed) };
}
