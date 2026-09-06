import { describe, expect, it } from 'vitest';
import { createDie } from '../dice';
import type { PlayerState } from '../types';
import { checkThresholds, renderMarkdown, runBatch } from './metrics';
import { classifyBuild, playGame } from './simulate';

const seats = (['magnate', 'scorer', 'engineer', 'casino'] as const).map((a, i) => ({
  name: `B${i}`,
  kind: 'bot' as const,
  archetype: a,
}));

describe('playGame', () => {
  it('juega una partida completa y resume compras, ofertas y líderes por ronda', () => {
    const g = playGame({ seats, rounds: 8, seed: 1 });
    expect(g.winners.length).toBeGreaterThan(0);
    expect(g.scores).toHaveLength(4);
    expect(g.leaderByRound).toHaveLength(8);
    expect(Object.values(g.offered).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(g.diceAtEnd.every((n) => n >= 2)).toBe(true);
    expect(g.builds).toHaveLength(4);
  });

  it('classifyBuild etiqueta por prioridad', () => {
    const p = (over: Partial<PlayerState>): PlayerState => ({
      seat: 0,
      name: 'P',
      kind: 'bot',
      gold: 0,
      pv: 0,
      dice: [createDie(1), createDie(2)],
      cards: [],
      objective: 'obj_purist',
      ...over,
    });
    expect(classifyBuild(p({}))).toBe('Mixto');
    expect(classifyBuild(p({ dice: [1, 2, 3, 4, 5].map((i) => createDie(i)) }))).toBe('Ingeniero');
    expect(classifyBuild(p({ cards: ['card_tax', 'card_reroll', 'card_income'] }))).toBe(
      'Coleccionista',
    );
    expect(
      classifyBuild(
        p({ dice: [createDie(1, ['risk_gold', 'risk_gold', 'risk_pv', 'g1', 'g1', 'blank'])] }),
      ),
    ).toBe('Casino');
  });
});

describe('runBatch', () => {
  it('es determinista y sus tasas suman 1', () => {
    const a = runBatch({
      games: 40,
      archetypes: ['magnate', 'scorer', 'engineer', 'casino'],
      rounds: 8,
      seed: 1,
    });
    const b = runBatch({
      games: 40,
      archetypes: ['magnate', 'scorer', 'engineer', 'casino'],
      rounds: 8,
      seed: 1,
    });
    expect(a).toEqual(b);
    const sum = Object.values(a.winRateByArchetype).reduce((x, y) => x + y, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(a.winRateBySeat.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 5);
    expect(a.games).toBe(40);
  });

  it('renderMarkdown incluye las secciones y checkThresholds devuelve una lista de fallos', () => {
    const m = runBatch({ games: 20, archetypes: ['balanced', 'balanced'], rounds: 4, seed: 2 });
    const md = renderMarkdown(m);
    for (const h of [
      '## Victorias por arquetipo',
      '## Victorias por asiento',
      '## Ítems',
      '## Builds',
      '## Umbrales',
    ]) {
      expect(md).toContain(h);
    }
    const t = checkThresholds(m);
    expect(Array.isArray(t.failures)).toBe(true);
    expect(t.ok).toBe(t.failures.length === 0);
  });
});
