import { card } from './data/cards';
import { permanentDice } from './economy';
import { objectiveProgress } from './objectives';
import type { FinalScore, PlayerState } from './types';

export function cardEndScore(p: PlayerState): number {
  let pv = 0;
  const dice = permanentDice(p).length;
  for (const id of p.cards) {
    const e = card(id).effect;
    if (e.kind !== 'endScore') continue;
    if (e.per === 'dice') pv += Math.max(0, dice - ((e.from ?? 1) - 1)) * e.pv;
    else pv += Math.floor(p.gold / (e.every ?? 1)) * e.pv;
  }
  return pv;
}

export function finalScores(players: readonly PlayerState[]): FinalScore[] {
  return players.map((p) => {
    const prog = objectiveProgress(p);
    const objectivePv = prog.achieved ? prog.objective.pv : 0;
    const cardPv = cardEndScore(p);
    return {
      seat: p.seat,
      basePv: p.pv,
      objectivePv,
      objectiveAchieved: prog.achieved,
      cardPv,
      total: p.pv + objectivePv + cardPv,
      gold: p.gold,
    };
  });
}

export function determineWinners(scores: readonly FinalScore[]): number[] {
  const maxTotal = Math.max(...scores.map((s) => s.total));
  const top = scores.filter((s) => s.total === maxTotal);
  const maxGold = Math.max(...top.map((s) => s.gold));
  return top.filter((s) => s.gold === maxGold).map((s) => s.seat);
}
