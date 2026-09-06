import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import {
  addDie,
  getBody,
  isSettled,
  makeThrowParams,
  readTransform,
  rotateVec,
  topSide,
} from './dieBody';
import {
  CONTACT_FORCE_THRESHOLD,
  type Rapier,
  TABLE,
  createPhysicsWorld,
  freeWorld,
  initPhysics,
  stepWorld,
} from './world';

let R: Rapier;
beforeAll(async () => {
  R = await initPhysics();
});

describe('topSide (matemática pura)', () => {
  const s = Math.SQRT1_2;
  it('identidad ⇒ +Y (lado 2) con dot 1', () => {
    expect(topSide({ x: 0, y: 0, z: 0, w: 1 })).toEqual({ side: 2, dot: 1 });
  });
  it('+90° sobre X ⇒ −Z (lado 5); −90° ⇒ +Z (lado 4)', () => {
    expect(topSide({ x: s, y: 0, z: 0, w: s }).side).toBe(5);
    expect(topSide({ x: -s, y: 0, z: 0, w: s }).side).toBe(4);
  });
  it('+90° sobre Z ⇒ +X (lado 0); −90° ⇒ −X (lado 1)', () => {
    expect(topSide({ x: 0, y: 0, z: s, w: s }).side).toBe(0);
    expect(topSide({ x: 0, y: 0, z: -s, w: s }).side).toBe(1);
  });
  it('rotateVec de +90° sobre Y lleva +X a −Z', () => {
    const v = rotateVec({ x: 0, y: s, z: 0, w: s }, { x: 1, y: 0, z: 0 });
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-1);
  });
});

describe('mundo', () => {
  it('un dado lanzado reposa en < 900 pasos, dentro de la mesa y con una cara clara arriba', () => {
    const pw = createPhysicsWorld(R);
    addDie(pw, 1, makeThrowParams(Rng.fromSeed(1), 0, 1));
    let steps = 0;
    while (steps < 900 && !isSettled(getBody(pw, 1))) {
      stepWorld(pw);
      steps++;
    }
    expect(steps).toBeLessThan(900);
    const { position, rotation } = readTransform(getBody(pw, 1));
    expect(position.y).toBeGreaterThan(0.3);
    expect(position.y).toBeLessThan(0.7);
    expect(Math.abs(position.x)).toBeLessThan(TABLE.halfX);
    expect(Math.abs(position.z)).toBeLessThan(TABLE.halfZ);
    expect(topSide(rotation).dot).toBeGreaterThan(0.95);
    freeWorld(pw);
  });

  it('es determinista bit a bit: dos mundos con la misma secuencia acaban idénticos', () => {
    const run = (): unknown => {
      const pw = createPhysicsWorld(R);
      const rng = Rng.fromSeed(7);
      for (let i = 0; i < 3; i++) addDie(pw, i + 1, makeThrowParams(rng, i, 3));
      for (let s = 0; s < 400; s++) stepWorld(pw);
      const out = [1, 2, 3].map((id) => readTransform(getBody(pw, id)));
      freeWorld(pw);
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('emite eventos de contacto con fuerza al golpear la mesa', () => {
    const pw = createPhysicsWorld(R);
    addDie(pw, 1, makeThrowParams(Rng.fromSeed(2), 0, 1));
    const hits: number[] = [];
    for (let s = 0; s < 300; s++) {
      stepWorld(pw, (dieId, f) => {
        if (dieId === 1) hits.push(f);
      });
    }
    expect(hits.length).toBeGreaterThan(0);
    expect(Math.max(...hits)).toBeGreaterThan(CONTACT_FORCE_THRESHOLD);
    freeWorld(pw);
  });
});
