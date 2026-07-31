/**
 * La couche WebGPU, volontairement mince.
 *
 * Le jeu utilise trois pipelines et deux tampons ; un moteur couterait 3 Mo et
 * ses hypotheses (§3.2 de la note). Ce fichier ne fait qu'eviter la
 * repetition : creation de device, tampons, lecture-retour.
 */

export interface GpuContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  /** Format de la chaine de presentation, ou null en mode calcul pur. */
  format: GPUTextureFormat;
}

export class GpuUnavailable extends Error {}

export async function initGpu(): Promise<GpuContext> {
  if (!('gpu' in navigator)) {
    throw new GpuUnavailable(
      "WebGPU absent. Choix assume du projet : pas de repli WebGL2 (§5 de la note). " +
        "Chrome, Edge et Safari 18 le supportent, Firefox depuis 2025.",
    );
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new GpuUnavailable('aucun adaptateur WebGPU disponible');
  const device = await adapter.requestDevice();
  device.lost.then((info) => {
    console.error('[ruban] device WebGPU perdu :', info.reason, info.message);
  });
  return { adapter, device, format: navigator.gpu.getPreferredCanvasFormat() };
}

export function createBuffer(
  device: GPUDevice,
  bytes: number,
  usage: GPUBufferUsageFlags,
  label: string,
): GPUBuffer {
  return device.createBuffer({ size: Math.max(4, bytes), usage, label });
}

/**
 * Attend une promesse WebGPU en gardant la page vivante.
 *
 * `mapAsync` ne se resout que si le navigateur fait tourner sa boucle : sans
 * frame en vol, le harnais — qui justement arrete la boucle de rendu pour
 * rejouer a l'identique — attendrait indefiniment ou verrait l'instance
 * liberee sous lui. On bat donc la mesure au rythme de `requestAnimationFrame`
 * sans rien dessiner.
 */
export function pumped<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  const done = promise.then(
    (v) => { settled = true; return v; },
    (e) => { settled = true; throw e; },
  );
  const tick = () => {
    if (settled) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return done;
}

/**
 * Lecture-retour ponctuelle d'un tampon de stockage. Bloquante par nature —
 * reservee au harnais de mesure et au debogage. La boucle de jeu, elle, lit un
 * anneau asynchrone (phase 2).
 */
export async function readBuffer(
  device: GPUDevice,
  src: GPUBuffer,
  bytes: number,
  offset = 0,
): Promise<ArrayBuffer> {
  const staging = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: 'readback',
  });
  const enc = device.createCommandEncoder({ label: 'readback' });
  enc.copyBufferToBuffer(src, offset, staging, 0, bytes);
  device.queue.submit([enc.finish()]);
  await pumped(staging.mapAsync(GPUMapMode.READ));
  const copy = staging.getMappedRange().slice(0);
  staging.unmap();
  staging.destroy();
  return copy;
}
