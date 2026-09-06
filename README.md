# Dice Foundry

Juego de estrategia ligero para navegador: lanza dados físicos, cobra oro y puntos, forja caras, compra cartas y dados y cierra objetivos secretos en 8 rondas. Sin backend.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # lint + typecheck + tests
npm run e2e        # Playwright
```

## Simulador de balance

```bash
npm run sim -- --games 2000 --seats magnate,scorer,engineer,casino --rounds 8 --seed 1
```

Escribe `docs/balance/latest.md` (winrates, ítems, builds, umbrales). Los números del juego viven en `src/core/data/*.ts`; cada cambio se anota en `docs/balance/CHANGELOG.md`.

## Documentación

- Reglas: `docs/rules.md`
- Plan de implementación: `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md`
- Decisiones: `docs/DECISIONS.md`
