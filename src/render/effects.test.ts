import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { projectToScreen } from './effects';

describe('projectToScreen', () => {
  it('un punto delante de la cámara cae dentro del viewport; uno detrás no es visible', () => {
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    cam.position.set(0, 9, 8);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const p = projectToScreen({ x: 0, y: 0.5, z: 0 }, cam, 1600, 900);
    expect(p.visible).toBe(true);
    expect(p.x).toBeGreaterThan(700);
    expect(p.x).toBeLessThan(900);
    expect(projectToScreen({ x: 0, y: 9, z: 20 }, cam, 1600, 900).visible).toBe(false);
  });
});
