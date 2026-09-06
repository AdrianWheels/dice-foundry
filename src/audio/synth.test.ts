import { describe, expect, it } from 'vitest';
import { MAX_VOICES, RateLimiter, clamp, midiToHz } from './synth';

describe('synth helpers', () => {
  it('midiToHz: A4 = 440, C5 ≈ 523.25', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(72)).toBeCloseTo(523.25, 1);
  });

  it('RateLimiter deja pasar la primera, bloquea dentro del hueco y por clave', () => {
    const rl = new RateLimiter(45);
    expect(rl.allow('d1', 0)).toBe(true);
    expect(rl.allow('d1', 20)).toBe(false);
    expect(rl.allow('d2', 20)).toBe(true);
    expect(rl.allow('d1', 46)).toBe(true);
  });

  it('MAX_VOICES es 12 y clamp acota', () => {
    expect(MAX_VOICES).toBe(12);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
