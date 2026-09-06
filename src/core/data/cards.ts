import type { CardDef, CardId } from '../types';

export const CARDS: Record<CardId, CardDef> = {
  card_income: {
    id: 'card_income',
    type: 'economy',
    name: 'Mina',
    description: '+1 oro en cada tirada.',
    cost: 6,
    effect: { kind: 'rollBonus', gold: 1 },
  },
  card_bigroll: {
    id: 'card_bigroll',
    type: 'economy',
    name: 'Manos grandes',
    description: '+1 oro extra si tiras 3 dados o más.',
    cost: 5,
    effect: { kind: 'rollBonus', gold: 1, minDice: 3 },
  },
  card_cheapfaces: {
    id: 'card_cheapfaces',
    type: 'economy',
    name: 'Gremio de forjadores',
    description: 'Las caras cuestan 1 oro menos.',
    cost: 5,
    effect: { kind: 'discount', target: 'face', amount: 1 },
  },
  card_cheapdice: {
    id: 'card_cheapdice',
    type: 'dice',
    name: 'Fundición',
    description: 'Los dados cuestan 3 oro menos.',
    cost: 7,
    effect: { kind: 'discount', target: 'die', amount: 3 },
  },
  card_score_dice: {
    id: 'card_score_dice',
    type: 'scoring',
    name: 'Arsenal',
    description: 'Al final: +3 PV por cada dado a partir del tercero.',
    cost: 8,
    effect: { kind: 'endScore', per: 'dice', from: 3, pv: 3 },
  },
  card_score_gold: {
    id: 'card_score_gold',
    type: 'scoring',
    name: 'Tesoro',
    description: 'Al final: +1 PV por cada 3 oro.',
    cost: 7,
    effect: { kind: 'endScore', per: 'gold', every: 3, pv: 1 },
  },
  card_reroll: {
    id: 'card_reroll',
    type: 'dice',
    name: 'Dado cargado',
    description: 'Relanzar un dado es gratis.',
    cost: 4,
    effect: { kind: 'freeReroll' },
  },
  card_tax: {
    id: 'card_tax',
    type: 'interaction',
    name: 'Recaudador',
    description: 'Ganas 1 oro cuando otro jugador compra un dado.',
    cost: 4,
    effect: { kind: 'tax', trigger: 'buyDie', gold: 1 },
  },
};
export const CARD_IDS: CardId[] = Object.keys(CARDS);

export function card(id: CardId): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`Carta desconocida: ${id}`);
  return c;
}
