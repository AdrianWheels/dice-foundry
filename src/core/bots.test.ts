import { describe, expect, it } from 'vitest';
import { decideBotAction, goldValue } from './bots';
import { applyAction, createGame, legalActions } from './game';
import type { BotArchetype, GameAction, GameConfig, GameState } from './types';

const cfg = (archs: BotArchetype[], seed = 1, rounds = 8): GameConfig => ({
  seats: archs.map((a, i) => ({ name: `B${i}`, kind: 'bot', archetype: a })),
  rounds,
  seed,
});
const isLegal = (s: GameState, a: GameAction): boolean =>
  legalActions(s).some((l) => JSON.stringify(l) === JSON.stringify(a));

function playOut(s: GameState, assertLegal = false): GameState {
  let guard = 0;
  while (s.phase !== 'gameOver') {
    const a = decideBotAction(s);
    if (assertLegal) expect(isLegal(s, a)).toBe(true);
    s = applyAction(s, a);
    if (++guard > 5000) throw new Error('bucle');
  }
  return s;
}

describe('bots', () => {
  it('siempre devuelven una acción legal y terminan la partida (50 semillas)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playOut(createGame(cfg(['magnate', 'scorer', 'engineer', 'casino'], seed)), true);
      expect(s.winners?.length).toBeGreaterThan(0);
    }
  });

  it('son deterministas', () => {
    const a = playOut(createGame(cfg(['balanced', 'balanced'], 3)));
    const b = playOut(createGame(cfg(['balanced', 'balanced'], 3)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('compran algo a lo largo de la partida', () => {
    const s = playOut(createGame(cfg(['balanced', 'balanced'], 5)));
    const p = s.players[0]!;
    const starter = new Set(['g1', 'g2', 'pv1', 'blank']);
    const bought =
      p.dice.length > 2 ||
      p.cards.length > 0 ||
      p.dice.some((d) => d.faces.some((f) => !starter.has(f)));
    expect(bought).toBe(true);
  });

  it('el ingeniero acaba con más dados que el puntuador (30 partidas)', () => {
    let eng = 0;
    let sco = 0;
    for (let seed = 100; seed < 130; seed++) {
      const s = playOut(createGame(cfg(['engineer', 'scorer'], seed)));
      eng += s.players[0]!.dice.length;
      sco += s.players[1]!.dice.length;
    }
    expect(eng).toBeGreaterThan(sco);
  });

  it('goldValue decrece hacia el final de la partida', () => {
    expect(goldValue(8, 8)).toBeGreaterThan(goldValue(0, 8));
    expect(goldValue(0, 8)).toBeCloseTo(0.15);
  });
});
