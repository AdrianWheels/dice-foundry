import { describe, expect, it } from 'vitest';
import { Rng, deriveSeed } from './rng';

describe('Rng', () => {
  it('misma semilla ⇒ misma secuencia', () => {
    const a = Rng.fromSeed(42);
    const b = Rng.fromSeed(42);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('semillas distintas ⇒ secuencias distintas', () => {
    const a = Rng.fromSeed(1);
    const b = Rng.fromSeed(2);
    expect(Array.from({ length: 10 }, () => a.next())).not.toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
  });

  it('next() está en [0, 1)', () => {
    const r = Rng.fromSeed(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() cubre todo el rango inclusive y nada fuera', () => {
    const r = Rng.fromSeed(3);
    const seen = new Set<number>();
    for (let i = 0; i < 6000; i++) {
      const v = r.int(0, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('int() rechaza rangos inválidos', () => {
    expect(() => Rng.fromSeed(1).int(3, 2)).toThrow(RangeError);
  });

  it('chance(0) nunca, chance(1) siempre, chance(0.5) ≈ mitad', () => {
    const r = Rng.fromSeed(9);
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (r.chance(0.5)) hits++;
    expect(hits).toBeGreaterThan(4700);
    expect(hits).toBeLessThan(5300);
  });

  it('shuffle es una permutación y no muta la entrada', () => {
    const r = Rng.fromSeed(5);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = r.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(out).not.toEqual(input);
  });

  it('fromState(state()) continúa exactamente la misma secuencia', () => {
    const a = Rng.fromSeed(11);
    a.next();
    a.next();
    const b = Rng.fromState(a.state());
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('deriveSeed es estable y sensible al orden', () => {
    expect(deriveSeed(1, 2, 3)).toBe(deriveSeed(1, 2, 3));
    expect(deriveSeed(1, 2, 3)).not.toBe(deriveSeed(3, 2, 1));
  });
});
