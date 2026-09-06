import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountHints, nextHint } from './Hints';
import { createStore } from './store';
import { type UiActions, type UiState, initialUiState } from './uiState';

const game = () =>
  createGame({
    seats: [
      { name: 'Ana', kind: 'human' },
      { name: 'Bot', kind: 'bot', archetype: 'balanced' },
    ],
    rounds: 2,
    seed: 3,
  });
const base = (over: Partial<UiState> = {}): UiState => ({
  ...initialUiState(),
  screen: 'game',
  game: game(),
  ...over,
});

describe('nextHint', () => {
  it('prioriza lanzar y respeta las ya vistas', () => {
    expect(nextHint(base())).toBe('roll');
    expect(nextHint(base({ hintsSeen: ['roll'] }))).toBe(null);
    const shop = applyAction(applyAction(game(), { type: 'roll' }), { type: 'pass' });
    expect(nextHint(base({ game: shop }))).toBe('shop');
    expect(nextHint(base({ game: shop, hintsSeen: ['shop'] }))).toBe('objective');
    expect(nextHint(base({ game: shop, hintsSeen: ['shop', 'objective'] }))).toBe(null);
  });

  it('no aparece en el menú, en el traspaso ni en turno de bot', () => {
    expect(nextHint(base({ screen: 'menu' }))).toBe(null);
    expect(nextHint(base({ handoffSeat: 1 }))).toBe(null);
    const botTurn = applyAction(
      applyAction(applyAction(game(), { type: 'roll' }), { type: 'pass' }),
      { type: 'endTurn' },
    );
    expect(nextHint(base({ game: botTurn }))).toBe(null);
  });
});

describe('mountHints', () => {
  it('muestra una pista y la descarta al pulsar', () => {
    const root = document.createElement('div');
    const store = createStore<UiState>(base());
    const dismissHint = vi.fn();
    mountHints(root, store, { dismissHint } as unknown as UiActions);
    const hint = root.querySelector('[data-testid="hint-roll"]');
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toContain('Lanzar');
    (root.querySelector('[data-testid="hint-dismiss-roll"]') as HTMLElement).click();
    expect(dismissHint).toHaveBeenCalledWith('roll');
    store.set({ hintsSeen: ['roll'] });
    expect(root.querySelector('[data-testid="hint-roll"]')).toBeNull();
  });
});
