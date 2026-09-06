export const S = {
  app: { title: 'Dice Foundry', tagline: 'Lanza. Cobra. Forja. Repite.' },
  menu: {
    title: 'Nueva partida',
    players: 'Jugadores',
    seat: 'Asiento {n}',
    human: 'Humano',
    archetype: {
      magnate: 'Bot · Magnate',
      scorer: 'Bot · Puntuador',
      engineer: 'Bot · Ingeniero',
      casino: 'Bot · Casino',
      balanced: 'Bot · Equilibrado',
    },
    rounds: 'Rondas',
    seed: 'Semilla (opcional)',
    start: 'Jugar',
    resume: 'Reanudar partida',
    settings: 'Ajustes',
    howto: 'Cómo se juega',
    howtoText:
      'Cada turno lanzas todos tus dados y cobras lo que muestran. Con el oro compras caras nuevas (y las forjas en un dado), cartas o más dados. Gana quien tenga más PV al acabar las rondas. Tu objetivo secreto da PV extra.',
  },
  hud: {
    round: 'Ronda {round} / {rounds}',
    turn: 'Turno de {name}',
    gold: 'Oro',
    pv: 'PV',
    dice: 'Dados',
    you: 'Tú',
  },
  roll: {
    roll: 'Lanzar dados',
    rolling: 'Lanzando…',
    reroll: 'Relanzar dado {id} ({cost} oro)',
    rerollFree: 'Relanzar dado {id} (gratis)',
    pass: 'Continuar',
    botTurn: '{name} está jugando…',
    summary: 'Esta tirada: {delta}',
  },
  shop: {
    title: 'Tienda',
    face: 'Cara',
    card: 'Carta',
    price: '{n} oro',
    buy: 'Comprar',
    buyDie: 'Comprar dado ({n} oro)',
    purchasesLeft: 'Compras restantes: {n}',
    endTurn: 'Terminar turno',
    empty: 'Vendido',
    cantAfford: 'Sin oro suficiente',
  },
  forge: {
    title: 'Forjar: {name}',
    hint: 'Elige el dado y la cara que quieres sustituir.',
    die: 'Dado {id}',
    cancel: 'Cancelar',
  },
  log: { title: 'Qué ha pasado', empty: 'Todavía no has lanzado.' },
  objective: {
    title: 'Objetivo secreto',
    progress: '{current} / {target}',
    reward: '+{pv} PV al final',
  },
  end: {
    title: 'Fin de la partida',
    winner: 'Gana {name}',
    tie: 'Empate: {names}',
    base: 'PV',
    objective: 'Objetivo',
    cards: 'Cartas',
    total: 'Total',
    achieved: 'cumplido',
    failed: 'no cumplido',
    again: 'Otra partida',
    menu: 'Menú',
  },
  handoff: { title: 'Pasa el dispositivo a {name}', ok: 'Estoy listo' },
  settings: {
    title: 'Ajustes',
    volume: 'Volumen',
    mute: 'Silencio',
    reduceMotion: 'Reducir movimiento',
    botSpeed: 'Velocidad de los bots',
    speed: { normal: 'Normal', fast: 'Rápida', instant: 'Instantánea' },
    close: 'Cerrar',
  },
  hints: {
    roll: 'Pulsa Lanzar: cada dado muestra una cara y cobras lo que dice.',
    shop: 'Compra una cara y fórjala en un dado: así construyes tu build.',
    objective: 'Tu objetivo secreto da PV extra al final. Los rivales no lo ven.',
  },
  families: {
    economy: 'Economía',
    pv: 'Puntos',
    multiplier: 'Multiplicador',
    combo: 'Combo',
    generator: 'Generador',
    risk: 'Riesgo',
    control: 'Control',
    conversion: 'Conversión',
    meta: 'Meta',
    blank: 'Vacía',
  },
  ev: {
    gain: '{face}: {delta}',
    riskHit: '{face}: ¡acierto! {delta}',
    riskMiss: '{face}: fallo, nada',
    scaling: '{face}: {delta} (×{n})',
    comboHit: '{face}: combo, {delta}',
    comboMiss: '{face}: sin combo',
    multiplier: '{face}: oro ×{factor} ({delta})',
    cardBonus: '{card}: {delta}',
    convert: '{face}: 3 oro → 2 PV',
    convertFail: '{face}: sin oro para convertir',
    spawnTemp: '{face}: dado temporal para tu próxima tirada',
    spawnPerm: '{face}: ¡dado nuevo permanente!',
    mirror: '{face}: copia {copied}',
    mirrorNone: '{face}: nada que copiar',
    tax: '{card}: +1 oro para {name}',
  },
} as const;

/** Sustituye {clave} por params[clave]; deja la clave visible si falta (se ve en tests). */
export function fmt(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export function delta(gold: number, pv: number): string {
  const parts: string[] = [];
  if (gold) parts.push(`${gold > 0 ? '+' : ''}${gold} oro`);
  if (pv) parts.push(`${pv > 0 ? '+' : ''}${pv} PV`);
  return parts.join(', ') || '0';
}
