import { type DieMesh } from '../render/dieMesh';
import { createLoop, type LoopHandle } from '../render/loop';
import type { SceneCtx } from '../render/scene';
import { type Transform, getBody, readTransform, topSide } from '../physics/dieBody';
import {
  type DieSpec,
  type RestingDie,
  type RollPlan,
  buildRollWorld,
  planRoll,
  stepRoll,
} from '../physics/preroll';
import { type ContactListener, type PhysicsWorld, type Rapier, freeWorld } from '../physics/world';

export interface RollOutcome {
  transforms: Map<number, Transform>;
  topSides: Map<number, number>;
  /** Dados cuyo lado superior real no coincidió con el plan (se corrigió el sideMap). */
  mismatches: number;
  forced: boolean;
}

/** Ejecuta una tirada en pantalla: planRoll → mundo nuevo → bucle fijo → reposo → verificación. */
export class RollRunner {
  private loop: LoopHandle | null = null;
  private pw: PhysicsWorld | null = null;

  constructor(
    private readonly R: Rapier,
    private readonly ctx: SceneCtx,
    private readonly meshes: Map<number, DieMesh>,
    private readonly opts: { onContact?: ContactListener } = {},
  ) {}

  roll(
    dice: DieSpec[],
    resting: RestingDie[],
    visualSeed: number,
    speed = 1,
  ): Promise<RollOutcome> {
    this.cancel();
    const plan = planRoll(this.R, dice, resting, visualSeed);
    for (const d of dice) {
      this.meshes.get(d.dieId)?.applySideMap(plan.sideMaps.get(d.dieId) ?? [0, 1, 2, 3, 4, 5]);
    }
    for (const m of this.meshes.values()) m.highlight(null);
    const pw = buildRollWorld(this.R, plan);
    this.pw = pw;
    const ids = dice.map((d) => d.dieId);
    return new Promise<RollOutcome>((resolve) => {
      const finish = (): void => {
        this.loop?.stop();
        const outcome = this.verify(pw, plan, dice);
        // Los dados quedan donde están; el siguiente roll crea otro mundo.
        freeWorld(pw);
        this.pw = null;
        this.loop = null;
        resolve(outcome);
      };
      this.loop = createLoop({
        step: () => {
          if (pw.step >= plan.settleStep) return;
          stepRoll(pw, plan, this.opts.onContact);
          for (const id of ids) this.meshes.get(id)?.syncFrom(readTransform(getBody(pw, id)));
        },
        render: () => {
          this.ctx.render();
          if (pw.step >= plan.settleStep) finish();
        },
      });
      this.loop.setSpeed(speed);
      this.loop.start();
    });
  }

  private verify(pw: PhysicsWorld, plan: RollPlan, dice: DieSpec[]): RollOutcome {
    const transforms = new Map<number, Transform>();
    const topSides = new Map<number, number>();
    let mismatches = 0;
    for (const d of dice) {
      const t = readTransform(getBody(pw, d.dieId));
      transforms.set(d.dieId, t);
      const { side } = topSide(t.rotation);
      topSides.set(d.dieId, side);
      const mesh = this.meshes.get(d.dieId);
      if (side !== plan.topSides.get(d.dieId)) {
        // Salvaguarda: el resultado del juego NO cambia; se repinta para que la cara decidida quede arriba.
        mismatches++;
        mesh?.applySideMap(
          Array.from({ length: 6 }, (_, s) => (((d.faceIndex + s - side) % 6) + 6) % 6),
        );
      }
      mesh?.syncFrom(t);
      mesh?.highlight(side);
    }
    this.ctx.render();
    return { transforms, topSides, mismatches, forced: plan.forced };
  }

  cancel(): void {
    this.loop?.stop();
    this.loop = null;
    if (this.pw) {
      freeWorld(this.pw);
      this.pw = null;
    }
  }
}
