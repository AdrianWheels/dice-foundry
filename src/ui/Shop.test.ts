import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountShop } from './Shop';
import { createStore } from './store';
import { type UiActions, type UiState, initialUiState } from './uiState';

const actions = () =>
  ({
    openForge: vi.fn(),
    buyCard: vi.fn(),
    buyDie: vi.fn(),
    endTurn: vi.fn(),
  }) as unknown as UiActions;
const shopState = (gold: number) => {
  let g = createGame({
    seats: [
      { name: 'Ana', kind: 'human' },
      { name: 'Bot', kind: 'bot' },
    ],
    rounds: 2,
    seed: 5,
  });
  g = { ...g, players: g.players.map((p) => ({ ...p, gold })) };
  return applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' });
};
const q = (root: HTMLElement, id: string) =>
  root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;

describe('Shop', () => {
  it('renderiza 5 slots, comprar dado, compras restantes y terminar turno', () => {
    const root = document.createElement('div');
    const a = actions();
    mountShop(
      root,
      createStore<UiState>({ ...initialUiState(), screen: 'game', game: shopState(50) }),
      a,
    );
    for (let i = 0; i < 5; i++) expect(q(root, `shop-slot-${i}`)).not.toBeNull();
    expect(q(root, 'purchases-left')!.textContent).toContain('2');
    q(root, 'buy-die')!.click();
    expect(a.buyDie).toHaveBeenCalled();
    q(root, 'btn-end-turn')!.click();
    expect(a.endTurn).toHaveBeenCalled();
  });

  it('sin oro todo está deshabilitado; con oro, comprar cara abre la forja y carta compra', () => {
    const root = document.createElement('div');
    const a = actions();
    const store = createStore<UiState>({
      ...initialUiState(),
      screen: 'game',
      game: shopState(0),
    });
    mountShop(root, store, a);
    for (let i = 0; i < 5; i++) expect(q(root, `buy-${i}`)!.disabled).toBe(true);
    expect(q(root, 'buy-die')!.disabled).toBe(true);
    store.set({ game: shopState(50) });
    const g = store.get().game!;
    const faceSlot = g.shop.slots.findIndex((s) => s?.kind === 'face');
    q(root, `buy-${faceSlot}`)!.click();
    expect(a.openForge).toHaveBeenCalledWith(faceSlot);
    const cardSlot = g.shop.slots.findIndex((s) => s?.kind === 'card');
    if (cardSlot >= 0) {
      q(root, `buy-${cardSlot}`)!.click();
      expect(a.buyCard).toHaveBeenCalledWith(cardSlot);
    }
  });
});
