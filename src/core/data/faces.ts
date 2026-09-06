import type { DieFaces, FaceDef, FaceId } from '../types';

export const FACES: Record<FaceId, FaceDef> = {
  blank: {
    id: 'blank',
    family: 'blank',
    name: 'Cara vacía',
    description: 'No hace nada.',
    cost: null,
    effect: { kind: 'blank' },
  },
  g1: {
    id: 'g1',
    family: 'economy',
    name: 'Moneda',
    description: '+1 oro.',
    cost: null,
    effect: { kind: 'gain', gold: 1 },
  },
  g2: {
    id: 'g2',
    family: 'economy',
    name: 'Dos monedas',
    description: '+2 oro.',
    cost: null,
    effect: { kind: 'gain', gold: 2 },
  },
  pv1: {
    id: 'pv1',
    family: 'pv',
    name: 'Laurel',
    description: '+1 PV.',
    cost: null,
    effect: { kind: 'gain', pv: 1 },
  },
  g3: {
    id: 'g3',
    family: 'economy',
    name: 'Bolsa',
    description: '+3 oro.',
    cost: 3,
    effect: { kind: 'gain', gold: 3 },
  },
  g4: {
    id: 'g4',
    family: 'economy',
    name: 'Cofre',
    description: '+4 oro.',
    cost: 5,
    effect: { kind: 'gain', gold: 4 },
  },
  pv2: {
    id: 'pv2',
    family: 'pv',
    name: 'Corona',
    description: '+2 PV.',
    cost: 5,
    effect: { kind: 'gain', pv: 2 },
  },
  pv3: {
    id: 'pv3',
    family: 'pv',
    name: 'Trono',
    description: '+3 PV.',
    cost: 8,
    effect: { kind: 'gain', pv: 3 },
  },
  x2gold: {
    id: 'x2gold',
    family: 'multiplier',
    name: 'Forja ardiente',
    description: 'Duplica el oro de esta tirada.',
    cost: 6,
    effect: { kind: 'multiplier', resource: 'gold', factor: 2 },
  },
  combo_gold: {
    id: 'combo_gold',
    family: 'combo',
    name: 'Eco dorado',
    description: '+3 oro si otro dado muestra Economía.',
    cost: 4,
    effect: { kind: 'combo', requires: 'economy', gold: 3 },
  },
  combo_pv: {
    id: 'combo_pv',
    family: 'combo',
    name: 'Resonancia',
    description: '+2 PV si otro dado muestra PV.',
    cost: 5,
    effect: { kind: 'combo', requires: 'pv', pv: 2 },
  },
  spawn_temp: {
    id: 'spawn_temp',
    family: 'generator',
    name: 'Chispa',
    description: 'Añade un dado temporal para tu próxima tirada.',
    cost: 4,
    effect: { kind: 'spawn', permanent: false },
  },
  spawn_perm: {
    id: 'spawn_perm',
    family: 'generator',
    name: 'Semilla',
    description: 'Añade un dado permanente. Después esta cara queda vacía.',
    cost: 7,
    effect: { kind: 'spawn', permanent: true },
  },
  risk_gold: {
    id: 'risk_gold',
    family: 'risk',
    name: 'Apuesta',
    description: '50 %: +6 oro. Si no, nada.',
    cost: 4,
    effect: { kind: 'risk', chance: 0.5, gold: 6 },
  },
  risk_pv: {
    id: 'risk_pv',
    family: 'risk',
    name: 'Todo o nada',
    description: '25 %: +8 PV. Si no, nada.',
    cost: 6,
    effect: { kind: 'risk', chance: 0.25, pv: 8 },
  },
  control_copy: {
    id: 'control_copy',
    family: 'control',
    name: 'Espejo',
    description: 'Copia la mejor cara de otro dado.',
    cost: 6,
    effect: { kind: 'control', mode: 'copyBest' },
  },
  control_reroll: {
    id: 'control_reroll',
    family: 'control',
    name: 'Segunda oportunidad',
    description: 'El relanzamiento de este turno es gratis.',
    cost: 3,
    effect: { kind: 'control', mode: 'freeReroll' },
  },
  convert: {
    id: 'convert',
    family: 'conversion',
    name: 'Alquimia',
    description: 'Convierte 3 oro en 2 PV automáticamente.',
    cost: 4,
    effect: { kind: 'convert', from: 'gold', amount: 3, to: 'pv', yield: 2 },
  },
  meta_dice: {
    id: 'meta_dice',
    family: 'meta',
    name: 'Legado',
    description: '+1 PV por cada 2 dados permanentes.',
    cost: 5,
    effect: { kind: 'scaling', per: 'dice', every: 2, pv: 1 },
  },
  meta_cards: {
    id: 'meta_cards',
    family: 'meta',
    name: 'Tesorero',
    description: '+1 oro por cada carta que tengas.',
    cost: 3,
    effect: { kind: 'scaling', per: 'cards', every: 1, gold: 1 },
  },
};

export const STARTER_FACES: DieFaces = ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'];
export const FACE_IDS: FaceId[] = Object.keys(FACES);
export const BUYABLE_FACE_IDS: FaceId[] = FACE_IDS.filter((id) => FACES[id].cost !== null);

export function face(id: FaceId): FaceDef {
  const f = FACES[id];
  if (!f) throw new Error(`Cara desconocida: ${id}`);
  return f;
}
