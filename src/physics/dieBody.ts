import type RAPIER from '@dimforge/rapier3d-compat';
import type { RandomSource } from '../core/rng';
import { CONTACT_FORCE_THRESHOLD, type PhysicsWorld, TABLE } from './world';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}
export interface ThrowParams {
  position: Vec3;
  rotation: Quat;
  linvel: Vec3;
  angvel: Vec3;
}
export interface Transform {
  position: Vec3;
  rotation: Quat;
}

export const DIE_HALF = 0.5;
export const DIE_RADIUS = 0.08;
export const DIE_FRICTION = 0.5;
export const DIE_RESTITUTION = 0.35;
/** Lado físico = grupo de BoxGeometry de three: 0:+X 1:−X 2:+Y 3:−Y 4:+Z 5:−Z. */
export const SIDE_NORMALS: readonly Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];
/** Por debajo de este coseno el dado está "de canto" y hay que empujarlo. */
export const COCKED_DOT = 0.85;
export const SETTLE_LINVEL = 0.05;
export const SETTLE_ANGVEL = 0.05;

/** Cuaternión unitario uniforme (Shoemake). Consume 3 números del RNG. */
export function randomQuat(rng: RandomSource): Quat {
  const u1 = rng.next();
  const u2 = rng.next() * 2 * Math.PI;
  const u3 = rng.next() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return { x: a * Math.sin(u2), y: a * Math.cos(u2), z: b * Math.sin(u3), w: b * Math.cos(u3) };
}

/** Lanzamiento desde el borde −X hacia el centro; los dados salen en fila a lo largo de Z. */
export function makeThrowParams(rng: RandomSource, index: number, count: number): ThrowParams {
  const spread = Math.min(4.5, count * 0.9);
  const z = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
  const j = (): number => rng.next() - 0.5;
  return {
    position: { x: -TABLE.halfX + 1 + j() * 0.4, y: 2 + rng.next() * 0.8, z: z + j() * 0.3 },
    rotation: randomQuat(rng),
    linvel: { x: 9 + rng.next() * 4, y: 1 + rng.next() * 1.5, z: j() * 3 },
    angvel: { x: j() * 24, y: j() * 24, z: j() * 24 },
  };
}

function dieCollider(R: PhysicsWorld['R']): RAPIER.ColliderDesc {
  const h = DIE_HALF - DIE_RADIUS;
  return R.ColliderDesc.roundCuboid(h, h, h, DIE_RADIUS)
    .setFriction(DIE_FRICTION)
    .setRestitution(DIE_RESTITUTION)
    .setDensity(1);
}

export function addDie(pw: PhysicsWorld, dieId: number, p: ThrowParams): number {
  const { R, world } = pw;
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(p.position.x, p.position.y, p.position.z)
      .setRotation(p.rotation)
      .setLinvel(p.linvel.x, p.linvel.y, p.linvel.z)
      .setAngvel(p.angvel)
      .setCcdEnabled(true)
      .setAngularDamping(0.4)
      .setLinearDamping(0.05),
  );
  const col = world.createCollider(
    dieCollider(R)
      .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(CONTACT_FORCE_THRESHOLD),
    body,
  );
  pw.bodies.set(dieId, body.handle);
  pw.colliderToDie.set(col.handle, dieId);
  return body.handle;
}

/** Dado en reposo de una tirada anterior, como cuerpo FIJO: obstáculo determinista para relanzamientos. */
export function addRestingDie(
  pw: PhysicsWorld,
  dieId: number,
  position: Vec3,
  rotation: Quat,
): number {
  const { R, world } = pw;
  const body = world.createRigidBody(
    R.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(rotation),
  );
  const col = world.createCollider(dieCollider(R), body);
  pw.bodies.set(dieId, body.handle);
  pw.colliderToDie.set(col.handle, dieId);
  return body.handle;
}

export function getBody(pw: PhysicsWorld, dieId: number): RAPIER.RigidBody {
  const h = pw.bodies.get(dieId);
  const body = h === undefined ? null : pw.world.getRigidBody(h);
  if (!body) throw new Error(`Sin cuerpo para el dado ${dieId}`);
  return body;
}

/** q · v · q* (misma fórmula que Vector3.applyQuaternion de three). */
export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const { x, y, z, w } = q;
  const ix = w * v.x + y * v.z - z * v.y;
  const iy = w * v.y + z * v.x - x * v.z;
  const iz = w * v.z + x * v.y - y * v.x;
  const iw = -x * v.x - y * v.y - z * v.z;
  return {
    x: ix * w + iw * -x + iy * -z - iz * -y,
    y: iy * w + iw * -y + iz * -x - ix * -z,
    z: iz * w + iw * -z + ix * -y - iy * -x,
  };
}

/** Lado cuya normal apunta más hacia +Y y cuánto (coseno). */
export function topSide(rotation: Quat): { side: number; dot: number } {
  let side = 0;
  let dot = -2;
  SIDE_NORMALS.forEach((n, i) => {
    const d = rotateVec(rotation, n).y;
    if (d > dot) {
      dot = d;
      side = i;
    }
  });
  return { side, dot };
}

export function isSettled(body: RAPIER.RigidBody): boolean {
  if (body.isSleeping()) return true;
  const l = body.linvel();
  const a = body.angvel();
  return Math.hypot(l.x, l.y, l.z) < SETTLE_LINVEL && Math.hypot(a.x, a.y, a.z) < SETTLE_ANGVEL;
}

export function readTransform(body: RAPIER.RigidBody): Transform {
  const t = body.translation();
  const r = body.rotation();
  return { position: { x: t.x, y: t.y, z: t.z }, rotation: { x: r.x, y: r.y, z: r.z, w: r.w } };
}

/** Empujón determinista para un dado de canto: salto + giro que depende de n. */
export function nudge(body: RAPIER.RigidBody, n: number): void {
  body.applyImpulse({ x: 0, y: 6, z: 0 }, true);
  body.applyTorqueImpulse({ x: 2 + (n % 3), y: 1, z: 2 - (n % 2) }, true);
}
