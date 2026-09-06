import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { buildDeck, createShop, refreshShop, takeSlot } from './shop';
import type { ShopState } from './types';

describe('shop', () => {
  it('el mazo tiene 64 ítems: 16 caras ×3 y 8 cartas ×2', () => {
    const d = buildDeck();
    expect(d).toHaveLength(64);
    expect(d.filter((i) => i.kind === 'face')).toHaveLength(48);
    expect(d.filter((i) => i.kind === 'card')).toHaveLength(16);
  });

  it('createShop llena 5 slots, deja 59 en el mazo y es determinista', () => {
    const s = createShop(Rng.fromSeed(1));
    expect(s.slots.every(Boolean)).toBe(true);
    expect(s.deck).toHaveLength(59);
    expect(s.slotAge).toEqual([0, 0, 0, 0, 0]);
    expect(s).toEqual(createShop(Rng.fromSeed(1)));
  });

  it('takeSlot vacía el slot sin tocar el mazo y lanza si está vacío', () => {
    const s = createShop(Rng.fromSeed(1));
    const t = takeSlot(s, 2);
    expect(t.item).toEqual(s.slots[2]);
    expect(t.shop.slots[2]).toBeNull();
    expect(t.shop.deck).toHaveLength(59);
    expect(() => takeSlot(t.shop, 2)).toThrow(RangeError);
    expect(() => takeSlot(s, 5)).toThrow(RangeError);
  });

  it('refreshShop descarta el ocupado más antiguo, envejece el resto y rellena huecos', () => {
    const rng = Rng.fromSeed(2);
    let s = createShop(rng);
    s = takeSlot(s, 2).shop;
    const before = [...s.slots];
    s = refreshShop(s, rng);
    expect(s.slots.every(Boolean)).toBe(true);
    expect(s.slots[0]).not.toBe(before[0]);
    expect(s.discard).toEqual([before[0]]);
    expect(s.slotAge).toEqual([0, 1, 0, 1, 1]);
    expect(s.deck).toHaveLength(57);
  });

  it('cuando el mazo se agota se rebaraja el descarte', () => {
    const s: ShopState = {
      slots: [null, null, null, null, null],
      slotAge: [0, 0, 0, 0, 0],
      deck: [],
      discard: [
        { kind: 'face', faceId: 'g3' },
        { kind: 'card', cardId: 'card_income' },
      ],
    };
    const out = refreshShop(s, Rng.fromSeed(3));
    expect(out.slots.filter(Boolean)).toHaveLength(2);
    expect(out.discard).toEqual([]);
    expect(out.deck).toEqual([]);
  });
});
