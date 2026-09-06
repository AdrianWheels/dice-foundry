import { describe, expect, it } from 'vitest';
import { BUYABLE_FACE_IDS, FACES, FACE_IDS, STARTER_FACES, face } from './faces';
import { CARDS, CARD_IDS, card } from './cards';
import { OBJECTIVES, OBJECTIVE_IDS, objective } from './objectives';

describe('catálogo de caras', () => {
  it('tiene 20 caras y 16 comprables con coste > 0', () => {
    expect(FACE_IDS).toHaveLength(20);
    expect(BUYABLE_FACE_IDS).toHaveLength(16);
    for (const id of BUYABLE_FACE_IDS) expect(face(id).cost).toBeGreaterThan(0);
  });

  it('las caras iniciales no son comprables y el starter es el del plan', () => {
    for (const id of ['blank', 'g1', 'g2', 'pv1']) expect(face(id).cost).toBeNull();
    expect(STARTER_FACES).toEqual(['g1', 'g1', 'g2', 'g2', 'pv1', 'blank']);
  });

  it('cada clave coincide con su id y ninguna cara da más de 8 PV', () => {
    for (const [k, f] of Object.entries(FACES)) {
      expect(f.id).toBe(k);
      const e = f.effect;
      if ('pv' in e && e.pv !== undefined) expect(e.pv).toBeLessThanOrEqual(8);
    }
  });

  it('valores de referencia del plan', () => {
    expect(face('g3')).toMatchObject({
      family: 'economy',
      cost: 3,
      effect: { kind: 'gain', gold: 3 },
    });
    expect(face('x2gold').effect).toEqual({ kind: 'multiplier', resource: 'gold', factor: 2 });
    expect(face('risk_pv').effect).toEqual({ kind: 'risk', chance: 0.25, pv: 8 });
    expect(face('spawn_perm')).toMatchObject({
      cost: 4,
      effect: { kind: 'spawn', permanent: true },
    });
    expect(face('meta_dice').effect).toEqual({ kind: 'scaling', per: 'dice', every: 2, pv: 1 });
    expect(() => face('nope')).toThrow(/Cara desconocida/);
  });
});

describe('catálogo de cartas', () => {
  it('tiene 8 cartas con id = clave y coste > 0', () => {
    expect(CARD_IDS).toHaveLength(8);
    for (const [k, c] of Object.entries(CARDS)) {
      expect(c.id).toBe(k);
      expect(c.cost).toBeGreaterThan(0);
    }
    expect(card('card_score_dice').effect).toEqual({
      kind: 'endScore',
      per: 'dice',
      from: 3,
      pv: 3,
    });
    expect(() => card('nope')).toThrow(/Carta desconocida/);
  });
});

describe('catálogo de objetivos', () => {
  it('tiene 8 objetivos de 9-10 PV con id = clave', () => {
    expect(OBJECTIVE_IDS).toHaveLength(8);
    for (const [k, o] of Object.entries(OBJECTIVES)) {
      expect(o.id).toBe(k);
      expect(o.pv).toBeGreaterThanOrEqual(9);
      expect(o.pv).toBeLessThanOrEqual(10);
    }
    expect(objective('obj_engineer').check).toEqual({ kind: 'minDice', count: 4 });
    expect(() => objective('nope')).toThrow(/Objetivo desconocido/);
  });
});
