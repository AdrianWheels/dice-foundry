import { face } from '../core/data/faces';
import { permanentDice } from '../core/economy';
import { currentPlayer } from '../core/game';
import { itemPrice } from '../core/economy';
import { faceGlyph } from '../render/faceGlyph';
import { h, mount } from './dom';
import { renderItemCard } from './faceCard';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

export function mountForge(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'forge-wrap' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.forgeSlot === null || !s.game) return null;
    const g = s.game;
    const item = g.shop.slots[s.forgeSlot];
    if (!item || item.kind !== 'face') return null;
    const me = currentPlayer(g);
    const slot = s.forgeSlot;
    const newFace = face(item.faceId);
    return h(
      'div',
      { testid: 'forge', class: 'forge' },
      h('h2', {}, fmt(S.forge.title, { name: newFace.name })),
      renderItemCard(item, itemPrice(item, me)),
      h('p', { class: 'forge-hint' }, S.forge.hint),
      ...permanentDice(me).map((d) =>
        h(
          'div',
          { class: 'forge-die' },
          h('h3', {}, fmt(S.forge.die, { id: d.id })),
          h(
            'div',
            { class: 'forge-grid' },
            ...d.faces.map((fid, side) => {
              const f = face(fid);
              return h(
                'button',
                {
                  testid: `forge-die-${d.id}-side-${side}`,
                  class: 'forge-cell',
                  onclick: () => actions.buyFace(slot, d.id, side),
                },
                h('span', { class: 'cell-glyph' }, faceGlyph(f) || '·'),
                h('span', { class: 'cell-name' }, f.name),
              );
            }),
          ),
        ),
      ),
      h('button', { testid: 'forge-cancel', onclick: () => actions.closeForge() }, S.forge.cancel),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
