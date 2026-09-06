import { describe, expect, it } from 'vitest';
import { createLoop } from './loop';

function fakeDeps() {
  let t = 0;
  const frames: FrameRequestCallback[] = [];
  return {
    deps: {
      raf: (cb: FrameRequestCallback): number => {
        frames.push(cb);
        return frames.length;
      },
      caf: (): void => {
        frames.length = 0;
      },
      now: (): number => t,
    },
    tick(ms: number): void {
      t += ms;
      const cb = frames.shift();
      if (cb) cb(t);
    },
  };
}

describe('createLoop', () => {
  it('avanza pasos fijos de 1/60 según el tiempo transcurrido y renderiza una vez por frame', () => {
    const f = fakeDeps();
    let steps = 0;
    let renders = 0;
    const loop = createLoop(
      {
        step: () => steps++,
        render: () => renders++,
      },
      f.deps,
    );
    loop.start();
    f.tick(50); // 3 pasos (50 ms / 16.67)
    expect(steps).toBe(3);
    expect(renders).toBe(1);
    f.tick(16.7); // 1 paso (+ resto acumulado)
    expect(steps).toBe(4);
  });

  it('limita los pasos por frame tras una pestaña dormida y respeta la velocidad', () => {
    const f = fakeDeps();
    let steps = 0;
    const loop = createLoop(
      {
        step: () => steps++,
        render: () => undefined,
        maxStepsPerFrame: 8,
      },
      f.deps,
    );
    loop.start();
    f.tick(5000);
    expect(steps).toBe(8);
    loop.setSpeed(2);
    f.tick(50);
    expect(steps).toBe(14); // 100 ms simulados → 6 pasos
    loop.stop();
    expect(loop.running).toBe(false);
  });
});
