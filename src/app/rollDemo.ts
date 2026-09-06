import { STARTER_FACES } from '../core/data/faces';
import { Rng, deriveSeed } from '../core/rng';
import { DieMesh } from '../render/dieMesh';
import { createScene } from '../render/scene';
import { createTable } from '../render/table';
import { initPhysics } from '../physics/world';
import { RollRunner } from './RollRunner';

declare global {
  interface Window {
    __df?: { rolls: number; mismatches: number; lastTopSides: Record<number, number> };
  }
}

export async function mountRollDemo(
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  seed: number,
): Promise<void> {
  const R = await initPhysics();
  const ctx = createScene(canvas);
  createTable(ctx.scene);
  const meshes = new Map<number, DieMesh>();
  for (let id = 1; id <= 3; id++) {
    const m = new DieMesh(STARTER_FACES);
    m.mesh.position.set(-3 + id * 1.5, 0.5, 0);
    ctx.scene.add(m.mesh);
    meshes.set(id, m);
  }
  const runner = new RollRunner(R, ctx, meshes);
  const rng = Rng.fromSeed(seed);
  window.__df = { rolls: 0, mismatches: 0, lastTopSides: {} };

  const btn = document.createElement('button');
  btn.dataset.testid = 'demo-roll';
  btn.textContent = 'Lanzar';
  const status = document.createElement('p');
  status.dataset.testid = 'demo-status';
  status.textContent = 'idle';
  root.append(btn, status);
  ctx.render();

  btn.addEventListener('click', () => {
    btn.disabled = true;
    status.textContent = 'rolling';
    const dice = [1, 2, 3].map((dieId) => ({ dieId, faceIndex: rng.int(0, 5) }));
    void runner.roll(dice, [], deriveSeed(seed, window.__df?.rolls ?? 0)).then((out) => {
      const df = window.__df;
      if (df) {
        df.rolls++;
        df.mismatches += out.mismatches;
        df.lastTopSides = Object.fromEntries(out.topSides);
      }
      status.textContent = 'settled';
      btn.disabled = false;
    });
  });
}
