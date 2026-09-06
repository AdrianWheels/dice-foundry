import { describe, expect, it } from 'vitest';
import { checkThresholds, runBatch } from './sim/metrics';

describe('balance v0.1', () => {
  it('400 partidas de 4 arquetipos cumplen los umbrales', () => {
    const m = runBatch({
      games: 400,
      archetypes: ['magnate', 'scorer', 'engineer', 'casino'],
      rounds: 8,
      seed: 11,
    });
    const t = checkThresholds(m);
    expect(t.failures).toEqual([]);
  });

  it('2 jugadores balanced: sin ventaja de asiento', () => {
    const m = runBatch({ games: 300, archetypes: ['balanced', 'balanced'], rounds: 8, seed: 12 });
    expect(Math.abs((m.winRateBySeat[0] ?? 0) - (m.winRateBySeat[1] ?? 0))).toBeLessThanOrEqual(
      0.12,
    );
  });
});
