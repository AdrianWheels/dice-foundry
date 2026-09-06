import type { GameConfig, GameState } from '../core/types';

export type Screen = 'menu' | 'game' | 'end';

export interface Settings {
  volume: number;
  muted: boolean;
  reduceMotion: boolean;
  botSpeed: 'normal' | 'fast' | 'instant';
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  muted: false,
  reduceMotion: false,
  botSpeed: 'fast',
};

export interface UiState {
  screen: Screen;
  game: GameState | null;
  rolling: boolean;
  botThinking: boolean;
  /** Slot de la tienda que se está forjando (modal abierta) o null. */
  forgeSlot: number | null;
  /** Asiento que debe coger el dispositivo (hot-seat) o null. */
  handoffSeat: number | null;
  settings: Settings;
  resumeAvailable: boolean;
  hintsSeen: string[];
}

export interface UiActions {
  startGame(cfg: GameConfig): void;
  resumeGame(): void;
  roll(): void;
  reroll(dieId: number): void;
  pass(): void;
  buyFace(slot: number, dieId: number, side: number): void;
  buyCard(slot: number): void;
  buyDie(): void;
  endTurn(): void;
  openForge(slot: number): void;
  closeForge(): void;
  confirmHandoff(): void;
  playAgain(): void;
  backToMenu(): void;
  updateSettings(patch: Partial<Settings>): void;
  dismissHint(id: string): void;
}

export function initialUiState(): UiState {
  return {
    screen: 'menu',
    game: null,
    rolling: false,
    botThinking: false,
    forgeSlot: null,
    handoffSeat: null,
    settings: { ...DEFAULT_SETTINGS },
    resumeAvailable: false,
    hintsSeen: [],
  };
}

export function humanSeat(state: GameState): boolean {
  return state.players[state.currentSeat]?.kind === 'human';
}
