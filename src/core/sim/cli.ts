import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import type { BotArchetype } from '../types';
import { renderMarkdown, runBatch } from './metrics';

const ARCHS = new Set(['magnate', 'scorer', 'engineer', 'casino', 'balanced']);

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '2000' },
    seats: { type: 'string', default: 'magnate,scorer,engineer,casino' },
    rounds: { type: 'string', default: '8' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'docs/balance/latest.md' },
  },
});

const archetypes = String(values.seats)
  .split(',')
  .map((s) => s.trim());
for (const a of archetypes) if (!ARCHS.has(a)) throw new Error(`Arquetipo desconocido: ${a}`);

const started = Date.now();
const metrics = runBatch({
  games: Number(values.games),
  archetypes: archetypes as BotArchetype[],
  rounds: Number(values.rounds),
  seed: Number(values.seed),
});
const md = renderMarkdown(metrics);
const out = String(values.out);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(md);
console.log(`Escrito ${out} en ${((Date.now() - started) / 1000).toFixed(1)} s`);
