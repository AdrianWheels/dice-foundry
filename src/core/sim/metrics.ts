import { CARD_IDS } from '../data/cards';
import { BUYABLE_FACE_IDS } from '../data/faces';
import type { BotArchetype } from '../types';
import { type BuildLabel, type GameSummary, playGame } from './simulate';

export interface BatchOptions {
  games: number;
  archetypes: BotArchetype[];
  rounds: number;
  seed: number;
}

export interface ItemStat {
  offered: number;
  bought: number;
  rate: number;
  winRateWhenBought: number;
}

export interface BatchMetrics {
  games: number;
  rounds: number;
  archetypes: BotArchetype[];
  winRateByArchetype: Record<string, number>;
  winRateBySeat: number[];
  avgWinnerTotal: number;
  avgTotal: number;
  avgGoldLeft: number;
  avgDice: number;
  /** P(ganador = líder al cerrar la ronda floor(rounds/2)). */
  leaderMidWinRate: number;
  /** Fracción de partidas con ganador ≥ 2× el segundo. */
  blowoutRate: number;
  itemStats: Record<string, ItemStat>;
  buildDistribution: Record<BuildLabel, number>;
  /** Fracción de jugadores que acaba con esa build. */
  buildShare: Record<BuildLabel, number>;
  /** P(ganar | build). Con n arquetipos, la referencia neutra es 1/n. */
  buildWinRate: Record<BuildLabel, number>;
  objectiveRate: number;
}

const BUILDS: BuildLabel[] = [
  'Ingeniero',
  'Casino',
  'Combo',
  'Coleccionista',
  'Puntuador',
  'Magnate',
  'Mixto',
];

export function runBatch(opts: BatchOptions): BatchMetrics {
  const n = opts.archetypes.length;
  if (n < 2 || n > 4) throw new RangeError('Entre 2 y 4 arquetipos');
  const winByArch: Record<string, number> = {};
  const winBySeat = Array<number>(n).fill(0);
  const itemOffered: Record<string, number> = {};
  const itemBought: Record<string, number> = {};
  const itemGamesBought: Record<string, number> = {};
  const itemWins: Record<string, number> = {};
  const builds = Object.fromEntries(BUILDS.map((b) => [b, 0])) as Record<BuildLabel, number>;
  const buildWins = Object.fromEntries(BUILDS.map((b) => [b, 0])) as Record<BuildLabel, number>;
  let winnerTotal = 0;
  let total = 0;
  let goldLeft = 0;
  let dice = 0;
  let leaderMid = 0;
  let blowouts = 0;
  let objectives = 0;
  const midRound = Math.max(1, Math.floor(opts.rounds / 2));

  for (let g = 0; g < opts.games; g++) {
    // Rotar arquetipos por asiento separa "arquetipo" de "orden de turno".
    const seats = Array.from({ length: n }, (_, j) => {
      const arch = opts.archetypes[(j + g) % n] as BotArchetype;
      return { name: `${arch}-${j}`, kind: 'bot' as const, archetype: arch };
    });
    const game: GameSummary = playGame({
      seats,
      rounds: opts.rounds,
      seed: opts.seed * 1_000_003 + g,
    });
    const share = 1 / game.winners.length;
    for (const w of game.winners) {
      const arch = seats[w]?.archetype ?? 'balanced';
      winByArch[arch] = (winByArch[arch] ?? 0) + share;
      winBySeat[w] = (winBySeat[w] ?? 0) + share;
    }
    const sorted = [...game.scores].sort((a, b) => b.total - a.total);
    const first = sorted[0]?.total ?? 0;
    const second = sorted[1]?.total ?? 0;
    winnerTotal += first;
    if (first >= 2 * second && first > 0) blowouts++;
    for (const s of game.scores) {
      total += s.total;
      goldLeft += s.gold;
      if (s.objectiveAchieved) objectives++;
    }
    for (const d of game.diceAtEnd) dice += d;
    const mid = game.leaderByRound[midRound - 1];
    if (mid !== undefined && game.winners.includes(mid)) leaderMid++;
    for (const [id, c] of Object.entries(game.offered)) {
      itemOffered[id] = (itemOffered[id] ?? 0) + c;
    }
    for (const [id, c] of Object.entries(game.bought)) {
      itemBought[id] = (itemBought[id] ?? 0) + c;
    }
    // "Gana cuando se compra": partidas en las que algún comprador del ítem ganó / partidas en las que se compró.
    for (const [id, seats2] of Object.entries(game.boughtBy)) {
      itemGamesBought[id] = (itemGamesBought[id] ?? 0) + 1;
      if (seats2.some((seat) => game.winners.includes(seat))) {
        itemWins[id] = (itemWins[id] ?? 0) + 1;
      }
    }
    game.builds.forEach((b, seat) => {
      builds[b]++;
      if (game.winners.includes(seat)) buildWins[b] += share;
    });
  }

  const players = opts.games * n;
  const itemIds = [
    ...BUYABLE_FACE_IDS.map((f) => `face:${f}`),
    ...CARD_IDS.map((c) => `card:${c}`),
    'die',
  ];
  const itemStats: Record<string, ItemStat> = {};
  for (const id of itemIds) {
    const offered = id === 'die' ? opts.games * n * opts.rounds : (itemOffered[id] ?? 0);
    const bought = itemBought[id] ?? 0;
    const gamesBought = itemGamesBought[id] ?? 0;
    itemStats[id] = {
      offered,
      bought,
      rate: offered > 0 ? bought / offered : 0,
      winRateWhenBought: gamesBought > 0 ? (itemWins[id] ?? 0) / gamesBought : 0,
    };
  }
  const norm = (rec: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v / opts.games]));

  return {
    games: opts.games,
    rounds: opts.rounds,
    archetypes: opts.archetypes,
    winRateByArchetype: norm(winByArch),
    winRateBySeat: winBySeat.map((v) => v / opts.games),
    avgWinnerTotal: winnerTotal / opts.games,
    avgTotal: total / players,
    avgGoldLeft: goldLeft / players,
    avgDice: dice / players,
    leaderMidWinRate: leaderMid / opts.games,
    blowoutRate: blowouts / opts.games,
    itemStats,
    buildDistribution: builds,
    buildShare: Object.fromEntries(BUILDS.map((b) => [b, builds[b] / players])) as Record<
      BuildLabel,
      number
    >,
    buildWinRate: Object.fromEntries(
      BUILDS.map((b) => [b, builds[b] > 0 ? buildWins[b] / builds[b] : 0]),
    ) as Record<BuildLabel, number>,
    objectiveRate: objectives / players,
  };
}

export function checkThresholds(m: BatchMetrics): { ok: boolean; failures: string[] } {
  const f: string[] = [];
  const n = m.archetypes.length;
  for (const a of m.archetypes) {
    const r = m.winRateByArchetype[a] ?? 0;
    if (r < 0.7 / n || r > 1.3 / n) {
      f.push(
        `winrate ${a} = ${r.toFixed(3)} fuera de [${(0.7 / n).toFixed(3)}, ${(1.3 / n).toFixed(3)}]`,
      );
    }
  }
  const seatSpread = Math.max(...m.winRateBySeat) - Math.min(...m.winRateBySeat);
  if (seatSpread > 0.1) f.push(`ventaja por asiento = ${seatSpread.toFixed(3)} > 0.10`);
  // El líder a mitad de partida parte de 1/n por puro azar: el umbral es relativo.
  const leaderCap = 1 / n + 0.35;
  if (m.leaderMidWinRate > leaderCap) {
    f.push(
      `líder a mitad gana ${m.leaderMidWinRate.toFixed(3)} > ${leaderCap.toFixed(2)} (snowball)`,
    );
  }
  // "Ganador ≥ 2× el segundo": con 2 jugadores el segundo es el único rival y salta mucho más.
  const blowCap = n >= 3 ? 0.25 : 0.4;
  if (m.blowoutRate > blowCap) {
    f.push(`blowouts ${m.blowoutRate.toFixed(3)} > ${blowCap.toFixed(2)}`);
  }
  for (const [id, s] of Object.entries(m.itemStats)) {
    if (id === 'die' || s.offered < 30) continue;
    if (s.rate < 0.03) f.push(`ítem muerto ${id}: rate ${s.rate.toFixed(3)} < 0.03`);
    if (s.rate > 0.6) f.push(`ítem dominante ${id}: rate ${s.rate.toFixed(3)} > 0.60`);
  }
  // El PV del ganador es el máximo de n jugadores, así que crece con n aunque la economía no
  // cambie: se acota el PV MEDIO (independiente de n) y se exige que el ganador destaque.
  if (m.avgTotal < 8 || m.avgTotal > 30) {
    f.push(`PV medio por jugador ${m.avgTotal.toFixed(1)} fuera de [8, 30]`);
  }
  if (m.avgWinnerTotal > 40) {
    f.push(`PV medio del ganador ${m.avgWinnerTotal.toFixed(1)} > 40`);
  }
  if (m.avgWinnerTotal < m.avgTotal * 1.15) {
    f.push(
      `el ganador no destaca: ${m.avgWinnerTotal.toFixed(1)} < ${(m.avgTotal * 1.15).toFixed(1)}`,
    );
  }
  if (m.avgDice < 2.5 || m.avgDice > 6) {
    f.push(`dados medios ${m.avgDice.toFixed(2)} fuera de [2.5, 6]`);
  }
  const buildCap = 1.8 / n;
  for (const [b, share] of Object.entries(m.buildShare)) {
    if (share <= 0.1) continue;
    const wr = m.buildWinRate[b as BuildLabel] ?? 0;
    if (wr > buildCap) {
      f.push(
        `build dominante ${b}: gana ${wr.toFixed(3)} > ${buildCap.toFixed(3)} con cuota ${share.toFixed(2)}`,
      );
    }
  }
  return { ok: f.length === 0, failures: f };
}

export function renderMarkdown(m: BatchMetrics): string {
  const pct = (v: number): string => `${(v * 100).toFixed(1)} %`;
  const lines: string[] = [];
  lines.push(
    `# Informe de balance — ${m.games} partidas · ${m.rounds} rondas · ${m.archetypes.join(', ')}`,
    '',
  );
  lines.push(
    '## Resumen',
    '',
    `- PV medio del ganador: ${m.avgWinnerTotal.toFixed(1)} · PV medio: ${m.avgTotal.toFixed(1)} · oro sobrante medio: ${m.avgGoldLeft.toFixed(1)} · dados medios: ${m.avgDice.toFixed(2)}`,
  );
  lines.push(
    `- Líder a mitad gana: ${pct(m.leaderMidWinRate)} · blowouts: ${pct(m.blowoutRate)} · objetivos cumplidos: ${pct(m.objectiveRate)}`,
    '',
  );
  lines.push('## Victorias por arquetipo', '', '| Arquetipo | Winrate |', '|---|---|');
  for (const a of m.archetypes) lines.push(`| ${a} | ${pct(m.winRateByArchetype[a] ?? 0)} |`);
  lines.push('', '## Victorias por asiento', '', '| Asiento | Winrate |', '|---|---|');
  m.winRateBySeat.forEach((v, i) => lines.push(`| ${i} | ${pct(v)} |`));
  lines.push(
    '',
    '## Ítems',
    '',
    '| Ítem | Ofrecido | Comprado | Tasa | Gana cuando se compra |',
    '|---|---|---|---|---|',
  );
  for (const [id, s] of Object.entries(m.itemStats).sort((a, b) => b[1].rate - a[1].rate)) {
    lines.push(
      `| ${id} | ${s.offered} | ${s.bought} | ${pct(s.rate)} | ${pct(s.winRateWhenBought)} |`,
    );
  }
  lines.push('', '## Builds', '', '| Build | Jugadores | Cuota | Gana |', '|---|---|---|---|');
  for (const [b, c] of Object.entries(m.buildDistribution)) {
    lines.push(
      `| ${b} | ${c} | ${pct(m.buildShare[b as BuildLabel] ?? 0)} | ${pct(m.buildWinRate[b as BuildLabel] ?? 0)} |`,
    );
  }
  const t = checkThresholds(m);
  lines.push(
    '',
    '## Umbrales',
    '',
    t.ok ? '✅ Todos los umbrales cumplidos.' : `❌ ${t.failures.length} fallos:`,
    '',
  );
  for (const x of t.failures) lines.push(`- ${x}`);
  lines.push('');
  return lines.join('\n');
}
