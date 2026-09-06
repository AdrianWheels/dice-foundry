import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountForge } from './Forge';
import { createStore } from './store';
import { type UiActions, type UiState, initialUiState } from './uiState';

describe('Forge', () => {
  it('muestra 6 celdas por dado permanente y compra al elegir una', () => {
    let g = createGame({
      seats: [
        { name: 'Ana', kind: 'human' },
        { name: 'Bot', kind: 'bot' },
      ],
      rounds: 2,
      seed: 5,
    });
    g = applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' });
    const slot = g.shop.slots.findIndex((s) => s?.kind === 'face');
    const root = document.createElement('div');
    const a = { buyFace: vi.fn(), closeForge: vi.fn() } as unknown as UiActions;
    const store = createStore<UiState>({
      ...initialUiState(),
      screen: 'game',
      game: g,
      forgeSlot: slot,
    });
    mountForge(root, store, a);
    expect(root.querySelectorAll('[data-testid^="forge-die-"]')).toHaveLength(12);
    (root.querySelector('[data-testid="forge-die-1-side-5"]') as HTMLElement).click();
    expect(a.buyFace).toHaveBeenCalledWith(slot, 1, 5);
    (root.querySelector('[data-testid="forge-cancel"]') as HTMLElement).click();
    expect(a.closeForge).toHaveBeenCalled();
    store.set({ forgeSlot: null });
    expect(root.querySelector('[data-testid="forge"]')).toBeNull();
  });
});
