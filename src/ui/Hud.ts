import { permanentDice } from '../core/economy';
import type { PlayerState } from '../core/types';
import { h, mount } from './dom';
import { S, fmt } from './strings.es';
import type { Store } from './store';
import type { UiState } from './uiState';

const diceLabel = (p: PlayerState): string => {
  const perm = permanentDice(p).length;
  const temp = p.dice.length - perm;
  return temp > 0 ? `${perm} (+${temp})` : String(perm);
};

export function mountHud(root: HTMLElement, store: Store<UiState>): () => void {
  const el = h('div', { class: 'panel hud' });
  root.append(el);
  const unsub = mount(el, store, (s) => {
    if (s.screen !== 'game' || !s.game) return null;
    const g = s.game;
    const me = g.players[g.currentSeat] as PlayerState;
    const humans = g.players.filter((p) => p.kind === 'human').length;
    const turnName = me.kind === 'human' && humans === 1 ? S.hud.you : me.name;
    return h(
      'div',
      { class: 'hud-inner' },
      h(
        'div',
        { class: 'hud-top' },
        h(
          'span',
          { testid: 'hud-round' },
          fmt(S.hud.round, { round: g.round, rounds: g.config.rounds }),
        ),
        h('span', { testid: 'hud-turn' }, fmt(S.hud.turn, { name: turnName })),
      ),
      h(
        'div',
        { class: 'hud-stats' },
        h('span', { testid: 'hud-gold' }, `${S.hud.gold}: ${me.gold}`),
        h('span', { testid: 'hud-pv' }, `${S.hud.pv}: ${me.pv}`),
        h('span', { testid: 'hud-dice' }, `${S.hud.dice}: ${diceLabel(me)}`),
      ),
      h(
        'ul',
        { class: 'hud-players' },
        ...g.players.map((p) =>
          h(
            'li',
            {
              testid: `hud-player-${p.seat}`,
              'data-active': p.seat === g.currentSeat ? 'true' : 'false',
            },
            `${p.name} · ${p.gold} ${S.hud.gold} · ${p.pv} ${S.hud.pv} · ${diceLabel(p)} ${S.hud.dice}`,
          ),
        ),
      ),
    );
  });
  return () => {
    unsub();
    el.remove();
  };
}
