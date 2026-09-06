import { objectiveProgress } from '../core/objectives';
import type { PlayerState } from '../core/types';
import { h, mount } from './dom';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiState } from './uiState';

export function mountObjectivePanel(root: HTMLElement, store: Store<UiState>): () => void {
  const el = h('div', { class: 'panel objective-panel' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'game' || !s.game) return null;
    const g = s.game;
    // El del asiento actual si es humano; si no, el del primer humano (hot-seat lo cubre el overlay).
    const current = g.players[g.currentSeat];
    const owner: PlayerState | undefined =
      current?.kind === 'human' ? current : g.players.find((p) => p.kind === 'human');
    if (!owner) return null;
    const prog = objectiveProgress(owner);
    return h(
      'div',
      { testid: 'objective', class: 'objective' },
      h('h3', {}, S.objective.title),
      h('p', { class: 'objective-name' }, prog.objective.name),
      h('p', { class: 'objective-desc' }, prog.objective.description),
      h(
        'p',
        { testid: 'objective-progress' },
        fmt(S.objective.progress, { current: prog.current, target: prog.target }),
      ),
      h('p', { class: 'objective-reward' }, fmt(S.objective.reward, { pv: prog.objective.pv })),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
