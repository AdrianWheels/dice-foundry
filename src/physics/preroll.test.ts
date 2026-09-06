import { beforeAll, describe, expect, it } from 'vitest';
import { COCKED_DOT, getBody, readTransform, topSide } from './dieBody';
import { MAX_PLAN_STEPS, buildRollWorld, planRoll, sideMapFor, stepRoll } from './preroll';
import { type Rapier, freeWorld, initPhysics } from './world';

let R: Rapier;
beforeAll(async () => {
  R = await initPhysics();
});

describe('sideMapFor', () => {
  it('pone la cara elegida en el lado superior y es una permutación de 0..5', () => {
    const m = sideMapFor(4, 2);
    expect(m[4]).toBe(2);
    expect([...m].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sideMapFor(0, 0)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('planRoll', () => {
  it('el replay reproduce exactamente la pre-simulación (25 semillas, 3 dados)', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const dice = [
        { dieId: 1, faceIndex: seed % 6 },
        { dieId: 2, faceIndex: (seed * 7) % 6 },
        { dieId: 3, faceIndex: (seed * 11) % 6 },
      ];
      const plan = planRoll(R, dice, [], seed);
      expect(plan.forced).toBe(false);
      expect(plan.settleStep).toBeLessThan(MAX_PLAN_STEPS);
      const pw = buildRollWorld(R, plan);
      while (pw.step < plan.settleStep) stepRoll(pw, plan);
      for (const d of dice) {
        const { side, dot } = topSide(readTransform(getBody(pw, d.dieId)).rotation);
        expect(side).toBe(plan.topSides.get(d.dieId));
        expect(dot).toBeGreaterThanOrEqual(COCKED_DOT);
        expect(plan.sideMaps.get(d.dieId)?.[side]).toBe(d.faceIndex);
      }
      freeWorld(pw);
    }
  });

  it('relanzar un dado con el otro en reposo (fijo) es reproducible y no mueve al fijo', () => {
    const first = planRoll(
      R,
      [
        { dieId: 1, faceIndex: 0 },
        { dieId: 2, faceIndex: 3 },
      ],
      [],
      99,
    );
    const pw = buildRollWorld(R, first);
    while (pw.step < first.settleStep) stepRoll(pw, first);
    const rest = readTransform(getBody(pw, 2));
    freeWorld(pw);
    const re = planRoll(R, [{ dieId: 1, faceIndex: 5 }], [{ dieId: 2, ...rest }], 100);
    const pw2 = buildRollWorld(R, re);
    while (pw2.step < re.settleStep) stepRoll(pw2, re);
    expect(topSide(readTransform(getBody(pw2, 1)).rotation).side).toBe(re.topSides.get(1));
    expect(readTransform(getBody(pw2, 2))).toEqual(rest);
    freeWorld(pw2);
  });

  it('8 dados reposan sin forzar (5 semillas)', () => {
    for (let seed = 200; seed < 205; seed++) {
      const dice = Array.from({ length: 8 }, (_, i) => ({ dieId: i + 1, faceIndex: i % 6 }));
      const plan = planRoll(R, dice, [], seed);
      expect(plan.forced).toBe(false);
    }
  });
});
