import { describe, expect, it } from 'vitest';
import { FACES, face } from '../core/data/faces';
import { FAMILY_COLORS, faceGlyph } from './faceGlyph';

describe('faceGlyph', () => {
  it('glifos de referencia', () => {
    expect(faceGlyph(face('g3'))).toBe('+3');
    expect(faceGlyph(face('pv2'))).toBe('+2★');
    expect(faceGlyph(face('x2gold'))).toBe('×2');
    expect(faceGlyph(face('risk_pv'))).toBe('25%');
    expect(faceGlyph(face('blank'))).toBe('');
  });
  it('toda familia tiene colores y toda cara tiene glifo definido', () => {
    for (const f of Object.values(FACES)) {
      expect(FAMILY_COLORS[f.family]).toBeDefined();
      expect(typeof faceGlyph(f)).toBe('string');
    }
  });
});
