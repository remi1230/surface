/**
 * Implementation de reference en JavaScript.
 *
 * Le §5 de `ruban-nouveau-projet.md` en fait un garde-fou explicite : ecrire
 * l'evaluation **aussi** en JS et comparer GPU contre CPU sur les memes
 * entrees. Ca tourne sans navigateur, ca attrape toute derive, et ca donne un
 * oracle pour deboguer un compute shader — ce qui est autrement tres penible.
 *
 * Cette reference partage l'AST avec l'emetteur WGSL, mais rien d'autre : elle
 * interprete l'arbre, la ou l'autre engendre du code. Un desaccord designe donc
 * l'emission ou l'execution GPU, jamais l'analyse syntaxique — celle-la est
 * verifiee separement, contre le pipeline du projet d'origine.
 */

import type { Expr } from './ast';
import type { ParsedSurface } from './wgsl';

/** Valeurs des uniformes lues par une formule. */
export interface Env {
  t: number;
  params: Record<string, number>;
  firstPoint: [number, number, number];
  /** Arrondir chaque operation en f32 pour imiter le GPU. Faux = tout en f64. */
  f32?: boolean;
}

export const DEFAULT_ENV: Env = {
  t: 0,
  params: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0 },
  firstPoint: [1, 0, 0],
};

/** Nombre dual : valeur et derivees partielles par rapport a u et v. */
export interface D {
  val: number;
  du: number;
  dv: number;
}

const K = (x: number): D => ({ val: x, du: 0, dv: 0 });

function makeOps(f32: boolean) {
  const r = f32 ? Math.fround : (x: number) => x;
  const add = (a: D, b: D): D => ({ val: r(a.val + b.val), du: r(a.du + b.du), dv: r(a.dv + b.dv) });
  const sub = (a: D, b: D): D => ({ val: r(a.val - b.val), du: r(a.du - b.du), dv: r(a.dv - b.dv) });
  const mul = (a: D, b: D): D => ({
    val: r(a.val * b.val),
    du: r(r(a.du * b.val) + r(a.val * b.du)),
    dv: r(r(a.dv * b.val) + r(a.val * b.dv)),
  });
  const div = (a: D, b: D): D => ({
    val: r(a.val / b.val), // division, pas produit par l'inverse : voir dDiv en WGSL

    du: r(r(r(a.du * b.val) - r(a.val * b.du)) / r(b.val * b.val)),
    dv: r(r(r(a.dv * b.val) - r(a.val * b.dv)) / r(b.val * b.val)),
  });
  const chain = (a: D, val: number, g: number): D => ({ val: r(val), du: r(g * a.du), dv: r(g * a.dv) });
  return { r, add, sub, mul, div, chain };
}

type Ops = ReturnType<typeof makeOps>;

function evalCall(name: string, a: D[], ops: Ops): D {
  const { r, add, sub, mul, div, chain } = ops;
  const x = a[0]!;
  switch (name) {
    case 'cos': return chain(x, Math.cos(x.val), -Math.sin(x.val));
    case 'sin': return chain(x, Math.sin(x.val), Math.cos(x.val));
    case 'tan': return chain(x, Math.tan(x.val), 1 / (Math.cos(x.val) * Math.cos(x.val)));
    case 'acos': return chain(x, Math.acos(x.val), -1 / Math.sqrt(1 - x.val * x.val));
    case 'asin': return chain(x, Math.asin(x.val), 1 / Math.sqrt(1 - x.val * x.val));
    case 'atan':
      if (a.length === 1) return chain(x, Math.atan(x.val), 1 / (1 + x.val * x.val));
      {
        const y = x, xx = a[1]!;
        const den = xx.val * xx.val + y.val * y.val;
        return {
          val: r(Math.atan2(y.val, xx.val)),
          du: r((xx.val * y.du - y.val * xx.du) / den),
          dv: r((xx.val * y.dv - y.val * xx.dv) / den),
        };
      }
    case 'cosh': return chain(x, Math.cosh(x.val), Math.sinh(x.val));
    case 'sinh': return chain(x, Math.sinh(x.val), Math.cosh(x.val));
    case 'tanh': return chain(x, Math.tanh(x.val), 1 - Math.tanh(x.val) ** 2);
    case 'exp': return chain(x, Math.exp(x.val), Math.exp(x.val));
    case 'log': return chain(x, Math.log(x.val), 1 / x.val);
    case 'sqrt': return chain(x, Math.sqrt(x.val), 0.5 / Math.sqrt(x.val));
    case 'abs': return chain(x, Math.abs(x.val), Math.sign(x.val));
    case 'sign': return K(Math.sign(x.val));
    case 'floor': return K(Math.floor(x.val));
    case 'ceil': return K(Math.ceil(x.val));
    case 'trunc': return K(Math.trunc(x.val));
    case 'round': return K(Math.round(x.val));
    case 'fract': return { val: r(x.val - Math.floor(x.val)), du: x.du, dv: x.dv };
    case 'min': return x.val <= a[1]!.val ? x : a[1]!;
    case 'max': return x.val >= a[1]!.val ? x : a[1]!;
    case 'clamp': return evalCall('min', [evalCall('max', [x, a[1]!], ops), a[2]!], ops);
    case 'step': return K(x.val <= a[1]!.val ? 1 : 0);
    case 'mix': return add(x, mul(sub(a[1]!, x), a[2]!));
    case 'mod': {
      const b = a[1]!;
      const q = Math.floor(x.val / b.val);
      return { val: r(x.val - b.val * q), du: r(x.du - q * b.du), dv: r(x.dv - q * b.dv) };
    }
    case 'smoothstep': {
      const raw = div(sub(a[2]!, x), sub(a[1]!, x));
      if (raw.val <= 0) return K(0);
      if (raw.val >= 1) return K(1);
      const g = 6 * raw.val * (1 - raw.val);
      return { val: r(raw.val * raw.val * (3 - 2 * raw.val)), du: r(g * raw.du), dv: r(g * raw.dv) };
    }
    case 'pow': {
      const b = a[1]!;
      if (b.du === 0 && b.dv === 0) {
        const g = b.val * Math.pow(x.val, b.val - 1);
        return { val: r(Math.pow(x.val, b.val)), du: r(g * x.du), dv: r(g * x.dv) };
      }
      const p = Math.pow(x.val, b.val);
      const ga = b.val * Math.pow(x.val, b.val - 1);
      const gb = p * Math.log(x.val);
      return { val: r(p), du: r(ga * x.du + gb * b.du), dv: r(ga * x.dv + gb * b.dv) };
    }
    case 'cpow': {
      const b = a[1]!;
      const m = Math.pow(Math.abs(x.val), b.val);
      const sg = Math.sign(x.val);
      const ga = b.val * Math.pow(Math.abs(x.val), b.val - 1);
      const gb = sg * m * Math.log(Math.abs(x.val));
      const dbu = b.du === 0 ? 0 : gb * b.du;
      const dbv = b.dv === 0 ? 0 : gb * b.dv;
      return { val: r(sg * m), du: r(ga * x.du + dbu), dv: r(ga * x.dv + dbv) };
    }
    case 'h': {
      const comps = a;
      const r2 = Math.sqrt(comps.reduce((s, c) => s + c.val * c.val, 0));
      const du = comps.reduce((s, c) => s + c.val * c.du, 0) / r2;
      const dv = comps.reduce((s, c) => s + c.val * c.dv, 0) / r2;
      return { val: r(r2), du: r(du), dv: r(dv) };
    }
    default:
      throw new Error(`fonction non evaluee sur CPU : ${name}`);
  }
}

function evalExpr(e: Expr, vars: Record<string, D>, ops: Ops): D {
  switch (e.k) {
    case 'num':
      return K(ops.r(e.value));
    case 'var': {
      const d = vars[e.name];
      if (!d) throw new Error(`variable non liee : ${e.name}`);
      return d;
    }
    case 'neg': {
      const a = evalExpr(e.a, vars, ops);
      return { val: -a.val, du: -a.du, dv: -a.dv };
    }
    case 'bin': {
      const a = evalExpr(e.a, vars, ops);
      const b = evalExpr(e.b, vars, ops);
      return e.op === '+' ? ops.add(a, b)
        : e.op === '-' ? ops.sub(a, b)
        : e.op === '*' ? ops.mul(a, b)
        : ops.div(a, b);
    }
    case 'call':
      return evalCall(e.name, e.args.map((x) => evalExpr(x, vars, ops)), ops);
  }
}

/** Position et tangentes exactes en un point, evaluees sur CPU. */
export function evalSurface(
  p: ParsedSurface,
  u: number,
  v: number,
  env: Env = DEFAULT_ENV,
): { pos: [number, number, number]; du: [number, number, number]; dv: [number, number, number] } {
  const ops = makeOps(env.f32 === true);
  const { r, add, sub, mul } = ops;

  const base: Record<string, D> = {
    u: { val: r(u), du: 1, dv: 0 },
    v: { val: r(v), du: 0, dv: 1 },
    t: K(r(env.t)),
  };
  for (const [k, val] of Object.entries(env.params)) base[k] = K(r(val));

  let px: D = K(0), py: D = K(0), pz: D = K(0);
  const fp = env.firstPoint;

  /**
   * `transposed` reproduit `rotateAxis()` du projet d'origine, dont le `mat3`
   * ecrit par lignes mais lu par colonnes vaut la transposee — donc une
   * rotation d'angle oppose. Les rotations primaires spherique et cylindrique
   * passent par la ; les rotations secondaires, non.
   */
  const rot = (axis: 'x' | 'y' | 'z', angle: D, transposed = false) => {
    const c = evalCall('cos', [angle], ops);
    const s = evalCall('sin', [angle], ops);
    if (axis === 'x') {
      const ty = transposed ? add(mul(py, c), mul(pz, s)) : sub(mul(py, c), mul(pz, s));
      const tz = transposed ? sub(mul(pz, c), mul(py, s)) : add(mul(py, s), mul(pz, c));
      py = ty; pz = tz;
    } else if (axis === 'y') {
      const tx = transposed ? sub(mul(px, c), mul(pz, s)) : add(mul(px, c), mul(pz, s));
      const tz = transposed ? add(mul(px, s), mul(pz, c)) : sub(mul(pz, c), mul(px, s));
      px = tx; pz = tz;
    } else {
      const tx = transposed ? add(mul(px, c), mul(py, s)) : sub(mul(px, c), mul(py, s));
      const ty = transposed ? sub(mul(py, c), mul(px, s)) : add(mul(px, s), mul(py, c));
      px = tx; py = ty;
    }
  };

  if (p.spec.coords === 'cartesian') {
    px = evalExpr(p.fx, base, ops);
    py = evalExpr(p.fy, base, ops);
    pz = evalExpr(p.fz, base, ops);
  } else if (p.spec.coords === 'spheric') {
    const sphR = evalExpr(p.fx, base, ops);
    const rotY = evalExpr(p.fy, base, ops);
    const rotZ = evalExpr(p.fz, base, ops);
    px = mul(K(r(fp[0])), sphR);
    py = mul(K(r(fp[1])), sphR);
    pz = mul(K(r(fp[2])), sphR);
    rot('y', rotY, true);
    rot('z', rotZ, true);
  } else {
    const cylR = evalExpr(p.fx, base, ops);
    const cylA = evalExpr(p.fy, base, ops);
    const cylH = evalExpr(p.fz, base, ops);
    px = mul(K(r(fp[0])), cylR);
    py = mul(K(r(fp[1])), cylR);
    pz = mul(K(r(fp[2])), cylR);
    rot('z', cylA, true);
    pz = cylH;
  }

  const withPos: Record<string, D> = { ...base, x: px, y: py, z: pz };
  const isZero = (e: Expr) => e.k === 'num' && e.value === 0;
  if (!isZero(p.theta)) rot('x', evalExpr(p.theta, withPos, ops));
  if (!isZero(p.beta)) rot('y', evalExpr(p.beta, withPos, ops));
  if (!isZero(p.alpha)) rot('z', evalExpr(p.alpha, withPos, ops));

  return {
    pos: [px.val, py.val, pz.val],
    du: [px.du, py.du, pz.du],
    dv: [px.dv, py.dv, pz.dv],
  };
}

/**
 * Tangentes par differences finies centrees d'ordre 4, en f64.
 * Sert a juger les tangentes duales sans leur faire confiance : deux methodes
 * independantes qui tombent d'accord, ce n'est plus une affirmation.
 */
export function finiteDiffTangents(
  p: ParsedSurface,
  u: number,
  v: number,
  h: number,
  env: Env = DEFAULT_ENV,
): { du: [number, number, number]; dv: [number, number, number] } {
  const at = (uu: number, vv: number) => evalSurface(p, uu, vv, env).pos;
  const d4 = (f: (s: number) => [number, number, number], x: number): [number, number, number] => {
    const m2 = f(x - 2 * h), m1 = f(x - h), p1 = f(x + h), p2 = f(x + 2 * h);
    return [0, 1, 2].map((i) => (m2[i]! - 8 * m1[i]! + 8 * p1[i]! - p2[i]!) / (12 * h)) as [number, number, number];
  };
  return {
    du: d4((s) => at(s, v), u),
    dv: d4((s) => at(u, s), v),
  };
}
