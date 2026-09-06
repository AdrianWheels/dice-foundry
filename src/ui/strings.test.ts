import { describe, expect, it } from 'vitest';
import { createGame } from '../core/game';
import { EVENT_KEYS, describeEvent } from './eventText';
import { S, delta, fmt } from './strings.es';

function walk(obj: unknown, path: string, out: string[]): void {
  if (typeof obj === 'string') {
    if (obj.trim() === '') out.push(path);
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`, out);
  }
}

describe('strings.es', () => {
  it('no tiene cadenas vacías', () => {
    const empties: string[] = [];
    walk(S, 'S', empties);
    expect(empties).toEqual([]);
  });

  it('fmt y delta', () => {
    expect(fmt('Ronda {round} / {rounds}', { round: 2, rounds: 8 })).toBe('Ronda 2 / 8');
    expect(fmt('{x}', {})).toBe('{x}');
    expect(delta(3, 0)).toBe('+3 oro');
    expect(delta(-3, 2)).toBe('-3 oro, +2 PV');
    expect(delta(0, 0)).toBe('0');
  });

  it('todas las textKey del resolver tienen texto', () => {
    for (const k of EVENT_KEYS) {
      expect(S.ev[k.replace('ev.', '') as keyof typeof S.ev]).toBeTruthy();
    }
  });

  it('describeEvent resuelve nombres de cara, carta y jugador', () => {
    const state = createGame({
      seats: [
        { name: 'Ana', kind: 'human' },
        { name: 'Bot', kind: 'bot' },
      ],
      rounds: 2,
      seed: 1,
    });
    expect(
      describeEvent({ step: 'gain', faceId: 'g3', gold: 3, pv: 0, textKey: 'ev.gain' }, state),
    ).toBe('Bolsa: +3 oro');
    expect(
      describeEvent(
        {
          step: 'tax',
          cardId: 'card_tax',
          gold: 1,
          pv: 0,
          textKey: 'ev.tax',
          params: { seat: 1, from: 0 },
        },
        state,
      ),
    ).toBe('Recaudador: +1 oro para Bot');
    expect(
      describeEvent(
        {
          step: 'multiplier',
          faceId: 'x2gold',
          gold: 3,
          pv: 0,
          textKey: 'ev.multiplier',
          params: { factor: 2 },
        },
        state,
      ),
    ).toBe('Forja ardiente: oro ×2 (+3 oro)');
  });
});
