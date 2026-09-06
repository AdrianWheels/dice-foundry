import { objective } from '../core/data/objectives';
import type { FinalScore, GameState } from '../core/types';
import { h, mount } from './dom';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

function headline(g: GameState): string {
  const names = (g.winners ?? []).map((seat) => g.players[seat]?.name ?? `#${seat}`);
  if (names.length === 1) return fmt(S.end.winner, { name: names[0] ?? '' });
  return fmt(S.end.tie, { names: names.join(', ') });
}

export function mountEndScreen(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
): () => void {
  const el = h('div', { class: 'panel end-panel' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'end' || !s.game || !s.game.finalScores) return null;
    const g = s.game;
    const scores = g.finalScores as FinalScore[];
    return h(
      'div',
      { testid: 'end-screen', class: 'end-screen' },
      h('h2', {}, S.end.title),
      h('p', { class: 'winner' }, headline(g)),
      h(
        'table',
        { class: 'scores' },
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, ''),
            h('th', {}, S.end.base),
            h('th', {}, S.end.objective),
            h('th', {}, S.end.cards),
            h('th', {}, S.end.total),
            h('th', {}, S.hud.gold),
          ),
        ),
        h(
          'tbody',
          {},
          ...[...scores]
            .sort((a, b) => b.total - a.total || b.gold - a.gold)
            .map((sc) =>
              h(
                'tr',
                { testid: `end-row-${sc.seat}` },
                h('td', {}, g.players[sc.seat]?.name ?? `#${sc.seat}`),
                h('td', {}, String(sc.basePv)),
                h(
                  'td',
                  {},
                  `${objective(g.players[sc.seat]?.objective ?? '').name} (${
                    sc.objectiveAchieved ? S.end.achieved : S.end.failed
                  }) +${sc.objectivePv}`,
                ),
                h('td', {}, String(sc.cardPv)),
                h('td', { class: 'total' }, String(sc.total)),
                h('td', {}, String(sc.gold)),
              ),
            ),
        ),
      ),
      h(
        'div',
        { class: 'row' },
        h(
          'button',
          { testid: 'btn-again', class: 'primary', onclick: () => actions.playAgain() },
          S.end.again,
        ),
        h('button', { testid: 'btn-menu', onclick: () => actions.backToMenu() }, S.end.menu),
      ),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
