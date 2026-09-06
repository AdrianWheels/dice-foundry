export const MAX_VOICES = 12;

/** Limita cuántas veces por clave se dispara un sonido (impactos de un mismo dado). */
export class RateLimiter {
  private readonly last = new Map<string, number>();

  constructor(private readonly minGapMs: number) {}

  allow(key: string, now: number): boolean {
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < this.minGapMs) return false;
    this.last.set(key, now);
    return true;
  }

  reset(): void {
    this.last.clear();
  }
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
