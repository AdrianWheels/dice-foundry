import { decideBotAction } from '../bots';
import { countFaces } from '../dice';
import { itemId, permanentDice } from '../economy';
import { applyAction, createGame } from '../game';
import type {
  FaceFamily,
  FinalScore,
  GameConfig,
  GameState,
  PlayerState,
  SeatConfig,
} from '../types';

export type BuildLabel =
  'Ingeniero' | 'Casino' | 'Combo' | 'Coleccionista' | 'Puntuador' | 'Magnate' | 'Mixto';

export interface GameSummary {
  seed: number;
  rounds: number;
  seats: SeatConfig[];
  winners: number[];
  scores: FinalScore[];
  /** ítem → veces que estaba en la tienda al abrirla un jugador. */
  offered: Record<string, number>;
  /** ítem → veces comprado ('die' para dados). */
  bought: Record<string, number>;
  /** ítem → asientos que lo compraron (sin repetir). */
  boughtBy: Record<string, number[]>;
  /** Asiento líder en PV (empate → oro) al cerrar cada ronda. */
  leaderByRound: number[];
  diceAtEnd: number[];
  builds: BuildLabel[];
}

/** Etiqueta la build final por prioridad (diseño §4). */
export function classifyBuild(p: PlayerState): BuildLabel {
  const dice = permanentDice(p);
  const fam = (f: FaceFamily): number => countFaces(dice, (x) => x.family === f);
  if (dice.length >= 5) return 'Ingeniero';
  if (fam('risk') >= 3) return 'Casino';
  if (fam('combo') >= 2) return 'Combo';
  if (p.cards.length >= 3) return 'Coleccionista';
  if (fam('pv') >= 5) return 'Puntuador';
  if (countFaces(dice, (x) => x.cost !== null && x.family === 'economy') >= 4) return 'Magnate';
  return 'Mixto';
}

function leader(s: GameState): number {
  let best = s.players[0] as PlayerState;
  for (const p of s.players) {
    if (p.pv > best.pv || (p.pv === best.pv && p.gold > best.gold)) best = p;
  }
  return best.seat;
}

const bump = (rec: Record<string, number>, key: string): void => {
  rec[key] = (rec[key] ?? 0) + 1;
};

export function playGame(config: GameConfig): GameSummary {
  let s = createGame(config);
  const offered: Record<string, number> = {};
  const bought: Record<string, number> = {};
  const boughtBy: Record<string, number[]> = {};
  const leaderByRound: number[] = [];
  const noteBuy = (id: string, seat: number): void => {
    bump(bought, id);
    const seats = (boughtBy[id] ??= []);
    if (!seats.includes(seat)) seats.push(seat);
  };
  let shopSeen = '';
  let guard = 0;
  while (s.phase !== 'gameOver') {
    if (s.phase === 'shop') {
      const key = `${s.round}:${s.currentSeat}`;
      if (key !== shopSeen) {
        shopSeen = key;
        for (const it of s.shop.slots) if (it) bump(offered, itemId(it));
      }
    }
    const a = decideBotAction(s);
    if (a.type === 'buyFace' || a.type === 'buyCard') {
      const it = s.shop.slots[a.slot];
      if (it) noteBuy(itemId(it), s.currentSeat);
    } else if (a.type === 'buyDie') {
      noteBuy('die', s.currentSeat);
    }
    const next = applyAction(s, a);
    if (next.round !== s.round || next.phase === 'gameOver') leaderByRound.push(leader(next));
    s = next;
    if (++guard > 20_000) throw new Error('Partida sin fin');
  }
  return {
    seed: config.seed,
    rounds: config.rounds,
    seats: config.seats,
    winners: s.winners ?? [],
    scores: s.finalScores ?? [],
    offered,
    bought,
    boughtBy,
    leaderByRound,
    diceAtEnd: s.players.map((p) => permanentDice(p).length),
    builds: s.players.map(classifyBuild),
  };
}
