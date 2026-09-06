import { card } from './data/cards';
import { STARTER_FACES, face } from './data/faces';
import { createDie, faceOf, replaceFace } from './dice';
import type { RandomSource } from './rng';
import type { DieFaces, FaceDef, PlayerState, RollEvent, RollResolution, RolledDie } from './types';

export const MULTIPLIER_CAP = 4;

export interface ResolveInput {
  player: PlayerState;
  rolled: RolledDie[];
  nextDieId: number;
}
export interface ResolveOutput {
  player: PlayerState;
  nextDieId: number;
  resolution: RollResolution;
}

interface Slot {
  dieId: number;
  faceIndex: number;
  /** Cara efectiva (tras Espejo). */
  face: FaceDef;
  original: FaceDef;
}

function gainValue(f: FaceDef): number {
  return f.effect.kind === 'gain' ? (f.effect.pv ?? 0) * 3 + (f.effect.gold ?? 0) : -1;
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    cards: [...p.cards],
    dice: p.dice.map((d) => ({ ...d, faces: [...d.faces] as DieFaces })),
  };
}

export function hasFreeRerollFace(player: PlayerState, rolled: RolledDie[]): boolean {
  return rolled.some((r) => {
    const d = player.dice.find((x) => x.id === r.dieId);
    if (!d) return false;
    const e = faceOf(d, r.faceIndex).effect;
    return e.kind === 'control' && e.mode === 'freeReroll';
  });
}

export function resolveRoll(input: ResolveInput, rng: RandomSource): ResolveOutput {
  const events: RollEvent[] = [];
  let player = clonePlayer(input.player);
  let nextDieId = input.nextDieId;
  const permanentDice = player.dice.filter((d) => !d.temporary).length;

  const slots: Slot[] = input.rolled.map((r) => {
    const d = player.dice.find((x) => x.id === r.dieId);
    if (!d) throw new Error(`El dado ${r.dieId} no pertenece al jugador`);
    const f = faceOf(d, r.faceIndex);
    return { dieId: r.dieId, faceIndex: r.faceIndex, face: f, original: f };
  });

  // 1. Espejo
  for (const s of slots) {
    const e = s.original.effect;
    if (e.kind !== 'control' || e.mode !== 'copyBest') continue;
    let best: Slot | null = null;
    for (const o of slots) {
      if (o === s || o.original.effect.kind !== 'gain') continue;
      if (!best || gainValue(o.original) > gainValue(best.original)) best = o;
    }
    s.face = best ? best.original : face('blank');
    events.push({
      step: 'control',
      dieId: s.dieId,
      faceId: s.original.id,
      gold: 0,
      pv: 0,
      textKey: best ? 'ev.mirror' : 'ev.mirrorNone',
      params: { copied: s.face.name },
    });
  }

  // 2. Ganancias base
  let gold = 0;
  let pv = 0;
  for (const s of slots) {
    const e = s.face.effect;
    if (e.kind === 'gain') {
      gold += e.gold ?? 0;
      pv += e.pv ?? 0;
      events.push({
        step: 'gain',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: e.gold ?? 0,
        pv: e.pv ?? 0,
        textKey: 'ev.gain',
      });
    } else if (e.kind === 'risk') {
      const hit = rng.chance(e.chance);
      const g = hit ? (e.gold ?? 0) : 0;
      const p = hit ? (e.pv ?? 0) : 0;
      gold += g;
      pv += p;
      events.push({
        step: 'risk',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: g,
        pv: p,
        textKey: hit ? 'ev.riskHit' : 'ev.riskMiss',
      });
    } else if (e.kind === 'scaling') {
      const n = e.per === 'dice' ? permanentDice : player.cards.length;
      const times = Math.floor(n / e.every);
      const g = (e.gold ?? 0) * times;
      const p = (e.pv ?? 0) * times;
      gold += g;
      pv += p;
      events.push({
        step: 'scaling',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: g,
        pv: p,
        textKey: 'ev.scaling',
        params: { n },
      });
    } else if (e.kind === 'combo') {
      const ok = slots.some((o) => o !== s && o.face.family === e.requires);
      const g = ok ? (e.gold ?? 0) : 0;
      const p = ok ? (e.pv ?? 0) : 0;
      gold += g;
      pv += p;
      events.push({
        step: 'combo',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: g,
        pv: p,
        textKey: ok ? 'ev.comboHit' : 'ev.comboMiss',
      });
    }
  }

  // 3. Multiplicadores (solo sobre el oro base)
  const mults = slots.filter((s) => s.face.effect.kind === 'multiplier');
  if (mults.length > 0 && gold > 0) {
    let factor = 1;
    for (const m of mults) if (m.face.effect.kind === 'multiplier') factor *= m.face.effect.factor;
    factor = Math.min(MULTIPLIER_CAP, factor);
    const before = gold;
    gold = gold * factor;
    const first = mults[0] as Slot;
    events.push({
      step: 'multiplier',
      dieId: first.dieId,
      faceId: first.face.id,
      gold: gold - before,
      pv: 0,
      textKey: 'ev.multiplier',
      params: { factor },
    });
  }

  // 4. Cartas pasivas de tirada
  for (const cardId of player.cards) {
    const e = card(cardId).effect;
    if (e.kind === 'rollBonus' && (e.minDice === undefined || slots.length >= e.minDice)) {
      gold += e.gold;
      events.push({ step: 'card', cardId, gold: e.gold, pv: 0, textKey: 'ev.cardBonus' });
    }
  }

  // 5. Abonar
  player = { ...player, gold: player.gold + gold, pv: player.pv + pv };

  // 6. Conversión
  for (const s of slots) {
    const e = s.face.effect;
    if (e.kind !== 'convert') continue;
    if (player.gold >= e.amount) {
      player = { ...player, gold: player.gold - e.amount, pv: player.pv + e.yield };
      gold -= e.amount;
      pv += e.yield;
      events.push({
        step: 'convert',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: -e.amount,
        pv: e.yield,
        textKey: 'ev.convert',
      });
    } else {
      events.push({
        step: 'convert',
        dieId: s.dieId,
        faceId: s.face.id,
        gold: 0,
        pv: 0,
        textKey: 'ev.convertFail',
      });
    }
  }

  // 7. Generadores
  for (const s of slots) {
    const e = s.face.effect;
    if (e.kind !== 'spawn') continue;
    const newDie = createDie(nextDieId++, STARTER_FACES, !e.permanent);
    let dice = [...player.dice, newDie];
    if (e.permanent) {
      dice = dice.map((d) => (d.id === s.dieId ? replaceFace(d, s.faceIndex, 'blank') : d));
    }
    player = { ...player, dice };
    events.push({
      step: 'spawn',
      dieId: s.dieId,
      faceId: s.face.id,
      gold: 0,
      pv: 0,
      textKey: e.permanent ? 'ev.spawnPerm' : 'ev.spawnTemp',
      params: { newDieId: newDie.id },
    });
  }

  return { player, nextDieId, resolution: { gold, pv, events } };
}
