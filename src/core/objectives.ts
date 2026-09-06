import { face } from './data/faces';
import { objective } from './data/objectives';
import { countFaces } from './dice';
import { permanentDice } from './economy';
import type { ObjectiveDef, PlayerState } from './types';

export interface ObjectiveProgress {
  objective: ObjectiveDef;
  current: number;
  target: number;
  achieved: boolean;
}

export function objectiveProgress(p: PlayerState): ObjectiveProgress {
  const def = objective(p.objective);
  const dice = permanentDice(p);
  const c = def.check;
  let current = 0;
  let target = 1;
  switch (c.kind) {
    case 'minDice':
      current = dice.length;
      target = c.count;
      break;
    case 'minGold':
      current = p.gold;
      target = c.amount;
      break;
    case 'noBlank':
      current = dice.filter((d) => !d.faces.includes('blank')).length;
      target = dice.length;
      break;
    case 'minFamilyFaces':
      current = countFaces(dice, (f) => f.family === c.family);
      target = c.count;
      break;
    case 'minCards':
      current = p.cards.length;
      target = c.count;
      break;
    case 'minBoughtFaces':
      current = countFaces(dice, (f) => f.cost !== null);
      target = c.count;
      break;
    case 'everyDieHas':
      current = dice.filter((d) =>
        c.families.every((fam) => d.faces.some((id) => face(id).family === fam)),
      ).length;
      target = dice.length;
      break;
  }
  return { objective: def, current, target, achieved: target > 0 && current >= target };
}
