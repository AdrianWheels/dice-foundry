import { describe, expect, it } from 'vitest';
import { createGame } from '../core/game';
import { DEFAULT_SETTINGS } from '../ui/uiState';
import {
  KEYS,
  type StorageLike,
  bumpStat,
  clearGame,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
} from './persistence';

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
const cfg = {
  seats: [
    { name: 'A', kind: 'human' as const },
    { name: 'B', kind: 'bot' as const },
  ],
  rounds: 2,
  seed: 1,
};

describe('persistence', () => {
  it('guarda y recupera la partida; clearGame la borra', () => {
    const st = memStorage();
    const g = createGame(cfg);
    saveGame(st, g, 100);
    expect(loadGame(st)).toEqual(g);
    clearGame(st);
    expect(loadGame(st)).toBeNull();
  });

  it('pone en cuarentena un save corrupto', () => {
    const st = memStorage();
    st.setItem(KEYS.save, '{"v":1,"state":{"nope":true}}');
    expect(loadGame(st)).toBeNull();
    expect(st.getItem(KEYS.save)).toBeNull();
    expect(st.getItem(KEYS.saveCorrupt)).toContain('nope');
  });

  it('valida los ajustes campo a campo', () => {
    const st = memStorage();
    expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
    st.setItem(
      KEYS.settings,
      JSON.stringify({ volume: 7, muted: true, botSpeed: 'warp', reduceMotion: 'yes' }),
    );
    expect(loadSettings(st)).toEqual({ ...DEFAULT_SETTINGS, muted: true });
    saveSettings(st, { ...DEFAULT_SETTINGS, volume: 0.3 });
    expect(loadSettings(st).volume).toBe(0.3);
  });

  it('estadísticas: incrementa y conserva lastPlayedAt', () => {
    const st = memStorage();
    expect(loadStats(st).gamesStarted).toBe(0);
    bumpStat(st, 'gamesStarted', 5);
    const s = bumpStat(st, 'gamesStarted', 9);
    expect(s.gamesStarted).toBe(2);
    expect(s.lastPlayedAt).toBe(9);
  });

  it('un storage que lanza no rompe nada', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => undefined,
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveGame(broken, createGame(cfg), 1)).not.toThrow();
    expect(loadGame(broken)).toBeNull();
  });
});
