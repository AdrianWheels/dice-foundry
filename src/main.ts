import './ui/styles.css';
import { AudioEngine } from './audio/AudioEngine';
import { GameController } from './app/GameController';
import { readParams } from './app/params';
import { wireAudio } from './app/wireAudio';
import { wireEffects } from './app/wireEffects';
import { anonId, loadGame, loadHints, loadSettings } from './app/persistence';
import { consoleSink, createTelemetry, posthogSink, type TelemetrySink } from './app/telemetry';
import { wireTelemetry } from './app/wireTelemetry';
import { APP_VERSION } from './app/version';
import { mountRollDemo } from './app/rollDemo';
import { initPhysics } from './physics/world';
import { createScene } from './render/scene';
import { createTable } from './render/table';
import { createStore } from './ui/store';
import { initialUiState } from './ui/uiState';

/** Banco de pruebas de la escena: `/?dev=scene`. */
function devScene(canvas: HTMLCanvasElement, root: HTMLElement): void {
  const ctx = createScene(canvas);
  createTable(ctx.scene);
  const tick = (): void => {
    ctx.render();
    requestAnimationFrame(tick);
  };
  tick();
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.textContent = 'OK scene';
  root.append(status);
}

async function main(): Promise<void> {
  const params = readParams(location.search);
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const root = document.getElementById('app') as HTMLElement;
  if (params.dev === 'scene') {
    devScene(canvas, root);
    return;
  }
  if (params.dev === 'roll') {
    await mountRollDemo(canvas, root, params.seed ?? 1);
    return;
  }
  const R = await initPhysics();
  const storage = localStorage;
  const store = createStore(initialUiState());
  store.set({
    settings: loadSettings(storage),
    hintsSeen: loadHints(storage),
    resumeAvailable: loadGame(storage) !== null,
  });
  if (params.bots) store.set({ settings: { ...store.get().settings, botSpeed: params.bots } });
  const controller = new GameController({ R, canvas, root, store, prefill: params, storage });
  controller.mount();
  wireAudio(controller, store, new AudioEngine());
  const fx = controller.effectDeps();
  if (fx) wireEffects(controller, store, fx);
  window.addEventListener('beforeunload', () => controller.flush());

  const sinks: TelemetrySink[] = [];
  if (import.meta.env.DEV) sinks.push(consoleSink);
  const phKey = import.meta.env.VITE_POSTHOG_KEY;
  if (phKey) {
    sinks.push(
      posthogSink({
        key: phKey,
        host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        distinctId: anonId(storage),
      }),
    );
  }
  wireTelemetry(
    controller,
    store,
    createTelemetry(sinks, { app: 'dice-foundry', version: APP_VERSION }),
  );
  // Solo en un despliegue real: en `vite preview` el script de Vercel da 404 y ensucia la consola.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (import.meta.env.PROD && !isLocal) {
    const { inject } = await import('@vercel/analytics');
    inject();
  }
  if (import.meta.env.DEV || params.dev || params.e2e) {
    const df = { rolls: 0, mismatches: 0, getState: () => controller.getState() };
    window.__df = df;
    controller.events.on('roll:settled', (o) => {
      df.rolls++;
      df.mismatches += o.mismatches;
    });
  }
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.hidden = true;
  status.textContent = 'OK rapier+three';
  root.append(status);
}

main().catch((err: unknown) => {
  console.error(err);
});
