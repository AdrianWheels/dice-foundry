import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { createDie } from './dice';
import { dieEV, diePrice, faceEV, facePrice, itemId, itemPrice } from './economy';
import type { PlayerState } from './types';

const p = (over: Partial<PlayerState> = {}): PlayerState => ({
  seat: 0,
  name: 'P',
  kind: 'human',
  gold: 0,
  pv: 0,
  dice: [createDie(1), createDie(2)],
  cards: [],
  objective: 'obj_purist',
  ...over,
});

describe('precios', () => {
  it('facePrice aplica el Gremio con mínimo 1 y rechaza caras no comprables', () => {
    expect(facePrice('g3', p())).toBe(3);
    expect(facePrice('g3', p({ cards: ['card_cheapfaces'] }))).toBe(2);
    expect(
      facePrice(
        'meta_cards',
        p({ cards: ['card_cheapfaces', 'card_cheapfaces', 'card_cheapfaces'] }),
      ),
    ).toBe(1);
    expect(() => facePrice('g1', p())).toThrow(/no es comprable/);
  });

  it('diePrice escala 8, 12, 16; Fundición resta 3 con mínimo 3; los temporales no cuentan', () => {
    expect(diePrice(p())).toBe(8);
    expect(diePrice(p({ dice: [createDie(1), createDie(2), createDie(3)] }))).toBe(12);
    expect(diePrice(p({ dice: [createDie(1), createDie(2), createDie(3), createDie(4)] }))).toBe(
      16,
    );
    expect(diePrice(p({ cards: ['card_cheapdice'] }))).toBe(5);
    expect(diePrice(p({ dice: [createDie(1)], cards: ['card_cheapdice'] }))).toBe(3);
    expect(
      diePrice(p({ dice: [createDie(1), createDie(2), createDie(3, STARTER_FACES, true)] })),
    ).toBe(8);
  });

  it('itemPrice e itemId', () => {
    expect(itemPrice({ kind: 'card', cardId: 'card_income' }, p())).toBe(6);
    expect(itemPrice({ kind: 'face', faceId: 'pv3' }, p())).toBe(8);
    expect(itemId({ kind: 'face', faceId: 'g3' })).toBe('face:g3');
    expect(itemId({ kind: 'card', cardId: 'card_tax' })).toBe('card:card_tax');
  });
});

describe('valor esperado', () => {
  const ctx = { permanentDice: 2, cards: 0 };
  it('valores de referencia por familia', () => {
    expect(faceEV('g3', ctx)).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('risk_gold', ctx)).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('risk_pv', ctx)).toEqual({ gold: 0, pv: 2 });
    expect(faceEV('combo_pv', ctx)).toEqual({ gold: 0, pv: 1 });
    expect(faceEV('blank', ctx)).toEqual({ gold: 0, pv: 0 });
    expect(faceEV('meta_dice', { permanentDice: 5, cards: 0 })).toEqual({ gold: 0, pv: 2 });
    expect(faceEV('meta_cards', { permanentDice: 2, cards: 3 })).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('x2gold', ctx).gold).toBeGreaterThan(0);
  });
  it('dieEV del starter es 1 oro y 1/6 PV por tirada', () => {
    expect(dieEV(createDie(1), ctx)).toEqual({ gold: 1, pv: 1 / 6 });
  });
});
