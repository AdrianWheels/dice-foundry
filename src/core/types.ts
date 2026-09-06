import type { RngState } from './rng';

export type FaceFamily =
  | 'economy'
  | 'pv'
  | 'multiplier'
  | 'combo'
  | 'generator'
  | 'risk'
  | 'control'
  | 'conversion'
  | 'meta'
  | 'blank';

export type FaceEffect =
  | { kind: 'blank' }
  | { kind: 'gain'; gold?: number; pv?: number }
  | { kind: 'risk'; chance: number; gold?: number; pv?: number }
  | { kind: 'multiplier'; resource: 'gold'; factor: number }
  | { kind: 'combo'; requires: FaceFamily; gold?: number; pv?: number }
  | { kind: 'spawn'; permanent: boolean }
  | { kind: 'control'; mode: 'copyBest' | 'freeReroll' }
  | { kind: 'convert'; from: 'gold'; amount: number; to: 'pv'; yield: number }
  | { kind: 'scaling'; per: 'dice' | 'cards'; every: number; gold?: number; pv?: number };

export type FaceId = string;
export interface FaceDef {
  id: FaceId;
  family: FaceFamily;
  name: string;
  description: string;
  /** null = no comprable (caras iniciales). */
  cost: number | null;
  effect: FaceEffect;
}

export type CardId = string;
export type CardType = 'economy' | 'dice' | 'scoring' | 'interaction';
export type CardEffect =
  | { kind: 'rollBonus'; gold: number; minDice?: number }
  | { kind: 'discount'; target: 'face' | 'die'; amount: number }
  | { kind: 'endScore'; per: 'dice' | 'gold'; from?: number; every?: number; pv: number }
  | { kind: 'freeReroll' }
  | { kind: 'tax'; trigger: 'buyDie'; gold: number };
export interface CardDef {
  id: CardId;
  type: CardType;
  name: string;
  description: string;
  cost: number;
  effect: CardEffect;
}

export type ObjectiveId = string;
export type ObjectiveCheck =
  | { kind: 'minDice'; count: number }
  | { kind: 'minGold'; amount: number }
  | { kind: 'noBlank' }
  | { kind: 'minFamilyFaces'; family: FaceFamily; count: number }
  | { kind: 'minCards'; count: number }
  | { kind: 'minBoughtFaces'; count: number }
  | { kind: 'everyDieHas'; families: FaceFamily[] };
export interface ObjectiveDef {
  id: ObjectiveId;
  name: string;
  description: string;
  pv: number;
  check: ObjectiveCheck;
}

export type DieFaces = [FaceId, FaceId, FaceId, FaceId, FaceId, FaceId];
export interface Die {
  id: number;
  faces: DieFaces;
  temporary: boolean;
}

export type SeatKind = 'human' | 'bot';
export type BotArchetype = 'magnate' | 'scorer' | 'engineer' | 'casino' | 'balanced';
export interface SeatConfig {
  name: string;
  kind: SeatKind;
  archetype?: BotArchetype;
}
export interface GameConfig {
  seats: SeatConfig[];
  rounds: number;
  seed: number;
}

export interface PlayerState {
  seat: number;
  name: string;
  kind: SeatKind;
  archetype?: BotArchetype;
  gold: number;
  pv: number;
  dice: Die[];
  cards: CardId[];
  objective: ObjectiveId;
}

export type ShopItem = { kind: 'face'; faceId: FaceId } | { kind: 'card'; cardId: CardId };
export interface ShopState {
  slots: (ShopItem | null)[];
  /** Rondas que lleva cada slot ocupado (para descartar el más antiguo). */
  slotAge: number[];
  deck: ShopItem[];
  discard: ShopItem[];
}

export type TurnPhase = 'roll' | 'mitigate' | 'shop' | 'gameOver';
export interface RolledDie {
  dieId: number;
  faceIndex: number;
}
export interface RollState {
  results: RolledDie[];
  rerollUsed: boolean;
  freeReroll: boolean;
}

export type RollStep =
  | 'control'
  | 'gain'
  | 'risk'
  | 'scaling'
  | 'combo'
  | 'multiplier'
  | 'card'
  | 'convert'
  | 'spawn'
  | 'tax';
export interface RollEvent {
  step: RollStep;
  dieId?: number;
  faceId?: FaceId;
  cardId?: CardId;
  gold: number;
  pv: number;
  /** Clave de `strings.es.ts` (ev.*) para el log "Qué ha pasado". */
  textKey: string;
  params?: Record<string, string | number>;
}
export interface RollResolution {
  gold: number;
  pv: number;
  events: RollEvent[];
}

export interface FinalScore {
  seat: number;
  basePv: number;
  objectivePv: number;
  objectiveAchieved: boolean;
  cardPv: number;
  total: number;
  gold: number;
}

export interface GameState {
  version: 1;
  config: GameConfig;
  rngState: RngState;
  /** 1-based. */
  round: number;
  /** 0..n-1 dentro de la ronda. */
  turnIndex: number;
  currentSeat: number;
  phase: TurnPhase;
  players: PlayerState[];
  shop: ShopState;
  roll: RollState | null;
  purchasesThisTurn: number;
  nextDieId: number;
  lastResolution: RollResolution | null;
  /** Últimos 200 eventos de la partida. */
  log: RollEvent[];
  finalScores: FinalScore[] | null;
  winners: number[] | null;
}

export type GameAction =
  | { type: 'roll' }
  | { type: 'reroll'; dieId: number }
  | { type: 'pass' }
  | { type: 'buyFace'; slot: number; dieId: number; side: number }
  | { type: 'buyCard'; slot: number }
  | { type: 'buyDie' }
  | { type: 'endTurn' };
