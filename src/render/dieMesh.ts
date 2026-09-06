import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { face } from '../core/data/faces';
import type { DieFaces } from '../core/types';
import type { Transform } from '../physics/dieBody';
import { getFaceTexture } from './faceTexture';

const IDENTITY = [0, 1, 2, 3, 4, 5];

export class DieMesh {
  readonly mesh: THREE.Mesh;
  private readonly materials: THREE.MeshStandardMaterial[];
  private faces: DieFaces;
  private sideMap: number[] = [...IDENTITY];

  constructor(faces: DieFaces) {
    let geometry: THREE.BufferGeometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.08);
    if (geometry.groups.length !== 6) {
      // RoundedBoxGeometry hereda los 6 grupos de BoxGeometry; si una versión los pierde, caemos a cubo simple.
      console.warn('[DieMesh] RoundedBoxGeometry sin 6 grupos; usando BoxGeometry');
      geometry.dispose();
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    this.materials = Array.from(
      { length: 6 },
      () => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }),
    );
    this.mesh = new THREE.Mesh(geometry, this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.faces = [...faces] as DieFaces;
    this.applySideMap(this.sideMap);
  }

  setFaces(faces: DieFaces): void {
    this.faces = [...faces] as DieFaces;
    this.applySideMap(this.sideMap);
  }

  /** sideMap[lado físico] = índice de cara del dado. */
  applySideMap(sideMap: number[]): void {
    this.sideMap = [...sideMap];
    for (let s = 0; s < 6; s++) {
      const m = this.materials[s] as THREE.MeshStandardMaterial;
      m.map = getFaceTexture(face(this.faces[this.sideMap[s] as number] as string));
      m.needsUpdate = true;
    }
  }

  syncFrom(t: Transform): void {
    this.mesh.position.set(t.position.x, t.position.y, t.position.z);
    this.mesh.quaternion.set(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w);
  }

  highlight(side: number | null): void {
    this.materials.forEach((m, i) => {
      m.emissive.set(i === side ? '#ffd166' : '#000000');
      m.emissiveIntensity = i === side ? 0.55 : 0;
    });
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
