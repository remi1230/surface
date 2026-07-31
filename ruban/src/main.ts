/**
 * Point d'entree.
 *
 * Phase 1 : on charge une forme, on la regarde tourner autour, et on peut la
 * relire au bit pres depuis le harnais. Rien d'autre. Le marcheur arrive en
 * phase 2, la peinture en phase 3.
 */

import { Ruban, type RenderTarget } from './engine';
import { FORMS } from './core/forms';
import { installTestApi } from './testapi';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const status = document.getElementById('status') as HTMLElement;
const picker = document.getElementById('form') as HTMLSelectElement;
const animate = document.getElementById('animate') as HTMLInputElement;

function resize(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
}

/**
 * `?offscreen=LxH` rend hors ecran au lieu de presenter le canvas. C'est le
 * mode du harnais de mesure : taille fixe, pas de compositeur, image lisible.
 */
function chooseTarget(): RenderTarget {
  const raw = new URLSearchParams(location.search).get('offscreen');
  if (raw === null) return { kind: 'canvas', canvas };
  const m = /^(\d+)x(\d+)$/.exec(raw);
  const width = m ? Number(m[1]) : 640;
  const height = m ? Number(m[2]) : 480;
  return { kind: 'offscreen', width, height };
}

async function boot(): Promise<void> {
  const target = chooseTarget();
  let ruban: Ruban;
  try {
    ruban = await Ruban.create(target);
  } catch (err) {
    status.textContent = String(err instanceof Error ? err.message : err);
    status.classList.add('error');
    return;
  }

  installTestApi(ruban);

  for (const f of FORMS) {
    const opt = document.createElement('option');
    opt.value = f.name;
    opt.textContent = f.name;
    picker.append(opt);
  }
  picker.value = 'Sphere';

  const load = (name: string) => {
    const def = FORMS.find((f) => f.name === name)!;
    ruban.loadForm(def, { G: 1 });
    status.textContent =
      `${def.name} — ${def.stepsU}x${def.stepsV} (${ruban.surface!.vertexCount.toLocaleString('fr-FR')} sommets)`;
  };

  if (target.kind === 'canvas') resize(canvas);
  load(picker.value);
  ruban.clock.frozen = !animate.checked;
  // Hors ecran, c'est le harnais qui decide quand une frame est calculee.
  if (target.kind === 'canvas') ruban.startLoop();

  picker.addEventListener('change', () => load(picker.value));
  animate.addEventListener('change', () => {
    ruban.clock.frozen = !animate.checked;
  });
  window.addEventListener('resize', () => resize(canvas));

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ruban.camera.drag(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    ruban.camera.zoom(Math.sign(e.deltaY));
  }, { passive: false });
}

void boot();
