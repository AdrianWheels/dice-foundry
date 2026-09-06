import { currentPlayer, rerollCost } from '../core/game';
import { h, mount } from './dom';
import { S, delta, fmt } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

export function mountRollControls(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'panel roll-controls-wrap' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'game' || !s.game) return null;
    const g = s.game;
    const busy = s.rolling || s.botThinking;
    const me = currentPlayer(g);
    const human = me.kind === 'human';
    const box = h('div', {
      testid: 'roll-controls',
      class: 'roll-controls',
      'data-phase': g.phase,
      'data-busy': busy ? 'true' : 'false',
    });

    if (s.botThinking) {
      box.append(h('p', { class: 'bot-turn' }, fmt(S.roll.botTurn, { name: me.name })));
    }
    if (g.phase === 'roll' && human) {
      box.append(
        h(
          'button',
          {
            testid: 'btn-roll',
            class: 'primary',
            disabled: busy,
            onclick: () => actions.roll(),
          },
          s.rolling ? S.roll.rolling : S.roll.roll,
        ),
      );
    }
    if (g.phase === 'mitigate' && human && g.roll) {
      const cost = rerollCost(g);
      const used = g.roll.rerollUsed;
      for (const r of g.roll.results) {
        const label = cost === 0 ? S.roll.rerollFree : S.roll.reroll;
        box.append(
          h(
            'button',
            {
              testid: `btn-reroll-${r.dieId}`,
              disabled: busy || used || me.gold < cost,
              onclick: () => actions.reroll(r.dieId),
            },
            fmt(label, { id: r.dieId, cost }),
          ),
        );
      }
      box.append(
        h(
          'button',
          { testid: 'btn-pass', class: 'primary', disabled: busy, onclick: () => actions.pass() },
          S.roll.pass,
        ),
      );
    }
    if (g.phase === 'shop' && g.lastResolution) {
      box.append(
        h(
          'p',
          { testid: 'roll-summary' },
          fmt(S.roll.summary, {
            delta: delta(g.lastResolution.gold, g.lastResolution.pv),
          }),
        ),
      );
    }
    return box;
  });
  return () => {
    unsub();
    el.remove();
  };
}
