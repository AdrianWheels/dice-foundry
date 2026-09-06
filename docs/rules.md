# Dice Foundry — Reglas v0.1

> Fuente de verdad de reglas y números. Los valores iniciales se ajustan con el simulador (`npm run sim`) y cada cambio se anota en `docs/balance/CHANGELOG.md`. El código en `src/core/` implementa exactamente esto; si difieren, gana este documento y se abre una tarea.

## Reglas del juego v0.1 (fuente de verdad para todas las tareas)

Los números son valores iniciales; la Tarea 11 (simulador) y la Tarea 26 (balance) los ajustan **solo** tocando `src/core/data/*.ts` y registrándolo en `docs/balance/CHANGELOG.md`.

### Partida

- Jugadores: 2–4. Asiento 0 = humano por defecto; los demás, bots (arquetipo) o humanos (hot-seat).
- Rondas: 8 por defecto; configurable 6–8 (los tests e2e usan 2).
- Orden de turno de la ronda `r` (1-based): empieza el jugador `(r - 1) % n` y sigue circularmente. Así el acceso a la tienda rota.
- Estado inicial por jugador: **5 oro, 0 PV**, 2 dados `starter`, 0 cartas, 1 objetivo secreto (repartido sin repetición).
- Dado `starter` (caras índice 0..5): `[g1, g1, g2, g2, pv1, blank]` → EV 1,0 oro + 0,17 PV por dado y tirada.

### Turno (máquina de estados `TurnPhase`)

1. `roll` — se lanzan **todos** los dados del jugador (permanentes + temporales). El resultado de cada dado (`faceIndex` 0..5) lo decide `Rng` de partida; la física solo lo representa.
2. `mitigate` — opcional, **una vez por turno**: relanzar **un** dado por **2 oro** (gratis si en la tirada salió `control_reroll` o si el jugador tiene `card_reroll`). El nuevo resultado también sale de `Rng`. `pass` cierra la fase.
3. `resolve` — aplicar la tirada con el orden de resolución de abajo; produce `RollResolution` (totales + eventos explicables).
4. `shop` — hasta **2 compras** por turno (un dado cuenta como compra). Comprar una cara obliga a **forjarla al instante** (elegir dado propio permanente + lado 0..5 que se sustituye; la cara sustituida se destruye). Comprar dado: el nuevo dado es un `starter`. Comprar carta: efecto permanente desde ese momento. `endTurn` cierra el turno.
5. Cuando el último jugador termina: `endRound` → se rellena la tienda (ver Tienda), `round++`. Si `round > rounds` → `gameOver`.

### Dados temporales

- Un dado temporal se crea en `resolve` (cara `spawn_temp`) y vive exactamente hasta después de la **siguiente** tirada de su dueño: se tira una vez y se elimina en el `resolve` (`pass`) de esa tirada, justo después de aplicar sus efectos. Es un `starter`. No cuenta para precio de dados, objetivos ni forja (no se pueden forjar caras en dados temporales).

### Orden de resolución (`resolveRoll`)

Entrada: lista de `(dieId, faceIndex)` → caras. Salida: `RollResolution { gold, pv, events[] }` y mutaciones de estado. Orden fijo:

1. **Control/Espejo** (`control_copy`): cada Espejo se convierte, solo para esta resolución, en copia de la mejor cara de _otro_ dado de la tirada (mejor = mayor `pv*3 + gold` entre caras `gain`; si no hay, es `blank`).
2. **Ganancias base**: `gain` (economía/PV), `risk` (se resuelve con `Rng`: con probabilidad `chance` paga, si no 0), `scaling` (meta: valor × cantidad), `combo` (paga si _otro_ dado de esta tirada muestra la familia requerida, evaluado sobre las caras tras el paso 1).
3. **Multiplicadores**: cada `multiplier` duplica el **subtotal de oro** del paso 2 (dos multiplicadores → ×4; tope ×4).
4. **Cartas pasivas de tirada**: `card_income` +1 oro; `card_bigroll` +1 oro si se tiraron ≥ 3 dados.
5. **Abonar** oro y PV al jugador.
6. **Conversión** (`convert`, Alquimia): por cada Alquimia en la tirada, si `gold ≥ 3` → `gold -= 3`, `pv += 2` (automática; si no se puede pagar, no hace nada).
7. **Generadores**: `spawn_temp` crea un dado temporal; `spawn_perm` crea un dado permanente y la cara pasa a ser `blank` (se consume).
8. **Interacción**: `card_tax` de _otros_ jugadores no se dispara aquí (se dispara al comprar dados, ver Tienda).
   Cada paso añade `RollEvent { dieId?, faceId?, cardId?, gold, pv, textKey }` para el log "Qué ha pasado".

### Tienda

- 5 slots visibles (caras y cartas mezcladas) + acción permanente **Comprar dado**.
- Mazo: cada cara comprable ×3 copias, cada carta ×2 copias → 16×3 + 8×2 = **64 ítems**, barajado con `Rng` al inicio. Slot comprado queda **vacío hasta fin de ronda** (competencia: la opción puede desaparecer antes de tu turno).
- `endRound`: (1) descartar el slot ocupado más antiguo y (2) rellenar todos los vacíos robando del mazo. Mazo vacío → rebarajar descartes con `Rng`.
- Precio cara = `cost` (−1 con `card_cheapfaces`, mínimo 1). Precio carta = `cost`. Precio dado = `8 + 4 × (dadosPermanentes − 2)` (−3 con `card_cheapdice`, mínimo 3).
- Cuando un jugador compra un dado, cada _otro_ jugador con `card_tax` gana 1 oro (evento).
- Un ítem que el jugador no puede pagar sigue visible pero deshabilitado.

### Fin de partida

- PV final = PV acumulados + objetivo secreto cumplido + cartas de puntuación (`card_score_dice`: +2 PV por dado permanente a partir del 3.º; `card_score_gold`: +1 PV por cada 4 oro restantes).
- Gana el mayor PV final; empate → más oro; si persiste → empate compartido. Se revelan los objetivos de todos en la pantalla final.

### Mitigación del azar (doc §9.5)

- El reroll pagado de la fase `mitigate` es la válvula principal. Ninguna cara puede dar más de 8 PV en una tirada. El mazo garantiza que las caras `control_*` existan (3 copias cada una).

---

## Catálogos de datos (valores iniciales v0.1)

Definidos como datos en `src/core/data/faces.ts`, `cards.ts`, `objectives.ts`. Familias: `economy | pv | multiplier | combo | generator | risk | control | conversion | meta | blank`.

### Caras (`FaceDef`)

| id               | familia    | nombre              | descripción (es)                                         | coste            | efecto                                                      |
| ---------------- | ---------- | ------------------- | -------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `blank`          | blank      | Cara vacía          | No hace nada.                                            | — (no comprable) | `{kind:'blank'}`                                            |
| `g1`             | economy    | Moneda              | +1 oro.                                                  | —                | `{kind:'gain', gold:1}`                                     |
| `g2`             | economy    | Dos monedas         | +2 oro.                                                  | —                | `{kind:'gain', gold:2}`                                     |
| `pv1`            | pv         | Laurel              | +1 PV.                                                   | —                | `{kind:'gain', pv:1}`                                       |
| `g3`             | economy    | Bolsa               | +3 oro.                                                  | 3                | `{kind:'gain', gold:3}`                                     |
| `g4`             | economy    | Cofre               | +4 oro.                                                  | 4                | `{kind:'gain', gold:4}`                                     |
| `pv2`            | pv         | Corona              | +2 PV.                                                   | 4                | `{kind:'gain', pv:2}`                                       |
| `pv3`            | pv         | Trono               | +3 PV.                                                   | 6                | `{kind:'gain', pv:3}`                                       |
| `x2gold`         | multiplier | Forja ardiente      | Duplica el oro de esta tirada.                           | 1                | `{kind:'multiplier', resource:'gold', factor:2}`            |
| `combo_gold`     | combo      | Eco dorado          | +3 oro si otro dado muestra Economía.                    | 2                | `{kind:'combo', requires:'economy', gold:3}`                |
| `combo_pv`       | combo      | Resonancia          | +2 PV si otro dado muestra PV.                           | 2                | `{kind:'combo', requires:'pv', pv:2}`                       |
| `spawn_temp`     | generator  | Chispa              | Añade un dado temporal para tu próxima tirada.           | 1                | `{kind:'spawn', permanent:false}`                           |
| `spawn_perm`     | generator  | Semilla             | Añade un dado permanente. Después esta cara queda vacía. | 2                | `{kind:'spawn', permanent:true}`                            |
| `risk_gold`      | risk       | Apuesta             | 50 %: +6 oro. Si no, nada.                               | 4                | `{kind:'risk', chance:0.5, gold:6}`                         |
| `risk_pv`        | risk       | Todo o nada         | 25 %: +8 PV. Si no, nada.                                | 6                | `{kind:'risk', chance:0.25, pv:8}`                          |
| `control_copy`   | control    | Espejo              | Copia la mejor cara de otro dado.                        | 2                | `{kind:'control', mode:'copyBest'}`                         |
| `control_reroll` | control    | Segunda oportunidad | El relanzamiento de este turno es gratis.                | 1                | `{kind:'control', mode:'freeReroll'}`                       |
| `convert`        | conversion | Alquimia            | Convierte 3 oro en 2 PV automáticamente.                 | 1                | `{kind:'convert', from:'gold', amount:3, to:'pv', yield:2}` |
| `meta_dice`      | meta       | Legado              | +1 PV por cada 2 dados permanentes.                      | 2                | `{kind:'scaling', per:'dice', every:2, pv:1}`               |
| `meta_cards`     | meta       | Tesorero            | +1 oro por cada carta que tengas.                        | 1                | `{kind:'scaling', per:'cards', every:1, gold:1}`            |

Caras comprables: 16 (todas menos `blank`, `g1`, `g2`, `pv1`).

### Cartas (`CardDef`)

| id                | tipo        | nombre               | descripción (es)                                    | coste | efecto                                         |
| ----------------- | ----------- | -------------------- | --------------------------------------------------- | ----- | ---------------------------------------------- |
| `card_income`     | economy     | Mina                 | +1 oro en cada tirada.                              | 6     | `{kind:'rollBonus', gold:1}`                   |
| `card_bigroll`    | economy     | Manos grandes        | +1 oro extra si tiras 3 dados o más.                | 5     | `{kind:'rollBonus', gold:1, minDice:3}`        |
| `card_cheapfaces` | economy     | Gremio de forjadores | Las caras cuestan 1 oro menos.                      | 5     | `{kind:'discount', target:'face', amount:1}`   |
| `card_cheapdice`  | dice        | Fundición            | Los dados cuestan 3 oro menos.                      | 7     | `{kind:'discount', target:'die', amount:3}`    |
| `card_score_dice` | scoring     | Arsenal              | Al final: +3 PV por cada dado a partir del tercero. | 8     | `{kind:'endScore', per:'dice', from:3, pv:3}`  |
| `card_score_gold` | scoring     | Tesoro               | Al final: +1 PV por cada 3 oro.                     | 8     | `{kind:'endScore', per:'gold', every:3, pv:1}` |
| `card_reroll`     | dice        | Dado cargado         | Relanzar un dado es gratis.                         | 4     | `{kind:'freeReroll'}`                          |
| `card_tax`        | interaction | Recaudador           | Ganas 1 oro cuando otro jugador compra un dado.     | 4     | `{kind:'tax', trigger:'buyDie', gold:1}`       |

### Objetivos secretos (`ObjectiveDef`) — 1 por jugador, sin repetir

| id              | nombre        | condición al final de partida                      | PV  |
| --------------- | ------------- | -------------------------------------------------- | --- |
| `obj_engineer`  | Ingeniero     | ≥ 4 dados permanentes                              | 10  |
| `obj_magnate`   | Magnate       | ≥ 12 oro sin gastar                                | 9   |
| `obj_purist`    | Purista       | ninguna cara `blank` en tus dados                  | 9   |
| `obj_gambler`   | Apostador     | ≥ 3 caras de familia `risk` instaladas             | 10  |
| `obj_collector` | Coleccionista | ≥ 3 cartas                                         | 9   |
| `obj_smith`     | Forjador      | ≥ 6 caras compradas instaladas (ids con coste)     | 10  |
| `obj_scorer`    | Puntuador     | ≥ 4 caras de familia `pv` instaladas               | 9   |
| `obj_balanced`  | Equilibrado   | cada dado tiene ≥ 1 cara `pv` y ≥ 1 cara `economy` | 9   |

### Arquetipos de bot (`BotArchetype`)

`magnate` (peso economy ×1,5), `scorer` (pv ×1,5), `engineer` (generator ×2, dado ×1,5), `casino` (risk ×1,5), `balanced` (todo ×1). Política en Tarea 10.

### Builds de referencia (doc §4) que el simulador debe ver emerger

Magnate, Casino, Ingeniero, Puntuador, Combo, Coleccionista. Si tras la Tarea 26 alguna no aparece nunca entre los bots, es un fallo de balance a registrar.

---
