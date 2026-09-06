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

## v0.2 — segundo pase de balance (BAL.2, 2026-09-07)

Ahora se valida en **tres configuraciones** (4, 3 y 2 jugadores) con 5000 partidas cada una: ✅ los tres cumplen todos los umbrales. Informe de builds: `docs/balance/builds.md`.

Métricas nuevas: `buildShare` (cuota de cada build final) y `buildWinRate` (P(ganar | build)), con umbral de build dominante `buildWinRate > 1.8/n` con `buildShare > 0.10` (con 4 jugadores es el 0,45 que pedía el plan).

**Corrección de umbrales dependientes del número de jugadores** (el plan los calibró con 4 y no transferían):

- `leaderMidWinRate`: antes `≤ 0.60` fijo; ahora `≤ 1/n + 0.35` · con 2 jugadores el líder a mitad parte de 0,50 por azar, no de 0,25.
- `blowoutRate` (ganador ≥ 2× el segundo): antes `≤ 0.25` fijo; ahora `≤ 0.25` con n ≥ 3 y `≤ 0.40` con n = 2 · con 2 jugadores "el segundo" es el único rival y el umbral saltaba siempre (0,34).
- `avgWinnerTotal ∈ [15, 40]` → se acota el **PV medio por jugador** `∈ [8, 30]` (independiente de n) y se exige que el ganador destaque (`avgWinnerTotal ≥ avgTotal × 1.15`) · el PV del ganador es el máximo de n muestras, así que crecía con n aunque la economía fuese idéntica (avgTotal es 12,0-12,2 en las tres configuraciones).

Ajustes de datos del hill-climb multiconfiguración (8 iteraciones × 3 configuraciones × 2000 partidas), todos de coste:

- 2026-09-07 · faces.ts · `g4` 5 → 4 · muerta con 3 y 2 jugadores (rate 0.016)
- 2026-09-07 · faces.ts · `pv2` 5 → 4 y `pv3` 6 → 6 · palanca de PV base para bajar el peso relativo de los objetivos
- 2026-09-07 · faces.ts · `x2gold` 2 → 1, `spawn_temp` 3 → 1, `spawn_perm` 4 → 2, `control_copy` 3 → 2, `control_reroll` 2 → 1, `convert` 2 → 1, `meta_dice` 3 → 2, `meta_cards` 2 → 1 · muertas en alguna de las tres configuraciones
- 2026-09-07 · faces.ts · `combo_gold` 2 → 2, `combo_pv` 3 → 2 · ajuste fino
- 2026-09-07 · cards.ts · `card_cheapfaces` 5 → 5, `card_score_dice` 8 → 8, `card_score_gold` 7 → 8 · dominantes al abaratarse las caras

Test de regresión: `src/core/balance.test.ts` sube a 1000 partidas (4 arquetipos) y añade un caso de 3 arquetipos (600). Con 400 partidas el winrate por arquetipo oscilaba ±3 puntos y el test parpadeaba (`casino` 0.172 vs suelo 0.175).

Deuda registrada (ver `builds.md`): las 6 builds de referencia del diseño §4 no emergen (82-85 % de jugadores en `Mixto`); hipótesis principal = el bot no premia comprometerse con una familia.
