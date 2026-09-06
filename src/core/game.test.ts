import { describe, expect, it } from 'vitest';
import { diePrice } from './economy';
import {
  IllegalActionError,
  applyAction,
  createGame,
  currentPlayer,
  legalActions,
  seatForTurn,
} from './game';
import type { DieFaces, GameAction, GameConfig, GameState } from './types';

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({
  seats: [
    { name: 'Ana', kind: 'human' },
    { name: 'Bot', kind: 'bot', archetype: 'balanced' },
  ],
  rounds: 2,
  seed: 7,
  ...over,
});
const act = (s: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((st, a) => applyAction(st, a), s);
/** Turno mínimo: tirar, pasar, terminar. */
const skipTurn = (s: GameState): GameState =>
  act(s, { type: 'roll' }, { type: 'pass' }, { type: 'endTurn' });
const withPlayer = (
  s: GameState,
  seat: number,
  patch: Partial<GameState['players'][number]>,
): GameState => ({
  ...s,
  players: s.players.map((p) => (p.seat === seat ? { ...p, ...patch } : p)),
});

describe('createGame', () => {
  it('estado inicial: 5 oro, 0 PV, 2 dados starter, objetivo único, tienda llena', () => {
    const s = createGame(cfg());
    expect(s.phase).toBe('roll');
    expect(s.round).toBe(1);
    expect(s.currentSeat).toBe(0);
    for (const p of s.players) {
      expect(p.gold).toBe(5);
      expect(p.pv).toBe(0);
      expect(p.dice).toHaveLength(2);
    }
    expect(new Set(s.players.map((p) => p.objective)).size).toBe(2);
    expect(s.shop.slots.every(Boolean)).toBe(true);
    expect(s.nextDieId).toBe(5);
  });

  it('valida jugadores y rondas', () => {
    expect(() => createGame(cfg({ seats: [{ name: 'Solo', kind: 'human' }] }))).toThrow(RangeError);
    expect(() => createGame(cfg({ rounds: 9 }))).toThrow(RangeError);
    expect(() => createGame(cfg({ rounds: 1 }))).toThrow(RangeError);
  });

  it('misma configuración ⇒ mismo estado', () => {
    expect(JSON.stringify(createGame(cfg()))).toBe(JSON.stringify(createGame(cfg())));
  });
});

describe('flujo de turno', () => {
  it('roll → mitigate → pass → shop → endTurn → siguiente jugador', () => {
    let s = createGame(cfg());
    s = applyAction(s, { type: 'roll' });
    expect(s.phase).toBe('mitigate');
    expect(s.roll?.results).toHaveLength(2);
    s = applyAction(s, { type: 'pass' });
    expect(s.phase).toBe('shop');
    expect(s.lastResolution).not.toBeNull();
    s = applyAction(s, { type: 'endTurn' });
    expect(s.currentSeat).toBe(1);
    expect(s.phase).toBe('roll');
    expect(s.round).toBe(1);
  });

  it('acciones fuera de fase lanzan IllegalActionError', () => {
    const s = createGame(cfg());
    expect(() => applyAction(s, { type: 'pass' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'endTurn' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'buyDie' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'reroll', dieId: 1 })).toThrow(IllegalActionError);
  });

  it('el orden de turno rota cada ronda', () => {
    expect(seatForTurn(3, 1, 0)).toBe(0);
    expect(seatForTurn(3, 2, 0)).toBe(1);
    expect(seatForTurn(3, 2, 2)).toBe(0);
    let s = createGame(
      cfg({
        seats: [
          { name: 'A', kind: 'bot' },
          { name: 'B', kind: 'bot' },
          { name: 'C', kind: 'bot' },
        ],
        rounds: 3,
      }),
    );
    s = skipTurn(skipTurn(skipTurn(s)));
    expect(s.round).toBe(2);
    expect(s.currentSeat).toBe(1);
  });

  it('la partida termina tras la última ronda con puntuaciones y ganadores', () => {
    let s = createGame(cfg());
    for (let i = 0; i < 4; i++) s = skipTurn(s);
    expect(s.phase).toBe('gameOver');
    expect(s.finalScores).toHaveLength(2);
    expect(s.winners?.length).toBeGreaterThan(0);
    expect(() => applyAction(s, { type: 'roll' })).toThrow(IllegalActionError);
    expect(legalActions(s)).toEqual([]);
  });

  it('la tirada abona al jugador actual exactamente lo que dice la resolución', () => {
    let s = createGame(cfg());
    s = act(s, { type: 'roll' }, { type: 'pass' });
    const me = currentPlayer(s);
    expect(me.gold - 5).toBe(s.lastResolution?.gold);
    expect(me.pv).toBe(s.lastResolution?.pv);
    expect(s.log).toEqual(s.lastResolution?.events);
  });
});

describe('mitigación', () => {
  it('relanzar cuesta 2 oro, solo una vez, y cambia solo ese dado', () => {
    let s = applyAction(createGame(cfg()), { type: 'roll' });
    const before = s.roll!.results;
    s = applyAction(s, { type: 'reroll', dieId: before[1]!.dieId });
    expect(currentPlayer(s).gold).toBe(3);
    expect(s.roll!.results[0]).toEqual(before[0]);
    expect(s.roll!.rerollUsed).toBe(true);
    expect(() => applyAction(s, { type: 'reroll', dieId: before[0]!.dieId })).toThrow(
      IllegalActionError,
    );
    expect(legalActions(s)).toEqual([{ type: 'pass' }]);
  });

  it('relanzar es gratis con Dado cargado y no se ofrece sin oro', () => {
    let s = withPlayer(createGame(cfg()), 0, { cards: ['card_reroll'] });
    s = applyAction(s, { type: 'roll' });
    expect(s.roll!.freeReroll).toBe(true);
    s = applyAction(s, { type: 'reroll', dieId: 1 });
    expect(currentPlayer(s).gold).toBe(5);
    let poor = withPlayer(createGame(cfg()), 0, { gold: 1 });
    poor = applyAction(poor, { type: 'roll' });
    expect(legalActions(poor)).toEqual([{ type: 'pass' }]);
  });
});

describe('tienda', () => {
  function shopState(gold = 50): GameState {
    let s = createGame(cfg());
    s = { ...s, players: s.players.map((p) => ({ ...p, gold })) };
    return act(s, { type: 'roll' }, { type: 'pass' });
  }

  it('comprar cara la forja en el dado/lado elegido, cobra y vacía el slot', () => {
    let s = shopState();
    const slot = s.shop.slots.findIndex((i) => i?.kind === 'face');
    const item = s.shop.slots[slot]!;
    const faceId = item.kind === 'face' ? item.faceId : '';
    const goldBefore = currentPlayer(s).gold;
    s = applyAction(s, { type: 'buyFace', slot, dieId: 1, side: 5 });
    expect(currentPlayer(s).dice[0]!.faces[5]).toBe(faceId);
    expect(s.shop.slots[slot]).toBeNull();
    expect(s.purchasesThisTurn).toBe(1);
    expect(currentPlayer(s).gold).toBeLessThan(goldBefore);
  });

  it('no se puede forjar sin oro, en un dado ajeno ni en un temporal', () => {
    const slot = shopState().shop.slots.findIndex((i) => i?.kind === 'face');
    expect(() => applyAction(shopState(0), { type: 'buyFace', slot, dieId: 1, side: 0 })).toThrow(
      /oro/,
    );
    expect(() => applyAction(shopState(), { type: 'buyFace', slot, dieId: 3, side: 0 })).toThrow(
      /permanentes propios/,
    );
  });

  it('comprar dado escala el precio y paga al Recaudador de los demás', () => {
    let s = withPlayer(shopState(), 1, { cards: ['card_tax'] });
    const p0 = diePrice(currentPlayer(s));
    // La tirada ya ha abonado oro al asiento 0, así que se mide contra el saldo previo.
    const goldBefore = currentPlayer(s).gold;
    s = applyAction(s, { type: 'buyDie' });
    expect(currentPlayer(s).dice).toHaveLength(3);
    expect(currentPlayer(s).gold).toBe(goldBefore - p0);
    expect(diePrice(currentPlayer(s))).toBe(p0 + 4);
    expect(s.players[1]!.gold).toBe(51);
    expect(s.log.at(-1)).toMatchObject({ step: 'tax', gold: 1, params: { seat: 1, from: 0 } });
  });

  it('comprar carta la añade al jugador', () => {
    let s = shopState();
    let cardSlot = s.shop.slots.findIndex((i) => i?.kind === 'card');
    if (cardSlot < 0) {
      s = {
        ...s,
        shop: {
          ...s.shop,
          slots: [{ kind: 'card', cardId: 'card_income' }, ...s.shop.slots.slice(1)],
        },
      };
      cardSlot = 0;
    }
    s = applyAction(s, { type: 'buyCard', slot: cardSlot });
    expect(currentPlayer(s).cards).toHaveLength(1);
    expect(s.shop.slots[cardSlot]).toBeNull();
  });

  it('máximo 2 compras por turno', () => {
    const s = act(shopState(), { type: 'buyDie' }, { type: 'buyDie' });
    expect(() => applyAction(s, { type: 'buyDie' })).toThrow(/2 compras/);
    expect(legalActions(s)).toEqual([{ type: 'endTurn' }]);
  });

  it('legalActions enumera lo comprable (12 forjas por cara con 2 dados)', () => {
    const acts = legalActions(shopState(50));
    expect(acts[0]).toEqual({ type: 'endTurn' });
    expect(acts.some((a) => a.type === 'buyDie')).toBe(true);
    expect(acts.filter((a) => a.type === 'buyFace').length % 12).toBe(0);
  });

  it('el hueco sigue vacío durante la ronda y se rellena al terminarla', () => {
    let s = shopState();
    const slot = s.shop.slots.findIndex((i) => i?.kind === 'face');
    s = act(s, { type: 'buyFace', slot, dieId: 1, side: 5 }, { type: 'endTurn' });
    expect(s.shop.slots[slot]).toBeNull();
    s = skipTurn(s);
    expect(s.shop.slots.every(Boolean)).toBe(true);
  });
});

describe('dados temporales', () => {
  it('Chispa crea un dado temporal que se tira una vez y desaparece', () => {
    const allSpawn: DieFaces = [
      'spawn_temp',
      'spawn_temp',
      'spawn_temp',
      'spawn_temp',
      'spawn_temp',
      'spawn_temp',
    ];
    let s = createGame(cfg());
    s = withPlayer(s, 0, {
      dice: [{ id: 1, faces: allSpawn, temporary: false }, s.players[0]!.dice[1]!],
    });
    s = act(s, { type: 'roll' }, { type: 'pass' });
    const firstTemp = currentPlayer(s).dice.find((d) => d.temporary);
    expect(firstTemp).toBeDefined();
    s = applyAction(s, { type: 'endTurn' }); // → asiento 1, ronda 1
    s = skipTurn(s); // → ronda 2, empieza el asiento 1
    s = skipTurn(s); // → asiento 0
    expect(s.currentSeat).toBe(0);
    s = applyAction(s, { type: 'roll' });
    expect(s.roll!.results).toHaveLength(3);
    s = applyAction(s, { type: 'pass' });
    const temps = currentPlayer(s).dice.filter((d) => d.temporary);
    expect(temps).toHaveLength(1);
    expect(temps[0]!.id).not.toBe(firstTemp!.id);
  });
});

describe('determinismo', () => {
  it('misma semilla y mismas acciones ⇒ mismo estado final', () => {
    const play = (): string => {
      let s = createGame(cfg({ rounds: 3 }));
      let guard = 0;
      while (s.phase !== 'gameOver') {
        const a = legalActions(s);
        s = applyAction(s, a[a.length - 1]!);
        if (++guard > 1000) throw new Error('bucle');
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});
