import { describe, expect, it } from 'vitest';
import { readParams } from './params';

describe('readParams', () => {
  it('lee semilla, rondas, jugadores, asientos y velocidad de bots', () => {
    expect(readParams('?seed=42&rounds=2&players=3&seats=human,human,casino&bots=instant')).toEqual(
      {
        seed: 42,
        rounds: 2,
        players: 3,
        seats: ['human', 'human', 'casino'],
        bots: 'instant',
      },
    );
    expect(readParams('')).toEqual({});
    expect(readParams('?rounds=99&bots=nope')).toEqual({});
  });

  it('marca los modos dev y e2e', () => {
    expect(readParams('?dev=roll&e2e=1')).toEqual({ dev: 'roll', e2e: true });
    expect(readParams('?seats=human,nope')).toEqual({});
  });
});
