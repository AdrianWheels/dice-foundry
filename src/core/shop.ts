import { CARD_IDS } from './data/cards';
import { BUYABLE_FACE_IDS } from './data/faces';
import type { RandomSource } from './rng';
import type { ShopItem, ShopState } from './types';

export const SHOP_SLOTS = 5;
export const MAX_PURCHASES_PER_TURN = 2;
export const FACE_COPIES = 3;
export const CARD_COPIES = 2;

export function buildDeck(): ShopItem[] {
  const deck: ShopItem[] = [];
  for (const faceId of BUYABLE_FACE_IDS) {
    for (let i = 0; i < FACE_COPIES; i++) deck.push({ kind: 'face', faceId });
  }
  for (const cardId of CARD_IDS) {
    for (let i = 0; i < CARD_COPIES; i++) deck.push({ kind: 'card', cardId });
  }
  return deck;
}

function fillEmpty(shop: ShopState, rng: RandomSource): ShopState {
  const slots = [...shop.slots];
  const slotAge = [...shop.slotAge];
  let deck = [...shop.deck];
  let discard = [...shop.discard];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    if (slots[i]) continue;
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = rng.shuffle(discard);
      discard = [];
    }
    slots[i] = deck.shift() as ShopItem;
    slotAge[i] = 0;
  }
  return { slots, slotAge, deck, discard };
}

export function createShop(rng: RandomSource): ShopState {
  return fillEmpty(
    {
      slots: Array<ShopItem | null>(SHOP_SLOTS).fill(null),
      slotAge: Array<number>(SHOP_SLOTS).fill(0),
      deck: rng.shuffle(buildDeck()),
      discard: [],
    },
    rng,
  );
}

export function takeSlot(shop: ShopState, slot: number): { shop: ShopState; item: ShopItem } {
  const item = slot >= 0 && slot < SHOP_SLOTS ? shop.slots[slot] : null;
  if (!item) throw new RangeError(`Slot vacío o inválido: ${slot}`);
  const slots = [...shop.slots];
  slots[slot] = null;
  return { shop: { ...shop, slots }, item };
}

/** Fin de ronda: descarta el ocupado más antiguo (empate → índice menor), envejece y rellena. */
export function refreshShop(shop: ShopState, rng: RandomSource): ShopState {
  const slots = [...shop.slots];
  const slotAge = [...shop.slotAge];
  const discard = [...shop.discard];
  let oldest = -1;
  for (let i = 0; i < SHOP_SLOTS; i++) {
    if (!slots[i]) continue;
    if (oldest === -1 || (slotAge[i] as number) > (slotAge[oldest] as number)) oldest = i;
  }
  if (oldest !== -1) {
    discard.push(slots[oldest] as ShopItem);
    slots[oldest] = null;
  }
  for (let i = 0; i < SHOP_SLOTS; i++) if (slots[i]) slotAge[i] = (slotAge[i] as number) + 1;
  return fillEmpty({ ...shop, slots, slotAge, discard }, rng);
}
