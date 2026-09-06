import { fromSave, toSave } from '../core/serialize';
import type { GameState } from '../core/types';
import { DEFAULT_SETTINGS, type Settings } from '../ui/uiState';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const KEYS = {
  settings: 'df.settings.v1',
  save: 'df.save.v1',
  saveCorrupt: 'df.save.corrupt',
  stats: 'df.stats.v1',
  hints: 'df.hints.v1',
  anon: 'df.anon.v1',
} as const;

function read(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // storage lleno o bloqueado: seguimos sin persistir
  }
}

function remove(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ídem
  }
}

// ------------------------------------------------------------------- ajustes

const SPEEDS = new Set<Settings['botSpeed']>(['normal', 'fast', 'instant']);

/** Cada campo se valida por separado: un valor raro no tira el resto. */
export function loadSettings(storage: StorageLike): Settings {
  const raw = read(storage, KEYS.settings);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const data = JSON.parse(raw) as Partial<Settings>;
    const out: Settings = { ...DEFAULT_SETTINGS };
    if (typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1) {
      out.volume = data.volume;
    }
    if (typeof data.muted === 'boolean') out.muted = data.muted;
    if (typeof data.reduceMotion === 'boolean') out.reduceMotion = data.reduceMotion;
    if (data.botSpeed && SPEEDS.has(data.botSpeed)) out.botSpeed = data.botSpeed;
    return out;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage: StorageLike, s: Settings): void {
  write(storage, KEYS.settings, JSON.stringify(s));
}

// ------------------------------------------------------------------ partida

export function saveGame(storage: StorageLike, state: GameState, now: number): void {
  write(storage, KEYS.save, toSave(state, now));
}

/** Un save ilegible se mueve a cuarentena para poder depurarlo sin bloquear al jugador. */
export function loadGame(storage: StorageLike): GameState | null {
  const raw = read(storage, KEYS.save);
  if (!raw) return null;
  const state = fromSave(raw);
  if (state) return state;
  write(storage, KEYS.saveCorrupt, raw);
  remove(storage, KEYS.save);
  return null;
}

export function clearGame(storage: StorageLike): void {
  remove(storage, KEYS.save);
}

// -------------------------------------------------------------- estadísticas

export interface Stats {
  gamesStarted: number;
  gamesFinished: number;
  playAgainClicks: number;
  lastPlayedAt: number;
}

const ZERO_STATS: Stats = {
  gamesStarted: 0,
  gamesFinished: 0,
  playAgainClicks: 0,
  lastPlayedAt: 0,
};

export function loadStats(storage: StorageLike): Stats {
  const raw = read(storage, KEYS.stats);
  if (!raw) return { ...ZERO_STATS };
  try {
    const data = JSON.parse(raw) as Partial<Stats>;
    const out: Stats = { ...ZERO_STATS };
    for (const k of Object.keys(ZERO_STATS) as (keyof Stats)[]) {
      const v = data[k];
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return { ...ZERO_STATS };
  }
}

export function bumpStat(
  storage: StorageLike,
  key: Exclude<keyof Stats, 'lastPlayedAt'>,
  now: number,
): Stats {
  const stats = loadStats(storage);
  stats[key] += 1;
  stats.lastPlayedAt = now;
  write(storage, KEYS.stats, JSON.stringify(stats));
  return stats;
}

// ------------------------------------------------------------------- pistas

export function loadHints(storage: StorageLike): string[] {
  const raw = read(storage, KEYS.hints);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHints(storage: StorageLike, ids: string[]): void {
  write(storage, KEYS.hints, JSON.stringify(ids));
}

/** Id anónimo estable para telemetría (Tarea 23). */
export function anonId(storage: StorageLike): string {
  const existing = read(storage, KEYS.anon);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `anon-${Date.now().toString(36)}`;
  write(storage, KEYS.anon, id);
  return id;
}
