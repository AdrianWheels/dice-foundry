import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { createDie, replaceFace } from './dice';
import { objectiveProgress } from './objectives';
import type { DieFaces, PlayerState } from './types';

const p = (objective: string, over: Partial<PlayerState> = {}): PlayerState => ({
  seat: 0,
  name: 'P',
  kind: 'human',
  gold: 0,
  pv: 0,
  dice: [createDie(1), createDie(2)],
  cards: [],
  objective,
  ...over,
});
const F = (...ids: string[]): DieFaces => ids as DieFaces;

describe('objectiveProgress', () => {
  it('Ingeniero: ≥ 4 dados permanentes (los temporales no cuentan)', () => {
    expect(objectiveProgress(p('obj_engineer'))).toMatchObject({
      current: 2,
      target: 4,
      achieved: false,
    });
    const four = p('obj_engineer', {
      dice: [
        createDie(1),
        createDie(2),
        createDie(3),
        createDie(4),
        createDie(5, STARTER_FACES, true),
      ],
    });
    expect(objectiveProgress(four)).toMatchObject({ current: 4, achieved: true });
  });
  it('Magnate: ≥ 12 oro', () => {
    expect(objectiveProgress(p('obj_magnate', { gold: 11 })).achieved).toBe(false);
    expect(objectiveProgress(p('obj_magnate', { gold: 12 })).achieved).toBe(true);
  });
  it('Purista: ningún blank', () => {
    expect(objectiveProgress(p('obj_purist'))).toMatchObject({
      current: 0,
      target: 2,
      achieved: false,
    });
    const clean = p('obj_purist', {
      dice: [replaceFace(createDie(1), 5, 'g3'), replaceFace(createDie(2), 5, 'pv2')],
    });
    expect(objectiveProgress(clean).achieved).toBe(true);
  });
  it('Apostador: ≥ 3 caras de riesgo', () => {
    const d = createDie(1, F('risk_gold', 'risk_pv', 'risk_gold', 'g1', 'g1', 'blank'));
    expect(objectiveProgress(p('obj_gambler', { dice: [d] }))).toMatchObject({
      current: 3,
      achieved: true,
    });
    expect(objectiveProgress(p('obj_gambler')).achieved).toBe(false);
  });
  it('Coleccionista: ≥ 3 cartas', () => {
    expect(
      objectiveProgress(p('obj_collector', { cards: ['card_tax', 'card_reroll', 'card_income'] }))
        .achieved,
    ).toBe(true);
    expect(objectiveProgress(p('obj_collector', { cards: ['card_tax'] })).achieved).toBe(false);
  });
  it('Forjador: ≥ 6 caras compradas', () => {
    const d = createDie(1, F('g3', 'g3', 'g4', 'pv2', 'pv3', 'x2gold'));
    expect(objectiveProgress(p('obj_smith', { dice: [d] }))).toMatchObject({
      current: 6,
      achieved: true,
    });
    expect(objectiveProgress(p('obj_smith')).current).toBe(0);
  });
  it('Puntuador: ≥ 4 caras PV', () => {
    const d = createDie(1, F('pv1', 'pv2', 'pv3', 'pv1', 'g1', 'blank'));
    expect(objectiveProgress(p('obj_scorer', { dice: [d] })).achieved).toBe(true);
    expect(objectiveProgress(p('obj_scorer')).current).toBe(2);
  });
  it('Equilibrado: cada dado con ≥ 1 PV y ≥ 1 economía', () => {
    expect(objectiveProgress(p('obj_balanced')).achieved).toBe(true);
    const bad = p('obj_balanced', {
      dice: [createDie(1), createDie(2, F('g1', 'g1', 'g2', 'g2', 'g3', 'blank'))],
    });
    expect(objectiveProgress(bad)).toMatchObject({ current: 1, target: 2, achieved: false });
  });
});
