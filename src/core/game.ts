import { card } from './data/cards';
import { OBJECTIVE_IDS } from './data/objectives';
import { createDie, replaceFace, rollDice } from './dice';
import { STARTING_DICE, cardPrice, diePrice, facePrice, hasCard, permanentDice } from './economy';
import { hasFreeRerollFace, resolveRoll } from './resolver';
import { Rng } from './rng';
import { determineWinners, finalScores } from './scoring';
import { MAX_PURCHASES_PER_TURN, SHOP_SLOTS, createShop, refreshShop, takeSlot } from './shop';
import type {
  Die,
  GameAction,
  GameConfig,
  GameState,
  PlayerState,
  RollEvent,
  ShopItem,
} from './types';

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

export const DEFAULT_ROUNDS = 8;
export const MIN_ROUNDS = 2;
export const MAX_ROUNDS = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const STARTING_GOLD = 5;
export const REROLL_COST = 2;
export const LOG_LIMIT = 200;

function fail(message: string): never {
  throw new IllegalActionError(message);
}

/** Asiento que juega en la posición `turnIndex` de la ronda `round` (1-based). Rota cada ronda. */
export function seatForTurn(playerCount: number, round: number, turnIndex: number): number {
  return (round - 1 + turnIndex) % playerCount;
}

export function createGame(config: GameConfig): GameState {
  const n = config.seats.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new RangeError(`Jugadores: ${n} (${MIN_PLAYERS}-${MAX_PLAYERS})`);
  }
  if (
    !Number.isInteger(config.rounds) ||
    config.rounds < MIN_ROUNDS ||
    config.rounds > MAX_ROUNDS
  ) {
    throw new RangeError(`Rondas: ${config.rounds} (${MIN_ROUNDS}-${MAX_ROUNDS})`);
  }
  const rng = Rng.fromSeed(config.seed);
  const objectives = rng.shuffle(OBJECTIVE_IDS);
  let nextDieId = 1;
  const players: PlayerState[] = config.seats.map((s, i) => {
    const dice: Die[] = [];
    for (let k = 0; k < STARTING_DICE; k++) dice.push(createDie(nextDieId++));
    const p: PlayerState = {
      seat: i,
      name: s.name,
      kind: s.kind,
      gold: STARTING_GOLD,
      pv: 0,
      dice,
      cards: [],
      objective: objectives[i] as string,
    };
    if (s.archetype) p.archetype = s.archetype;
    return p;
  });
  const shop = createShop(rng);
  return {
    version: 1,
    config,
    rngState: rng.state(),
    round: 1,
    turnIndex: 0,
    currentSeat: seatForTurn(n, 1, 0),
    phase: 'roll',
    players,
    shop,
    roll: null,
    purchasesThisTurn: 0,
    nextDieId,
    lastResolution: null,
    log: [],
    finalScores: null,
    winners: null,
  };
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentSeat] as PlayerState;
}

/** Rondas que quedan DESPUÉS de la actual = tiradas futuras que verán una compra hecha ahora. */
export function remainingRounds(state: GameState): number {
  return state.config.rounds - state.round;
}

export function rerollCost(state: GameState): number {
  return state.roll?.freeReroll ? 0 : REROLL_COST;
}

function replacePlayer(state: GameState, p: PlayerState): PlayerState[] {
  return state.players.map((x) => (x.seat === p.seat ? p : x));
}

function appendLog(log: RollEvent[], events: RollEvent[]): RollEvent[] {
  const out = [...log, ...events];
  return out.length > LOG_LIMIT ? out.slice(out.length - LOG_LIMIT) : out;
}

function requireShop(state: GameState): void {
  if (state.phase !== 'shop') fail('La tienda no está abierta');
  if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) {
    fail(`Máximo ${MAX_PURCHASES_PER_TURN} compras por turno`);
  }
}

function slotItem(state: GameState, slot: number): ShopItem {
  const item = slot >= 0 && slot < SHOP_SLOTS ? state.shop.slots[slot] : null;
  if (!item) fail('Slot vacío');
  return item;
}

function advanceTurn(state: GameState, rng: Rng): GameState {
  const n = state.players.length;
  const turnIndex = state.turnIndex + 1;
  if (turnIndex < n) {
    return {
      ...state,
      turnIndex,
      currentSeat: seatForTurn(n, state.round, turnIndex),
      phase: 'roll',
      roll: null,
      purchasesThisTurn: 0,
      lastResolution: null,
    };
  }
  const shop = refreshShop(state.shop, rng);
  const round = state.round + 1;
  if (round > state.config.rounds) {
    const scores = finalScores(state.players);
    return {
      ...state,
      shop,
      phase: 'gameOver',
      roll: null,
      lastResolution: null,
      finalScores: scores,
      winners: determineWinners(scores),
    };
  }
  return {
    ...state,
    shop,
    round,
    turnIndex: 0,
    currentSeat: seatForTurn(n, round, 0),
    phase: 'roll',
    roll: null,
    purchasesThisTurn: 0,
    lastResolution: null,
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase === 'gameOver') fail('La partida ha terminado');
  const rng = Rng.fromState(state.rngState);
  const me = currentPlayer(state);
  let next: GameState;

  switch (action.type) {
    case 'roll': {
      if (state.phase !== 'roll') fail('No es momento de lanzar');
      const results = rollDice(me.dice, rng);
      const freeReroll = hasFreeRerollFace(me, results) || hasCard(me, 'card_reroll');
      next = { ...state, phase: 'mitigate', roll: { results, rerollUsed: false, freeReroll } };
      break;
    }
    case 'reroll': {
      if (state.phase !== 'mitigate' || !state.roll) fail('No es momento de relanzar');
      if (state.roll.rerollUsed) fail('Ya has relanzado este turno');
      const die = me.dice.find((d) => d.id === action.dieId);
      if (!die || !state.roll.results.some((r) => r.dieId === action.dieId)) {
        fail('Ese dado no está en la tirada');
      }
      const cost = rerollCost(state);
      if (me.gold < cost) fail('No tienes oro para relanzar');
      const [r] = rollDice([die], rng);
      const results = state.roll.results.map((x) => (x.dieId === action.dieId && r ? r : x));
      next = {
        ...state,
        players: replacePlayer(state, { ...me, gold: me.gold - cost }),
        roll: { ...state.roll, results, rerollUsed: true },
      };
      break;
    }
    case 'pass': {
      if (state.phase !== 'mitigate' || !state.roll) fail('No hay tirada que resolver');
      const out = resolveRoll(
        { player: me, rolled: state.roll.results, nextDieId: state.nextDieId },
        rng,
      );
      const rolledIds = new Set(state.roll.results.map((r) => r.dieId));
      // Los temporales que se acaban de tirar caducan; el recién creado (no tirado) sobrevive.
      const dice = out.player.dice.filter((d) => !d.temporary || !rolledIds.has(d.id));
      next = {
        ...state,
        phase: 'shop',
        players: replacePlayer(state, { ...out.player, dice }),
        nextDieId: out.nextDieId,
        lastResolution: out.resolution,
        log: appendLog(state.log, out.resolution.events),
        purchasesThisTurn: 0,
      };
      break;
    }
    case 'buyFace': {
      requireShop(state);
      const item = slotItem(state, action.slot);
      if (item.kind !== 'face') fail('Ese slot no es una cara');
      const price = facePrice(item.faceId, me);
      if (me.gold < price) fail('No tienes oro suficiente');
      const die = me.dice.find((d) => d.id === action.dieId);
      if (!die || die.temporary) fail('Solo puedes forjar dados permanentes propios');
      const dice = me.dice.map((d) =>
        d.id === die.id ? replaceFace(d, action.side, item.faceId) : d,
      );
      next = {
        ...state,
        players: replacePlayer(state, { ...me, gold: me.gold - price, dice }),
        shop: takeSlot(state.shop, action.slot).shop,
        purchasesThisTurn: state.purchasesThisTurn + 1,
      };
      break;
    }
    case 'buyCard': {
      requireShop(state);
      const item = slotItem(state, action.slot);
      if (item.kind !== 'card') fail('Ese slot no es una carta');
      const price = cardPrice(item.cardId);
      if (me.gold < price) fail('No tienes oro suficiente');
      next = {
        ...state,
        players: replacePlayer(state, {
          ...me,
          gold: me.gold - price,
          cards: [...me.cards, item.cardId],
        }),
        shop: takeSlot(state.shop, action.slot).shop,
        purchasesThisTurn: state.purchasesThisTurn + 1,
      };
      break;
    }
    case 'buyDie': {
      requireShop(state);
      const price = diePrice(me);
      if (me.gold < price) fail('No tienes oro suficiente');
      const taxEvents: RollEvent[] = [];
      const players = state.players.map((p) => {
        if (p.seat === me.seat) {
          return { ...p, gold: p.gold - price, dice: [...p.dice, createDie(state.nextDieId)] };
        }
        let gold = p.gold;
        for (const id of p.cards) {
          const e = card(id).effect;
          if (e.kind === 'tax' && e.trigger === 'buyDie') {
            gold += e.gold;
            taxEvents.push({
              step: 'tax',
              cardId: id,
              gold: e.gold,
              pv: 0,
              textKey: 'ev.tax',
              params: { seat: p.seat, from: me.seat },
            });
          }
        }
        return gold === p.gold ? p : { ...p, gold };
      });
      next = {
        ...state,
        players,
        nextDieId: state.nextDieId + 1,
        purchasesThisTurn: state.purchasesThisTurn + 1,
        log: appendLog(state.log, taxEvents),
      };
      break;
    }
    case 'endTurn': {
      if (state.phase !== 'shop') fail('No es momento de terminar el turno');
      next = advanceTurn(state, rng);
      break;
    }
    default:
      fail('Acción desconocida');
  }
  return { ...next, rngState: rng.state() };
}

export function legalActions(state: GameState): GameAction[] {
  const me = currentPlayer(state);
  switch (state.phase) {
    case 'roll':
      return [{ type: 'roll' }];
    case 'mitigate': {
      const acts: GameAction[] = [{ type: 'pass' }];
      if (state.roll && !state.roll.rerollUsed && me.gold >= rerollCost(state)) {
        for (const r of state.roll.results) acts.push({ type: 'reroll', dieId: r.dieId });
      }
      return acts;
    }
    case 'shop': {
      const acts: GameAction[] = [{ type: 'endTurn' }];
      if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) return acts;
      state.shop.slots.forEach((item, slot) => {
        if (!item) return;
        if (item.kind === 'card') {
          if (me.gold >= cardPrice(item.cardId)) acts.push({ type: 'buyCard', slot });
          return;
        }
        if (me.gold < facePrice(item.faceId, me)) return;
        for (const d of permanentDice(me)) {
          for (let side = 0; side < 6; side++)
            acts.push({ type: 'buyFace', slot, dieId: d.id, side });
        }
      });
      if (me.gold >= diePrice(me)) acts.push({ type: 'buyDie' });
      return acts;
    }
    case 'gameOver':
      return [];
  }
}
