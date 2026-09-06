# Changelog de balance

Cada entrada: fecha · fichero de datos · cambio (antes → después) · métrica que lo motivó (del informe `latest.md`).

## v0.1 (valores iniciales del plan, 2026-09-06)

Punto de partida del plan. Informe base (2000 partidas, semilla 1): PV medio del ganador 11.2, 7 ítems muertos.

## v0.1.1 — primer pase de balance (BAL.1, 2026-09-06)

Informe final: `docs/balance/latest.md` (2000 partidas, semilla 1) — ✅ todos los umbrales; verificado también con semillas 2, 11 y 12 (1000 partidas cada una).

Caras muertas (`rate < 0.03`): el bot nunca las valoraba por encima de su precio, así que baja el coste.

- 2026-09-06 · faces.ts · `pv3.cost` 8 → 6 · rate 0.025 < 0.03
- 2026-09-06 · faces.ts · `x2gold.cost` 6 → 2 · rate 0.001 (la más muerta del catálogo)
- 2026-09-06 · faces.ts · `combo_gold.cost` 4 → 2 · rate 0.013
- 2026-09-06 · faces.ts · `combo_pv.cost` 5 → 3 · rate 0.010
- 2026-09-06 · faces.ts · `spawn_temp.cost` 4 → 3 · rate 0.012
- 2026-09-06 · faces.ts · `spawn_perm.cost` 7 → 4 · rate 0.002
- 2026-09-06 · faces.ts · `control_copy.cost` 6 → 3 · rate 0.002
- 2026-09-06 · faces.ts · `control_reroll.cost` 3 → 2 · rate 0.014
- 2026-09-06 · faces.ts · `convert.cost` 4 → 2 · rate 0.012
- 2026-09-06 · faces.ts · `meta_dice.cost` 5 → 3 · rate 0.010
- 2026-09-06 · faces.ts · `meta_cards.cost` 3 → 2 · rate 0.024
- 2026-09-06 · cards.ts · `card_cheapfaces.cost` 6 → 5 · rate 0.029

PV medio del ganador 11.2 < 15 (umbral). Se sube el PV de **final de partida** en vez de inflar las caras: mantiene intactas las ganancias por tirada del documento de diseño y premia la estrategia larga.

- 2026-09-06 · objectives.ts · PV de los 8 objetivos +4 (5 → 9 y 6 → 10) · PV medio del ganador 11.2 → 15.9; cumplidos el 69 % de las partidas
- 2026-09-06 · cards.ts · `card_score_dice` pv 2 → 3 y coste 6 → 8 · al subir su valor pasó a dominante (rate 0.38 > 0.20)
- 2026-09-06 · cards.ts · `card_score_gold` `every` 4 → 3 y coste 5 → 7 · dominante (rate 0.45); convierte el oro acumulado (≈ 10 por jugador) en puntos

Método: hill-climb determinista (subir coste si `rate > 0.20`, bajarlo si `rate < 0.03`, palanca global de objetivos si el PV del ganador se sale del rango), 4 iteraciones de 2000 partidas. No se tocó `economy.ts` ni `ARCHETYPE_WEIGHTS`.
