import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { countFaces, createDie, faceOf, replaceFace, rollDice } from './dice';
import { Rng } from './rng';

describe('dice', () => {
  it('createDie usa las caras starter por defecto y copia el array', () => {
    const d = createDie(1);
    expect(d).toEqual({ id: 1, faces: ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'], temporary: false });
    expect(d.faces).not.toBe(STARTER_FACES);
  });

  it('replaceFace es inmutable y solo toca el lado indicado', () => {
    const d = createDie(1);
    const d2 = replaceFace(d, 5, 'g3');
    expect(d.faces[5]).toBe('blank');
    expect(d2.faces).toEqual(['g1', 'g1', 'g2', 'g2', 'pv1', 'g3']);
    expect(d2.id).toBe(1);
  });

  it('replaceFace rechaza lados y caras inválidos', () => {
    expect(() => replaceFace(createDie(1), 6, 'g3')).toThrow(RangeError);
    expect(() => replaceFace(createDie(1), -1, 'g3')).toThrow(RangeError);
    expect(() => replaceFace(createDie(1), 0, 'nope')).toThrow(/Cara desconocida/);
  });

  it('faceOf devuelve la definición de la cara en ese índice', () => {
    expect(faceOf(createDie(1), 4).id).toBe('pv1');
    expect(() => faceOf(createDie(1), 6)).toThrow(RangeError);
  });

  it('rollDice devuelve un índice 0..5 por dado, en orden, determinista', () => {
    const dice = [createDie(1), createDie(2), createDie(3)];
    const a = rollDice(dice, Rng.fromSeed(1));
    const b = rollDice(dice, Rng.fromSeed(1));
    expect(a).toEqual(b);
    expect(a.map((r) => r.dieId)).toEqual([1, 2, 3]);
    for (const r of a) {
      expect(r.faceIndex).toBeGreaterThanOrEqual(0);
      expect(r.faceIndex).toBeLessThanOrEqual(5);
    }
  });

  it('countFaces cuenta caras que cumplen el predicado en todos los dados', () => {
    const dice = [createDie(1), replaceFace(createDie(2), 0, 'pv2')];
    expect(countFaces(dice, (f) => f.family === 'pv')).toBe(3);
  });
});
