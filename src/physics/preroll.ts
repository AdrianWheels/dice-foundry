import { Rng } from '../core/rng';
import {
  COCKED_DOT,
  type Quat,
  type ThrowParams,
  type Vec3,
  addDie,
  addRestingDie,
  getBody,
  isSettled,
  makeThrowParams,
  nudge,
  readTransform,
  topSide,
} from './dieBody';
import {
  type ContactListener,
  type PhysicsWorld,
  type Rapier,
  createPhysicsWorld,
  freeWorld,
  stepWorld,
} from './world';

export interface DieSpec {
  dieId: number;
  faceIndex: number;
}
export interface RestingDie {
  dieId: number;
  position: Vec3;
  rotation: Quat;
}
export interface Nudge {
  step: number;
  dieId: number;
  n: number;
}

export interface RollPlan {
  visualSeed: number;
  throws: { dieId: number; params: ThrowParams }[];
  resting: RestingDie[];
  nudges: Nudge[];
  /** Paso en el que la pre-simulación dio todos los dados por reposados. */
  settleStep: number;
  /** dieId → lado físico que queda arriba. */
  topSides: Map<number, number>;
  /** dieId → sideMap (lado → índice de cara) con sideMap[topSide] = faceIndex. */
  sideMaps: Map<number, number[]>;
  /** true si se agotó el presupuesto sin reposo estable; la salvaguarda del controlador lo cubre. */
  forced: boolean;
}

export const MAX_PLAN_STEPS = 1200;
export const MAX_NUDGES = 4;

/** Relleno cíclico: cada cara aparece exactamente una vez y la elegida cae en topSide. */
export function sideMapFor(topSide: number, faceIndex: number): number[] {
  return Array.from({ length: 6 }, (_, s) => (((faceIndex + s - topSide) % 6) + 6) % 6);
}

/** Mundo nuevo con mesa + dados en reposo (fijos) + dados lanzados. La MISMA secuencia de operaciones siempre. */
export function buildRollWorld(
  R: Rapier,
  plan: Pick<RollPlan, 'throws' | 'resting'>,
): PhysicsWorld {
  const pw = createPhysicsWorld(R);
  for (const r of plan.resting) addRestingDie(pw, r.dieId, r.position, r.rotation);
  for (const t of plan.throws) addDie(pw, t.dieId, t.params);
  return pw;
}

/** Un paso de la tirada: aplica los empujones programados para este índice de paso y avanza. */
export function stepRoll(
  pw: PhysicsWorld,
  plan: Pick<RollPlan, 'nudges'>,
  onContact?: ContactListener,
): void {
  for (const n of plan.nudges) if (n.step === pw.step) nudge(getBody(pw, n.dieId), n.n);
  stepWorld(pw, onContact);
}

export function allSettled(pw: PhysicsWorld, dieIds: number[]): boolean {
  return dieIds.every((id) => isSettled(getBody(pw, id)));
}

export function planRoll(
  R: Rapier,
  dice: DieSpec[],
  resting: RestingDie[],
  visualSeed: number,
  maxSteps = MAX_PLAN_STEPS,
): RollPlan {
  const rng = Rng.fromSeed(visualSeed);
  const throws = dice.map((d, i) => ({
    dieId: d.dieId,
    params: makeThrowParams(rng, i, dice.length),
  }));
  const ids = dice.map((d) => d.dieId);
  const nudges: Nudge[] = [];
  const pw = buildRollWorld(R, { throws, resting });
  let forced = false;
  let settleStep: number;
  for (;;) {
    stepRoll(pw, { nudges });
    if (pw.step >= maxSteps) {
      forced = true;
      settleStep = pw.step;
      break;
    }
    if (pw.step % 5 !== 0 || !allSettled(pw, ids)) continue;
    const cocked = ids.filter(
      (id) => topSide(readTransform(getBody(pw, id)).rotation).dot < COCKED_DOT,
    );
    if (cocked.length === 0) {
      settleStep = pw.step;
      break;
    }
    if (nudges.length >= MAX_NUDGES) {
      forced = true;
      settleStep = pw.step;
      break;
    }
    // Se aplica en el siguiente stepRoll (mismo índice de paso en el replay).
    for (const id of cocked) nudges.push({ step: pw.step, dieId: id, n: nudges.length + 1 });
  }
  const topSides = new Map<number, number>();
  const sideMaps = new Map<number, number[]>();
  for (const d of dice) {
    const { side } = topSide(readTransform(getBody(pw, d.dieId)).rotation);
    topSides.set(d.dieId, side);
    sideMaps.set(d.dieId, sideMapFor(side, d.faceIndex));
  }
  freeWorld(pw);
  return { visualSeed, throws, resting, nudges, settleStep, topSides, sideMaps, forced };
}
