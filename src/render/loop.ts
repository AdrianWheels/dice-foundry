import { PHYSICS_DT } from '../physics/world';

export interface LoopDeps {
  raf: (cb: FrameRequestCallback) => number;
  caf: (id: number) => void;
  now: () => number;
}
export interface LoopOptions {
  step: () => void;
  render: (alpha: number) => void;
  dt?: number;
  maxStepsPerFrame?: number;
}
export interface LoopHandle {
  start(): void;
  stop(): void;
  setSpeed(mult: number): void;
  readonly running: boolean;
}

const browserDeps = (): LoopDeps => ({
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
});

/** Timestep fijo con acumulador: el número de pasos NO depende del framerate. */
export function createLoop(opts: LoopOptions, deps: LoopDeps = browserDeps()): LoopHandle {
  const dt = opts.dt ?? PHYSICS_DT;
  const maxSteps = opts.maxStepsPerFrame ?? 8;
  let acc = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let speed = 1;
  const frame = (now: number): void => {
    if (!running) return;
    acc += Math.min(0.25, (now - last) / 1000) * speed;
    last = now;
    let n = 0;
    while (acc >= dt && n < maxSteps) {
      opts.step();
      acc -= dt;
      n++;
    }
    if (n === maxSteps) acc = 0; // pestaña dormida: no intentar recuperar el tiempo perdido
    opts.render(acc / dt);
    raf = deps.raf(frame);
  };
  return {
    start() {
      if (running) return;
      running = true;
      last = deps.now();
      acc = 0;
      raf = deps.raf(frame);
    },
    stop() {
      running = false;
      deps.caf(raf);
    },
    setSpeed(m) {
      speed = m;
    },
    get running() {
      return running;
    },
  };
}
