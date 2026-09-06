import { MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS, MIN_ROUNDS } from '../core/game';

export type BotSpeed = 'normal' | 'fast' | 'instant';

export interface UrlParams {
  seed?: number;
  rounds?: number;
  players?: number;
  seats?: string[];
  bots?: BotSpeed;
  dev?: string;
  e2e?: boolean;
}

const SEAT_VALUES = new Set(['human', 'magnate', 'scorer', 'engineer', 'casino', 'balanced']);
const SPEEDS = new Set<BotSpeed>(['normal', 'fast', 'instant']);

function intIn(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

/** Lee la configuración de la URL. Los valores inválidos se ignoran (no rompen el arranque). */
export function readParams(search: string): UrlParams {
  const p = new URLSearchParams(search);
  const out: UrlParams = {};
  const seed = p.get('seed');
  if (seed !== null && Number.isFinite(Number(seed)) && seed.trim() !== '') {
    out.seed = Number(seed);
  }
  const rounds = intIn(p.get('rounds'), MIN_ROUNDS, MAX_ROUNDS);
  if (rounds !== undefined) out.rounds = rounds;
  const players = intIn(p.get('players'), MIN_PLAYERS, MAX_PLAYERS);
  if (players !== undefined) out.players = players;
  const seats = p.get('seats');
  if (seats) {
    const list = seats.split(',').map((s) => s.trim());
    if (list.length > 0 && list.every((s) => SEAT_VALUES.has(s))) out.seats = list;
  }
  const bots = p.get('bots');
  if (bots && SPEEDS.has(bots as BotSpeed)) out.bots = bots as BotSpeed;
  const dev = p.get('dev');
  if (dev) out.dev = dev;
  if (p.get('e2e') === '1') out.e2e = true;
  return out;
}
