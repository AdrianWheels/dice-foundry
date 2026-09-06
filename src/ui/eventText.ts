import { card } from '../core/data/cards';
import { face } from '../core/data/faces';
import type { GameState, RollEvent } from '../core/types';
import { S, delta, fmt } from './strings.es';

export const EVENT_KEYS = [
  'ev.gain',
  'ev.riskHit',
  'ev.riskMiss',
  'ev.scaling',
  'ev.comboHit',
  'ev.comboMiss',
  'ev.multiplier',
  'ev.cardBonus',
  'ev.convert',
  'ev.convertFail',
  'ev.spawnTemp',
  'ev.spawnPerm',
  'ev.mirror',
  'ev.mirrorNone',
  'ev.tax',
] as const;

export function describeEvent(e: RollEvent, state: GameState): string {
  const key = e.textKey.replace(/^ev\./, '') as keyof typeof S.ev;
  const template = S.ev[key] ?? e.textKey;
  const params: Record<string, string | number> = {
    ...(e.params ?? {}),
    delta: delta(e.gold, e.pv),
  };
  if (e.faceId) params.face = face(e.faceId).name;
  if (e.cardId) params.card = card(e.cardId).name;
  if (typeof e.params?.seat === 'number') params.name = state.players[e.params.seat]?.name ?? '';
  return fmt(template, params);
}
