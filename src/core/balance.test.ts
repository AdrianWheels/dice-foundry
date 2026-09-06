import { describe, expect, it } from 'vitest';
import { checkThresholds, runBatch } from './sim/metrics';

/**
 * Regresión de balance. Las muestras son grandes a propósito: con 400 partidas el winrate
 * por arquetipo oscila ±3 puntos y el test parpadea (visto con `casino` en la Tarea 25).
 */
describe('balance v0.1', () => {
  it('1000 partidas de 4 arquetipos cumplen los umbrales', () => {
    const m = runBatch({
      games: 1000,
      archetypes: ['magnate', 'scorer', 'engineer', 'casino'],
      rounds: 8,
      seed: 11,
    });
    const t = checkThresholds(m);
    expect(t.failures).toEqual([]);
  });

  it('600 partidas de 3 arquetipos cumplen los umbrales', () => {
    const m = runBatch({
      games: 600,
      archetypes: ['balanced', 'scorer', 'engineer'],
      rounds: 8,
      seed: 13,
    });
    expect(checkThresholds(m).failures).toEqual([]);
  });

  it('2 jugadores balanced: sin ventaja de asiento', () => {
    const m = runBatch({ games: 300, archetypes: ['balanced', 'balanced'], rounds: 8, seed: 12 });
    expect(Math.abs((m.winRateBySeat[0] ?? 0) - (m.winRateBySeat[1] ?? 0))).toBeLessThanOrEqual(
      0.12,
    );
  });
});
