import type { GameState } from './types';

export const SAVE_VERSION = 1;

export interface SaveFile {
  v: number;
  savedAt: number;
  state: GameState;
}

const PHASES = new Set(['roll', 'mitigate', 'shop', 'gameOver']);

/** `savedAt` lo pasa el llamador (Date.now()): core no lee el reloj. */
export function toSave(state: GameState, savedAt: number): string {
  const file: SaveFile = { v: SAVE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

export function fromSave(json: string): GameState | null {
  try {
    const data = JSON.parse(json) as Partial<SaveFile>;
    if (data.v !== SAVE_VERSION || !data.state || typeof data.state !== 'object') return null;
    const s = data.state;
    if (
      s.version !== 1 ||
      !Array.isArray(s.players) ||
      typeof s.round !== 'number' ||
      !PHASES.has(s.phase) ||
      typeof s.rngState !== 'number' ||
      !s.shop
    ) {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
