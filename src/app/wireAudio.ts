import type { AudioEngine } from '../audio/AudioEngine';
import type { Store } from '../ui/store';
import type { UiState } from '../ui/uiState';
import type { GameController } from './GameController';

/** Conecta los eventos del controlador con el motor de audio. Devuelve el desmontaje. */
export function wireAudio(
  controller: GameController,
  store: Store<UiState>,
  engine: AudioEngine,
): () => void {
  const offs: (() => void)[] = [];
  offs.push(controller.events.on('roll:start', () => engine.whoosh()));
  offs.push(controller.events.on('roll:contact', (dieId, force) => engine.click(dieId, force)));
  offs.push(
    controller.events.on('resolved', (_seat, state) => {
      const res = state.lastResolution;
      if (!res) return;
      if (res.gold > 0) engine.coin(res.gold);
      if (res.pv > 0) setTimeout(() => engine.pv(), 150);
    }),
  );
  offs.push(controller.events.on('purchase', () => engine.buy()));
  offs.push(controller.events.on('illegal', () => engine.error()));
  offs.push(controller.events.on('gameover', () => engine.win()));

  let last = store.get().settings;
  offs.push(
    store.subscribe((s) => {
      if (s.settings === last) return;
      if (s.settings.volume !== last.volume) engine.setVolume(s.settings.volume);
      if (s.settings.muted !== last.muted) engine.setMuted(s.settings.muted);
      last = s.settings;
    }),
  );

  const unlock = (): void => engine.unlock();
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  offs.push(() => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  });

  return () => {
    for (const off of offs) off();
  };
}
