import { describe, expect, it } from 'vitest';
import { createDie } from './dice';
import { hasFreeRerollFace, resolveRoll } from './resolver';
import type { RandomSource } from './rng';
import type { DieFaces, PlayerState, RolledDie } from './types';

const S: DieFaces = ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'];
const die = (_id: number, f0: string, rest: DieFaces = S): DieFaces =>
  [f0, rest[1], rest[2], rest[3], rest[4], rest[5]] as DieFaces;

function player(dice: DieFaces[], over: Partial<PlayerState> = {}): PlayerState {
  return {
    seat: 0,
    name: 'P',
    kind: 'human',
    gold: 0,
    pv: 0,
    cards: [],
    objective: 'obj_purist',
    dice: dice.map((f, i) => createDie(i + 1, f)),
    ...over,
  };
}
/** Tirada donde cada dado muestra su cara 0. */
const rolledZero = (p: PlayerState): RolledDie[] =>
  p.dice.map((d) => ({ dieId: d.id, faceIndex: 0 }));
const always: RandomSource = {
  next: () => 0,
  chance: () => true,
  int: (a) => a,
  pick: (a) => a[0] as never,
  shuffle: (a) => [...a],
};
const never: RandomSource = { ...always, chance: () => false };
const run = (p: PlayerState, rng: RandomSource = never, rolled = rolledZero(p)) =>
  resolveRoll({ player: p, rolled, nextDieId: 100 }, rng);

describe('resolveRoll', () => {
  it('ganancias base: suma oro y PV y emite un evento por cara', () => {
    const p = player([S, S]);
    const out = run(p, never, [
      { dieId: 1, faceIndex: 3 },
      { dieId: 2, faceIndex: 4 },
    ]);
    expect(out.player.gold).toBe(2);
    expect(out.player.pv).toBe(1);
    expect(out.resolution).toMatchObject({ gold: 2, pv: 1 });
    expect(out.resolution.events.map((e) => e.step)).toEqual(['gain', 'gain']);
  });

  it('no muta la entrada', () => {
    const p = player([S]);
    const before = JSON.stringify(p);
    run(p);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('cara vacía: 0 y sin evento de ganancia', () => {
    const out = run(player([die(1, 'blank')]));
    expect(out.player.gold).toBe(0);
    expect(out.resolution.events).toEqual([]);
  });

  it('multiplicador duplica solo el oro base de la tirada', () => {
    const out = run(player([die(1, 'g3'), die(2, 'x2gold')]));
    expect(out.player.gold).toBe(6);
    expect(out.resolution.events.find((e) => e.step === 'multiplier')).toMatchObject({
      gold: 3,
      params: { factor: 2 },
    });
  });

  it('dos multiplicadores ⇒ ×4; tres ⇒ sigue siendo ×4 (tope)', () => {
    expect(run(player([die(1, 'g4'), die(2, 'x2gold'), die(3, 'x2gold')])).player.gold).toBe(16);
    expect(
      run(player([die(1, 'g4'), die(2, 'x2gold'), die(3, 'x2gold'), die(4, 'x2gold')])).player.gold,
    ).toBe(16);
  });

  it('multiplicador sin oro base no hace nada ni emite evento', () => {
    const out = run(player([die(1, 'pv2'), die(2, 'x2gold')]));
    expect(out.player.gold).toBe(0);
    expect(out.resolution.events.some((e) => e.step === 'multiplier')).toBe(false);
  });

  it('combo paga si OTRO dado muestra la familia requerida', () => {
    expect(run(player([die(1, 'combo_gold'), die(2, 'g1')])).player.gold).toBe(4);
    const miss = run(player([die(1, 'combo_gold'), die(2, 'pv1')]));
    expect(miss.player.gold).toBe(0);
    expect(miss.player.pv).toBe(1);
    expect(miss.resolution.events[0]).toMatchObject({ step: 'combo', textKey: 'ev.comboMiss' });
  });

  it('riesgo: paga con el RNG a favor y nada en contra', () => {
    expect(run(player([die(1, 'risk_gold')]), always).player.gold).toBe(6);
    const miss = run(player([die(1, 'risk_gold')]), never);
    expect(miss.player.gold).toBe(0);
    expect(miss.resolution.events[0]).toMatchObject({ step: 'risk', textKey: 'ev.riskMiss' });
  });

  it('Espejo copia la mejor cara de ganancia de otro dado (pv*3 + oro); sin candidatas es vacía', () => {
    const out = run(player([die(1, 'control_copy'), die(2, 'g3'), die(3, 'pv2')]));
    expect(out.player.pv).toBe(4);
    expect(out.player.gold).toBe(3);
    expect(out.resolution.events[0]).toMatchObject({
      step: 'control',
      textKey: 'ev.mirror',
      params: { copied: 'Corona' },
    });
    const none = run(player([die(1, 'control_copy'), die(2, 'x2gold')]));
    expect(none.player.gold + none.player.pv).toBe(0);
    expect(none.resolution.events[0]).toMatchObject({ textKey: 'ev.mirrorNone' });
  });

  it('meta: Legado escala con dados permanentes y Tesorero con cartas', () => {
    const p4 = player([die(1, 'meta_dice'), S, S, S]);
    expect(run(p4, never, [{ dieId: 1, faceIndex: 0 }]).player.pv).toBe(2);
    const pc = player([die(1, 'meta_cards')], { cards: ['card_reroll', 'card_tax'] });
    expect(run(pc).player.gold).toBe(2);
  });

  it('cartas de tirada: Mina siempre, Manos grandes solo con ≥ 3 dados; no se multiplican', () => {
    expect(run(player([S], { cards: ['card_income'] })).player.gold).toBe(2);
    expect(run(player([S, S], { cards: ['card_bigroll'] })).player.gold).toBe(2);
    expect(run(player([S, S, S], { cards: ['card_bigroll'] })).player.gold).toBe(4);
    expect(
      run(player([die(1, 'g3'), die(2, 'x2gold')], { cards: ['card_income'] })).player.gold,
    ).toBe(7);
  });

  it('Alquimia convierte 3 oro en 2 PV tras abonar, solo si puede pagar', () => {
    const ok = run(player([die(1, 'convert'), die(2, 'g2')], { gold: 2 }));
    expect(ok.player.gold).toBe(1);
    expect(ok.player.pv).toBe(2);
    expect(ok.resolution).toMatchObject({ gold: -1, pv: 2 });
    const fail = run(player([die(1, 'convert')], { gold: 2 }));
    expect(fail.player.gold).toBe(2);
    expect(fail.resolution.events[0]).toMatchObject({ step: 'convert', textKey: 'ev.convertFail' });
  });

  it('Chispa añade un dado temporal; Semilla añade uno permanente y se consume', () => {
    const t = run(player([die(1, 'spawn_temp')]));
    expect(t.player.dice).toHaveLength(2);
    expect(t.player.dice[1]).toMatchObject({ id: 100, temporary: true });
    expect(t.nextDieId).toBe(101);
    const p = run(player([die(1, 'spawn_perm')]));
    expect(p.player.dice[1]).toMatchObject({ id: 100, temporary: false });
    expect(p.player.dice[0]?.faces[0]).toBe('blank');
  });

  it('hasFreeRerollFace detecta Segunda oportunidad en la tirada', () => {
    const p = player([die(1, 'control_reroll'), S]);
    expect(hasFreeRerollFace(p, rolledZero(p))).toBe(true);
    expect(hasFreeRerollFace(p, [{ dieId: 1, faceIndex: 1 }])).toBe(false);
  });
});
