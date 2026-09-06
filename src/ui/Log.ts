import { h, mount } from './dom';
import { describeEvent } from './eventText';
import { S } from './strings.es';
import type { Store } from './store';
import type { UiState } from './uiState';

const MAX_VISIBLE = 30;

export function mountLog(root: HTMLElement, store: Store<UiState>): () => void {
  const el = h('div', { class: 'panel log-panel' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'game' || !s.game) return null;
    const g = s.game;
    const entries = [...g.log].reverse().slice(0, MAX_VISIBLE);
    return h(
      'div',
      { testid: 'log', class: 'log' },
      h('h3', {}, S.log.title),
      entries.length === 0
        ? h('p', { class: 'empty' }, S.log.empty)
        : h('ul', {}, ...entries.map((e) => h('li', { testid: 'log-entry' }, describeEvent(e, g)))),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
