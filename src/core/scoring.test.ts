import { describe, expect, it } from 'vitest';
import { createDie } from './dice';
import { cardEndScore, determineWinners, finalScores } from './scoring';
import type { PlayerState } from './types';

const p = (seat: number, over: Partial<PlayerState> = {}): PlayerState => ({
  seat,
  name: `P${seat}`,
  kind: 'bot',
  gold: 0,
  pv: 0,
  dice: [createDie(1), createDie(2)],
  cards: [],
  objective: 'obj_purist',
  ...over,
});

describe('scoring', () => {
  it('Arsenal: +3 PV por dado a partir del tercero', () => {
    expect(cardEndScore(p(0, { cards: ['card_score_dice'] }))).toBe(0);
    expect(
      cardEndScore(
        p(0, {
          cards: ['card_score_dice'],
          dice: [createDie(1), createDie(2), createDie(3)],
        }),
      ),
    ).toBe(3);
    expect(
      cardEndScore(
        p(0, {
          cards: ['card_score_dice'],
          dice: [1, 2, 3, 4, 5].map((i) => createDie(i)),
        }),
      ),
    ).toBe(9);
  });
  it('Tesoro: +1 PV por cada 3 oro', () => {
    expect(cardEndScore(p(0, { cards: ['card_score_gold'], gold: 9 }))).toBe(3);
    expect(cardEndScore(p(0, { cards: ['card_score_gold'], gold: 2 }))).toBe(0);
  });
  it('finalScores suma PV base + objetivo + cartas', () => {
    const magnate = p(0, {
      objective: 'obj_magnate',
      gold: 12,
      pv: 10,
      cards: ['card_score_gold'],
    });
    const [s] = finalScores([magnate]);
    expect(s).toMatchObject({
      seat: 0,
      basePv: 10,
      objectivePv: 9,
      objectiveAchieved: true,
      cardPv: 4,
      total: 23,
      gold: 12,
    });
  });
  it('gana el mayor total; empate → más oro; empate total → varios ganadores', () => {
    const scores = finalScores([
      p(0, { pv: 10, gold: 3 }),
      p(1, { pv: 10, gold: 5 }),
      p(2, { pv: 4, gold: 30 }),
    ]);
    expect(determineWinners(scores)).toEqual([1]);
    const tie = finalScores([p(0, { pv: 10, gold: 5 }), p(1, { pv: 10, gold: 5 })]);
    expect(determineWinners(tie)).toEqual([0, 1]);
  });
});
