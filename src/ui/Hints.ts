import { currentPlayer } from '../core/game';
import type { GameState } from '../core/types';
import { h, mount } from './dom';
import { S } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

export type HintId = 'roll' | 'shop' | 'objective';

/** Prioridad: solo se ve una pista a la vez. */
const ORDER: HintId[] = ['roll', 'shop', 'objective'];

function applies(id: HintId, g: GameState): boolean {
  switch (id) {
    case 'roll':
      return g.phase === 'roll' && g.round === 1;
    case 'shop':
      return g.phase === 'shop';
    case 'objective':
      return g.log.length > 0;
  }
}

export function nextHint(state: UiState): HintId | null {
  const g = state.game;
  if (!g || state.screen !== 'game' || state.handoffSeat !== null) return null;
  if (currentPlayer(g).kind !== 'human') return null;
  for (const id of ORDER) {
    if (!state.hintsSeen.includes(id) && applies(id, g)) return id;
  }
  return null;
}

export function mountHints(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'hints-wrap' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    const id = nextHint(s);
    if (!id) return null;
    return h(
      'div',
      { testid: `hint-${id}`, class: 'hint' },
      h('p', {}, S.hints[id]),
      h(
        'button',
        { testid: `hint-dismiss-${id}`, onclick: () => actions.dismissHint(id) },
        'Entendido',
      ),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
