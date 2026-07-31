/**
 * Analyseur du langage d'expressions des formes.
 *
 * Le projet d'origine expansait la notation compacte (`2cucv`) par une pile de
 * 109 expressions regulieres appliquees en sequence (`glo.regs`). Ici c'est un
 * vrai analyseur : un scanner caractere par caractere et une descente
 * recursive. Le langage reconnu est le meme, a trois ecarts assumes et
 * documentes en bas de ce fichier.
 *
 * Ce que le langage accepte :
 *
 *   - multiplication implicite       `2cucv`  ->  2*cos(u)*cos(v)
 *   - abreviations trigonometriques  `c<coef><var>` / `s<coef><var>` ou <var>
 *     est u, v ou t : `su` -> sin(u), `c.5u` -> cos(0.5*u), `s2v` -> sin(2*v)
 *   - appels de fonction             `cosh(v/2)`, `h(u,v)`, `pow(a,b)`
 *   - puissances                     `sv**3`, `u²`, `(cu)***2` (cpow signee)
 *   - constantes                     pi, e/ep, Q (racine de 2), Z (nombre d'or)
 *   - parametres uniformes           A..M, plus u, v et le temps t
 *
 * Ce que le langage refuse volontairement : les variables de parite du projet
 * d'origine (d, k, p, w, n, i, j), derivees de `mod(i, 2.0)`. Elles n'ont pas
 * de valeur definie entre deux sommets — c'est exactement la limite relevee au
 * §15 de `vue-premiere-personne.md`, et la raison pour laquelle le marcheur ne
 * pouvait jamais sonder en fractionnaire. Le nouveau moteur evalue
 * `surfacePoint(u, v)` en continu ; une forme qui depend de l'indice de sommet
 * n'a pas de surface a parcourir. Refus explicite plutot que valeur inventee.
 */

import type { Expr } from './ast';
import { bin, call, neg, num, vari } from './ast';

/** Variables toujours disponibles dans une expression de forme. */
const BASE_VARS = new Set(['u', 'v', 't']);

/** Parametres uniformes de l'application (curseurs A..M). */
const PARAM_VARS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);

/**
 * Constantes numeriques. Les valeurs sont celles du projet d'origine
 * (`GPUShaderMesh.js:71-76`), au chiffre pres, pour que la comparaison de
 * maillage porte sur la geometrie et non sur un arrondi de constante.
 */
const CONSTANTS: Record<string, number> = {
  pi: 3.14159265358979,
  PI: 3.14159265358979,
  ep: 2.71828182845905,
  e: 2.71828182845905,
  Q: 1.41421356237310,
  Z: 1.61803398874989,
};

/** Variables disponibles uniquement dans les expressions de rotation (alpha/beta/theta). */
const ROTATION_VARS = new Set(['x', 'y', 'z']);

/**
 * Fonctions reconnues, avec leur arite acceptee.
 * `c`/`s`/`ca`/`sa`/`h`/`l`/`q`/`r`/`g` sont les abreviations definies en GLSL
 * par `getUtilityFunctionsGLSL()` dans le projet d'origine.
 */
export const FUNCTIONS: Record<string, number[]> = {
  cos: [1], sin: [1], tan: [1],
  acos: [1], asin: [1], atan: [1, 2],
  cosh: [1], sinh: [1], tanh: [1],
  exp: [1], log: [1], sqrt: [1], abs: [1], sign: [1],
  floor: [1], ceil: [1], fract: [1], trunc: [1], round: [1],
  min: [2], max: [2], mod: [2], pow: [2], step: [2],
  clamp: [3], smoothstep: [3], mix: [3],
  c: [1], s: [1], ca: [1], sa: [1], l: [1],
  h: [2, 3], hypot: [2, 3],
  cpow: [2],
  q: [3], r: [3], g: [2],
};

/** Noms de fonction, du plus long au plus court : le scanner prend le plus long. */
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length);

/** Caracteres interdits dans le coefficient d'une abreviation, par variable terminale. */
const SHORTHAND_STOP: Record<string, string> = {
  // Reprend les classes de `glo.regs` : /c([^u\(vw]*)u/, /c([^v\(uw]*)v/, /c([^t\(auvp]*)t/
  u: 'uvw(),',
  v: 'uvw(),',
  t: 'tauvp(),',
};

export class FormulaError extends Error {
  constructor(message: string, readonly source: string, readonly at: number) {
    super(`${message}\n  ${source}\n  ${' '.repeat(Math.max(0, at))}^`);
    this.name = 'FormulaError';
  }
}

export interface ParseOptions {
  /** Autorise x, y, z et R (position avant rotation) — vrai pour alpha/beta/theta. */
  allowPosition?: boolean;
}

/**
 * Analyse une expression compacte et renvoie son AST.
 * @param source expression telle que saisie ("2cucv", "(cv + e)cu", ...)
 */
export function parseFormula(source: string, options: ParseOptions = {}): Expr {
  const text = source ?? '';
  if (text.trim() === '') return num(0);
  const parser = new Parser(text, options);
  const expr = parser.parseExpression();
  parser.expectEnd();
  return expr;
}

class Parser {
  private i = 0;

  constructor(private readonly src: string, private readonly opt: ParseOptions) {}

  // ---------- scanner ----------

  private skipSpace(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i]!)) this.i++;
  }

  private peek(): string {
    this.skipSpace();
    return this.i < this.src.length ? this.src[this.i]! : '';
  }

  private eat(token: string): boolean {
    this.skipSpace();
    if (this.src.startsWith(token, this.i)) {
      this.i += token.length;
      return true;
    }
    return false;
  }

  private fail(message: string): never {
    throw new FormulaError(message, this.src, this.i);
  }

  expectEnd(): void {
    if (this.peek() !== '') this.fail(`caractere inattendu "${this.peek()}"`);
  }

  // ---------- grammaire ----------

  /** somme := produit (('+' | '-') produit)* */
  parseExpression(): Expr {
    let left = this.parseProduct();
    for (;;) {
      const c = this.peek();
      if (c === '+') {
        this.i++;
        left = bin('+', left, this.parseProduct());
      } else if (c === '-') {
        this.i++;
        left = bin('-', left, this.parseProduct());
      } else {
        return left;
      }
    }
  }

  /** produit := unaire (('*' | '/' | '%') unaire | unaire)*  — le dernier cas est la multiplication implicite */
  private parseProduct(): Expr {
    let left = this.parseUnary();
    for (;;) {
      this.skipSpace();
      if (this.src.startsWith('***', this.i) || this.src.startsWith('**', this.i)) {
        // Traite par parsePower, en aval : on ne consomme pas ici.
        return left;
      }
      const c = this.peek();
      if (c === '*') {
        this.i++;
        left = bin('*', left, this.parseUnary());
      } else if (c === '/') {
        this.i++;
        left = bin('/', left, this.parseUnary());
      } else if (c === '%') {
        this.i++;
        left = call('mod', left, this.parseUnary());
      } else if (this.startsPrimary(c)) {
        left = bin('*', left, this.parseUnary());
      } else {
        return left;
      }
    }
  }

  private startsPrimary(c: string): boolean {
    return c !== '' && (/[0-9.a-zA-Z]/.test(c) || c === '(');
  }

  /** unaire := ('-' | '+') unaire | puissance */
  private parseUnary(): Expr {
    const c = this.peek();
    if (c === '-') {
      this.i++;
      return neg(this.parseUnary());
    }
    if (c === '+') {
      this.i++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  /** puissance := postfixe (('**' | '***') unaire)?  — associatif a droite */
  private parsePower(): Expr {
    const base = this.parsePostfix();
    this.skipSpace();
    if (this.src.startsWith('***', this.i)) {
      this.i += 3;
      return call('cpow', base, this.parseUnary());
    }
    if (this.src.startsWith('**', this.i)) {
      this.i += 2;
      return call('pow', base, this.parseUnary());
    }
    return base;
  }

  /** postfixe := primaire ('²' | '³')* */
  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    for (;;) {
      this.skipSpace();
      if (this.src.startsWith('²', this.i)) {
        this.i += 1;
        e = call('pow', e, num(2));
      } else if (this.src.startsWith('³', this.i)) {
        this.i += 1;
        e = call('pow', e, num(3));
      } else {
        return e;
      }
    }
  }

  private parsePrimary(): Expr {
    this.skipSpace();
    const c = this.peek();
    if (c === '') this.fail('expression tronquee');

    if (c === '(') {
      this.i++;
      const inner = this.parseExpression();
      if (!this.eat(')')) this.fail('parenthese fermante manquante');
      return inner;
    }

    if (/[0-9.]/.test(c)) return this.parseNumber();
    if (/[a-zA-Z]/.test(c)) return this.parseName();

    return this.fail(`caractere inattendu "${c}"`);
  }

  private parseNumber(): Expr {
    const start = this.i;
    while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) this.i++;
    if (this.src[this.i] === '.') {
      this.i++;
      while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) this.i++;
    }
    const text = this.src.slice(start, this.i);
    const value = Number(text);
    if (!Number.isFinite(value)) this.fail(`nombre invalide "${text}"`);
    return num(value);
  }

  /**
   * Un nom : fonction (si suivie d'une parenthese), variable connue, ou
   * abreviation trigonometrique. Dans cet ordre : c'est la meme priorite que
   * les regex d'origine, ou `cosh(` ne peut pas etre lu comme `c` + `osh(`
   * parce que la classe de caracteres exclut la parenthese.
   */
  private parseName(): Expr {
    for (const name of FUNCTION_NAMES) {
      if (this.src.startsWith(name, this.i) && this.afterName(name) === '(') {
        this.i += name.length;
        return this.parseCall(name);
      }
    }

    const varName = this.matchVariable();
    if (varName !== null) {
      this.i += varName.length;
      if (varName in CONSTANTS) return num(CONSTANTS[varName]!);
      if (varName === 'R') return call('h', vari('x'), vari('y'), vari('z'));
      return vari(varName);
    }

    const c = this.src[this.i]!;
    if (c === 'c' || c === 's') return this.parseShorthand(c);

    return this.fail(`nom inconnu a partir de "${this.src.slice(this.i, this.i + 6)}"`);
  }

  /** Caractere qui suit un nom candidat, espaces ignores. */
  private afterName(name: string): string {
    let j = this.i + name.length;
    while (j < this.src.length && /\s/.test(this.src[j]!)) j++;
    return j < this.src.length ? this.src[j]! : '';
  }

  private matchVariable(): string | null {
    const candidates = [
      ...Object.keys(CONSTANTS),
      ...BASE_VARS,
      ...PARAM_VARS,
      ...(this.opt.allowPosition ? [...ROTATION_VARS, 'R'] : []),
    ].sort((a, b) => b.length - a.length);

    for (const name of candidates) {
      if (!this.src.startsWith(name, this.i)) continue;
      // Un nom ne peut pas etre le prefixe d'un identifiant plus long ("e" dans "exp").
      const next = this.src[this.i + name.length] ?? '';
      if (/[a-zA-Z]/.test(next) && this.longerNameExists(name, next)) continue;
      return name;
    }
    return null;
  }

  /**
   * Vrai si le caractere suivant peut prolonger un identifiant reconnu : dans
   * ce cas le nom court n'est pas le bon decoupage. Les abreviations `cu`,
   * `sv`... sont exclues de ce test, sinon `e` suivi de `x` bloquerait `ex`
   * qui n'existe pas alors que `exp` existe.
   */
  private longerNameExists(name: string, next: string): boolean {
    const prefix = name + next;
    return FUNCTION_NAMES.some((f) => f.startsWith(prefix)) ||
      Object.keys(CONSTANTS).some((k) => k.startsWith(prefix) && k !== name);
  }

  private parseCall(name: string): Expr {
    if (!this.eat('(')) this.fail(`"(" attendu apres ${name}`);
    const args: Expr[] = [];
    if (this.peek() !== ')') {
      args.push(this.parseExpression());
      while (this.eat(',')) args.push(this.parseExpression());
    }
    if (!this.eat(')')) this.fail(`parenthese fermante manquante pour ${name}`);

    const arities = FUNCTIONS[name]!;
    if (!arities.includes(args.length)) {
      this.fail(`${name} attend ${arities.join(' ou ')} argument(s), ${args.length} fourni(s)`);
    }
    if (name === 'hypot') return call('h', ...args);
    if (name === 'l') return call('log', ...args);
    if (name === 'c') return call('cos', ...args);
    if (name === 's') return call('sin', ...args);
    if (name === 'q') return call('mix', ...args);
    if (name === 'r') return call('smoothstep', ...args);
    if (name === 'g') return call('step', ...args);
    return call(name, ...args);
  }

  /**
   * Abreviation `c<coef><var>` / `s<coef><var>`.
   *
   * Le coefficient est capture textuellement puis reanalyse avec la variable
   * terminale collee — exactement ce que faisait le remplacement `cos($1u)`.
   * `c3+u` donne donc `cos(3+u)`, comme dans le projet d'origine.
   */
  private parseShorthand(head: 'c' | 's'): Expr {
    const start = this.i;
    this.i++; // consomme c ou s

    for (const terminator of ['u', 'v', 't']) {
      const stop = SHORTHAND_STOP[terminator]!;
      let j = this.i;
      while (j < this.src.length && !stop.includes(this.src[j]!)) j++;
      if (j >= this.src.length || this.src[j] !== terminator) continue;

      const argText = this.src.slice(this.i, j + 1);
      const arg = new Parser(argText, this.opt);
      const parsed = arg.parseExpression();
      arg.expectEnd();
      this.i = j + 1;
      return call(head === 'c' ? 'cos' : 'sin', parsed);
    }

    this.i = start;
    return this.fail(
      `abreviation "${head}" sans variable terminale (u, v ou t) : "${this.src.slice(start, start + 8)}"`,
    );
  }
}

/*
 * Ecarts assumes par rapport a la pile de regex du projet d'origine
 * -----------------------------------------------------------------
 * 1. Les variables de parite (d, k, p, w, n, i, j) sont refusees, pas ignorees.
 *    Voir l'en-tete de ce fichier.
 * 2. Le coefficient d'une abreviation s'arrete aussi sur ")" et "," , la ou la
 *    classe d'origine les laissait passer. Les seuls cas ou cela change quelque
 *    chose sont ceux ou la regex produisait du GLSL desequilibre — donc du code
 *    qui ne compilait pas.
 * 3. Les familles de deformation (m(), o(), b(), a(), ce/se(), tube()...) ne
 *    sont pas reconnues : elles lisent des globales par sommet du pipeline de
 *    deformation, qui n'existe pas ici. La forme est une fonction de (u, v, t).
 */
