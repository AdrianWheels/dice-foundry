import RAPIER from '@dimforge/rapier3d-compat';

export type Rapier = typeof RAPIER;

/** Unidades: 1 = arista de un dado. Gravedad alta para que el dado "pese" a esa escala. */
export const PHYSICS_DT = 1 / 60;
export const GRAVITY = { x: 0, y: -40, z: 0 } as const;
export const TABLE = {
  halfX: 5,
  halfZ: 3,
  wallHeight: 4,
  wallThickness: 0.5,
  floorThickness: 0.5,
  friction: 0.6,
  restitution: 0.3,
} as const;
export const CONTACT_FORCE_THRESHOLD = 15;

let ready: Promise<Rapier> | null = null;
export function initPhysics(): Promise<Rapier> {
  if (!ready) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}

export interface PhysicsWorld {
  R: Rapier;
  world: RAPIER.World;
  events: RAPIER.EventQueue;
  /** dieId → handle del rigid body. */
  bodies: Map<number, number>;
  /** handle de collider → dieId. */
  colliderToDie: Map<number, number>;
  /** Pasos dados desde la creación. */
  step: number;
}

/** Mesa acotada: suelo (cara superior en y = 0), 4 paredes y techo. Misma secuencia de creación siempre. */
export function createPhysicsWorld(R: Rapier): PhysicsWorld {
  const world = new R.World({ x: GRAVITY.x, y: GRAVITY.y, z: GRAVITY.z });
  world.timestep = PHYSICS_DT;
  const ground = world.createRigidBody(R.RigidBodyDesc.fixed());
  const { halfX, halfZ, wallHeight: h, wallThickness: t, floorThickness: ft } = TABLE;
  const box = (hx: number, hy: number, hz: number, x: number, y: number, z: number): void => {
    world.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(x, y, z)
        .setFriction(TABLE.friction)
        .setRestitution(TABLE.restitution),
      ground,
    );
  };
  box(halfX + t, ft / 2, halfZ + t, 0, -ft / 2, 0);
  box(t / 2, h / 2, halfZ + t, halfX + t / 2, h / 2, 0);
  box(t / 2, h / 2, halfZ + t, -(halfX + t / 2), h / 2, 0);
  box(halfX + t, h / 2, t / 2, 0, h / 2, halfZ + t / 2);
  box(halfX + t, h / 2, t / 2, 0, h / 2, -(halfZ + t / 2));
  box(halfX + t, t / 2, halfZ + t, 0, h + t / 2, 0);
  return {
    R,
    world,
    events: new R.EventQueue(true),
    bodies: new Map(),
    colliderToDie: new Map(),
    step: 0,
  };
}

export type ContactListener = (dieId: number, force: number) => void;

export function stepWorld(pw: PhysicsWorld, onContact?: ContactListener): void {
  pw.world.step(pw.events);
  pw.step++;
  if (!onContact) return;
  pw.events.drainContactForceEvents((e) => {
    const d1 = pw.colliderToDie.get(e.collider1());
    const d2 = pw.colliderToDie.get(e.collider2());
    const f = e.totalForceMagnitude();
    if (d1 !== undefined) onContact(d1, f);
    if (d2 !== undefined && d2 !== d1) onContact(d2, f);
  });
}

export function freeWorld(pw: PhysicsWorld): void {
  pw.events.free();
  pw.world.free();
  pw.bodies.clear();
  pw.colliderToDie.clear();
}
