import * as THREE from 'three';
import { TABLE } from '../physics/world';

export function createTable(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const { halfX, halfZ, wallThickness: t } = TABLE;
  const felt = new THREE.Mesh(
    new THREE.BoxGeometry((halfX + t) * 2, TABLE.floorThickness, (halfZ + t) * 2),
    new THREE.MeshStandardMaterial({ color: 0x2e6b4f, roughness: 0.95 }),
  );
  felt.position.y = -TABLE.floorThickness / 2;
  felt.receiveShadow = true;
  g.add(felt);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.7 });
  const rimH = 0.35;
  const mk = (w: number, d: number, x: number, z: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, rimH, d), rimMat);
    m.position.set(x, rimH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  mk(t, (halfZ + t) * 2, halfX + t / 2, 0);
  mk(t, (halfZ + t) * 2, -(halfX + t / 2), 0);
  mk((halfX + t) * 2, t, 0, halfZ + t / 2);
  mk((halfX + t) * 2, t, 0, -(halfZ + t / 2));
  scene.add(g);
  return g;
}
