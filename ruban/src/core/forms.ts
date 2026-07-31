/**
 * Les formes du terrain de jeu.
 *
 * Transcrites telles quelles de `js/forms.js` du projet d'origine — memes
 * expressions, meme domaine, meme resolution — parce que la recette de la
 * phase 1 est « le maillage coincide avec celui de l'application actuelle pour
 * la meme formule ». Toute retouche ici viderait la comparaison de son sens.
 *
 * Le choix des formes suit le §2 de `ruban-nouveau-projet.md` : ce sont celles
 * dont la geometrie *decide* quelque chose pour le jeu — la sphere qui referme
 * toute droite, le tore et son arbitrage rationnel / irrationnel, le Moebius
 * dont aucune geodesique ne fait le tour, la selle qui evase les bandes.
 */

import type { CoordSystem } from './formula/wgsl';

export interface FormDef {
  name: string;
  coords: CoordSystem;
  fx: string;
  fy: string;
  fz: string;
  alpha?: string;
  beta?: string;
  theta?: string;
  /** Domaine : u dans [-udef, +udef], v dans [-vdef, +vdef]. */
  udef: number;
  vdef: number;
  stepsU: number;
  stepsV: number;
  /** Pose de camera par defaut, reprise de `orient` dans forms.js. */
  orient?: { distance: number; alpha: number; beta: number };
}

const PI = Math.PI;

export const FORMS: FormDef[] = [
  {
    name: 'Sphere',
    coords: 'cartesian',
    fx: '2cucv', fy: '2sucv', fz: '2sv',
    udef: PI, vdef: PI / 2, stepsU: 128, stepsV: 128,
    orient: { distance: 10, alpha: PI / 4, beta: -PI / 10 },
  },
  {
    name: 'Torus',
    coords: 'cartesian',
    fx: '(cv + e)cu', fy: '(cv + e)su', fz: 'sv',
    udef: PI, vdef: PI, stepsU: 128, stepsV: 32,
    orient: { distance: 16.66, alpha: PI / 4, beta: -PI / 5 },
  },
  {
    name: 'Plan',
    coords: 'cartesian',
    fx: '.125u', fy: '.125v', fz: '',
    udef: 6 * PI, vdef: 6 * PI, stepsU: 128, stepsV: 128,
    orient: { distance: 10, alpha: PI / 4, beta: -PI / 4 },
  },
  {
    name: 'Saddle',
    coords: 'cartesian',
    fx: '.25u', fy: '.25v', fz: '.25uv',
    udef: PI, vdef: PI, stepsU: 16, stepsV: 64,
    orient: { distance: 8, alpha: (9 * PI) / 16, beta: (-2 * PI) / 7 },
  },
  {
    name: 'Moebius',
    coords: 'cartesian',
    fx: '(1+ 0.5vc(0.5u))cu', fy: '(1+ 0.5vc(0.5u))su', fz: '.5vs(0.5u)',
    udef: PI, vdef: 1, stepsU: 256, stepsV: 12,
    orient: { distance: 6, alpha: 0, beta: -PI / 6 },
  },
  {
    name: 'Catenoid',
    coords: 'cartesian',
    fx: 'cosh(v/2)cu', fy: '.5v', fz: 'cosh(v/2)su',
    udef: PI, vdef: PI, stepsU: 96, stepsV: 48,
    orient: { distance: 12.5, alpha: 0, beta: -PI / 8 },
  },
  {
    name: 'Klein Bottle',
    coords: 'cartesian',
    fx: '(2 + c.5usv - s.5us2v)cu',
    fy: '(2 + c.5usv - s.5us2v)su',
    fz: '(s.5usv + c.5us2v)',
    udef: PI, vdef: PI, stepsU: 128, stepsV: 128,
    orient: { distance: 15, alpha: 0, beta: -PI / 4 },
  },
  {
    name: 'Twisted Torus',
    coords: 'cartesian',
    fx: '(cv + 2)cu', fy: '(cv + 2)su', fz: 'sv',
    alpha: 'G(cv)', beta: 'G(cv)',
    udef: PI, vdef: PI, stepsU: 128, stepsV: 128,
    orient: { distance: 15, alpha: PI / 2, beta: 0 },
  },
  {
    name: 'Waves',
    coords: 'cartesian',
    fx: '.125u', fy: '.125v', fz: '.375(s(h(u,v)+6t))c.5t',
    theta: 'xc.5t',
    udef: 9 * PI, vdef: 9 * PI, stepsU: 128, stepsV: 128,
    orient: { distance: 15, alpha: -PI / 2, beta: 0 },
  },
  {
    name: 'Sphere meridians',
    coords: 'spheric',
    fx: '1', fy: 'v', fz: 'u',
    udef: PI, vdef: PI / 2, stepsU: 128, stepsV: 128,
    orient: { distance: 7, alpha: 0, beta: -PI / 5 },
  },
  {
    name: 'Cylinder',
    coords: 'cylindrical',
    fx: '1', fy: 'v', fz: 'u',
    udef: PI, vdef: PI, stepsU: 88, stepsV: 88,
    orient: { distance: 15, alpha: PI / 4, beta: -PI / 12 },
  },
  {
    name: 'Pseudosphere',
    coords: 'cartesian',
    fx: 'cv / cosh(u)', fy: 'sv / cosh(u)', fz: 'u - tanh(u)',
    udef: (3 * PI) / 2, vdef: PI, stepsU: 256, stepsV: 92,
    orient: { distance: 10, alpha: 0, beta: -PI / 8 },
  },
];

export function formByName(name: string): FormDef {
  const f = FORMS.find((x) => x.name === name);
  if (!f) throw new Error(`forme inconnue : ${name}`);
  return f;
}
