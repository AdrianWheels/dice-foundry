import { h, mount } from './dom';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

export function mountHotSeatOverlay(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'handoff-wrap' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.handoffSeat === null || !s.game) return null;
    const name = s.game.players[s.handoffSeat]?.name ?? '';
    return h(
      'div',
      { testid: 'handoff', class: 'handoff' },
      h('h2', {}, fmt(S.handoff.title, { name })),
      h(
        'button',
        { testid: 'btn-handoff-ok', class: 'primary', onclick: () => actions.confirmHandoff() },
        S.handoff.ok,
      ),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
