/**
 * Le strict necessaire de maths matricielles, a la main.
 *
 * Colonnes majeures, convention WebGPU : z du clip dans [0, 1] et non [-1, 1].
 * Une bibliotheque couterait plus a verifier qu'a ecrire.
 */

export type Mat4 = Float32Array;
export type Vec3 = [number, number, number];

export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function multiply(a: Mat4, b: Mat4, out: Mat4 = new Float32Array(16)): Mat4 {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r]! * b[c * 4 + k]!;
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/** Projection perspective, profondeur inverse non utilisee : near = petit, far = grand. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = far / (near - far);
  m[11] = -1;
  m[14] = (far * near) / (near - far);
  return m;
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize(sub(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  const m = new Float32Array(16);
  m[0] = xAxis[0]; m[1] = yAxis[0]; m[2] = zAxis[0]; m[3] = 0;
  m[4] = xAxis[1]; m[5] = yAxis[1]; m[6] = zAxis[1]; m[7] = 0;
  m[8] = xAxis[2]; m[9] = yAxis[2]; m[10] = zAxis[2]; m[11] = 0;
  m[12] = -dot(xAxis, eye); m[13] = -dot(yAxis, eye); m[14] = -dot(zAxis, eye); m[15] = 1;
  return m;
}
