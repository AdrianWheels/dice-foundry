import { facePrice, cardPrice, diePrice } from '../core/economy';
import type { GameState } from '../core/types';
import type { CoinBurst, FloatingLabels } from '../render/effects';
import type { DieMesh } from '../render/dieMesh';
import { delta } from '../ui/strings.es';
import type { Store } from '../ui/store';
import type { UiState } from '../ui/uiState';
import type { GameController } from './GameController';

export interface EffectDeps {
  labels: FloatingLabels;
  burst: CoinBurst;
  meshes: Map<number, DieMesh>;
}

const TABLE_CENTER = { x: 0, y: 1.2, z: 0 };
const STAGGER_MS = 120;

function worldOf(deps: EffectDeps, dieId: number | undefined): { x: number; y: number; z: number } {
  const mesh = dieId === undefined ? undefined : deps.meshes.get(dieId);
  if (!mesh) return TABLE_CENTER;
  const p = mesh.mesh.position;
  return { x: p.x, y: p.y + 0.8, z: p.z };
}

/** Etiquetas y partículas a partir de los eventos del controlador. */
export function wireEffects(
  controller: GameController,
  store: Store<UiState>,
  deps: EffectDeps,
): () => void {
  const offs: (() => void)[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  offs.push(
    controller.events.on('resolved', (_seat, state: GameState) => {
      const res = state.lastResolution;
      if (!res) return;
      let i = 0;
      for (const e of res.events) {
        if (e.gold === 0 && e.pv === 0) continue;
        const world = worldOf(deps, e.dieId);
        const cls = e.pv !== 0 ? 'pv' : 'gold';
        const text = delta(e.gold, e.pv);
        const bursts = e.gold >= 3;
        timers.push(
          setTimeout(() => {
            deps.labels.show(text, world, cls);
            if (bursts) deps.burst.burst(world);
          }, i * STAGGER_MS),
        );
        i++;
      }
    }),
  );

  offs.push(
    controller.events.on('purchase', (_seat, action) => {
      const g = controller.getState();
      if (!g) return;
      const me = g.players[g.currentSeat];
      if (!me) return;
      let price = 0;
      let dieId: number | undefined;
      if (action.type === 'buyDie') {
        price = diePrice(me);
      } else if (action.type === 'buyCard') {
        const item = g.shop.slots[action.slot];
        price = item && item.kind === 'card' ? cardPrice(item.cardId) : 0;
      } else if (action.type === 'buyFace') {
        const item = g.shop.slots[action.slot];
        price = item && item.kind === 'face' ? facePrice(item.faceId, me) : 0;
        dieId = action.dieId;
      }
      deps.labels.show(`−${price} oro`, worldOf(deps, dieId), 'neutral');
    }),
  );

  let lastMotion = store.get().settings.reduceMotion;
  deps.labels.setReduceMotion(lastMotion);
  deps.burst.setReduceMotion(lastMotion);
  offs.push(
    store.subscribe((s) => {
      if (s.settings.reduceMotion === lastMotion) return;
      lastMotion = s.settings.reduceMotion;
      deps.labels.setReduceMotion(lastMotion);
      deps.burst.setReduceMotion(lastMotion);
    }),
  );
  offs.push(controller.events.on('screen', () => deps.labels.clear()));

  return () => {
    for (const t of timers) clearTimeout(t);
    for (const off of offs) off();
    deps.labels.clear();
    deps.burst.dispose();
  };
}
