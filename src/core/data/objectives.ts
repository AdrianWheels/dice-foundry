import type { ObjectiveDef, ObjectiveId } from '../types';

export const OBJECTIVES: Record<ObjectiveId, ObjectiveDef> = {
  obj_engineer: {
    id: 'obj_engineer',
    name: 'Ingeniero',
    description: 'Termina con 4 dados permanentes o más.',
    pv: 10,
    check: { kind: 'minDice', count: 4 },
  },
  obj_magnate: {
    id: 'obj_magnate',
    name: 'Magnate',
    description: 'Termina con 12 oro o más sin gastar.',
    pv: 9,
    check: { kind: 'minGold', amount: 12 },
  },
  obj_purist: {
    id: 'obj_purist',
    name: 'Purista',
    description: 'Ninguna cara vacía en tus dados al final.',
    pv: 9,
    check: { kind: 'noBlank' },
  },
  obj_gambler: {
    id: 'obj_gambler',
    name: 'Apostador',
    description: 'Ten 3 caras de Riesgo instaladas o más.',
    pv: 10,
    check: { kind: 'minFamilyFaces', family: 'risk', count: 3 },
  },
  obj_collector: {
    id: 'obj_collector',
    name: 'Coleccionista',
    description: 'Ten 3 cartas o más.',
    pv: 9,
    check: { kind: 'minCards', count: 3 },
  },
  obj_smith: {
    id: 'obj_smith',
    name: 'Forjador',
    description: 'Ten 6 caras compradas instaladas o más.',
    pv: 10,
    check: { kind: 'minBoughtFaces', count: 6 },
  },
  obj_scorer: {
    id: 'obj_scorer',
    name: 'Puntuador',
    description: 'Ten 4 caras de PV instaladas o más.',
    pv: 9,
    check: { kind: 'minFamilyFaces', family: 'pv', count: 4 },
  },
  obj_balanced: {
    id: 'obj_balanced',
    name: 'Equilibrado',
    description: 'Cada dado tiene al menos una cara de PV y una de Economía.',
    pv: 9,
    check: { kind: 'everyDieHas', families: ['pv', 'economy'] },
  },
};
export const OBJECTIVE_IDS: ObjectiveId[] = Object.keys(OBJECTIVES);

export function objective(id: ObjectiveId): ObjectiveDef {
  const o = OBJECTIVES[id];
  if (!o) throw new Error(`Objetivo desconocido: ${id}`);
  return o;
}
