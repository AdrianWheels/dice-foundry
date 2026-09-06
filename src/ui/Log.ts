import { clear, h } from './dom';
import { describeEvent } from './eventText';
import { S } from './strings.es';
import type { Store } from './store';
import type { UiState } from './uiState';

const MAX_VISIBLE = 30;
const MOBILE_MAX = 768;

export function mountLog(root: HTMLElement, store: Store<UiState>): () => void {
  const el = h('div', { class: 'panel log-panel' });
  root.append(el);
  // En móvil el log arranca plegado para no comerse la pantalla.
  let open = window.innerWidth >= MOBILE_MAX;

  const render = (): void => {
    clear(el);
    const s = store.get();
    if (s.screen !== 'game' || !s.game) return;
    const g = s.game;
    const entries = [...g.log].reverse().slice(0, MAX_VISIBLE);
    const box = h('div', { testid: 'log', class: 'log', 'data-open': open ? 'true' : 'false' });
    box.append(
      h(
        'button',
        {
          testid: 'log-toggle',
          class: 'log-toggle',
          'aria-expanded': open ? 'true' : 'false',
          onclick: () => {
            open = !open;
            render();
          },
        },
        S.log.title,
      ),
      h('h3', { class: 'log-title' }, S.log.title),
    );
    if (open) {
      box.append(
        entries.length === 0
          ? h('p', { class: 'empty' }, S.log.empty)
          : h(
              'ul',
              {},
              ...entries.map((e) => h('li', { testid: 'log-entry' }, describeEvent(e, g))),
            ),
      );
    }
    el.append(box);
  };

  const unsub = store.subscribe(() => render());
  return () => {
    unsub();
    el.remove();
  };
}
