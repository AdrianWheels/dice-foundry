import { cardPrice, diePrice, facePrice, itemPrice } from '../core/economy';
import { currentPlayer } from '../core/game';
import { MAX_PURCHASES_PER_TURN } from '../core/shop';
import { h, mount } from './dom';
import { renderItemCard } from './faceCard';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

export function mountShop(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'panel shop-panel' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'game' || !s.game) return null;
    const g = s.game;
    const me = currentPlayer(g);
    if (g.phase !== 'shop' || me.kind !== 'human') return null;
    const busy = s.rolling || s.botThinking;
    const left = MAX_PURCHASES_PER_TURN - g.purchasesThisTurn;
    const box = h(
      'div',
      { testid: 'shop', class: 'shop' },
      h('h3', {}, S.shop.title),
      h('p', { testid: 'purchases-left' }, fmt(S.shop.purchasesLeft, { n: left })),
    );

    g.shop.slots.forEach((item, i) => {
      if (!item) {
        box.append(
          h(
            'div',
            { testid: `shop-slot-${i}`, 'data-kind': 'empty', class: 'shop-slot empty' },
            S.shop.empty,
          ),
        );
        return;
      }
      const price = itemPrice(item, me);
      const base = item.kind === 'face' ? facePrice(item.faceId, me) : cardPrice(item.cardId);
      const affordable = me.gold >= price;
      const disabled = busy || left <= 0 || !affordable;
      box.append(
        h(
          'div',
          { testid: `shop-slot-${i}`, 'data-kind': item.kind, class: 'shop-slot' },
          renderItemCard(item, price, { basePrice: base }),
          h(
            'button',
            {
              testid: `buy-${i}`,
              disabled,
              title: affordable ? undefined : S.shop.cantAfford,
              onclick: () => (item.kind === 'face' ? actions.openForge(i) : actions.buyCard(i)),
            },
            S.shop.buy,
          ),
        ),
      );
    });

    const dp = diePrice(me);
    box.append(
      h(
        'div',
        { class: 'shop-actions' },
        h(
          'button',
          {
            testid: 'buy-die',
            disabled: busy || left <= 0 || me.gold < dp,
            title: me.gold < dp ? S.shop.cantAfford : undefined,
            onclick: () => actions.buyDie(),
          },
          fmt(S.shop.buyDie, { n: dp }),
        ),
        h(
          'button',
          {
            testid: 'btn-end-turn',
            class: 'primary',
            disabled: busy,
            onclick: () => actions.endTurn(),
          },
          S.shop.endTurn,
        ),
      ),
    );
    return box;
  });
  return () => {
    unsub();
    el.remove();
  };
}
