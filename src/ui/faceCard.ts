import { card } from '../core/data/cards';
import { face } from '../core/data/faces';
import type { ShopItem } from '../core/types';
import { FAMILY_COLORS, faceGlyph } from '../render/faceGlyph';
import { h } from './dom';
import { S, fmt } from './strings.es';

export interface ItemView {
  name: string;
  description: string;
  glyph: string;
  kind: 'face' | 'card';
  color: string;
  family: string;
}

export function itemView(item: ShopItem): ItemView {
  if (item.kind === 'face') {
    const f = face(item.faceId);
    return {
      name: f.name,
      description: f.description,
      glyph: faceGlyph(f),
      kind: 'face',
      color: FAMILY_COLORS[f.family].bg,
      family: S.families[f.family],
    };
  }
  const c = card(item.cardId);
  return {
    name: c.name,
    description: c.description,
    glyph: '🂠',
    kind: 'card',
    color: '#c9d1ff',
    family: S.shop.card,
  };
}

/** Tarjeta de un ítem de la tienda (cara o carta) con glifo, nombre, familia, descripción y precio. */
export function renderItemCard(
  item: ShopItem,
  price: number,
  opts: { basePrice?: number } = {},
): HTMLElement {
  const v = itemView(item);
  const discounted = opts.basePrice !== undefined && opts.basePrice !== price;
  return h(
    'div',
    { class: 'item-card', style: `border-color:${v.color}` },
    h('span', { class: 'item-glyph', style: `background:${v.color}` }, v.glyph || '·'),
    h(
      'div',
      { class: 'item-body' },
      h('strong', {}, v.name),
      h('span', { class: 'item-family' }, v.family),
      h('span', { class: 'item-desc' }, v.description),
    ),
    h(
      'span',
      { class: 'item-price' },
      discounted && h('s', {}, fmt(S.shop.price, { n: opts.basePrice ?? price })),
      fmt(S.shop.price, { n: price }),
    ),
  );
}
