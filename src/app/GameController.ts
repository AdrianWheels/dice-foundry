import { decideBotAction } from '../core/bots';
import {
  IllegalActionError,
  applyAction,
  createGame,
  currentPlayer,
  rerollCost,
} from '../core/game';
import { deriveSeed } from '../core/rng';
import type { FinalScore, GameAction, GameConfig, GameState } from '../core/types';
import type { Transform } from '../physics/dieBody';
import { type DieSpec, type RestingDie, sideMapFor } from '../physics/preroll';
import type { Rapier } from '../physics/world';
import { DieMesh } from '../render/dieMesh';
import { CoinBurst, FloatingLabels } from '../render/effects';
import { type LoopHandle, createLoop } from '../render/loop';
import { type SceneCtx, type SceneOptions, createScene } from '../render/scene';
import { createTable } from '../render/table';
import { mountEndScreen } from '../ui/EndScreen';
import { mountForge } from '../ui/Forge';
import { mountHotSeatOverlay } from '../ui/HotSeatOverlay';
import { mountHud } from '../ui/Hud';
import { mountLog } from '../ui/Log';
import { mountMenu } from '../ui/Menu';
import { mountObjectivePanel } from '../ui/ObjectivePanel';
import { mountRollControls } from '../ui/RollControls';
import { mountSettingsPanel } from '../ui/SettingsPanel';
import { mountShop } from '../ui/Shop';
import type { Store } from '../ui/store';
import { type Screen, type Settings, type UiActions, type UiState, humanSeat } from '../ui/uiState';
import { createEmitter } from './emitter';
import {
  type StorageLike,
  bumpStat,
  clearGame,
  loadGame,
  saveGame,
  saveHints,
  saveSettings,
} from './persistence';
import { RollRunner, type RollOutcome } from './RollRunner';
import type { UrlParams } from './params';

export type ControllerEvents = {
  state: [GameState];
  'roll:start': [number, DieSpec[]];
  'roll:contact': [number, number];
  'roll:settled': [RollOutcome];
  resolved: [number, GameState];
  purchase: [number, GameAction];
  turn: [number];
  gameover: [FinalScore[]];
  screen: [Screen];
  illegal: [string];
  reroll: [number, number];
};

export interface ControllerDeps {
  R: Rapier;
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  store: Store<UiState>;
  prefill: UrlParams;
  /** Persistencia (Tarea 22). Sin storage el juego funciona igual, sin autosave. */
  storage?: StorageLike;
  /** Ajustes de render (Tarea 26): en móvil se baja el DPR y se apagan las sombras. */
  scene?: SceneOptions;
}

const TRAY_X = -4;
const TRAY_Y = 0.5;
const TRAY_Z0 = -2;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** ÚNICO punto donde core, physics, render y ui se tocan. */
export class GameController implements UiActions {
  readonly events = createEmitter<ControllerEvents>();
  private readonly store: Store<UiState>;
  private readonly deps: ControllerDeps;
  private ctx: SceneCtx | null = null;
  private runner: RollRunner | null = null;
  private readonly meshes = new Map<number, DieMesh>();
  private readonly restTransforms = new Map<number, Transform>();
  private state: GameState | null = null;
  private cfg: GameConfig | null = null;
  private botRunning = false;
  private labels: FloatingLabels | null = null;
  private burst: CoinBurst | null = null;
  private ambient: LoopHandle | null = null;
  private lastFxTime = 0;
  private unmounts: (() => void)[] = [];

  constructor(deps: ControllerDeps) {
    this.deps = deps;
    this.store = deps.store;
  }

  mount(): void {
    const ctx = createScene(this.deps.canvas, this.deps.scene);
    createTable(ctx.scene);
    this.ctx = ctx;
    const layer = document.createElement('div');
    layer.id = 'fx-layer';
    this.deps.root.append(layer);
    this.labels = new FloatingLabels(layer, ctx.camera);
    this.burst = new CoinBurst(ctx.scene);
    this.runner = new RollRunner(this.deps.R, ctx, this.meshes, {
      onContact: (dieId, force) => this.events.emit('roll:contact', dieId, force),
      onRender: () => this.updateEffects(),
    });
    const { root, prefill } = this.deps;
    this.unmounts = [
      mountHud(root, this.store),
      mountObjectivePanel(root, this.store),
      mountShop(root, this.store, this),
      mountLog(root, this.store),
      mountRollControls(root, this.store, this),
      mountForge(root, this.store, this),
      mountEndScreen(root, this.store, this),
      mountHotSeatOverlay(root, this.store, this),
      mountSettingsPanel(root, this.store, this),
      mountMenu(root, this.store, this, {
        players: prefill.players,
        rounds: prefill.rounds,
        seed: prefill.seed,
        seats: prefill.seats as never,
      }),
    ];
    this.lastFxTime = performance.now();
    this.ambient = createLoop({
      step: () => undefined,
      render: () => {
        this.updateEffects();
        ctx.render();
      },
    });
    this.ambient.start();
    ctx.render();
  }

  /** Etiquetas y partículas: se actualizan tanto en el bucle ambiente como durante la tirada. */
  private updateEffects(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFxTime) / 1000);
    this.lastFxTime = now;
    this.labels?.update(now);
    this.burst?.update(dt);
  }

  /** Dependencias para `wireEffects` (Tarea 21). */
  effectDeps(): { labels: FloatingLabels; burst: CoinBurst; meshes: Map<number, DieMesh> } | null {
    if (!this.labels || !this.burst) return null;
    return { labels: this.labels, burst: this.burst, meshes: this.meshes };
  }

  unmount(): void {
    this.ambient?.stop();
    this.ambient = null;
    this.labels?.clear();
    this.burst?.dispose();
    this.runner?.cancel();
    for (const off of this.unmounts) off();
    this.unmounts = [];
    this.clearMeshes();
    this.ctx?.dispose();
    this.ctx = null;
  }

  getState(): GameState | null {
    return this.state;
  }

  /** Guarda la partida en curso (para `beforeunload`). */
  flush(): void {
    if (this.state && this.state.phase !== 'gameOver') this.autosave(this.state);
  }

  // ---------------------------------------------------------------- UiActions

  startGame(cfg: GameConfig): void {
    if (this.deps.storage) bumpStat(this.deps.storage, 'gamesStarted', Date.now());
    this.cfg = cfg;
    this.state = createGame(cfg);
    this.clearMeshes();
    this.restTransforms.clear();
    this.store.set({
      screen: 'game',
      game: this.state,
      forgeSlot: null,
      handoffSeat: null,
      rolling: false,
      botThinking: false,
    });
    this.events.emit('screen', 'game');
    this.syncDiceMeshes();
    this.events.emit('turn', this.state.currentSeat);
    if (!humanSeat(this.state)) void this.runBotTurn();
  }

  resumeGame(): void {
    const storage = this.deps.storage;
    const saved = storage ? loadGame(storage) : null;
    if (!saved) {
      this.store.set({ resumeAvailable: false });
      return;
    }
    this.state = saved;
    this.cfg = saved.config;
    this.clearMeshes();
    this.restTransforms.clear();
    this.store.set({
      screen: 'game',
      game: saved,
      forgeSlot: null,
      handoffSeat: null,
      rolling: false,
      botThinking: false,
    });
    this.events.emit('screen', 'game');
    this.syncDiceMeshes();
    if (saved.roll) this.showRolledStatic();
    this.events.emit('turn', saved.currentSeat);
    if (!humanSeat(saved)) void this.runBotTurn();
  }

  roll(): void {
    const g = this.state;
    if (!g || g.phase !== 'roll' || !humanSeat(g) || this.busy()) return;
    if (!this.apply({ type: 'roll' })) return;
    void this.showRoll(0);
  }

  reroll(dieId: number): void {
    const g = this.state;
    if (!g || g.phase !== 'mitigate' || !humanSeat(g) || this.busy()) return;
    const cost = rerollCost(g);
    if (!this.apply({ type: 'reroll', dieId })) return;
    this.events.emit('reroll', g.round, cost);
    void this.showRoll(1, dieId);
  }

  pass(): void {
    const g = this.state;
    if (!g || g.phase !== 'mitigate' || this.busy()) return;
    const seat = g.currentSeat;
    if (!this.apply({ type: 'pass' })) return;
    if (this.state) this.events.emit('resolved', seat, this.state);
    this.syncDiceMeshes();
  }

  buyFace(slot: number, dieId: number, side: number): void {
    const seat = this.state?.currentSeat ?? 0;
    if (this.apply({ type: 'buyFace', slot, dieId, side })) {
      this.events.emit('purchase', seat, { type: 'buyFace', slot, dieId, side });
      this.syncDiceMeshes();
    }
    this.closeForge();
  }

  buyCard(slot: number): void {
    const seat = this.state?.currentSeat ?? 0;
    if (this.apply({ type: 'buyCard', slot })) {
      this.events.emit('purchase', seat, { type: 'buyCard', slot });
    }
  }

  buyDie(): void {
    const seat = this.state?.currentSeat ?? 0;
    if (this.apply({ type: 'buyDie' })) {
      this.events.emit('purchase', seat, { type: 'buyDie' });
      this.syncDiceMeshes();
    }
  }

  endTurn(): void {
    if (!this.state || this.busy()) return;
    if (!this.apply({ type: 'endTurn' })) return;
    this.settleAfterTurn();
  }

  openForge(slot: number): void {
    this.store.set({ forgeSlot: slot });
  }

  closeForge(): void {
    this.store.set({ forgeSlot: null });
  }

  confirmHandoff(): void {
    this.store.set({ handoffSeat: null });
    this.syncDiceMeshes();
  }

  playAgain(): void {
    if (!this.cfg) return;
    if (this.deps.storage) bumpStat(this.deps.storage, 'playAgainClicks', Date.now());
    this.startGame({ ...this.cfg, seed: this.cfg.seed + 1 });
  }

  backToMenu(): void {
    this.runner?.cancel();
    this.clearMeshes();
    this.state = null;
    this.store.set({
      screen: 'menu',
      game: null,
      forgeSlot: null,
      handoffSeat: null,
      rolling: false,
      botThinking: false,
    });
    this.events.emit('screen', 'menu');
  }

  updateSettings(patch: Partial<Settings>): void {
    const settings = { ...this.store.get().settings, ...patch };
    this.store.set({ settings });
    if (this.deps.storage) saveSettings(this.deps.storage, settings);
  }

  dismissHint(id: string): void {
    const seen = this.store.get().hintsSeen;
    if (seen.includes(id)) return;
    const hintsSeen = [...seen, id];
    this.store.set({ hintsSeen });
    if (this.deps.storage) saveHints(this.deps.storage, hintsSeen);
  }

  // ------------------------------------------------------------------ interno

  private autosave(state: GameState): void {
    const storage = this.deps.storage;
    if (!storage) return;
    if (state.phase === 'gameOver') {
      clearGame(storage);
      bumpStat(storage, 'gamesFinished', Date.now());
      this.store.set({ resumeAvailable: false });
      return;
    }
    saveGame(storage, state, Date.now());
    this.store.set({ resumeAvailable: true });
  }

  /** Coloca los dados de una tirada ya resuelta sin simular (al reanudar un save). */
  private showRolledStatic(): void {
    const g = this.state;
    if (!g?.roll) return;
    g.roll.results.forEach((r, i) => {
      const mesh = this.meshes.get(r.dieId);
      if (!mesh) return;
      mesh.applySideMap(sideMapFor(2, r.faceIndex));
      const t: Transform = {
        position: { x: -1.5 + i * 1.2, y: TRAY_Y, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      };
      mesh.syncFrom(t);
      mesh.highlight(2);
      this.restTransforms.set(r.dieId, t);
    });
    this.ctx?.render();
  }

  private busy(): boolean {
    const s = this.store.get();
    return s.rolling || s.botThinking;
  }

  private apply(a: GameAction): boolean {
    if (!this.state) return false;
    try {
      this.state = applyAction(this.state, a);
      this.store.set({ game: this.state });
      this.events.emit('state', this.state);
      this.autosave(this.state);
      return true;
    } catch (err) {
      if (err instanceof IllegalActionError) {
        console.warn('[GameController] acción ilegal:', err.message);
        this.events.emit('illegal', err.message);
        return false;
      }
      throw err;
    }
  }

  private clearMeshes(): void {
    for (const mesh of this.meshes.values()) {
      this.ctx?.scene.remove(mesh.mesh);
      mesh.dispose();
    }
    this.meshes.clear();
  }

  /** Un DieMesh por dado del jugador actual; los que ya reposaron mantienen su sitio. */
  private syncDiceMeshes(): void {
    const g = this.state;
    const ctx = this.ctx;
    if (!g || !ctx) return;
    const me = currentPlayer(g);
    const ids = new Set(me.dice.map((d) => d.id));
    for (const [id, mesh] of [...this.meshes]) {
      if (ids.has(id)) continue;
      ctx.scene.remove(mesh.mesh);
      mesh.dispose();
      this.meshes.delete(id);
    }
    me.dice.forEach((d, i) => {
      let mesh = this.meshes.get(d.id);
      if (!mesh) {
        mesh = new DieMesh(d.faces);
        ctx.scene.add(mesh.mesh);
        this.meshes.set(d.id, mesh);
      } else {
        mesh.setFaces(d.faces);
      }
      const rest = this.restTransforms.get(d.id);
      if (rest) {
        mesh.syncFrom(rest);
      } else {
        mesh.mesh.position.set(TRAY_X, TRAY_Y, TRAY_Z0 + i);
        mesh.mesh.quaternion.set(0, 0, 0, 1);
      }
    });
    ctx.render();
  }

  private speedForCurrentSeat(): number {
    const g = this.state;
    if (!g || humanSeat(g)) return 1;
    return this.store.get().settings.botSpeed === 'fast' ? 3 : 1.5;
  }

  /** Tirada visible. `only` = relanzar un solo dado (los demás quedan fijos donde reposaron). */
  private async showRoll(nonce: number, only?: number): Promise<void> {
    const g = this.state;
    const runner = this.runner;
    if (!g || !g.roll || !runner || !this.cfg) return;
    const results = g.roll.results;
    const rolled = only === undefined ? results : results.filter((r) => r.dieId === only);
    const dice: DieSpec[] = rolled.map((r) => ({ dieId: r.dieId, faceIndex: r.faceIndex }));
    const seat = g.currentSeat;
    this.events.emit('roll:start', seat, dice);

    if (!humanSeat(g) && this.store.get().settings.botSpeed === 'instant') {
      this.placeInstant(dice);
      return;
    }

    const resting: RestingDie[] = [];
    if (only !== undefined) {
      for (const r of results) {
        if (r.dieId === only) continue;
        const t = this.restTransforms.get(r.dieId);
        if (t) resting.push({ dieId: r.dieId, position: t.position, rotation: t.rotation });
      }
    }
    this.store.set({ rolling: true });
    this.ambient?.stop();
    try {
      const outcome = await runner.roll(
        dice,
        resting,
        deriveSeed(this.cfg.seed, g.round, seat, nonce),
        this.speedForCurrentSeat(),
      );
      for (const [id, t] of outcome.transforms) this.restTransforms.set(id, t);
      this.events.emit('roll:settled', outcome);
    } finally {
      this.lastFxTime = performance.now();
      this.ambient?.start();
      this.store.set({ rolling: false, game: this.state });
    }
  }

  /** Bots en modo instantáneo: la cara decidida arriba, sin simular. */
  private placeInstant(dice: DieSpec[]): void {
    dice.forEach((d, i) => {
      const mesh = this.meshes.get(d.dieId);
      if (!mesh) return;
      mesh.applySideMap(sideMapFor(2, d.faceIndex));
      const t: Transform = {
        position: { x: TRAY_X + 2 + i * 1.2, y: TRAY_Y, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      };
      mesh.syncFrom(t);
      mesh.highlight(2);
      this.restTransforms.set(d.dieId, t);
    });
    this.ctx?.render();
    this.events.emit('roll:settled', {
      transforms: new Map(),
      topSides: new Map(),
      mismatches: 0,
      forced: false,
    });
  }

  private botDelay(): Promise<void> {
    const speed = this.store.get().settings.botSpeed;
    return delay(speed === 'instant' ? 0 : 350);
  }

  private async runBotTurn(): Promise<void> {
    if (this.botRunning) return;
    this.botRunning = true;
    this.store.set({ botThinking: true });
    try {
      let guard = 0;
      while (this.state && this.state.phase !== 'gameOver' && !humanSeat(this.state)) {
        if (++guard > 500) throw new Error('Bucle de bot sin fin');
        const before = this.state;
        const a = decideBotAction(before);
        const seat = before.currentSeat;
        if (!this.apply(a)) break;
        if (a.type === 'roll') {
          await this.showRoll(0);
        } else if (a.type === 'reroll') {
          await this.showRoll(1, a.dieId);
        } else if (a.type === 'pass') {
          if (this.state) this.events.emit('resolved', seat, this.state);
          this.syncDiceMeshes();
          await this.botDelay();
        } else if (a.type === 'endTurn') {
          this.restTransforms.clear();
          await this.botDelay();
        } else {
          this.events.emit('purchase', seat, a);
          this.syncDiceMeshes();
          await this.botDelay();
        }
      }
    } finally {
      this.botRunning = false;
      this.store.set({ botThinking: false });
    }
    this.settleAfterTurn();
  }

  /** Cierra el turno: fin de partida, siguiente bot o traspaso a otro humano. */
  private settleAfterTurn(): void {
    const g = this.state;
    if (!g) return;
    if (g.phase === 'gameOver') {
      this.store.set({ screen: 'end', game: g, handoffSeat: null, forgeSlot: null });
      this.events.emit('screen', 'end');
      this.events.emit('gameover', g.finalScores ?? []);
      return;
    }
    this.restTransforms.clear();
    this.syncDiceMeshes();
    this.events.emit('turn', g.currentSeat);
    if (!humanSeat(g)) {
      void this.runBotTurn();
      return;
    }
    const humans = g.players.filter((p) => p.kind === 'human').length;
    if (humans >= 2) this.store.set({ handoffSeat: g.currentSeat });
  }
}
