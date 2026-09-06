# Dice Foundry — instrucciones para Claude Code

Juego de dados estratégico web (Vite + TS + Three.js + Rapier). Plan maestro:
`docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md`. Reglas: `docs/rules.md`.
Kanban: `D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry/Kanban.md` (nunca mover a Done).

## Arquitectura (regla dura)

- `src/core/` es TypeScript puro: sin three, sin rapier, sin DOM, sin `Math.random`. Todo azar vía `Rng`.
- `src/physics/` (Rapier) no conoce three ni la UI. `src/render/` (three) no muta el estado del juego.
- `src/app/GameController.ts` es el ÚNICO sitio donde core, physics, render, ui y audio se tocan.
- Todo texto visible sale de `src/ui/strings.es.ts`.
- La simulación decide el resultado; la física solo lo representa (`src/physics/preroll.ts`).

## Comandos

- `npm run check` — gate obligatorio antes de cada commit (lint + typecheck + test).
- `npm run e2e` — Playwright sobre `vite preview` (build previo automático).
- `npm run sim -- --games 2000` — simulador de balance → `docs/balance/latest.md`.
- `npm run dev` — servidor local; `npm run deploy` — Vercel producción.

## Convenciones

- Commits: Conventional Commits en español con el código Kanban como scope: `feat(CORE.3): …`. Sin Co-Authored-By.
- Los números de balance SOLO cambian en `src/core/data/*.ts` y se registran en `docs/balance/CHANGELOG.md`.
- Desviaciones del plan → `docs/DECISIONS.md` con fecha y motivo.
