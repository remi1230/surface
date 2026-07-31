/**
 * Camera orbitale.
 *
 * Elle porte une contrainte de methode plus qu'une contrainte de rendu : le §6
 * de la note demande qu'elle soit **epinglable** avant toute entree en mode
 * marche. Dans le projet d'origine, son inertie decidait du cote de la surface
 * ou l'on atterrissait, ce qui rendait deux executions du meme code
 * differentes. Ici l'etat est trois nombres, `pin()` les pose exactement, et
 * il n'y a aucune inertie a purger.
 */

import { lookAt, multiply, perspective, type Mat4, type Vec3 } from '../math/mat4';

export interface OrbitState {
  alpha: number;
  beta: number;
  distance: number;
  target: Vec3;
}

export class OrbitCamera {
  alpha = Math.PI / 4;
  beta = -Math.PI / 10;
  distance = 10;
  target: Vec3 = [0, 0, 0];
  fovY = Math.PI / 4;
  /** Rapproche le plan proche de l'echelle du maillage : sinon on clippe des qu'on approche. */
  nearFactor = 0.001;
  farFactor = 100;

  pin(state: Partial<OrbitState>): void {
    if (state.alpha !== undefined) this.alpha = state.alpha;
    if (state.beta !== undefined) this.beta = state.beta;
    if (state.distance !== undefined) this.distance = state.distance;
    if (state.target !== undefined) this.target = [...state.target];
  }

  snapshot(): OrbitState {
    return { alpha: this.alpha, beta: this.beta, distance: this.distance, target: [...this.target] };
  }

  eye(): Vec3 {
    const cb = Math.cos(this.beta);
    return [
      this.target[0] + this.distance * cb * Math.cos(this.alpha),
      this.target[1] + this.distance * Math.sin(this.beta),
      this.target[2] + this.distance * cb * Math.sin(this.alpha),
    ];
  }

  viewProjection(aspect: number): Mat4 {
    const near = Math.max(1e-4, this.distance * this.nearFactor);
    const far = Math.max(near * 10, this.distance * this.farFactor);
    const view = lookAt(this.eye(), this.target, [0, 1, 0]);
    return multiply(perspective(this.fovY, aspect, near, far), view);
  }

  /** Entrees souris. Le pas angulaire est fixe : aucune inertie, aucun lissage. */
  drag(dx: number, dy: number): void {
    this.alpha += dx * 0.01;
    this.beta = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.beta + dy * 0.01));
  }

  zoom(ticks: number): void {
    this.distance = Math.max(0.01, this.distance * Math.exp(ticks * 0.1));
  }
}
