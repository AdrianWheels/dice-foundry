import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountEndScreen } from './EndScreen';
import { mountHotSeatOverlay } from './HotSeatOverlay';
import { mountHud } from './Hud';
import { mountLog } from './Log';
import { mountMenu } from './Menu';
import { mountObjectivePanel } from './ObjectivePanel';
import { mountRollControls } from './RollControls';
import { createStore } from './store';
import { type UiActions, type UiState, initialUiState } from './uiState';

const actions = (): UiActions => ({
  startGame: vi.fn(),
  resumeGame: vi.fn(),
  roll: vi.fn(),
  reroll: vi.fn(),
  pass: vi.fn(),
  buyFace: vi.fn(),
  buyCard: vi.fn(),
  buyDie: vi.fn(),
  endTurn: vi.fn(),
  openForge: vi.fn(),
  closeForge: vi.fn(),
  confirmHandoff: vi.fn(),
  playAgain: vi.fn(),
  backToMenu: vi.fn(),
  updateSettings: vi.fn(),
  dismissHint: vi.fn(),
});
const game = () =>
  createGame({
    seats: [
      { name: 'Ana', kind: 'human' },
      { name: 'Bot', kind: 'bot', archetype: 'balanced' },
    ],
    rounds: 2,
    seed: 3,
  });
const q = (root: HTMLElement, id: string) =>
  root.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('Menu', () => {
  it('arranca una partida con la configuración elegida', () => {
    const root = document.createElement('div');
    const a = actions();
    mountMenu(root, createStore(initialUiState()), a, { players: 3, rounds: 4, seed: 42 });
    expect(q(root, 'menu-seat-2')).not.toBeNull();
    q(root, 'start-game')!.click();
    expect(a.startGame).toHaveBeenCalledWith(expect.objectContaining({ rounds: 4, seed: 42 }));
    const cfg = (a.startGame as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(cfg.seats).toHaveLength(3);
    expect(cfg.seats[0].kind).toBe('human');
  });
});

describe('Hud + RollControls + Log + Objective', () => {
  it('muestran el estado y disparan acciones por fase', () => {
    const root = document.createElement('div');
    const store = createStore<UiState>({ ...initialUiState(), screen: 'game', game: game() });
    const a = actions();
    mountHud(root, store);
    mountRollControls(root, store, a);
    mountLog(root, store);
    mountObjectivePanel(root, store);
    expect(q(root, 'hud-round')!.textContent).toBe('Ronda 1 / 2');
    expect(q(root, 'hud-gold')!.textContent).toContain('5');
    expect(q(root, 'roll-controls')!.dataset.phase).toBe('roll');
    q(root, 'btn-roll')!.click();
    expect(a.roll).toHaveBeenCalled();
    let g = applyAction(store.get().game!, { type: 'roll' });
    store.set({ game: g });
    expect(q(root, 'roll-controls')!.dataset.phase).toBe('mitigate');
    expect(root.querySelectorAll('[data-testid^="btn-reroll-"]')).toHaveLength(2);
    q(root, 'btn-pass')!.click();
    expect(a.pass).toHaveBeenCalled();
    g = applyAction(g, { type: 'pass' });
    store.set({ game: g });
    expect(q(root, 'roll-summary')!.textContent).toContain('Esta tirada');
    expect(root.querySelectorAll('[data-testid="log-entry"]').length).toBe(g.log.length);
    expect(q(root, 'objective-progress')).not.toBeNull();
    store.set({ botThinking: true });
    expect(q(root, 'roll-controls')!.dataset.busy).toBe('true');
  });
});

describe('EndScreen + HotSeat', () => {
  it('pantalla final con filas por jugador y overlay de hot-seat', () => {
    const root = document.createElement('div');
    let g = game();
    for (let i = 0; i < 4; i++) {
      g = applyAction(applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' }), {
        type: 'endTurn',
      });
    }
    const store = createStore<UiState>({
      ...initialUiState(),
      screen: 'end',
      game: g,
      handoffSeat: 1,
    });
    const a = actions();
    mountEndScreen(root, store, a);
    mountHotSeatOverlay(root, store, a);
    expect(q(root, 'end-row-0')).not.toBeNull();
    expect(q(root, 'end-row-1')).not.toBeNull();
    q(root, 'btn-again')!.click();
    expect(a.playAgain).toHaveBeenCalled();
    expect(q(root, 'handoff')!.textContent).toContain('Bot');
    q(root, 'btn-handoff-ok')!.click();
    expect(a.confirmHandoff).toHaveBeenCalled();
  });
});
