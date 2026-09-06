import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Vec3 } from '../physics/dieBody';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

/** Proyecta un punto del mundo a píxeles de pantalla. */
export function projectToScreen(
  v: Vec3,
  camera: THREE.Camera,
  width: number,
  height: number,
): ScreenPoint {
  const p = new THREE.Vector3(v.x, v.y, v.z).project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * width,
    y: (-p.y * 0.5 + 0.5) * height,
    visible: p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1,
  };
}

export type LabelClass = 'gold' | 'pv' | 'neutral';

interface Label {
  el: HTMLElement;
  world: Vec3;
  born: number;
  duration: number;
  rise: boolean;
}

/** Números flotantes sobre los dados. La animación va en JS para poder desactivarla. */
export class FloatingLabels {
  private readonly labels: Label[] = [];
  private reduceMotion = false;

  constructor(
    private readonly layer: HTMLElement,
    private readonly camera: THREE.Camera,
  ) {}

  setReduceMotion(v: boolean): void {
    this.reduceMotion = v;
  }

  show(
    text: string,
    world: Vec3,
    cls: LabelClass = 'neutral',
    opts: { durationMs?: number; rise?: boolean } = {},
  ): void {
    const el = document.createElement('span');
    el.className = `fx-label fx-${cls}`;
    el.textContent = text;
    this.layer.append(el);
    this.labels.push({
      el,
      world,
      born: performance.now(),
      duration: opts.durationMs ?? (this.reduceMotion ? 600 : 900),
      rise: (opts.rise ?? true) && !this.reduceMotion,
    });
  }

  update(now = performance.now()): void {
    const w = this.layer.clientWidth || window.innerWidth;
    const h = this.layer.clientHeight || window.innerHeight;
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const l = this.labels[i] as Label;
      const t = (now - l.born) / l.duration;
      if (t >= 1) {
        l.el.remove();
        this.labels.splice(i, 1);
        continue;
      }
      const p = projectToScreen(l.world, this.camera, w, h);
      l.el.style.opacity = String(1 - t * t);
      l.el.style.transform = `translate(${p.x}px, ${p.y - (l.rise ? t * 40 : 0)}px)`;
      l.el.style.visibility = p.visible ? 'visible' : 'hidden';
    }
  }

  clear(): void {
    for (const l of this.labels) l.el.remove();
    this.labels.length = 0;
  }
}

const BURST_COUNT = 24;
const BURST_LIFE = 0.7;

/** Chorro de monedas: THREE.Points con gravedad y vida corta. */
export class CoinBurst {
  private readonly rng = Rng.fromSeed(2);
  private points: THREE.Points | null = null;
  private velocities: Vec3[] = [];
  private life = 0;
  private reduceMotion = false;

  constructor(private readonly scene: THREE.Scene) {}

  setReduceMotion(v: boolean): void {
    this.reduceMotion = v;
    if (v) this.dispose();
  }

  burst(world: Vec3, count = BURST_COUNT): void {
    if (this.reduceMotion) return;
    this.dispose();
    const n = Math.max(1, Math.min(count, 64));
    const positions = new Float32Array(n * 3);
    this.velocities = [];
    for (let i = 0; i < n; i++) {
      positions[i * 3] = world.x;
      positions[i * 3 + 1] = world.y;
      positions[i * 3 + 2] = world.z;
      this.velocities.push({
        x: (this.rng.next() - 0.5) * 5,
        y: 4 + this.rng.next() * 4,
        z: (this.rng.next() - 0.5) * 5,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf5c542,
      size: 0.16,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);
    this.life = BURST_LIFE;
  }

  update(dt: number): void {
    const pts = this.points;
    if (!pts) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.dispose();
      return;
    }
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.velocities.length; i++) {
      const v = this.velocities[i] as Vec3;
      v.y -= 25 * dt;
      arr[i * 3] = (arr[i * 3] as number) + v.x * dt;
      arr[i * 3 + 1] = Math.max(0.05, (arr[i * 3 + 1] as number) + v.y * dt);
      arr[i * 3 + 2] = (arr[i * 3 + 2] as number) + v.z * dt;
    }
    attr.needsUpdate = true;
    (pts.material as THREE.PointsMaterial).opacity = Math.max(0, this.life / BURST_LIFE);
  }

  dispose(): void {
    if (!this.points) return;
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.points = null;
    this.velocities = [];
  }
}
