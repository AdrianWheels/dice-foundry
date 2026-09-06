import type { FaceDef, FaceFamily } from '../core/types';

export const FAMILY_COLORS: Record<FaceFamily, { bg: string; fg: string }> = {
  economy: { bg: '#f5c542', fg: '#3b2a00' },
  pv: { bg: '#7c5cff', fg: '#ffffff' },
  multiplier: { bg: '#ff7a3d', fg: '#2b0f00' },
  combo: { bg: '#38c8ff', fg: '#00202b' },
  generator: { bg: '#5be07a', fg: '#00240b' },
  risk: { bg: '#ff4d6d', fg: '#ffffff' },
  control: { bg: '#c9d1ff', fg: '#1a1f4d' },
  conversion: { bg: '#b78cff', fg: '#1d0c3d' },
  meta: { bg: '#ffd6f0', fg: '#4d1140' },
  blank: { bg: '#e9e4d8', fg: '#8a8375' },
};

/** Texto grande de la cara. Corto: se lee a distancia sobre el dado. */
export function faceGlyph(f: FaceDef): string {
  const e = f.effect;
  switch (e.kind) {
    case 'blank':
      return '';
    case 'gain':
      return [e.gold ? `+${e.gold}` : '', e.pv ? `+${e.pv}★` : ''].filter(Boolean).join(' ');
    case 'risk':
      return `${Math.round(e.chance * 100)}%`;
    case 'multiplier':
      return `×${e.factor}`;
    case 'combo':
      return '⚡';
    case 'spawn':
      return e.permanent ? '✦' : '✧';
    case 'control':
      return e.mode === 'copyBest' ? '⇄' : '↻';
    case 'convert':
      return '⚗';
    case 'scaling':
      return '◈';
  }
}
