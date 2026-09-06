import { deriveSeed } from '../core/rng';
import type { BotArchetype, GameConfig, SeatConfig } from '../core/types';
import { clear, h } from './dom';
import { S } from './strings.es';
import type { Store } from './store';
import type { UiActions, UiState } from './uiState';

type SeatValue = 'human' | BotArchetype;
const ARCHETYPES: BotArchetype[] = ['magnate', 'scorer', 'engineer', 'casino', 'balanced'];

export interface MenuPrefill {
  players?: number;
  rounds?: number;
  seed?: number;
  seats?: SeatValue[];
}

/** Nombre visible del bot: la etiqueta sin el prefijo "Bot · ". */
function botName(arch: BotArchetype, seat: number): string {
  return `${S.menu.archetype[arch].replace('Bot · ', '')} ${seat + 1}`;
}

export function mountMenu(
  root: HTMLElement,
  store: Store<UiState>,
  actions: UiActions,
  prefill: MenuPrefill = {},
): () => void {
  const el = h('div', { class: 'panel menu-panel' });
  root.append(el);
  const local = {
    players: prefill.players ?? 2,
    rounds: prefill.rounds ?? 8,
    seed: prefill.seed === undefined ? '' : String(prefill.seed),
    seats: [...(prefill.seats ?? [])] as SeatValue[],
  };
  const seatValue = (i: number): SeatValue =>
    local.seats[i] ?? (i === 0 ? 'human' : ('balanced' as SeatValue));

  const buildSeats = (): HTMLElement =>
    h(
      'div',
      { class: 'seats' },
      ...Array.from({ length: local.players }, (_, i) =>
        h(
          'label',
          { class: 'field' },
          `${S.menu.seat.replace('{n}', String(i + 1))}: `,
          h(
            'select',
            {
              testid: `menu-seat-${i}`,
              onchange: (ev: Event) => {
                local.seats[i] = (ev.target as HTMLSelectElement).value as SeatValue;
              },
            },
            h('option', { value: 'human', selected: seatValue(i) === 'human' }, S.menu.human),
            ...ARCHETYPES.map((a) =>
              h('option', { value: a, selected: seatValue(i) === a }, S.menu.archetype[a]),
            ),
          ),
        ),
      ),
    );

  const start = (): void => {
    const seats: SeatConfig[] = Array.from({ length: local.players }, (_, i) => {
      const v = seatValue(i);
      return v === 'human'
        ? { name: `Jugador ${i + 1}`, kind: 'human' as const }
        : { name: botName(v, i), kind: 'bot' as const, archetype: v };
    });
    const typed = Number(local.seed);
    const seed =
      Number.isFinite(typed) && local.seed.trim() !== '' && typed !== 0
        ? typed
        : deriveSeed(Date.now() >>> 0, Math.floor(performance.now()));
    const cfg: GameConfig = { seats, rounds: local.rounds, seed };
    actions.startGame(cfg);
  };

  const render = (): void => {
    clear(el);
    const s = store.get();
    if (s.screen !== 'menu') return;
    el.append(
      h(
        'div',
        { testid: 'menu', class: 'menu' },
        h('h1', {}, S.app.title),
        h('p', { class: 'tagline' }, S.app.tagline),
        h('h2', {}, S.menu.title),
        h(
          'label',
          { class: 'field' },
          `${S.menu.players}: `,
          h(
            'select',
            {
              testid: 'menu-players',
              onchange: (ev: Event) => {
                local.players = Number((ev.target as HTMLSelectElement).value);
                render();
              },
            },
            ...[2, 3, 4].map((n) =>
              h('option', { value: n, selected: local.players === n }, String(n)),
            ),
          ),
        ),
        buildSeats(),
        h(
          'label',
          { class: 'field' },
          `${S.menu.rounds}: `,
          h(
            'select',
            {
              testid: 'menu-rounds',
              onchange: (ev: Event) => {
                local.rounds = Number((ev.target as HTMLSelectElement).value);
              },
            },
            ...[2, 3, 4, 5, 6, 7, 8].map((n) =>
              h('option', { value: n, selected: local.rounds === n }, String(n)),
            ),
          ),
        ),
        h(
          'label',
          { class: 'field' },
          `${S.menu.seed}: `,
          h('input', {
            testid: 'menu-seed',
            type: 'number',
            value: local.seed,
            oninput: (ev: Event) => {
              local.seed = (ev.target as HTMLInputElement).value;
            },
          }),
        ),
        h(
          'div',
          { class: 'row' },
          h('button', { testid: 'start-game', class: 'primary', onclick: start }, S.menu.start),
          s.resumeAvailable &&
            h(
              'button',
              { testid: 'resume-game', onclick: () => actions.resumeGame() },
              S.menu.resume,
            ),
        ),
        h(
          'details',
          { class: 'howto' },
          h('summary', {}, S.menu.howto),
          h('p', {}, S.menu.howtoText),
        ),
      ),
    );
  };

  const unsub = store.subscribe(() => render());
  return () => {
    unsub();
    el.remove();
  };
}
