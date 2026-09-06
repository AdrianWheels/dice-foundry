import { card } from './data/cards';
import { face } from './data/faces';
import { createDie, faceOf } from './dice';
import {
  type EV,
  cardPrice,
  diePrice,
  dieEV,
  evContext,
  faceEV,
  facePrice,
  permanentDice,
} from './economy';
import { applyAction, currentPlayer, legalActions, remainingRounds, rerollCost } from './game';
import { objectiveProgress } from './objectives';
import { MAX_PURCHASES_PER_TURN } from './shop';
import type { BotArchetype, CardId, FaceFamily, GameAction, GameState, PlayerState } from './types';

type Weights = Partial<Record<FaceFamily | 'die' | 'card', number>>;

export const ARCHETYPE_WEIGHTS: Record<BotArchetype, Weights> = {
  magnate: { economy: 1.5, multiplier: 1.3, meta: 1.2 },
  scorer: { pv: 1.5, conversion: 1.3, combo: 1.1 },
  engineer: { generator: 2, die: 1.5 },
  casino: { risk: 1.6, multiplier: 1.2 },
  balanced: {},
};

/** Valor de 1 oro en PV según lo que queda de partida: al final el oro casi no vale. */
export function goldValue(horizon: number, rounds: number): number {
  return 0.15 + 0.5 * (horizon / rounds);
}

function pvEq(ev: EV, gv: number): number {
  return ev.pv + ev.gold * gv;
}

export function decideBotAction(state: GameState): GameAction {
  const me = currentPlayer(state);
  const arch: BotArchetype = me.archetype ?? 'balanced';
  switch (state.phase) {
    case 'roll':
      return { type: 'roll' };
    case 'mitigate':
      return decideMitigate(state, me);
    case 'shop':
      return decideShop(state, me, arch);
    case 'gameOver':
      throw new Error('La partida ha terminado');
  }
}

/** Relanza el peor dado si su cara vale ≤ 0 (vacía) y puede pagarlo sin quedarse sin oro. */
function decideMitigate(state: GameState, me: PlayerState): GameAction {
  const roll = state.roll;
  if (!roll || roll.rerollUsed) return { type: 'pass' };
  const cost = rerollCost(state);
  if (cost > 0 && me.gold < cost + 2) return { type: 'pass' };
  const ctx = evContext(me);
  const gv = goldValue(remainingRounds(state), state.config.rounds);
  let worst: { dieId: number; v: number } | null = null;
  for (const r of roll.results) {
    const d = me.dice.find((x) => x.id === r.dieId);
    if (!d) continue;
    const v = pvEq(faceEV(faceOf(d, r.faceIndex).id, ctx), gv);
    if (!worst || v < worst.v) worst = { dieId: r.dieId, v };
  }
  return worst && worst.v <= 0 ? { type: 'reroll', dieId: worst.dieId } : { type: 'pass' };
}

function decideShop(state: GameState, me: PlayerState, arch: BotArchetype): GameAction {
  if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) return { type: 'endTurn' };
  const horizon = remainingRounds(state);
  const gv = goldValue(horizon, state.config.rounds);
  let best: { action: GameAction; score: number } | null = null;
  for (const a of legalActions(state)) {
    if (a.type === 'endTurn') continue;
    const score = scorePurchase(state, me, arch, a, horizon, gv);
    if (!best || score > best.score) best = { action: a, score };
  }
  return best && best.score > 0 ? best.action : { type: 'endTurn' };
}

/** Beneficio en PV-equivalente menos precio en PV-equivalente. > 0 ⇒ merece la pena. */
export function scorePurchase(
  state: GameState,
  me: PlayerState,
  arch: BotArchetype,
  a: GameAction,
  horizon: number,
  gv: number,
): number {
  const w = ARCHETYPE_WEIGHTS[arch];
  const ctx = evContext(me);
  let benefit: number;
  let price: number;
  if (a.type === 'buyFace') {
    const item = state.shop.slots[a.slot];
    const die = me.dice.find((d) => d.id === a.dieId);
    if (!item || item.kind !== 'face' || !die) return -Infinity;
    const gain =
      pvEq(faceEV(item.faceId, ctx), gv) - pvEq(faceEV(die.faces[a.side] as string, ctx), gv);
    // La cara sale 1 de cada 6 tiradas del dado.
    benefit = (gain / 6) * horizon * (w[face(item.faceId).family] ?? 1);
    price = facePrice(item.faceId, me);
  } else if (a.type === 'buyCard') {
    const item = state.shop.slots[a.slot];
    if (!item || item.kind !== 'card') return -Infinity;
    benefit = cardBenefit(state, me, item.cardId, horizon, gv) * (w.card ?? 1);
    price = cardPrice(item.cardId);
  } else if (a.type === 'buyDie') {
    benefit = pvEq(dieEV(createDie(0), ctx), gv) * horizon * (w.die ?? 1);
    price = diePrice(me);
  } else {
    return -Infinity;
  }
  benefit += objectiveBonus(state, a, horizon);
  return benefit - price * gv;
}

function cardBenefit(
  state: GameState,
  me: PlayerState,
  cardId: CardId,
  horizon: number,
  gv: number,
): number {
  const e = card(cardId).effect;
  const nDice = permanentDice(me).length;
  const players = state.players.length;
  switch (e.kind) {
    case 'rollBonus':
      return e.gold * gv * horizon * (e.minDice !== undefined && nDice < e.minDice ? 0.5 : 1);
    case 'discount':
      return e.amount * gv * Math.min(horizon, 3);
    case 'endScore':
      return e.per === 'dice'
        ? Math.max(0, nDice + horizon * 0.3 - ((e.from ?? 1) - 1)) * e.pv
        : Math.floor((me.gold + horizon * 2) / (e.every ?? 1)) * e.pv * 0.6;
    case 'freeReroll':
      return 0.3 * horizon;
    case 'tax':
      return e.gold * gv * 0.25 * (players - 1) * horizon;
  }
}

/** PV-equivalente extra si la acción acerca el objetivo secreto (se simula la acción). */
function objectiveBonus(state: GameState, a: GameAction, horizon: number): number {
  const before = objectiveProgress(currentPlayer(state));
  if (before.achieved) return 0;
  let after;
  try {
    after = objectiveProgress(currentPlayer(applyAction(state, a)));
  } catch {
    return 0;
  }
  const delta = after.current - before.current;
  if (delta <= 0) return 0;
  const urgency = 1 + (1 - horizon / state.config.rounds);
  return before.objective.pv * (delta / Math.max(1, before.target)) * urgency;
}
