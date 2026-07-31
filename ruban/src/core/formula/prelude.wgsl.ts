/**
 * Prelude WGSL : l'arithmetique des nombres duaux.
 *
 * Un scalaire de la formule devient `(val, d/du, d/dv)` et chaque operation se
 * releve mecaniquement. En sortie on a les tangentes **exactes** — donc E, F, G
 * exacts, la normale exacte et l'element d'aire exact — en une passe, sans le
 * moindre echantillon supplementaire. C'est le §3.4 de `ruban-nouveau-projet.md`.
 *
 * Conventions aux points non derivables, ecrites ici parce qu'elles sont un
 * choix et non une evidence :
 *   - `sign`, `floor`, `ceil`, `trunc`, `round`, `step` : derivee nulle ;
 *   - `abs` : derivee `sign(a)`, donc nulle en zero ;
 *   - `fract` : derivee de l'identite ;
 *   - `min` / `max` / `clamp` : la derivee suit la branche retenue ;
 *   - `pow` a exposant variable : formule generale, indefinie pour base <= 0 —
 *     l'emetteur specialise le cas courant de l'exposant constant, qui lui
 *     reste defini pour une base negative.
 */
export const DUAL_PRELUDE = /* wgsl */ `
struct Dual {
  val : f32,
  du  : f32,
  dv  : f32,
};

fn dk(x: f32) -> Dual { return Dual(x, 0.0, 0.0); }

fn dAdd(a: Dual, b: Dual) -> Dual { return Dual(a.val + b.val, a.du + b.du, a.dv + b.dv); }
fn dSub(a: Dual, b: Dual) -> Dual { return Dual(a.val - b.val, a.du - b.du, a.dv - b.dv); }
fn dNeg(a: Dual) -> Dual { return Dual(-a.val, -a.du, -a.dv); }
fn dMul(a: Dual, b: Dual) -> Dual {
  return Dual(a.val * b.val, a.du * b.val + a.val * b.du, a.dv * b.val + a.val * b.dv);
}
// La valeur est calculee comme une vraie division et non comme un produit par
// l'inverse : sinon la version duale et la version scalaire se separent d'un
// ulp, et la verification croisee entre les deux perdrait sa raison d'etre.
fn dDiv(a: Dual, b: Dual) -> Dual {
  let inv2 = 1.0 / (b.val * b.val);
  return Dual(a.val / b.val, (a.du * b.val - a.val * b.du) * inv2, (a.dv * b.val - a.val * b.dv) * inv2);
}

fn dScale(a: Dual, k: f32) -> Dual { return Dual(a.val * k, a.du * k, a.dv * k); }

fn dCos(a: Dual) -> Dual { let g = -sin(a.val); return Dual(cos(a.val), g * a.du, g * a.dv); }
fn dSin(a: Dual) -> Dual { let g = cos(a.val); return Dual(sin(a.val), g * a.du, g * a.dv); }
fn dTan(a: Dual) -> Dual { let c = cos(a.val); let g = 1.0 / (c * c); return Dual(tan(a.val), g * a.du, g * a.dv); }
fn dAcos(a: Dual) -> Dual { let g = -1.0 / sqrt(1.0 - a.val * a.val); return Dual(acos(a.val), g * a.du, g * a.dv); }
fn dAsin(a: Dual) -> Dual { let g = 1.0 / sqrt(1.0 - a.val * a.val); return Dual(asin(a.val), g * a.du, g * a.dv); }
fn dAtan(a: Dual) -> Dual { let g = 1.0 / (1.0 + a.val * a.val); return Dual(atan(a.val), g * a.du, g * a.dv); }
fn dAtan2(y: Dual, x: Dual) -> Dual {
  let den = x.val * x.val + y.val * y.val;
  return Dual(atan2(y.val, x.val),
              (x.val * y.du - y.val * x.du) / den,
              (x.val * y.dv - y.val * x.dv) / den);
}
fn dCosh(a: Dual) -> Dual { let g = sinh(a.val); return Dual(cosh(a.val), g * a.du, g * a.dv); }
fn dSinh(a: Dual) -> Dual { let g = cosh(a.val); return Dual(sinh(a.val), g * a.du, g * a.dv); }
fn dTanh(a: Dual) -> Dual { let th = tanh(a.val); let g = 1.0 - th * th; return Dual(th, g * a.du, g * a.dv); }
fn dExp(a: Dual) -> Dual { let e = exp(a.val); return Dual(e, e * a.du, e * a.dv); }
fn dLog(a: Dual) -> Dual { let g = 1.0 / a.val; return Dual(log(a.val), g * a.du, g * a.dv); }
fn dSqrt(a: Dual) -> Dual { let r = sqrt(a.val); let g = 0.5 / r; return Dual(r, g * a.du, g * a.dv); }
fn dAbs(a: Dual) -> Dual { let g = sign(a.val); return Dual(abs(a.val), g * a.du, g * a.dv); }
fn dSign(a: Dual) -> Dual { return dk(sign(a.val)); }
fn dFloor(a: Dual) -> Dual { return dk(floor(a.val)); }
fn dCeil(a: Dual) -> Dual { return dk(ceil(a.val)); }
fn dTrunc(a: Dual) -> Dual { return dk(trunc(a.val)); }
fn dRound(a: Dual) -> Dual { return dk(round(a.val)); }
fn dFract(a: Dual) -> Dual { return Dual(fract(a.val), a.du, a.dv); }

fn dMin(a: Dual, b: Dual) -> Dual { if (a.val <= b.val) { return a; } return b; }
fn dMax(a: Dual, b: Dual) -> Dual { if (a.val >= b.val) { return a; } return b; }
fn dClamp(x: Dual, lo: Dual, hi: Dual) -> Dual { return dMin(dMax(x, lo), hi); }

// mod au sens GLSL : a - b * floor(a / b), et non le reste tronque de WGSL.
fn gmod(a: f32, b: f32) -> f32 { return a - b * floor(a / b); }
fn dMod(a: Dual, b: Dual) -> Dual {
  let q = floor(a.val / b.val);
  return Dual(a.val - b.val * q, a.du - q * b.du, a.dv - q * b.dv);
}

fn dStep(edge: Dual, x: Dual) -> Dual { return dk(step(edge.val, x.val)); }

fn dMix(a: Dual, b: Dual, s: Dual) -> Dual { return dAdd(a, dMul(dSub(b, a), s)); }

fn dSmoothstep(e0: Dual, e1: Dual, x: Dual) -> Dual {
  let span = dSub(e1, e0);
  let raw = dDiv(dSub(x, e0), span);
  if (raw.val <= 0.0) { return dk(0.0); }
  if (raw.val >= 1.0) { return dk(1.0); }
  let g = 6.0 * raw.val * (1.0 - raw.val);
  return Dual(raw.val * raw.val * (3.0 - 2.0 * raw.val), g * raw.du, g * raw.dv);
}

// Exposant variable : formule generale, indefinie pour une base negative —
// exactement comme pow() en GLSL et en WGSL.
fn dPow(a: Dual, b: Dual) -> Dual {
  let p = pow(a.val, b.val);
  let ga = b.val * pow(a.val, b.val - 1.0);
  let gb = p * log(a.val);
  return Dual(p, ga * a.du + gb * b.du, ga * a.dv + gb * b.dv);
}

// Exposant constant : reste defini pour une base negative, ce qui est le cas
// courant (u², sv**3). L'emetteur choisit cette variante quand il le peut.
fn dPowC(a: Dual, k: f32) -> Dual {
  let g = k * pow(a.val, k - 1.0);
  return Dual(pow(a.val, k), g * a.du, g * a.dv);
}

// cpow du projet d'origine : puissance signee, sign(v) * pow(abs(v), p).
fn cpowf(a: f32, p: f32) -> f32 { return sign(a) * pow(abs(a), p); }
fn dCpow(a: Dual, b: Dual) -> Dual {
  let m = pow(abs(a.val), b.val);
  let sg = sign(a.val);
  let ga = b.val * pow(abs(a.val), b.val - 1.0);
  let gb = sg * m * log(abs(a.val));
  return Dual(sg * m, ga * a.du + gb * b.du, ga * a.dv + gb * b.dv);
}
fn dCpowC(a: Dual, k: f32) -> Dual {
  let g = k * pow(abs(a.val), k - 1.0);
  return Dual(sign(a.val) * pow(abs(a.val), k), g * a.du, g * a.dv);
}

fn dHypot2(x: Dual, y: Dual) -> Dual {
  let r = sqrt(x.val * x.val + y.val * y.val);
  let inv = 1.0 / r;
  return Dual(r, (x.val * x.du + y.val * y.du) * inv, (x.val * x.dv + y.val * y.dv) * inv);
}
fn dHypot3(x: Dual, y: Dual, z: Dual) -> Dual {
  let r = sqrt(x.val * x.val + y.val * y.val + z.val * z.val);
  let inv = 1.0 / r;
  return Dual(r,
              (x.val * x.du + y.val * y.du + z.val * z.du) * inv,
              (x.val * x.dv + y.val * y.dv + z.val * z.dv) * inv);
}
`;
