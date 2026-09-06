import { card } from './data/cards';
import { face } from './data/faces';
import type { CardId, Die, FaceId, PlayerState, ShopItem } from './types';

export const BASE_DIE_PRICE = 8;
export const DIE_PRICE_STEP = 4;
export const MIN_DIE_PRICE = 3;
export const MIN_FACE_PRICE = 1;
export const STARTING_DICE = 2;

export interface EV {
  gold: number;
  pv: number;
}
export interface EvContext {
  permanentDice: number;
  cards: number;
}

export function permanentDice(p: PlayerState): Die[] {
  return p.dice.filter((d) => !d.temporary);
}

export function hasCard(p: PlayerState, id: CardId): boolean {
  return p.cards.includes(id);
}

export function discountFor(p: PlayerState, target: 'face' | 'die'): number {
  let total = 0;
  for (const id of p.cards) {
    const e = card(id).effect;
    if (e.kind === 'discount' && e.target === target) total += e.amount;
  }
  return total;
}

export function facePrice(faceId: FaceId, p: PlayerState): number {
  const cost = face(faceId).cost;
  if (cost === null) throw new Error(`La cara ${faceId} no es comprable`);
  return Math.max(MIN_FACE_PRICE, cost - discountFor(p, 'face'));
}

export function cardPrice(cardId: CardId): number {
  return card(cardId).cost;
}

export function diePrice(p: PlayerState): number {
  const n = permanentDice(p).length;
  return Math.max(
    MIN_DIE_PRICE,
    BASE_DIE_PRICE + DIE_PRICE_STEP * (n - STARTING_DICE) - discountFor(p, 'die'),
  );
}

export function itemPrice(item: ShopItem, p: PlayerState): number {
  return item.kind === 'face' ? facePrice(item.faceId, p) : cardPrice(item.cardId);
}

export function itemId(item: ShopItem): string {
  return item.kind === 'face' ? `face:${item.faceId}` : `card:${item.cardId}`;
}

/**
 * Valor esperado POR TIRADA DE ESA CARA (no por tirada del dado). Heurístico para
 * bots y simulador; no lo usa el resolver.
 */
export function faceEV(faceId: FaceId, ctx: EvContext): EV {
  const e = face(faceId).effect;
  switch (e.kind) {
    case 'blank':
      return { gold: 0, pv: 0 };
    case 'gain':
      return { gold: e.gold ?? 0, pv: e.pv ?? 0 };
    case 'risk':
      return { gold: (e.gold ?? 0) * e.chance, pv: (e.pv ?? 0) * e.chance };
    case 'multiplier':
      // Duplica ~1 oro por cada OTRO dado de la tirada.
      return { gold: Math.max(0, ctx.permanentDice - 1), pv: 0 };
    case 'combo':
      return { gold: (e.gold ?? 0) * 0.5, pv: (e.pv ?? 0) * 0.5 };
    case 'spawn':
      return e.permanent ? { gold: 2, pv: 0.33 } : { gold: 1, pv: 0.17 };
    case 'control':
      return e.mode === 'copyBest' ? { gold: 1.5, pv: 0.3 } : { gold: 0.5, pv: 0 };
    case 'convert':
      return { gold: -e.amount * 0.8, pv: e.yield * 0.8 };
    case 'scaling': {
      const n = e.per === 'dice' ? ctx.permanentDice : ctx.cards;
      const t = Math.floor(n / e.every);
      return { gold: (e.gold ?? 0) * t, pv: (e.pv ?? 0) * t };
    }
  }
}

export function dieEV(die: Die, ctx: EvContext): EV {
  let gold = 0;
  let pv = 0;
  for (const id of die.faces) {
    const ev = faceEV(id, ctx);
    gold += ev.gold;
    pv += ev.pv;
  }
  return { gold: gold / 6, pv: pv / 6 };
}

export function evContext(p: PlayerState): EvContext {
  return { permanentDice: permanentDice(p).length, cards: p.cards.length };
}
