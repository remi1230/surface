/**
 * AST du langage d'expressions des formes.
 *
 * Volontairement minuscule : le langage n'a que des scalaires. Les vecteurs
 * n'apparaissent qu'au niveau du systeme de coordonnees (surface.ts), jamais
 * dans une expression utilisateur.
 */

export type Expr =
  | { k: 'num'; value: number }
  | { k: 'var'; name: string }
  | { k: 'neg'; a: Expr }
  | { k: 'bin'; op: BinOp; a: Expr; b: Expr }
  | { k: 'call'; name: string; args: Expr[] };

export type BinOp = '+' | '-' | '*' | '/';

export const num = (value: number): Expr => ({ k: 'num', value });
export const vari = (name: string): Expr => ({ k: 'var', name });
export const neg = (a: Expr): Expr => ({ k: 'neg', a });
export const bin = (op: BinOp, a: Expr, b: Expr): Expr => ({ k: 'bin', op, a, b });
export const call = (name: string, ...args: Expr[]): Expr => ({ k: 'call', name, args });

/** Vrai si l'expression est la constante litterale zero (permet d'elider du code mort). */
export function isZero(e: Expr): boolean {
  return e.k === 'num' && e.value === 0;
}

/** Ensemble des variables libres d'une expression — sert a savoir si une forme depend du temps. */
export function freeVars(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.k) {
    case 'num':
      break;
    case 'var':
      out.add(e.name);
      break;
    case 'neg':
      freeVars(e.a, out);
      break;
    case 'bin':
      freeVars(e.a, out);
      freeVars(e.b, out);
      break;
    case 'call':
      for (const a of e.args) freeVars(a, out);
      break;
  }
  return out;
}
