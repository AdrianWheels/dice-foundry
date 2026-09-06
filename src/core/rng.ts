/**
 * RNG determinista (mulberry32). Estado = un uint32, serializable en GameState.rngState.
 * Es la ÚNICA fuente de azar del juego. ESLint prohíbe Math.random fuera de este fichero.
 */
export type RngState = number;

export interface RandomSource {
  /** Float en [0, 1). */
  next(): number;
  /** Entero en [min, maxInclusive]. */
  int(min: number, maxInclusive: number): number;
  /** true con probabilidad p. */
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  /** Fisher-Yates. Devuelve copia. */
  shuffle<T>(arr: readonly T[]): T[];
}

export class Rng implements RandomSource {
  private t: number;

  private constructor(state: number) {
    this.t = state >>> 0;
  }

  static fromSeed(seed: number): Rng {
    // Dispersión (murmur3 fmix) para que semillas consecutivas no den secuencias parecidas.
    let h = (seed ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return new Rng((h ^ (h >>> 16)) >>> 0);
  }

  static fromState(state: RngState): Rng {
    return new Rng(state);
  }

  state(): RngState {
    return this.t;
  }

  next(): number {
    this.t = (this.t + 0x6d2b79f5) >>> 0;
    let x = this.t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, maxInclusive: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min) {
      throw new RangeError(`int(${min}, ${maxInclusive})`);
    }
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }

  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new RangeError('pick de array vacío');
    return arr[this.int(0, arr.length - 1)] as T;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }
}

/** Semilla derivada (FNV-1a sobre enteros) para flujos secundarios, p. ej. el RNG visual de la física. */
export function deriveSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
