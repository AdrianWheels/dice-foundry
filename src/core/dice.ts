import { STARTER_FACES, face } from './data/faces';
import type { RandomSource } from './rng';
import type { Die, DieFaces, FaceDef, FaceId, RolledDie } from './types';

export const SIDES = 6;

export function createDie(id: number, faces: DieFaces = STARTER_FACES, temporary = false): Die {
  return { id, faces: [...faces] as DieFaces, temporary };
}

/** Devuelve un dado nuevo con la cara del lado `side` sustituida. */
export function replaceFace(die: Die, side: number, faceId: FaceId): Die {
  if (!Number.isInteger(side) || side < 0 || side >= SIDES) {
    throw new RangeError(`Lado inválido: ${side}`);
  }
  face(faceId); // valida que exista
  const faces = [...die.faces] as DieFaces;
  faces[side] = faceId;
  return { ...die, faces };
}

export function faceOf(die: Die, faceIndex: number): FaceDef {
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= SIDES) {
    throw new RangeError(`Índice de cara inválido: ${faceIndex}`);
  }
  return face(die.faces[faceIndex] as FaceId);
}

/** El resultado lo decide el RNG; la física solo lo representa (diseño §7). */
export function rollDice(dice: readonly Die[], rng: RandomSource): RolledDie[] {
  return dice.map((d) => ({ dieId: d.id, faceIndex: rng.int(0, SIDES - 1) }));
}

export function countFaces(dice: readonly Die[], pred: (f: FaceDef) => boolean): number {
  let n = 0;
  for (const d of dice) for (const id of d.faces) if (pred(face(id))) n++;
  return n;
}
