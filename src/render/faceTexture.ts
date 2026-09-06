import * as THREE from 'three';
import type { FaceDef, FaceId } from '../core/types';
import { FAMILY_COLORS, faceGlyph } from './faceGlyph';

const SIZE = 256;
const cache = new Map<FaceId, THREE.CanvasTexture>();

export function getFaceTexture(f: FaceDef): THREE.CanvasTexture {
  const hit = cache.get(f.id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sin contexto 2D');
  const { bg, fg } = FAMILY_COLORS[f.family];
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = bg;
  roundRect(ctx, 14, 14, SIZE - 28, SIZE - 28, 28);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = faceGlyph(f);
  ctx.font = `bold ${glyph.length > 3 ? 72 : 96}px system-ui, sans-serif`;
  ctx.fillText(glyph, SIZE / 2, SIZE / 2 - 14);
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(f.name.toUpperCase(), SIZE / 2, SIZE - 46);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(f.id, tex);
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
