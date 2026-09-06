# Dice Foundry — Plan de implementación (MVP offline + web pública)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir desde cero, en `D:/Proyectos/Dice Foundry`, un juego de dados estratégico web-first (Three.js + Rapier) jugable de principio a fin contra bots o en hot-seat, con simulador económico headless para balancear, telemetría mínima y despliegue estático público. Cubre las fases 0 → 2 del roadmap del documento de diseño y lo automatizable de la fase 4 (web pública + analytics).

**Architecture:** Cuatro capas desacopladas que solo se encuentran en `src/app/GameController.ts`: `core/` (reglas, RNG con semilla, economía, bots — TypeScript puro, sin DOM, 100 % testeable en Node), `physics/` (Rapier: mesa, dados, pre-simulación determinista que hace que la tirada física *represente* el resultado que ya decidió `core/`), `render/` (Three.js: escena, dados, feedback) y `ui/` (HTML/CSS + TS vanilla, textos centralizados). La simulación decide, la física muestra: el resultado nunca se lee de la orientación visual del dado.

**Tech Stack:** Vite + TypeScript + Three.js `three/addons` (WebGLRenderer, RoundedBoxGeometry, OrbitControls) + `@dimforge/rapier3d-compat` + Web Audio API (SFX sintetizados, sin assets) + Vitest (unit, proyectos node/jsdom) + Playwright (smoke e2e) + GitHub Actions (gate) + Vercel (deploy con la CLI ya autenticada). Sin backend. Sin framework de UI.

---

## Contexto

- Adrian ha escrito `Dice_Foundry_game_design_stack_roadmap.docx` (diseño, stack, riesgos, roadmap de monetización). Este plan es su traducción a tareas ejecutables por un orquestador Opus con subagentes, sin intervención humana salvo los puntos marcados `👤 HUMANO`.
- La carpeta `D:/Proyectos/Dice Foundry` existe y está **vacía** (creada 2026-09-06). No hay repo git propio todavía (el `.git` que se ve es el del workspace `D:/Proyectos`, que NO trackea los proyectos hijos: Incremental, Brisca y Pepa tienen su propio repo con remote en `github.com/AdrianWheels`). Dice Foundry debe ser un repo propio igual.
- No existe todavía ficha del proyecto en el vault `D:/Proyectos/CONTROL/` (ni `Proyectos/Activos/Dice Foundry/`, ni entrada en `scripts/portfolio.config.json`). La convención del workspace (CLAUDE.md) exige Kanban antes de trabajar → Tarea 0.
- Ningún proyecto hermano usa Rapier ni tiene ESLint/Prettier/CI; Brisca usa Three.js 0.183 vía React Three Fiber, Vitest con dos proyectos (node/jsdom), Playwright y un RNG `mulberry32` en `src/engine/rng.ts`. Aquí se usa Three.js "a pelo" (sin React) como pide el documento, y se añade ESLint solo para vigilar fronteras de capa (decisión deliberada: lo ejecutan agentes).
- Herramientas ya disponibles y autenticadas en la máquina: `gh` 2.94 (cuenta `AdrianWheels`, scopes `repo`+`workflow`), Vercel CLI 54.12 (cuenta `adrianwheels`), Node 22.22, npm 10.9, pnpm 10.33. Decisión de Adrian (2026-09-06): **deploy en Vercel**, UI en **español**, alcance **fases 0-2 + web pública**.
- Decisiones del documento que este plan respeta al pie de la letra: separar simulación y presentación (§7), MVP técnico (§8), orden de implementación (§15), decisiones que NO se toman todavía (§16): nada de multiplayer/backend/cuentas/temporadas/anuncios/pay-to-win.

## Alcance

**Dentro:** fases 0 (reglas + simulador económico), 1 (vertical slice: dados físicos + tienda + forja), 2 (MVP: rondas, objetivos, bots, hot-seat, audio, feedback, persistencia local, telemetría) y lo automatizable de la 4 (CI + deploy estático + landing mínima en el propio `index.html`).
**Fuera (explícito, doc §16):** playtest con humanos (fase 3, la ejecuta Adrian con la build desplegada), social, online, monetización, tercer recurso (cristal), i18n multi-idioma (UI en español con strings centralizados para poder traducir luego).

---

## Global Constraints

- Ruta del proyecto: `D:/Proyectos/Dice Foundry` (con espacio; citar siempre entre comillas en shell). Nombre de paquete/repo: `dice-foundry`.
- Node `v22.22.2`, npm `10.9.7` (pnpm 10.33 existe pero se usa **npm** para alinearse con los hermanos; ver Tarea 1).
- Versiones a fijar en `package.json` (verificadas en npm el 2026-09-06, instalar con `-E` exacto): `three@0.185.1`, `@types/three@0.185.4`, `@dimforge/rapier3d-compat@0.20.0`, `vite@8.2.2`, `vitest@5.0.0`, `jsdom@30.0.1`, `@playwright/test@1.63.0`, `typescript@5.9.3` (no la 7.x: `typescript-eslint` necesita la API JS del compilador), `typescript-eslint@8.69.0`, `eslint@10.10.0`, `@eslint/js@10.0.1`, `globals@17.12.0`, `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `tsx@4.23.13`, `@types/node@26.4.1`, `@vercel/analytics` (última).
- Si una versión fijada no instala o rompe (p. ej. `vitest@5` cambia la API `projects`), bajar UNA major (`vitest@4`, `jsdom@29`), anotarlo en `docs/DECISIONS.md` y seguir. No perder más de 15 min en versiones.
- Repo GitHub `AdrianWheels/dice-foundry` **público** (como Incremental y Brisca); Vercel se despliega desde la CLI, no depende del repo.
- Toda lógica de juego en `src/core/` es TypeScript puro: prohibido importar `three`, `@dimforge/*`, `document`, `window` o `localStorage` desde `src/core/`. Regla ESLint `no-restricted-imports` la vigila (Tarea 1).
- Todo azar pasa por `Rng` (semilla). Prohibido `Math.random()` fuera de `src/core/rng.ts` (regla ESLint `no-restricted-properties`).
- Todo texto visible al usuario sale de `src/ui/strings.es.ts`. Sin literales en componentes.
- UI en español. Identificadores de código en inglés. Commits en español con Conventional Commits (`feat(core): …`, `test(physics): …`, `docs: …`). **Sin líneas de atribución/Co-Authored-By.**
- Gate obligatorio antes de cada commit: `npm run check` (= `lint` + `typecheck` + `test`). Un commit por tarea como mínimo; nunca commitear con el gate en rojo.
- Nunca mover tarjetas del Kanban a `Done` (eso lo hace Adrian). El agente mueve a `In Progress` al empezar y a `Completada - Pendiente Revisión` al acabar.
- Sin backend, sin cuentas, sin anuncios, sin compras de poder. Sin librerías de UI ni de estado (store propio de 30 líneas).
- Desktop-first; la UI debe seguir siendo usable a 390 px de ancho (Tarea 27).

---

## Protocolo de ejecución (para el orquestador Opus)

1. Leer este plan entero una vez. Las tareas están ordenadas por dependencia; la columna **Depende de** dice qué puede ir en paralelo. Dos pistas independientes: **A** = `core/` + simulador (Tareas 3-12) y **B** = `physics/` + `render/` (Tareas 13-17). Se cruzan en la Tarea 18. Si se paraleliza, usar worktrees (`superpowers:using-git-worktrees`) y rama por pista; si no, ejecutar en orden numérico.
2. Por cada tarea: lanzar **un subagente nuevo** con el bloque completo de la tarea como goal + el bloque "Reglas v0.1" + el bloque "Catálogos" (los subagentes no ven este fichero salvo que se les pegue). El subagente sigue TDD: test rojo → implementación mínima → verde → `npm run check` → commit.
3. Tras cada tarea, el orquestador revisa el diff contra el **Done when** de la tarea (criterios verificables), y solo entonces pasa a la siguiente. Si un Done when falla, se devuelve al mismo subagente con el fallo concreto.
4. Mantener `docs/DECISIONS.md` (Tarea 1): cada desviación del plan se apunta con fecha y motivo. Los números de balance (costes/valores) SOLO se cambian en los catálogos de datos y se registran en `docs/balance/CHANGELOG.md` (Tarea 11).
5. Puntos `👤 HUMANO`: el orquestador prepara todo y deja instrucciones exactas en el `README.md`; no se bloquea esperando.
6. Al cerrar: mover las tarjetas del Kanban del vault (Tarea 0) a `Completada - Pendiente Revisión`, escribir el resumen en `Resumen.md` del vault y enviar el enlace desplegado.

---

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
1. **Control/Espejo** (`control_copy`): cada Espejo se convierte, solo para esta resolución, en copia de la mejor cara de *otro* dado de la tirada (mejor = mayor `pv*3 + gold` entre caras `gain`; si no hay, es `blank`).
2. **Ganancias base**: `gain` (economía/PV), `risk` (se resuelve con `Rng`: con probabilidad `chance` paga, si no 0), `scaling` (meta: valor × cantidad), `combo` (paga si *otro* dado de esta tirada muestra la familia requerida, evaluado sobre las caras tras el paso 1).
3. **Multiplicadores**: cada `multiplier` duplica el **subtotal de oro** del paso 2 (dos multiplicadores → ×4; tope ×4).
4. **Cartas pasivas de tirada**: `card_income` +1 oro; `card_bigroll` +1 oro si se tiraron ≥ 3 dados.
5. **Abonar** oro y PV al jugador.
6. **Conversión** (`convert`, Alquimia): por cada Alquimia en la tirada, si `gold ≥ 3` → `gold -= 3`, `pv += 2` (automática; si no se puede pagar, no hace nada).
7. **Generadores**: `spawn_temp` crea un dado temporal; `spawn_perm` crea un dado permanente y la cara pasa a ser `blank` (se consume).
8. **Interacción**: `card_tax` de *otros* jugadores no se dispara aquí (se dispara al comprar dados, ver Tienda).
Cada paso añade `RollEvent { dieId?, faceId?, cardId?, gold, pv, textKey }` para el log "Qué ha pasado".

### Tienda
- 5 slots visibles (caras y cartas mezcladas) + acción permanente **Comprar dado**.
- Mazo: cada cara comprable ×3 copias, cada carta ×2 copias → 16×3 + 8×2 = **64 ítems**, barajado con `Rng` al inicio. Slot comprado queda **vacío hasta fin de ronda** (competencia: la opción puede desaparecer antes de tu turno).
- `endRound`: (1) descartar el slot ocupado más antiguo y (2) rellenar todos los vacíos robando del mazo. Mazo vacío → rebarajar descartes con `Rng`.
- Precio cara = `cost` (−1 con `card_cheapfaces`, mínimo 1). Precio carta = `cost`. Precio dado = `8 + 4 × (dadosPermanentes − 2)` (−3 con `card_cheapdice`, mínimo 3).
- Cuando un jugador compra un dado, cada *otro* jugador con `card_tax` gana 1 oro (evento).
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

| id | familia | nombre | descripción (es) | coste | efecto |
|---|---|---|---|---|---|
| `blank` | blank | Cara vacía | No hace nada. | — (no comprable) | `{ kind:'blank' }` |
| `g1` | economy | Moneda | +1 oro. | — | `{ kind:'gain', gold:1 }` |
| `g2` | economy | Dos monedas | +2 oro. | — | `{ kind:'gain', gold:2 }` |
| `pv1` | pv | Laurel | +1 PV. | — | `{ kind:'gain', pv:1 }` |
| `g3` | economy | Bolsa | +3 oro. | 3 | `{ kind:'gain', gold:3 }` |
| `g4` | economy | Cofre | +4 oro. | 5 | `{ kind:'gain', gold:4 }` |
| `pv2` | pv | Corona | +2 PV. | 5 | `{ kind:'gain', pv:2 }` |
| `pv3` | pv | Trono | +3 PV. | 8 | `{ kind:'gain', pv:3 }` |
| `x2gold` | multiplier | Forja ardiente | Duplica el oro de esta tirada. | 6 | `{ kind:'multiplier', resource:'gold', factor:2 }` |
| `combo_gold` | combo | Eco dorado | +3 oro si otro dado muestra Economía. | 4 | `{ kind:'combo', requires:'economy', gold:3 }` |
| `combo_pv` | combo | Resonancia | +2 PV si otro dado muestra PV. | 5 | `{ kind:'combo', requires:'pv', pv:2 }` |
| `spawn_temp` | generator | Chispa | Añade un dado temporal para tu próxima tirada. | 4 | `{ kind:'spawn', permanent:false }` |
| `spawn_perm` | generator | Semilla | Añade un dado permanente. Después esta cara queda vacía. | 7 | `{ kind:'spawn', permanent:true }` |
| `risk_gold` | risk | Apuesta | 50 %: +6 oro. Si no, nada. | 4 | `{ kind:'risk', chance:0.5, gold:6 }` |
| `risk_pv` | risk | Todo o nada | 25 %: +8 PV. Si no, nada. | 6 | `{ kind:'risk', chance:0.25, pv:8 }` |
| `control_copy` | control | Espejo | Copia la mejor cara de otro dado. | 6 | `{ kind:'control', mode:'copyBest' }` |
| `control_reroll` | control | Segunda oportunidad | El relanzamiento de este turno es gratis. | 3 | `{ kind:'control', mode:'freeReroll' }` |
| `convert` | conversion | Alquimia | Convierte 3 oro en 2 PV automáticamente. | 4 | `{ kind:'convert', from:'gold', amount:3, to:'pv', yield:2 }` |
| `meta_dice` | meta | Legado | +1 PV por cada 2 dados permanentes. | 5 | `{ kind:'scaling', per:'dice', every:2, pv:1 }` |
| `meta_cards` | meta | Tesorero | +1 oro por cada carta que tengas. | 3 | `{ kind:'scaling', per:'cards', every:1, gold:1 }` |

Caras comprables: 16 (todas menos `blank`, `g1`, `g2`, `pv1`).

### Cartas (`CardDef`)

| id | tipo | nombre | descripción (es) | coste | efecto |
|---|---|---|---|---|---|
| `card_income` | economy | Mina | +1 oro en cada tirada. | 6 | `{ kind:'rollBonus', gold:1 }` |
| `card_bigroll` | economy | Manos grandes | +1 oro extra si tiras 3 dados o más. | 5 | `{ kind:'rollBonus', gold:1, minDice:3 }` |
| `card_cheapfaces` | economy | Gremio de forjadores | Las caras cuestan 1 oro menos. | 6 | `{ kind:'discount', target:'face', amount:1 }` |
| `card_cheapdice` | dice | Fundición | Los dados cuestan 3 oro menos. | 7 | `{ kind:'discount', target:'die', amount:3 }` |
| `card_score_dice` | scoring | Arsenal | Al final: +2 PV por cada dado a partir del tercero. | 6 | `{ kind:'endScore', per:'dice', from:3, pv:2 }` |
| `card_score_gold` | scoring | Tesoro | Al final: +1 PV por cada 4 oro. | 5 | `{ kind:'endScore', per:'gold', every:4, pv:1 }` |
| `card_reroll` | dice | Dado cargado | Relanzar un dado es gratis. | 4 | `{ kind:'freeReroll' }` |
| `card_tax` | interaction | Recaudador | Ganas 1 oro cuando otro jugador compra un dado. | 4 | `{ kind:'tax', trigger:'buyDie', gold:1 }` |

### Objetivos secretos (`ObjectiveDef`) — 1 por jugador, sin repetir

| id | nombre | condición al final de partida | PV |
|---|---|---|---|
| `obj_engineer` | Ingeniero | ≥ 4 dados permanentes | 6 |
| `obj_magnate` | Magnate | ≥ 12 oro sin gastar | 5 |
| `obj_purist` | Purista | ninguna cara `blank` en tus dados | 5 |
| `obj_gambler` | Apostador | ≥ 3 caras de familia `risk` instaladas | 6 |
| `obj_collector` | Coleccionista | ≥ 3 cartas | 5 |
| `obj_smith` | Forjador | ≥ 6 caras compradas instaladas (ids con coste) | 6 |
| `obj_scorer` | Puntuador | ≥ 4 caras de familia `pv` instaladas | 5 |
| `obj_balanced` | Equilibrado | cada dado tiene ≥ 1 cara `pv` y ≥ 1 cara `economy` | 5 |

### Arquetipos de bot (`BotArchetype`)
`magnate` (peso economy ×1,5), `scorer` (pv ×1,5), `engineer` (generator ×2, dado ×1,5), `casino` (risk ×1,5), `balanced` (todo ×1). Política en Tarea 10.

### Builds de referencia (doc §4) que el simulador debe ver emerger
Magnate, Casino, Ingeniero, Puntuador, Combo, Coleccionista. Si tras la Tarea 26 alguna no aparece nunca entre los bots, es un fallo de balance a registrar.

---

## Arquitectura y mapa de ficheros

```
D:/Proyectos/Dice Foundry/
├── index.html                      # landing mínima + <div id="app"> + <canvas id="scene">
├── package.json / tsconfig.json / vite.config.ts / vitest.config.ts / playwright.config.ts
├── eslint.config.js / .prettierrc / .editorconfig / .gitignore / .nvmrc
├── .github/workflows/ci.yml        # lint + typecheck + test + build (+ deploy Pages)
├── README.md                       # cómo jugar, cómo correr, cómo simular, cómo desplegar
├── docs/
│   ├── rules.md                    # Reglas v0.1 (copia viva de este plan, Tarea 2)
│   ├── DECISIONS.md                # desviaciones del plan con fecha
│   └── balance/latest.md, CHANGELOG.md   # salida del simulador y cambios de números
├── public/favicon.svg
├── e2e/smoke.spec.ts               # Playwright
└── src/
    ├── main.ts                     # bootstrap: await RAPIER.init(), crear GameController, montar UI
    ├── core/                       # PURO. Sin DOM, sin three, sin rapier.
    │   ├── rng.ts                  # Rng (xoshiro128**), fork, serialize
    │   ├── types.ts                # todos los tipos del dominio
    │   ├── data/faces.ts, cards.ts, objectives.ts, dice.ts   # catálogos (solo datos)
    │   ├── dice.ts                 # createDie, replaceFace, rollDice
    │   ├── resolver.ts             # resolveRoll (orden de resolución)
    │   ├── economy.ts              # precios, descuentos, EV helpers
    │   ├── shop.ts                 # mazo, slots, buy, refresh
    │   ├── objectives.ts           # evaluateObjective
    │   ├── scoring.ts              # finalScores, winner
    │   ├── game.ts                 # GameState + reducer: createGame, applyAction, legalActions
    │   ├── bots.ts                 # decideBotAction(state, seat, archetype, rng)
    │   ├── serialize.ts            # toJSON/fromJSON de GameState (save)
    │   └── sim/simulate.ts, sim/metrics.ts, sim/cli.ts   # simulador headless
    ├── physics/                    # Rapier. Funciona en Node (tests) y navegador.
    │   ├── world.ts                # createPhysicsWorld (mesa + paredes), step, snapshot
    │   ├── dieBody.ts              # createDieBody, throwParams, topSide, isSettled
    │   └── preroll.ts              # planRoll: pre-simula, calcula sideMap por dado
    ├── render/                     # Three.js. Solo navegador.
    │   ├── scene.ts                # renderer, cámara, luces, controles, resize
    │   ├── table.ts                # mesa visual (coincide con physics/world)
    │   ├── faceTexture.ts          # CanvasTexture por FaceDef (cache)
    │   ├── dieMesh.ts              # RoundedBox + 6 materiales; applySideMap; syncFromBody
    │   ├── effects.ts              # highlight cara superior, números flotantes, partículas
    │   └── loop.ts                 # bucle: timestep fijo 1/60 + render
    ├── audio/audio.ts              # AudioEngine: click/coin/pv/buy/error/win sintetizados
    ├── ui/                         # HTML/CSS + TS vanilla
    │   ├── strings.es.ts           # TODOS los textos
    │   ├── store.ts                # createStore<T>() (subscribe/set/get)
    │   ├── dom.ts                  # h(), mount(), helpers
    │   ├── styles.css
    │   ├── Menu.ts, Hud.ts, RollControls.ts, Shop.ts, Forge.ts, Log.ts, Objectives.ts, EndScreen.ts, Settings.ts, HotSeatOverlay.ts
    └── app/
        ├── GameController.ts       # ÚNICO punto donde core+physics+render+ui+audio se tocan
        ├── persistence.ts          # settings, autosave, stats en localStorage
        └── telemetry.ts            # track(); sinks console/noop/umami
```

Convención de lados físicos del dado (compartida por `physics/` y `render/`, definida en `src/physics/dieBody.ts` y re-exportada): índice de lado = grupo de `BoxGeometry` de Three.js: `0:+X, 1:−X, 2:+Y, 3:−Y, 4:+Z, 5:−Z`. `sideMap[side] = faceIndex` (qué cara del dado se pinta en cada lado). Identidad por defecto.

**Cómo la física representa un resultado ya decidido (Tarea 13):** `core` decide `faceIndex` por dado → `physics/preroll.planRoll()` genera parámetros de lanzamiento desde un `Rng` visual (derivado de la semilla), construye un **mundo Rapier nuevo y desechable** (mesa + dados en reposo como cuerpos fijos + dados lanzados), lo simula en silencio hasta reposo (empujando dados "de canto" y anotando en qué paso), lee `topSide` de cada dado, libera el mundo y devuelve `sideMap` tal que `sideMap[topSide] = faceIndex` (relleno cíclico: `sideMap[s] = (faceIndex + s − topSide + 6) % 6`). La tirada visual construye **otro mundo nuevo con la misma secuencia exacta de operaciones** y avanza el mismo número de pasos → Rapier es determinista para la misma secuencia de entrada, así que el lado que queda arriba muestra la cara decidida. Un mundo nuevo por tirada evita depender de `takeSnapshot/restoreSnapshot` (cuya firma cambia entre versiones) y del historial del broad-phase. Salvaguarda: si al reposar en pantalla el lado superior real ≠ previsto, se reasigna `sideMap` sobre el lado real y se emite `telemetry('physics_mismatch')`; el resultado del juego no cambia nunca.

## Índice de tareas

| # | Código Kanban | Tarea | Pista | Depende de |
|---|---|---|---|---|
| 0 | `SETUP.0` | Alta del proyecto en el vault | — | — |
| 1 | `SETUP.1` | Scaffold del repo + CI + GitHub | — | 0 |
| 2 | `DOC.1` | Reglas v0.1, decisiones y changelog de balance | — | 1 |
| 3 | `CORE.1` | RNG con semilla | A | 1 |
| 4 | `CORE.2` | Tipos, catálogos y dados | A | 3 |
| 5 | `CORE.3` | Resolver de tiradas | A | 4 |
| 6 | `CORE.4` | Economía y tienda | A | 4 |
| 7 | `CORE.5` | Objetivos y puntuación final | A | 4 |
| 8 | `CORE.6` | Máquina de estados de partida + save | A | 5, 6, 7 |
| 9 | `CORE.7` | Bots | A | 8 |
| 10 | `SIM.1` | Simulador headless + métricas + CLI | A | 9 |
| 11 | `BAL.1` | Primer pase de balance | A | 10 |
| 12 | `PHY.1` | Mundo Rapier: mesa, dados, lado superior | B | 1 |
| 13 | `PHY.2` | Pre-roll determinista (`planRoll`) | B | 12 |
| 14 | `REN.1` | Escena Three.js: renderer, cámara, mesa | B | 1 |
| 15 | `REN.2` | Malla de dado + texturas de cara | B | 4, 14 |
| 16 | `REN.3` | Bucle fijo + tirada visible en navegador | B | 13, 15 |
| 17 | `UI.1` | Base de UI: strings, store, menú, HUD, controles, log, final | — | 8 |
| 18 | `UI.2` | Tienda y forja | — | 17 |
| 19 | `APP.1` | GameController: partida completa jugable | — | 9, 16, 18 |
| 20 | `AUD.1` | Audio sintetizado | — | 19 |
| 21 | `FX.1` | Feedback visual de la recompensa | — | 19 |
| 22 | `PERS.1` | Persistencia local (ajustes, autosave, stats) | — | 19 |
| 23 | `TEL.1` | Telemetría | — | 19 |
| 24 | `E2E.1` | Suite e2e completa + CI | — | 20-23 |
| 25 | `BAL.2` | Segundo pase de balance + builds de referencia | — | 11, 19 |
| 26 | `MOB.1` | Móvil / responsive | — | 24 |
| 27 | `REL.1` | Deploy en Vercel + landing + analytics | — | 24 |
| 28 | `UX.1` | Pistas de primera partida | — | 22 |
| 29 | `SETUP.2` | Cierre: Kanban, Resumen, hito, enlace | — | todo |

---

# Fase 0 — Preproducción y scaffolding

### Tarea 0: Alta del proyecto en el vault `[SETUP.0]`

**Goal:** Que Dice Foundry exista para el sistema de control de Adrian antes de escribir código: ficha, Kanban con todas las tarjetas de este plan, entrada en el dashboard, hito y copia del documento de diseño.

**Files:**
- Create: `D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry/Resumen.md`
- Create: `D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry/Kanban.md`
- Create: `D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry/Diseño_original.md`
- Modify: `D:/Proyectos/CONTROL/scripts/portfolio.config.json` (array `projects`, tras la entrada de Incremental)
- Modify: `D:/Proyectos/CONTROL/Tableros/Hitos.md` (columna `## 🎯 Próximos meses`)

**Done when:** `node scripts/kanban.js list "Dice Foundry"` lista 29 tarjetas con `^id` estampado; `Tablero Principal.md` regenerado contiene `Dice Foundry`; commit hecho en el repo del vault (`D:/Proyectos`, rama `master`) con solo esos ficheros.

- [ ] **Step 1: Convertir el documento de diseño a Markdown dentro del vault** (no hay pandoc; usar Python):

```bash
cd "D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry" && python - <<'EOF'
import zipfile, re
from xml.etree import ElementTree as ET
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
z = zipfile.ZipFile(r'C:\Users\drila\Downloads\Dice_Foundry_game_design_stack_roadmap.docx')
body = ET.fromstring(z.read('word/document.xml')).find(W+'body')
def text(p): return ''.join((n.text or '') if n.tag == W+'t' else ('\t' if n.tag == W+'tab' else '') for n in p.iter())
def style(p):
    ppr = p.find(W+'pPr'); ps = ppr.find(W+'pStyle') if ppr is not None else None
    return ps.get(W+'val') if ps is not None else ''
out = ['---', 'tags: [proyecto, dice-foundry, diseno]', 'proyecto: "[[Proyectos/Activos/Dice Foundry/Resumen|Dice Foundry]]"', 'origen: "Dice_Foundry_game_design_stack_roadmap.docx (2026-09-06)"', '---', '']
for ch in body:
    if ch.tag == W+'p':
        s, t = style(ch), text(ch).strip()
        if not t: continue
        if s.lower() == 'title': out.append('# ' + t)
        elif s.lower().startswith('heading'): out.append('#' * (int(re.sub(r'\D', '', s) or 1) + 1) + ' ' + t)
        else: out.append(t)
        out.append('')
    elif ch.tag == W+'tbl':
        rows = [[' '.join(text(p).strip() for p in tc.findall(W+'p')) for tc in tr.findall(W+'tc')] for tr in ch.findall(W+'tr')]
        out.append('| ' + ' | '.join(rows[0]) + ' |'); out.append('|' + '---|' * len(rows[0]))
        for r in rows[1:]: out.append('| ' + ' | '.join(r) + ' |')
        out.append('')
open('Diseño_original.md', 'w', encoding='utf-8').write('\n'.join(out))
print('ok', len(out), 'lines')
EOF
```

Expected: `ok` y un fichero con las 19 secciones del documento (`## 1. Resumen ejecutivo` … `## 19. Checklist del primer prototipo`) y 8 tablas.

- [ ] **Step 2: Escribir `Resumen.md`** (frontmatter exigido por `CONTROL/scripts/SCHEMA.md`):

```markdown
---
tags: [proyecto, activo, dice-foundry, tier-3]
project_name: "Dice Foundry"
project_path: "D:/Proyectos/Dice Foundry"
tier: 3
lifecycle: active
tablero: "[[Proyectos/Activos/Dice Foundry/Kanban|Dice Foundry]]"
---

# 🎲 Dice Foundry · Juego de dados estratégico web

## Resumen
<!-- AUTO-EXTRACT-START: summary -->
Juego de estrategia ligero para navegador (Three.js + Rapier + TypeScript + Vite, sin backend) creado el 2026-09-06: lanzar dados físicos, cobrar oro y PV, forjar caras, comprar cartas y dados y cerrar objetivos secretos en 8 rondas contra bots o en hot-seat. Referencia Dice Forge con ritmo Catán. Fase actual: MVP offline según `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md` (en el repo). Sin monetización hasta validar retención.
<!-- AUTO-EXTRACT-END: summary -->

## Estado

- 2026-09-06: proyecto creado. Diseño en [[Proyectos/Activos/Dice Foundry/Diseño_original|Diseño original]]; plan de implementación en el repo.
- Decisiones fijadas (diseño §16): sin multiplayer, sin cuentas, sin anuncios, sin vender poder. Deploy en Vercel. UI en español.

## Referencias

- Kanban: [[Proyectos/Activos/Dice Foundry/Kanban|Dice Foundry]]
- Repo: `D:/Proyectos/Dice Foundry` · GitHub `AdrianWheels/dice-foundry`
- Diseño: [[Proyectos/Activos/Dice Foundry/Diseño_original|Diseño original]]
```

- [ ] **Step 3: Escribir `Kanban.md`.** Frontmatter y columnas idénticos a Incremental/Brisca (línea en blanco tras el primer `---` incluida). Sub-viñetas indentadas con **TAB + 2 espacios**. Sin `^id` (los estampa `kanban.js`). Una tarjeta por tarea de este plan; `Descripción` apunta a la tarea del plan y `Verificación` es el Done when resumido:

```markdown
---

kanban-plugin: board
hub: "[[Tablero Principal]]"

---

## Backlog ALTA

- [ ] `[SETUP.1]` Scaffold del repo: Vite + TS + Three + Rapier + Vitest + Playwright + ESLint + CI + GitHub
	  - Descripción: Tarea 1 del plan `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md`. Repo git propio, toolchain fijada, gate `npm run check`, remote `AdrianWheels/dice-foundry`.
	  - Verificación: `cd "D:/Proyectos/Dice Foundry" && npm run check && npm run build && npm run e2e` en verde; CI verde en GitHub.
- [ ] `[DOC.1]` Reglas v0.1, `docs/DECISIONS.md` y changelog de balance
	  - Descripción: Tarea 2 del plan. `docs/rules.md` es la fuente de verdad de reglas y catálogos.
	  - Verificación: los tres ficheros existen y `docs/rules.md` contiene las 20 caras, 8 cartas y 8 objetivos.
- [ ] `[CORE.1]` RNG con semilla (mulberry32) y `RandomSource`
	  - Descripción: Tarea 3 del plan. Todo azar del juego pasa por aquí; ESLint prohíbe `Math.random` fuera.
	  - Verificación: `npx vitest run src/core/rng.test.ts` verde (determinismo, rango, shuffle, estado serializable).
- [ ] `[CORE.2]` Tipos del dominio, catálogos (caras/cartas/objetivos) y módulo de dados
	  - Descripción: Tarea 4 del plan. Datos puros en `src/core/data/*`, `createDie/replaceFace/rollDice`.
	  - Verificación: `npx vitest run src/core/data src/core/dice.test.ts` verde; 20 caras (16 comprables), 8 cartas, 8 objetivos.
- [ ] `[CORE.3]` Resolver de tiradas (orden de resolución de 7 pasos + eventos explicables)
	  - Descripción: Tarea 5 del plan. `resolveRoll` puro con Espejo, ganancias, riesgo, escalado, combo, ×2 (tope ×4), cartas, conversión y generadores.
	  - Verificación: `npx vitest run src/core/resolver.test.ts` verde (una prueba por familia + tope de multiplicador).
- [ ] `[CORE.4]` Economía (precios, descuentos, EV) y tienda (mazo 64, 5 slots, refresco)
	  - Descripción: Tarea 6 del plan.
	  - Verificación: `npx vitest run src/core/economy.test.ts src/core/shop.test.ts` verde.
- [ ] `[CORE.5]` Objetivos secretos y puntuación final
	  - Descripción: Tarea 7 del plan. 8 objetivos evaluables, cartas de puntuación, desempate por oro.
	  - Verificación: `npx vitest run src/core/objectives.test.ts src/core/scoring.test.ts` verde.
- [ ] `[CORE.6]` Máquina de estados de partida (`createGame/applyAction/legalActions`) + save/load
	  - Descripción: Tarea 8 del plan. Reducer puro y determinista; partida completa de principio a fin sin UI.
	  - Verificación: `npx vitest run src/core/game.test.ts src/core/serialize.test.ts` verde; misma semilla ⇒ mismo estado final.
- [ ] `[CORE.7]` Bots por arquetipo (magnate, scorer, engineer, casino, balanced)
	  - Descripción: Tarea 9 del plan. Política heurística en PV-equivalente; siempre acción legal.
	  - Verificación: `npx vitest run src/core/bots.test.ts` verde; 4 bots terminan 50 partidas sin excepción.
- [ ] `[SIM.1]` Simulador headless + métricas + CLI `npm run sim`
	  - Descripción: Tarea 10 del plan. Winrate por arquetipo/asiento, snowball, blowout, uso de ítems, builds emergentes → `docs/balance/latest.md`.
	  - Verificación: `npm run sim -- --games 200` genera el informe; `npx vitest run src/core/sim` verde y determinista.
- [ ] `[BAL.1]` Primer pase de balance con umbrales
	  - Descripción: Tarea 11 del plan. Ajustar SOLO `src/core/data/*.ts` hasta cumplir umbrales; registrar en `docs/balance/CHANGELOG.md`.
	  - Verificación: informe de 2000 partidas dentro de umbrales; `src/core/balance.test.ts` verde.
- [ ] `[PHY.1]` Mundo Rapier: mesa acotada, cuerpo de dado, lanzamiento, reposo y lado superior
	  - Descripción: Tarea 12 del plan. `@dimforge/rapier3d-compat` funcionando en Node (tests) y navegador.
	  - Verificación: `npx vitest run src/physics/world.test.ts src/physics/dieBody.test.ts` verde (reposo < 900 pasos, determinismo bit a bit).
- [ ] `[PHY.2]` Pre-roll determinista: `planRoll` decide `sideMap` para que la cara elegida quede arriba
	  - Descripción: Tarea 13 del plan. Mundo nuevo por tirada, empujones a dados de canto anotados por paso, replay idéntico.
	  - Verificación: `npx vitest run src/physics/preroll.test.ts` verde en 25 semillas distintas.
- [ ] `[REN.1]` Escena Three.js: renderer, cámara orbital acotada, luces, mesa
	  - Descripción: Tarea 14 del plan.
	  - Verificación: `npm run build` verde; e2e `boot` muestra la mesa sin errores de consola.
- [ ] `[REN.2]` Malla de dado (RoundedBox, 6 materiales) + texturas de cara generadas en canvas
	  - Descripción: Tarea 15 del plan. Glifo y color por familia; `sideMap` aplicable; sincronización desde el cuerpo físico.
	  - Verificación: `npx vitest run src/render/faceTexture.test.ts` verde; captura e2e con dados visibles.
- [ ] `[REN.3]` Bucle de timestep fijo + primera tirada visible en el navegador
	  - Descripción: Tarea 16 del plan. Botón Lanzar → `planRoll` → replay físico → reposo → lado superior coincide con lo previsto.
	  - Verificación: e2e `roll.spec.ts`: `window.__df.lastMismatch === 0` tras 5 tiradas.
- [ ] `[UI.1]` Base de UI: strings.es, store, dom helpers, menú, HUD, controles de tirada, log, objetivo, pantalla final, hot-seat
	  - Descripción: Tarea 17 del plan. HTML/CSS + TS vanilla, sin literales fuera de `strings.es.ts`, `data-testid` estables.
	  - Verificación: `npx vitest run src/ui` verde (jsdom).
- [ ] `[UI.2]` Tienda (5 slots + comprar dado) y modal de forja
	  - Descripción: Tarea 18 del plan.
	  - Verificación: `npx vitest run src/ui/Shop.test.ts src/ui/Forge.test.ts` verde.
- [ ] `[APP.1]` GameController: partida completa jugable contra bots y en hot-seat
	  - Descripción: Tarea 19 del plan. Único punto de unión core+physics+render+ui.
	  - Verificación: e2e `game.spec.ts` termina una partida de 2 rondas contra 1 bot y llega a la pantalla final.

## Backlog MEDIA

- [ ] `[AUD.1]` Audio sintetizado con Web Audio (impactos por fuerza de contacto, oro, PV, compra, error, victoria) + mute
	  - Descripción: Tarea 20 del plan. Sin assets; cadena voces → compresor → master.
	  - Verificación: `npx vitest run src/audio` verde; mute persiste.
- [ ] `[FX.1]` Feedback visual: cara superior resaltada, números flotantes, partículas de oro
	  - Descripción: Tarea 21 del plan.
	  - Verificación: e2e captura tras resolver muestra números flotantes; `reduceMotion` los desactiva.
- [ ] `[PERS.1]` Persistencia local: ajustes, autosave/reanudar, stats
	  - Descripción: Tarea 22 del plan. `localStorage` versionado con cuarentena de saves corruptos.
	  - Verificación: `npx vitest run src/app/persistence.test.ts` verde; e2e recarga a mitad de partida y reanuda.
- [ ] `[TEL.1]` Telemetría: eventos del doc §14 con sinks console/beacon(PostHog)/Vercel
	  - Descripción: Tarea 23 del plan.
	  - Verificación: `npx vitest run src/app/telemetry.test.ts` verde; `docs/telemetry.md` lista eventos ↔ métricas.
- [ ] `[E2E.1]` Suite e2e completa (boot, tirada, partida, reanudar, móvil) en CI
	  - Descripción: Tarea 24 del plan.
	  - Verificación: `npm run e2e` verde local y en GitHub Actions.
- [ ] `[BAL.2]` Segundo pase de balance (5000 partidas) + informe de builds de referencia
	  - Descripción: Tarea 25 del plan.
	  - Verificación: umbrales cumplidos; las 6 builds del diseño §4 aparecen en el informe o quedan anotadas como deuda.
- [ ] `[MOB.1]` Móvil / responsive: layout ≤ 390 px, táctil, DPR limitado, sombras off
	  - Descripción: Tarea 26 del plan.
	  - Verificación: e2e con viewport iPhone 13 completa una partida de 2 rondas.
- [ ] `[REL.1]` Deploy en Vercel + landing en `index.html` + analytics
	  - Descripción: Tarea 27 del plan. `vercel.json` + `npm run deploy`; URL pública verificada con HTTP 200.
	  - Verificación: la URL de producción carga y completa el e2e `boot` apuntando a ella.

## Backlog BAJA

- [ ] `[UX.1]` Pistas de primera partida (3 tooltips descartables persistidos)
	  - Descripción: Tarea 28 del plan.
	  - Verificación: e2e: las pistas aparecen en la primera partida y no en la segunda.
- [ ] `[SETUP.2]` Cierre: tarjetas a revisión, Resumen.md, hito, enlace desplegado
	  - Descripción: Tarea 29 del plan.
	  - Verificación: todas las tarjetas anteriores en `Completada - Pendiente Revisión`.

## In Progress



## Completada - Pendiente Revisión



## Done



%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,false,false]}
```
%%
```

- [ ] **Step 4: Registrar en `portfolio.config.json`.** Insertar tras la línea de Incremental:

```json
    {"name": "Dice Foundry", "path": "D:/Proyectos/Dice Foundry", "tier": 3},
```

- [ ] **Step 5: Añadir hito en `Hitos.md`** bajo `## 🎯 Próximos meses` (si la columna tiene `_(vacío)_`, sustituirlo):

```markdown
- [ ] **2026-10-31** [Dice Foundry] MVP offline jugable y desplegado en Vercel (bots + hot-seat, ≥ 3 builds viables en el simulador)
```

- [ ] **Step 6: Verificar con las herramientas del vault**

```bash
cd "D:/Proyectos/CONTROL" && node scripts/scan-vault.js && node scripts/kanban.js list "Dice Foundry" && node scripts/portfolio-status.js && grep -n "Dice Foundry" "Tableros/Tablero Principal.md"
```

Expected: `scan-vault` sin errores de validación; `kanban.js list` muestra las 29 tarjetas por columna y el fichero ahora tiene `^xxxxxx` en cada tarjeta; el `grep` devuelve al menos una línea (`[no-git]` hasta la Tarea 1).

- [ ] **Step 7: Commit en el repo del vault** (solo estos ficheros; el vault tiene otros cambios de Adrian sin commitear que NO se tocan):

```bash
cd "D:/Proyectos" && git add "CONTROL/Proyectos/Activos/Dice Foundry" CONTROL/scripts/portfolio.config.json CONTROL/Tableros/Hitos.md && git commit -m "docs(vault): alta Dice Foundry (Resumen, Kanban, diseño, hito, config)"
```

---

### Tarea 1: Scaffold del repo + CI + GitHub `[SETUP.1]`

**Goal:** Repo `dice-foundry` con toolchain fijada, gate `npm run check`, Rapier+Three arrancando en el navegador (verificado por Playwright), CI en GitHub Actions y remote público. Es la base sobre la que todas las demás tareas hacen TDD.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.gitignore`, `.nvmrc`, `index.html`, `public/favicon.svg`, `src/main.ts`, `src/vite-env.d.ts`, `src/app/version.ts`, `src/app/version.test.ts`, `e2e/boot.spec.ts`, `e2e/harness.ts`, `.github/workflows/ci.yml`, `.claude/launch.json`, `CLAUDE.md`, `README.md`, `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md` (copia íntegra de este plan)

**Interfaces:**
- Produces: `npm run check` (lint + typecheck + test), `npm run e2e`, `npm run dev`, `npm run build`, `npm run sim` (script listo, fichero llega en Tarea 10), `npm run deploy`. `APP_VERSION` en `src/app/version.ts`. Helper e2e `captureConsoleErrors(page)` en `e2e/harness.ts`.

**Done when:** `npm run check`, `npm run build` y `npm run e2e` verdes en local; primer commit en `main`; repo `https://github.com/AdrianWheels/dice-foundry` creado y CI verde; la tarjeta `[SETUP.1]` en `Completada - Pendiente Revisión`.

- [ ] **Step 1: Mover la tarjeta a In Progress** (así en TODAS las tareas siguientes; no se repite el paso):

```bash
cd "D:/Proyectos/CONTROL" && node scripts/kanban.js list "Dice Foundry" | grep "SETUP.1"
```
Copiar el `^id` que imprime y ejecutar `node scripts/kanban.js start "Dice Foundry" <^id>`.

- [ ] **Step 2: Inicializar repo y dependencias**

```bash
cd "D:/Proyectos/Dice Foundry" && git init -b main && npm init -y >/dev/null && npm install -E three@0.185.1 @dimforge/rapier3d-compat@0.20.0 @vercel/analytics && npm install -E -D @types/three@0.185.4 vite@8.2.2 vitest@5.0.0 jsdom@30.0.1 @playwright/test@1.63.0 typescript@5.9.3 typescript-eslint@8.69.0 eslint@10.10.0 @eslint/js@10.0.1 globals@17.12.0 prettier@3.9.6 eslint-config-prettier@10.1.8 tsx@4.23.13 @types/node@26.4.1
```

- [ ] **Step 3: `package.json`** (sustituir el generado por `npm init` conservando `dependencies`/`devDependencies` instaladas):

```json
{
  "name": "dice-foundry",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "Juego de dados estratégico web-first: lanza, cobra, forja, repite.",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run lint && npm run typecheck && npm run test",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "sim": "tsx src/core/sim/cli.ts",
    "deploy": "vercel --prod --yes"
  }
}
```

- [ ] **Step 4: Configs**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "e2e", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el bundle funciona en Vercel, en un zip de itch.io y en file://.
  base: './',
  server: { port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  build: { target: 'es2022', sourcemap: true },
  // El paquete -compat lleva el wasm embebido en base64; excluirlo del pre-bundle evita
  // que el optimizador de Vite lo reescriba.
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
});
```

`vitest.config.ts` (patrón de Brisca: dos proyectos):
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // Lógica pura (core, physics, app, audio, render helpers). Sin DOM.
        test: {
          name: 'node',
          include: ['src/{core,physics,app,audio,render}/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
        },
      },
      {
        // Componentes de UI vanilla. jsdom.
        test: {
          name: 'jsdom',
          include: ['src/ui/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

// WebGL en headless: ANGLE + SwiftShader (render por software). Si un test 3D
// falla con "WebGL not supported", añadir '--ignore-gpu-blocklist'.
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: gl },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

`eslint.config.js` (vigila las fronteras de capa y el azar):
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

const noMathRandom = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Usa Rng (src/core/rng.ts): todo azar es determinista.' },
  ],
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['src/**/*.ts'], rules: { ...noMathRandom } },
  { files: ['src/core/rng.ts'], rules: { 'no-restricted-properties': 'off' } },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*', '@dimforge/*', '**/physics/**', '**/render/**', '**/ui/**', '**/app/**', '**/audio/**'],
              message: 'src/core es puro: sin three, rapier, DOM ni capas superiores.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator', 'requestAnimationFrame'],
    },
  },
  {
    files: ['src/physics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['three', 'three/*', '**/render/**', '**/ui/**', '**/app/**', '**/audio/**'], message: 'src/physics no conoce three ni la UI.' }] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
    },
  },
  prettier,
);
```

`.prettierrc`:
```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```

`.prettierignore`:
```
dist
node_modules
coverage
playwright-report
test-results
package-lock.json
```

`.editorconfig`:
```
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.gitignore`:
```
node_modules
dist
coverage
playwright-report
test-results
.playwright
.playwright-mcp
.vercel
*.local
.env
.env.*
.DS_Store
.claude/*
!.claude/launch.json
```

`.nvmrc`: `22`

`.claude/launch.json` (patrón de Incremental):
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dice-foundry-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "autoPort": true }
  ]
}
```

- [ ] **Step 5: `index.html`, `src/main.ts`, versión y favicon**

`index.html`:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Dice Foundry</title>
    <meta
      name="description"
      content="Lanza dados físicos, forja sus caras y construye la mejor máquina de puntos. Juego de estrategia gratuito en el navegador."
    />
    <link rel="icon" href="./favicon.svg" />
  </head>
  <body>
    <canvas id="scene" aria-hidden="true"></canvas>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#f4e7c3" stroke="#3b2f1e" stroke-width="4"/><g fill="#3b2f1e"><circle cx="20" cy="20" r="6"/><circle cx="44" cy="20" r="6"/><circle cx="32" cy="32" r="6"/><circle cx="20" cy="44" r="6"/><circle cx="44" cy="44" r="6"/></g></svg>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/app/version.ts`:
```ts
export const APP_VERSION = '0.1.0';
```

`src/app/version.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { APP_VERSION } from './version';

describe('APP_VERSION', () => {
  it('coincide con package.json', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
});
```

`src/main.ts` (arranque mínimo: demuestra que Rapier y Three cargan en el navegador; la Tarea 19 lo sustituye):
```ts
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { APP_VERSION } from './app/version';

async function boot(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app no existe');
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.textContent = 'Cargando…';
  app.append(status);

  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.step();
  world.free();

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(64, 64, false);
  renderer.dispose();

  status.textContent = `OK rapier+three v${APP_VERSION}`;
}

boot().catch((err: unknown) => {
  const status = document.querySelector('[data-testid="boot-status"]');
  if (status) status.textContent = `ERROR ${String(err)}`;
  console.error(err);
});
```

- [ ] **Step 6: e2e de arranque**

`e2e/harness.ts`:
```ts
import type { Page } from '@playwright/test';

/** Recoge errores de consola y excepciones no capturadas durante el test. */
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}
```

`e2e/boot.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('la app arranca con Rapier y Three sin errores', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('boot-status')).toHaveText(/^OK rapier\+three/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});
```

- [ ] **Step 7: Ejecutar todo**

```bash
cd "D:/Proyectos/Dice Foundry" && npm run check && npm run build && npx playwright install chromium && npm run e2e
```
Expected: lint/typecheck/test verdes (1 test), `dist/` generado, e2e `1 passed`. Si `prettier --check` falla, ejecutar `npm run format` y repetir.

- [ ] **Step 8: CI, CLAUDE.md, README y copia del plan**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

`CLAUDE.md` (instrucciones para los agentes que trabajen en este repo):
```markdown
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
```

`README.md` (esqueleto; se completa en Tareas 10, 27 y 29):
```markdown
# Dice Foundry

Juego de estrategia ligero para navegador: lanza dados físicos, cobra oro y puntos, forja caras, compra cartas y dados y cierra objetivos secretos en 8 rondas. Sin backend.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # lint + typecheck + tests
npm run e2e        # Playwright
```

## Documentación

- Reglas: `docs/rules.md`
- Plan de implementación: `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md`
- Decisiones: `docs/DECISIONS.md`
```

Copiar este plan íntegro a `docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md`:
```bash
mkdir -p "D:/Proyectos/Dice Foundry/docs/superpowers/plans" && cp "C:/Users/drila/.claude/plans/c-users-drila-downloads-dice-foundry-ga-staged-tome.md" "D:/Proyectos/Dice Foundry/docs/superpowers/plans/2026-09-06-dice-foundry-mvp.md"
```

- [ ] **Step 9: Primer commit y repo remoto**

```bash
cd "D:/Proyectos/Dice Foundry" && npm run check && git add -A && git commit -m "chore(SETUP.1): scaffold Vite + TS + Three + Rapier + Vitest + Playwright + CI" && gh repo create AdrianWheels/dice-foundry --public --source . --remote origin --push --description "Juego de dados estratégico web-first (Three.js + Rapier)"
```
Expected: repo creado, rama `main` subida. Después `gh run list --limit 1` → workflow `CI` en curso; `gh run watch --exit-status` → `completed success` (si falla por WebGL headless en Ubuntu, añadir `--ignore-gpu-blocklist` al array `gl` de `playwright.config.ts`, commit `fix(SETUP.1): flags WebGL en CI` y repetir).

- [ ] **Step 10: Mover la tarjeta a revisión** (así en TODAS las tareas siguientes; no se repite el paso):

```bash
cd "D:/Proyectos/CONTROL" && node scripts/kanban.js done "Dice Foundry" <^id de SETUP.1>
```

---

### Tarea 2: Reglas v0.1, decisiones y changelog de balance `[DOC.1]`

**Goal:** Que la fuente de verdad de reglas y números viva en el repo (`docs/rules.md`) y que exista un sitio para registrar desviaciones (`docs/DECISIONS.md`) y cambios de balance (`docs/balance/CHANGELOG.md`). Es el "documento de reglas" que el diseño §11 pide como resultado de la Fase 0.

**Files:**
- Create: `docs/rules.md`, `docs/DECISIONS.md`, `docs/balance/CHANGELOG.md`, `docs/balance/.gitkeep`

**Done when:** los tres ficheros existen; `docs/rules.md` contiene literalmente las secciones "Reglas del juego v0.1" y "Catálogos de datos" de este plan (20 caras, 8 cartas, 8 objetivos, 5 arquetipos); commit hecho.

- [ ] **Step 1: `docs/rules.md`** — copiar íntegras las secciones **Reglas del juego v0.1** y **Catálogos de datos (valores iniciales v0.1)** de este plan, precedidas de:

```markdown
# Dice Foundry — Reglas v0.1

> Fuente de verdad de reglas y números. Los valores iniciales se ajustan con el simulador (`npm run sim`) y cada cambio se anota en `docs/balance/CHANGELOG.md`. El código en `src/core/` implementa exactamente esto; si difieren, gana este documento y se abre una tarea.
```

- [ ] **Step 2: `docs/DECISIONS.md`**

```markdown
# Decisiones y desviaciones del plan

Formato: `- YYYY-MM-DD · [tarea] · decisión · motivo`.

- 2026-09-06 · [plan] · Mundo Rapier nuevo por tirada en vez de `takeSnapshot/restoreSnapshot` · determinismo por construcción y la firma del snapshot cambia entre versiones.
- 2026-09-06 · [plan] · Tercer recurso (cristal) fuera del MVP · diseño §16: no añadir recursos hasta demostrar el sistema básico.
- 2026-09-06 · [plan] · TypeScript 5.9 en vez de 7.x · `typescript-eslint` necesita la API JS del compilador.
- 2026-09-06 · [plan] · Deploy en Vercel (CLI ya autenticada) en vez de Cloudflare Pages · decisión de Adrian.
```

- [ ] **Step 3: `docs/balance/CHANGELOG.md`**

```markdown
# Changelog de balance

Cada entrada: fecha · fichero de datos · cambio (antes → después) · métrica que lo motivó (del informe `latest.md`).

## v0.1 (valores iniciales del plan, 2026-09-06)
Sin cambios todavía.
```

- [ ] **Step 4: Commit**

```bash
cd "D:/Proyectos/Dice Foundry" && npm run check && git add docs && git commit -m "docs(DOC.1): reglas v0.1, decisiones y changelog de balance"
```

---

# Pista A — Núcleo puro (`src/core/`)

Todo `src/core/` es TypeScript sin DOM. Los tests corren en el proyecto `node` de Vitest. Comando por fichero: `npx vitest run <ruta>`; gate completo: `npm run check`.

### Tarea 3: RNG con semilla `[CORE.1]`

**Goal:** Un generador determinista y serializable del que sale TODO el azar del juego (tiradas, riesgo, barajado de tienda y objetivos, parámetros de lanzamiento visual).

**Files:**
- Create: `src/core/rng.ts`
- Test: `src/core/rng.test.ts`

**Interfaces:**
- Produces: `type RngState = number`; `interface RandomSource { next(): number; int(min, maxInclusive): number; chance(p): boolean; pick<T>(arr): T; shuffle<T>(arr): T[] }`; `class Rng implements RandomSource` con `static fromSeed(seed: number)`, `static fromState(state: RngState)`, `state(): RngState`; `deriveSeed(...parts: number[]): number`.

**Done when:** tests verdes; `Rng` es la única implementación de `RandomSource` en producción; `grep -rn "Math.random" src` solo encuentra `src/core/rng.ts` (si es que lo usa: no lo usa).

- [ ] **Step 1: Test rojo** — `src/core/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Rng, deriveSeed } from './rng';

describe('Rng', () => {
  it('misma semilla ⇒ misma secuencia', () => {
    const a = Rng.fromSeed(42);
    const b = Rng.fromSeed(42);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('semillas distintas ⇒ secuencias distintas', () => {
    const a = Rng.fromSeed(1);
    const b = Rng.fromSeed(2);
    expect(Array.from({ length: 10 }, () => a.next())).not.toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
  });

  it('next() está en [0, 1)', () => {
    const r = Rng.fromSeed(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() cubre todo el rango inclusive y nada fuera', () => {
    const r = Rng.fromSeed(3);
    const seen = new Set<number>();
    for (let i = 0; i < 6000; i++) {
      const v = r.int(0, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('int() rechaza rangos inválidos', () => {
    expect(() => Rng.fromSeed(1).int(3, 2)).toThrow(RangeError);
  });

  it('chance(0) nunca, chance(1) siempre, chance(0.5) ≈ mitad', () => {
    const r = Rng.fromSeed(9);
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (r.chance(0.5)) hits++;
    expect(hits).toBeGreaterThan(4700);
    expect(hits).toBeLessThan(5300);
  });

  it('shuffle es una permutación y no muta la entrada', () => {
    const r = Rng.fromSeed(5);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = r.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(out).not.toEqual(input);
  });

  it('fromState(state()) continúa exactamente la misma secuencia', () => {
    const a = Rng.fromSeed(11);
    a.next();
    a.next();
    const b = Rng.fromState(a.state());
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('deriveSeed es estable y sensible al orden', () => {
    expect(deriveSeed(1, 2, 3)).toBe(deriveSeed(1, 2, 3));
    expect(deriveSeed(1, 2, 3)).not.toBe(deriveSeed(3, 2, 1));
  });
});
```

- [ ] **Step 2: Comprobar que falla**: `npx vitest run src/core/rng.test.ts` → FAIL (`Cannot find module './rng'`).

- [ ] **Step 3: Implementación** — `src/core/rng.ts` (mulberry32, el mismo algoritmo que `Brisca/src/engine/rng.ts`, envuelto en clase con estado serializable):

```ts
/**
 * RNG determinista (mulberry32). Estado = un uint32, serializable en GameState.rngState.
 * Es la ÚNICA fuente de azar del juego. ESLint prohíbe Math.random fuera de este fichero.
 */
export type RngState = number;

export interface RandomSource {
  /** Float en [0, 1). */
  next(): number;
  /** Entero en [min, maxInclusive]. */
  int(min: number, maxInclusive: number): number;
  /** true con probabilidad p. */
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  /** Fisher-Yates. Devuelve copia. */
  shuffle<T>(arr: readonly T[]): T[];
}

export class Rng implements RandomSource {
  private t: number;

  private constructor(state: number) {
    this.t = state >>> 0;
  }

  static fromSeed(seed: number): Rng {
    // Dispersión (murmur3 fmix) para que semillas consecutivas no den secuencias parecidas.
    let h = (seed ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return new Rng((h ^ (h >>> 16)) >>> 0);
  }

  static fromState(state: RngState): Rng {
    return new Rng(state);
  }

  state(): RngState {
    return this.t;
  }

  next(): number {
    this.t = (this.t + 0x6d2b79f5) >>> 0;
    let x = this.t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, maxInclusive: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min) {
      throw new RangeError(`int(${min}, ${maxInclusive})`);
    }
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }

  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new RangeError('pick de array vacío');
    return arr[this.int(0, arr.length - 1)] as T;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }
}

/** Semilla derivada (FNV-1a sobre enteros) para flujos secundarios, p. ej. el RNG visual de la física. */
export function deriveSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/core/rng.test.ts` → `9 passed`.
- [ ] **Step 5: Commit**: `npm run check && git add src/core/rng.ts src/core/rng.test.ts && git commit -m "feat(CORE.1): rng determinista con semilla y estado serializable"`.

---

### Tarea 4: Tipos, catálogos y dados `[CORE.2]`

**Goal:** Fijar el vocabulario del dominio (tipos), volcar los catálogos de la sección "Catálogos de datos" a ficheros de datos puros y dar el módulo de dados (`createDie`, `replaceFace`, `rollDice`).

**Files:**
- Create: `src/core/types.ts`, `src/core/data/faces.ts`, `src/core/data/cards.ts`, `src/core/data/objectives.ts`, `src/core/dice.ts`
- Test: `src/core/data/catalog.test.ts`, `src/core/dice.test.ts`

**Interfaces:**
- Consumes: `RandomSource`, `RngState` (Tarea 3).
- Produces: todos los tipos de abajo; `FACES`, `FACE_IDS`, `BUYABLE_FACE_IDS`, `STARTER_FACES`, `face(id)`; `CARDS`, `CARD_IDS`, `card(id)`; `OBJECTIVES`, `OBJECTIVE_IDS`, `objective(id)`; `SIDES = 6`, `createDie(id, faces?, temporary?)`, `replaceFace(die, side, faceId)`, `faceOf(die, faceIndex)`, `rollDice(dice, rng)`, `countFaces(dice, pred)`.

**Done when:** tests verdes; los catálogos coinciden 1:1 con las tablas de "Catálogos de datos" (ids, nombres, costes, efectos).

- [ ] **Step 1: `src/core/types.ts`** (fuente de verdad de tipos; NO cambiar nombres sin actualizar el plan):

```ts
import type { RngState } from './rng';

export type FaceFamily =
  | 'economy'
  | 'pv'
  | 'multiplier'
  | 'combo'
  | 'generator'
  | 'risk'
  | 'control'
  | 'conversion'
  | 'meta'
  | 'blank';

export type FaceEffect =
  | { kind: 'blank' }
  | { kind: 'gain'; gold?: number; pv?: number }
  | { kind: 'risk'; chance: number; gold?: number; pv?: number }
  | { kind: 'multiplier'; resource: 'gold'; factor: number }
  | { kind: 'combo'; requires: FaceFamily; gold?: number; pv?: number }
  | { kind: 'spawn'; permanent: boolean }
  | { kind: 'control'; mode: 'copyBest' | 'freeReroll' }
  | { kind: 'convert'; from: 'gold'; amount: number; to: 'pv'; yield: number }
  | { kind: 'scaling'; per: 'dice' | 'cards'; every: number; gold?: number; pv?: number };

export type FaceId = string;
export interface FaceDef {
  id: FaceId;
  family: FaceFamily;
  name: string;
  description: string;
  /** null = no comprable (caras iniciales). */
  cost: number | null;
  effect: FaceEffect;
}

export type CardId = string;
export type CardType = 'economy' | 'dice' | 'scoring' | 'interaction';
export type CardEffect =
  | { kind: 'rollBonus'; gold: number; minDice?: number }
  | { kind: 'discount'; target: 'face' | 'die'; amount: number }
  | { kind: 'endScore'; per: 'dice' | 'gold'; from?: number; every?: number; pv: number }
  | { kind: 'freeReroll' }
  | { kind: 'tax'; trigger: 'buyDie'; gold: number };
export interface CardDef {
  id: CardId;
  type: CardType;
  name: string;
  description: string;
  cost: number;
  effect: CardEffect;
}

export type ObjectiveId = string;
export type ObjectiveCheck =
  | { kind: 'minDice'; count: number }
  | { kind: 'minGold'; amount: number }
  | { kind: 'noBlank' }
  | { kind: 'minFamilyFaces'; family: FaceFamily; count: number }
  | { kind: 'minCards'; count: number }
  | { kind: 'minBoughtFaces'; count: number }
  | { kind: 'everyDieHas'; families: FaceFamily[] };
export interface ObjectiveDef {
  id: ObjectiveId;
  name: string;
  description: string;
  pv: number;
  check: ObjectiveCheck;
}

export type DieFaces = [FaceId, FaceId, FaceId, FaceId, FaceId, FaceId];
export interface Die {
  id: number;
  faces: DieFaces;
  temporary: boolean;
}

export type SeatKind = 'human' | 'bot';
export type BotArchetype = 'magnate' | 'scorer' | 'engineer' | 'casino' | 'balanced';
export interface SeatConfig {
  name: string;
  kind: SeatKind;
  archetype?: BotArchetype;
}
export interface GameConfig {
  seats: SeatConfig[];
  rounds: number;
  seed: number;
}

export interface PlayerState {
  seat: number;
  name: string;
  kind: SeatKind;
  archetype?: BotArchetype;
  gold: number;
  pv: number;
  dice: Die[];
  cards: CardId[];
  objective: ObjectiveId;
}

export type ShopItem = { kind: 'face'; faceId: FaceId } | { kind: 'card'; cardId: CardId };
export interface ShopState {
  slots: (ShopItem | null)[];
  /** Rondas que lleva cada slot ocupado (para descartar el más antiguo). */
  slotAge: number[];
  deck: ShopItem[];
  discard: ShopItem[];
}

export type TurnPhase = 'roll' | 'mitigate' | 'shop' | 'gameOver';
export interface RolledDie {
  dieId: number;
  faceIndex: number;
}
export interface RollState {
  results: RolledDie[];
  rerollUsed: boolean;
  freeReroll: boolean;
}

export type RollStep =
  | 'control'
  | 'gain'
  | 'risk'
  | 'scaling'
  | 'combo'
  | 'multiplier'
  | 'card'
  | 'convert'
  | 'spawn'
  | 'tax';
export interface RollEvent {
  step: RollStep;
  dieId?: number;
  faceId?: FaceId;
  cardId?: CardId;
  gold: number;
  pv: number;
  /** Clave de `strings.es.ts` (ev.*) para el log "Qué ha pasado". */
  textKey: string;
  params?: Record<string, string | number>;
}
export interface RollResolution {
  gold: number;
  pv: number;
  events: RollEvent[];
}

export interface FinalScore {
  seat: number;
  basePv: number;
  objectivePv: number;
  objectiveAchieved: boolean;
  cardPv: number;
  total: number;
  gold: number;
}

export interface GameState {
  version: 1;
  config: GameConfig;
  rngState: RngState;
  /** 1-based. */
  round: number;
  /** 0..n-1 dentro de la ronda. */
  turnIndex: number;
  currentSeat: number;
  phase: TurnPhase;
  players: PlayerState[];
  shop: ShopState;
  roll: RollState | null;
  purchasesThisTurn: number;
  nextDieId: number;
  lastResolution: RollResolution | null;
  /** Últimos 200 eventos de la partida. */
  log: RollEvent[];
  finalScores: FinalScore[] | null;
  winners: number[] | null;
}

export type GameAction =
  | { type: 'roll' }
  | { type: 'reroll'; dieId: number }
  | { type: 'pass' }
  | { type: 'buyFace'; slot: number; dieId: number; side: number }
  | { type: 'buyCard'; slot: number }
  | { type: 'buyDie' }
  | { type: 'endTurn' };
```

- [ ] **Step 2: Test rojo de catálogos** — `src/core/data/catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BUYABLE_FACE_IDS, FACES, FACE_IDS, STARTER_FACES, face } from './faces';
import { CARDS, CARD_IDS, card } from './cards';
import { OBJECTIVES, OBJECTIVE_IDS, objective } from './objectives';

describe('catálogo de caras', () => {
  it('tiene 20 caras y 16 comprables con coste > 0', () => {
    expect(FACE_IDS).toHaveLength(20);
    expect(BUYABLE_FACE_IDS).toHaveLength(16);
    for (const id of BUYABLE_FACE_IDS) expect(face(id).cost).toBeGreaterThan(0);
  });

  it('las caras iniciales no son comprables y el starter es el del plan', () => {
    for (const id of ['blank', 'g1', 'g2', 'pv1']) expect(face(id).cost).toBeNull();
    expect(STARTER_FACES).toEqual(['g1', 'g1', 'g2', 'g2', 'pv1', 'blank']);
  });

  it('cada clave coincide con su id y ninguna cara da más de 8 PV', () => {
    for (const [k, f] of Object.entries(FACES)) {
      expect(f.id).toBe(k);
      const e = f.effect;
      if ('pv' in e && e.pv !== undefined) expect(e.pv).toBeLessThanOrEqual(8);
    }
  });

  it('valores de referencia del plan', () => {
    expect(face('g3')).toMatchObject({ family: 'economy', cost: 3, effect: { kind: 'gain', gold: 3 } });
    expect(face('x2gold').effect).toEqual({ kind: 'multiplier', resource: 'gold', factor: 2 });
    expect(face('risk_pv').effect).toEqual({ kind: 'risk', chance: 0.25, pv: 8 });
    expect(face('spawn_perm')).toMatchObject({ cost: 7, effect: { kind: 'spawn', permanent: true } });
    expect(face('meta_dice').effect).toEqual({ kind: 'scaling', per: 'dice', every: 2, pv: 1 });
    expect(() => face('nope')).toThrow(/Cara desconocida/);
  });
});

describe('catálogo de cartas', () => {
  it('tiene 8 cartas con id = clave y coste > 0', () => {
    expect(CARD_IDS).toHaveLength(8);
    for (const [k, c] of Object.entries(CARDS)) {
      expect(c.id).toBe(k);
      expect(c.cost).toBeGreaterThan(0);
    }
    expect(card('card_score_dice').effect).toEqual({ kind: 'endScore', per: 'dice', from: 3, pv: 2 });
    expect(() => card('nope')).toThrow(/Carta desconocida/);
  });
});

describe('catálogo de objetivos', () => {
  it('tiene 8 objetivos de 5-6 PV con id = clave', () => {
    expect(OBJECTIVE_IDS).toHaveLength(8);
    for (const [k, o] of Object.entries(OBJECTIVES)) {
      expect(o.id).toBe(k);
      expect(o.pv).toBeGreaterThanOrEqual(5);
      expect(o.pv).toBeLessThanOrEqual(6);
    }
    expect(objective('obj_engineer').check).toEqual({ kind: 'minDice', count: 4 });
    expect(() => objective('nope')).toThrow(/Objetivo desconocido/);
  });
});
```

- [ ] **Step 3: Test rojo de dados** — `src/core/dice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { countFaces, createDie, faceOf, replaceFace, rollDice } from './dice';
import { Rng } from './rng';

describe('dice', () => {
  it('createDie usa las caras starter por defecto y copia el array', () => {
    const d = createDie(1);
    expect(d).toEqual({ id: 1, faces: ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'], temporary: false });
    expect(d.faces).not.toBe(STARTER_FACES);
  });

  it('replaceFace es inmutable y solo toca el lado indicado', () => {
    const d = createDie(1);
    const d2 = replaceFace(d, 5, 'g3');
    expect(d.faces[5]).toBe('blank');
    expect(d2.faces).toEqual(['g1', 'g1', 'g2', 'g2', 'pv1', 'g3']);
    expect(d2.id).toBe(1);
  });

  it('replaceFace rechaza lados y caras inválidos', () => {
    expect(() => replaceFace(createDie(1), 6, 'g3')).toThrow(RangeError);
    expect(() => replaceFace(createDie(1), -1, 'g3')).toThrow(RangeError);
    expect(() => replaceFace(createDie(1), 0, 'nope')).toThrow(/Cara desconocida/);
  });

  it('faceOf devuelve la definición de la cara en ese índice', () => {
    expect(faceOf(createDie(1), 4).id).toBe('pv1');
    expect(() => faceOf(createDie(1), 6)).toThrow(RangeError);
  });

  it('rollDice devuelve un índice 0..5 por dado, en orden, determinista', () => {
    const dice = [createDie(1), createDie(2), createDie(3)];
    const a = rollDice(dice, Rng.fromSeed(1));
    const b = rollDice(dice, Rng.fromSeed(1));
    expect(a).toEqual(b);
    expect(a.map((r) => r.dieId)).toEqual([1, 2, 3]);
    for (const r of a) {
      expect(r.faceIndex).toBeGreaterThanOrEqual(0);
      expect(r.faceIndex).toBeLessThanOrEqual(5);
    }
  });

  it('countFaces cuenta caras que cumplen el predicado en todos los dados', () => {
    const dice = [createDie(1), replaceFace(createDie(2), 0, 'pv2')];
    expect(countFaces(dice, (f) => f.family === 'pv')).toBe(3);
  });
});
```

- [ ] **Step 4: Comprobar rojo**: `npx vitest run src/core/data src/core/dice.test.ts` → FAIL (módulos inexistentes).

- [ ] **Step 5: Catálogos** — `src/core/data/faces.ts`:

```ts
import type { DieFaces, FaceDef, FaceId } from '../types';

export const FACES: Record<FaceId, FaceDef> = {
  blank: { id: 'blank', family: 'blank', name: 'Cara vacía', description: 'No hace nada.', cost: null, effect: { kind: 'blank' } },
  g1: { id: 'g1', family: 'economy', name: 'Moneda', description: '+1 oro.', cost: null, effect: { kind: 'gain', gold: 1 } },
  g2: { id: 'g2', family: 'economy', name: 'Dos monedas', description: '+2 oro.', cost: null, effect: { kind: 'gain', gold: 2 } },
  pv1: { id: 'pv1', family: 'pv', name: 'Laurel', description: '+1 PV.', cost: null, effect: { kind: 'gain', pv: 1 } },
  g3: { id: 'g3', family: 'economy', name: 'Bolsa', description: '+3 oro.', cost: 3, effect: { kind: 'gain', gold: 3 } },
  g4: { id: 'g4', family: 'economy', name: 'Cofre', description: '+4 oro.', cost: 5, effect: { kind: 'gain', gold: 4 } },
  pv2: { id: 'pv2', family: 'pv', name: 'Corona', description: '+2 PV.', cost: 5, effect: { kind: 'gain', pv: 2 } },
  pv3: { id: 'pv3', family: 'pv', name: 'Trono', description: '+3 PV.', cost: 8, effect: { kind: 'gain', pv: 3 } },
  x2gold: { id: 'x2gold', family: 'multiplier', name: 'Forja ardiente', description: 'Duplica el oro de esta tirada.', cost: 6, effect: { kind: 'multiplier', resource: 'gold', factor: 2 } },
  combo_gold: { id: 'combo_gold', family: 'combo', name: 'Eco dorado', description: '+3 oro si otro dado muestra Economía.', cost: 4, effect: { kind: 'combo', requires: 'economy', gold: 3 } },
  combo_pv: { id: 'combo_pv', family: 'combo', name: 'Resonancia', description: '+2 PV si otro dado muestra PV.', cost: 5, effect: { kind: 'combo', requires: 'pv', pv: 2 } },
  spawn_temp: { id: 'spawn_temp', family: 'generator', name: 'Chispa', description: 'Añade un dado temporal para tu próxima tirada.', cost: 4, effect: { kind: 'spawn', permanent: false } },
  spawn_perm: { id: 'spawn_perm', family: 'generator', name: 'Semilla', description: 'Añade un dado permanente. Después esta cara queda vacía.', cost: 7, effect: { kind: 'spawn', permanent: true } },
  risk_gold: { id: 'risk_gold', family: 'risk', name: 'Apuesta', description: '50 %: +6 oro. Si no, nada.', cost: 4, effect: { kind: 'risk', chance: 0.5, gold: 6 } },
  risk_pv: { id: 'risk_pv', family: 'risk', name: 'Todo o nada', description: '25 %: +8 PV. Si no, nada.', cost: 6, effect: { kind: 'risk', chance: 0.25, pv: 8 } },
  control_copy: { id: 'control_copy', family: 'control', name: 'Espejo', description: 'Copia la mejor cara de otro dado.', cost: 6, effect: { kind: 'control', mode: 'copyBest' } },
  control_reroll: { id: 'control_reroll', family: 'control', name: 'Segunda oportunidad', description: 'El relanzamiento de este turno es gratis.', cost: 3, effect: { kind: 'control', mode: 'freeReroll' } },
  convert: { id: 'convert', family: 'conversion', name: 'Alquimia', description: 'Convierte 3 oro en 2 PV automáticamente.', cost: 4, effect: { kind: 'convert', from: 'gold', amount: 3, to: 'pv', yield: 2 } },
  meta_dice: { id: 'meta_dice', family: 'meta', name: 'Legado', description: '+1 PV por cada 2 dados permanentes.', cost: 5, effect: { kind: 'scaling', per: 'dice', every: 2, pv: 1 } },
  meta_cards: { id: 'meta_cards', family: 'meta', name: 'Tesorero', description: '+1 oro por cada carta que tengas.', cost: 3, effect: { kind: 'scaling', per: 'cards', every: 1, gold: 1 } },
};

export const STARTER_FACES: DieFaces = ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'];
export const FACE_IDS: FaceId[] = Object.keys(FACES);
export const BUYABLE_FACE_IDS: FaceId[] = FACE_IDS.filter((id) => FACES[id].cost !== null);

export function face(id: FaceId): FaceDef {
  const f = FACES[id];
  if (!f) throw new Error(`Cara desconocida: ${id}`);
  return f;
}
```

`src/core/data/cards.ts`:
```ts
import type { CardDef, CardId } from '../types';

export const CARDS: Record<CardId, CardDef> = {
  card_income: { id: 'card_income', type: 'economy', name: 'Mina', description: '+1 oro en cada tirada.', cost: 6, effect: { kind: 'rollBonus', gold: 1 } },
  card_bigroll: { id: 'card_bigroll', type: 'economy', name: 'Manos grandes', description: '+1 oro extra si tiras 3 dados o más.', cost: 5, effect: { kind: 'rollBonus', gold: 1, minDice: 3 } },
  card_cheapfaces: { id: 'card_cheapfaces', type: 'economy', name: 'Gremio de forjadores', description: 'Las caras cuestan 1 oro menos.', cost: 6, effect: { kind: 'discount', target: 'face', amount: 1 } },
  card_cheapdice: { id: 'card_cheapdice', type: 'dice', name: 'Fundición', description: 'Los dados cuestan 3 oro menos.', cost: 7, effect: { kind: 'discount', target: 'die', amount: 3 } },
  card_score_dice: { id: 'card_score_dice', type: 'scoring', name: 'Arsenal', description: 'Al final: +2 PV por cada dado a partir del tercero.', cost: 6, effect: { kind: 'endScore', per: 'dice', from: 3, pv: 2 } },
  card_score_gold: { id: 'card_score_gold', type: 'scoring', name: 'Tesoro', description: 'Al final: +1 PV por cada 4 oro.', cost: 5, effect: { kind: 'endScore', per: 'gold', every: 4, pv: 1 } },
  card_reroll: { id: 'card_reroll', type: 'dice', name: 'Dado cargado', description: 'Relanzar un dado es gratis.', cost: 4, effect: { kind: 'freeReroll' } },
  card_tax: { id: 'card_tax', type: 'interaction', name: 'Recaudador', description: 'Ganas 1 oro cuando otro jugador compra un dado.', cost: 4, effect: { kind: 'tax', trigger: 'buyDie', gold: 1 } },
};
export const CARD_IDS: CardId[] = Object.keys(CARDS);

export function card(id: CardId): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`Carta desconocida: ${id}`);
  return c;
}
```

`src/core/data/objectives.ts`:
```ts
import type { ObjectiveDef, ObjectiveId } from '../types';

export const OBJECTIVES: Record<ObjectiveId, ObjectiveDef> = {
  obj_engineer: { id: 'obj_engineer', name: 'Ingeniero', description: 'Termina con 4 dados permanentes o más.', pv: 6, check: { kind: 'minDice', count: 4 } },
  obj_magnate: { id: 'obj_magnate', name: 'Magnate', description: 'Termina con 12 oro o más sin gastar.', pv: 5, check: { kind: 'minGold', amount: 12 } },
  obj_purist: { id: 'obj_purist', name: 'Purista', description: 'Ninguna cara vacía en tus dados al final.', pv: 5, check: { kind: 'noBlank' } },
  obj_gambler: { id: 'obj_gambler', name: 'Apostador', description: 'Ten 3 caras de Riesgo instaladas o más.', pv: 6, check: { kind: 'minFamilyFaces', family: 'risk', count: 3 } },
  obj_collector: { id: 'obj_collector', name: 'Coleccionista', description: 'Ten 3 cartas o más.', pv: 5, check: { kind: 'minCards', count: 3 } },
  obj_smith: { id: 'obj_smith', name: 'Forjador', description: 'Ten 6 caras compradas instaladas o más.', pv: 6, check: { kind: 'minBoughtFaces', count: 6 } },
  obj_scorer: { id: 'obj_scorer', name: 'Puntuador', description: 'Ten 4 caras de PV instaladas o más.', pv: 5, check: { kind: 'minFamilyFaces', family: 'pv', count: 4 } },
  obj_balanced: { id: 'obj_balanced', name: 'Equilibrado', description: 'Cada dado tiene al menos una cara de PV y una de Economía.', pv: 5, check: { kind: 'everyDieHas', families: ['pv', 'economy'] } },
};
export const OBJECTIVE_IDS: ObjectiveId[] = Object.keys(OBJECTIVES);

export function objective(id: ObjectiveId): ObjectiveDef {
  const o = OBJECTIVES[id];
  if (!o) throw new Error(`Objetivo desconocido: ${id}`);
  return o;
}
```

- [ ] **Step 6: Módulo de dados** — `src/core/dice.ts`:

```ts
import { STARTER_FACES, face } from './data/faces';
import type { RandomSource } from './rng';
import type { Die, DieFaces, FaceDef, FaceId, RolledDie } from './types';

export const SIDES = 6;

export function createDie(id: number, faces: DieFaces = STARTER_FACES, temporary = false): Die {
  return { id, faces: [...faces] as DieFaces, temporary };
}

/** Devuelve un dado nuevo con la cara del lado `side` sustituida. */
export function replaceFace(die: Die, side: number, faceId: FaceId): Die {
  if (!Number.isInteger(side) || side < 0 || side >= SIDES) {
    throw new RangeError(`Lado inválido: ${side}`);
  }
  face(faceId); // valida que exista
  const faces = [...die.faces] as DieFaces;
  faces[side] = faceId;
  return { ...die, faces };
}

export function faceOf(die: Die, faceIndex: number): FaceDef {
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= SIDES) {
    throw new RangeError(`Índice de cara inválido: ${faceIndex}`);
  }
  return face(die.faces[faceIndex] as FaceId);
}

/** El resultado lo decide el RNG; la física solo lo representa (diseño §7). */
export function rollDice(dice: readonly Die[], rng: RandomSource): RolledDie[] {
  return dice.map((d) => ({ dieId: d.id, faceIndex: rng.int(0, SIDES - 1) }));
}

export function countFaces(dice: readonly Die[], pred: (f: FaceDef) => boolean): number {
  let n = 0;
  for (const d of dice) for (const id of d.faces) if (pred(face(id))) n++;
  return n;
}
```

- [ ] **Step 7: Verde**: `npx vitest run src/core/data src/core/dice.test.ts` → `12 passed`.
- [ ] **Step 8: Commit**: `npm run check && git add src/core && git commit -m "feat(CORE.2): tipos del dominio, catálogos v0.1 y módulo de dados"`.

---

### Tarea 5: Resolver de tiradas `[CORE.3]`

**Goal:** `resolveRoll` convierte las caras de una tirada en oro/PV/dados nuevos siguiendo EXACTAMENTE el "Orden de resolución" de las reglas, y deja una lista de eventos que la UI puede explicar (diseño §9.4: "la interfaz debe explicar inmediatamente qué ocurrió").

**Files:**
- Create: `src/core/resolver.ts`
- Test: `src/core/resolver.test.ts`

**Interfaces:**
- Consumes: `face`, `card`, `createDie`, `replaceFace`, `faceOf`, `RandomSource`, tipos.
- Produces: `MULTIPLIER_CAP = 4`; `interface ResolveInput { player: PlayerState; rolled: RolledDie[]; nextDieId: number }`; `interface ResolveOutput { player: PlayerState; nextDieId: number; resolution: RollResolution }`; `resolveRoll(input, rng): ResolveOutput` (puro: no muta `input`); `hasFreeRerollFace(player, rolled): boolean`.

**Done when:** una prueba por familia + tope ×4 + inmutabilidad, todas verdes.

- [ ] **Step 1: Test rojo** — `src/core/resolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createDie } from './dice';
import { hasFreeRerollFace, resolveRoll } from './resolver';
import type { RandomSource } from './rng';
import type { DieFaces, PlayerState, RolledDie } from './types';

const S: DieFaces = ['g1', 'g1', 'g2', 'g2', 'pv1', 'blank'];
const die = (id: number, f0: string, rest: DieFaces = S): DieFaces => [f0, rest[1], rest[2], rest[3], rest[4], rest[5]] as DieFaces;

function player(dice: DieFaces[], over: Partial<PlayerState> = {}): PlayerState {
  return {
    seat: 0, name: 'P', kind: 'human', gold: 0, pv: 0, cards: [], objective: 'obj_purist',
    dice: dice.map((f, i) => createDie(i + 1, f)),
    ...over,
  };
}
/** Tirada donde cada dado muestra su cara 0. */
const rolledZero = (p: PlayerState): RolledDie[] => p.dice.map((d) => ({ dieId: d.id, faceIndex: 0 }));
const always: RandomSource = { next: () => 0, chance: () => true, int: (a) => a, pick: (a) => a[0] as never, shuffle: (a) => [...a] };
const never: RandomSource = { ...always, chance: () => false };
const run = (p: PlayerState, rng: RandomSource = never, rolled = rolledZero(p)) => resolveRoll({ player: p, rolled, nextDieId: 100 }, rng);

describe('resolveRoll', () => {
  it('ganancias base: suma oro y PV y emite un evento por cara', () => {
    const p = player([S, S]);
    const out = run(p, never, [{ dieId: 1, faceIndex: 3 }, { dieId: 2, faceIndex: 4 }]);
    expect(out.player.gold).toBe(2);
    expect(out.player.pv).toBe(1);
    expect(out.resolution).toMatchObject({ gold: 2, pv: 1 });
    expect(out.resolution.events.map((e) => e.step)).toEqual(['gain', 'gain']);
  });

  it('no muta la entrada', () => {
    const p = player([S]);
    const before = JSON.stringify(p);
    run(p);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('cara vacía: 0 y sin evento de ganancia', () => {
    const out = run(player([die(1, 'blank')]));
    expect(out.player.gold).toBe(0);
    expect(out.resolution.events).toEqual([]);
  });

  it('multiplicador duplica solo el oro base de la tirada', () => {
    const out = run(player([die(1, 'g3'), die(2, 'x2gold')]));
    expect(out.player.gold).toBe(6);
    expect(out.resolution.events.find((e) => e.step === 'multiplier')).toMatchObject({ gold: 3, params: { factor: 2 } });
  });

  it('dos multiplicadores ⇒ ×4; tres ⇒ sigue siendo ×4 (tope)', () => {
    expect(run(player([die(1, 'g4'), die(2, 'x2gold'), die(3, 'x2gold')])).player.gold).toBe(16);
    expect(run(player([die(1, 'g4'), die(2, 'x2gold'), die(3, 'x2gold'), die(4, 'x2gold')])).player.gold).toBe(16);
  });

  it('multiplicador sin oro base no hace nada ni emite evento', () => {
    const out = run(player([die(1, 'pv2'), die(2, 'x2gold')]));
    expect(out.player.gold).toBe(0);
    expect(out.resolution.events.some((e) => e.step === 'multiplier')).toBe(false);
  });

  it('combo paga si OTRO dado muestra la familia requerida', () => {
    expect(run(player([die(1, 'combo_gold'), die(2, 'g1')])).player.gold).toBe(4);
    const miss = run(player([die(1, 'combo_gold'), die(2, 'pv1')]));
    expect(miss.player.gold).toBe(0);
    expect(miss.player.pv).toBe(1);
    expect(miss.resolution.events[0]).toMatchObject({ step: 'combo', textKey: 'ev.comboMiss' });
  });

  it('riesgo: paga con el RNG a favor y nada en contra', () => {
    expect(run(player([die(1, 'risk_gold')]), always).player.gold).toBe(6);
    const miss = run(player([die(1, 'risk_gold')]), never);
    expect(miss.player.gold).toBe(0);
    expect(miss.resolution.events[0]).toMatchObject({ step: 'risk', textKey: 'ev.riskMiss' });
  });

  it('Espejo copia la mejor cara de ganancia de otro dado (pv*3 + oro); sin candidatas es vacía', () => {
    const out = run(player([die(1, 'control_copy'), die(2, 'g3'), die(3, 'pv2')]));
    expect(out.player.pv).toBe(4);
    expect(out.player.gold).toBe(3);
    expect(out.resolution.events[0]).toMatchObject({ step: 'control', textKey: 'ev.mirror', params: { copied: 'Corona' } });
    const none = run(player([die(1, 'control_copy'), die(2, 'x2gold')]));
    expect(none.player.gold + none.player.pv).toBe(0);
    expect(none.resolution.events[0]).toMatchObject({ textKey: 'ev.mirrorNone' });
  });

  it('meta: Legado escala con dados permanentes y Tesorero con cartas', () => {
    const p4 = player([die(1, 'meta_dice'), S, S, S]);
    expect(run(p4, never, [{ dieId: 1, faceIndex: 0 }]).player.pv).toBe(2);
    const pc = player([die(1, 'meta_cards')], { cards: ['card_reroll', 'card_tax'] });
    expect(run(pc).player.gold).toBe(2);
  });

  it('cartas de tirada: Mina siempre, Manos grandes solo con ≥ 3 dados; no se multiplican', () => {
    expect(run(player([S], { cards: ['card_income'] })).player.gold).toBe(2);
    expect(run(player([S, S], { cards: ['card_bigroll'] })).player.gold).toBe(2);
    expect(run(player([S, S, S], { cards: ['card_bigroll'] })).player.gold).toBe(4);
    expect(run(player([die(1, 'g3'), die(2, 'x2gold')], { cards: ['card_income'] })).player.gold).toBe(7);
  });

  it('Alquimia convierte 3 oro en 2 PV tras abonar, solo si puede pagar', () => {
    const ok = run(player([die(1, 'convert'), die(2, 'g2')], { gold: 2 }));
    expect(ok.player.gold).toBe(1);
    expect(ok.player.pv).toBe(2);
    expect(ok.resolution).toMatchObject({ gold: -1, pv: 2 });
    const fail = run(player([die(1, 'convert')], { gold: 2 }));
    expect(fail.player.gold).toBe(2);
    expect(fail.resolution.events[0]).toMatchObject({ step: 'convert', textKey: 'ev.convertFail' });
  });

  it('Chispa añade un dado temporal; Semilla añade uno permanente y se consume', () => {
    const t = run(player([die(1, 'spawn_temp')]));
    expect(t.player.dice).toHaveLength(2);
    expect(t.player.dice[1]).toMatchObject({ id: 100, temporary: true });
    expect(t.nextDieId).toBe(101);
    const p = run(player([die(1, 'spawn_perm')]));
    expect(p.player.dice[1]).toMatchObject({ id: 100, temporary: false });
    expect(p.player.dice[0]?.faces[0]).toBe('blank');
  });

  it('hasFreeRerollFace detecta Segunda oportunidad en la tirada', () => {
    const p = player([die(1, 'control_reroll'), S]);
    expect(hasFreeRerollFace(p, rolledZero(p))).toBe(true);
    expect(hasFreeRerollFace(p, [{ dieId: 1, faceIndex: 1 }])).toBe(false);
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/core/resolver.test.ts` → FAIL.

- [ ] **Step 3: Implementación** — `src/core/resolver.ts`:

```ts
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
  return { ...p, cards: [...p.cards], dice: p.dice.map((d) => ({ ...d, faces: [...d.faces] as DieFaces })) };
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
      step: 'control', dieId: s.dieId, faceId: s.original.id, gold: 0, pv: 0,
      textKey: best ? 'ev.mirror' : 'ev.mirrorNone', params: { copied: s.face.name },
    });
  }

  // 2. Ganancias base
  let gold = 0;
  let pv = 0;
  for (const s of slots) {
    const e = s.face.effect;
    if (e.kind === 'gain') {
      gold += e.gold ?? 0; pv += e.pv ?? 0;
      events.push({ step: 'gain', dieId: s.dieId, faceId: s.face.id, gold: e.gold ?? 0, pv: e.pv ?? 0, textKey: 'ev.gain' });
    } else if (e.kind === 'risk') {
      const hit = rng.chance(e.chance);
      const g = hit ? (e.gold ?? 0) : 0;
      const p = hit ? (e.pv ?? 0) : 0;
      gold += g; pv += p;
      events.push({ step: 'risk', dieId: s.dieId, faceId: s.face.id, gold: g, pv: p, textKey: hit ? 'ev.riskHit' : 'ev.riskMiss' });
    } else if (e.kind === 'scaling') {
      const n = e.per === 'dice' ? permanentDice : player.cards.length;
      const times = Math.floor(n / e.every);
      const g = (e.gold ?? 0) * times;
      const p = (e.pv ?? 0) * times;
      gold += g; pv += p;
      events.push({ step: 'scaling', dieId: s.dieId, faceId: s.face.id, gold: g, pv: p, textKey: 'ev.scaling', params: { n } });
    } else if (e.kind === 'combo') {
      const ok = slots.some((o) => o !== s && o.face.family === e.requires);
      const g = ok ? (e.gold ?? 0) : 0;
      const p = ok ? (e.pv ?? 0) : 0;
      gold += g; pv += p;
      events.push({ step: 'combo', dieId: s.dieId, faceId: s.face.id, gold: g, pv: p, textKey: ok ? 'ev.comboHit' : 'ev.comboMiss' });
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
    events.push({ step: 'multiplier', dieId: first.dieId, faceId: first.face.id, gold: gold - before, pv: 0, textKey: 'ev.multiplier', params: { factor } });
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
      gold -= e.amount; pv += e.yield;
      events.push({ step: 'convert', dieId: s.dieId, faceId: s.face.id, gold: -e.amount, pv: e.yield, textKey: 'ev.convert' });
    } else {
      events.push({ step: 'convert', dieId: s.dieId, faceId: s.face.id, gold: 0, pv: 0, textKey: 'ev.convertFail' });
    }
  }

  // 7. Generadores
  for (const s of slots) {
    const e = s.face.effect;
    if (e.kind !== 'spawn') continue;
    const newDie = createDie(nextDieId++, STARTER_FACES, !e.permanent);
    let dice = [...player.dice, newDie];
    if (e.permanent) dice = dice.map((d) => (d.id === s.dieId ? replaceFace(d, s.faceIndex, 'blank') : d));
    player = { ...player, dice };
    events.push({ step: 'spawn', dieId: s.dieId, faceId: s.face.id, gold: 0, pv: 0, textKey: e.permanent ? 'ev.spawnPerm' : 'ev.spawnTemp', params: { newDieId: newDie.id } });
  }

  return { player, nextDieId, resolution: { gold, pv, events } };
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/core/resolver.test.ts` → `14 passed`.
- [ ] **Step 5: Commit**: `npm run check && git add src/core/resolver.ts src/core/resolver.test.ts && git commit -m "feat(CORE.3): resolver de tiradas con orden de resolución y eventos explicables"`.

---

### Tarea 6: Economía y tienda `[CORE.4]`

**Goal:** Precios con descuentos y mínimos, valor esperado heurístico (para bots y simulador) y la tienda común con mazo de 64, 5 slots, huecos hasta fin de ronda y rotación del más antiguo (diseño §3.3).

**Files:**
- Create: `src/core/economy.ts`, `src/core/shop.ts`
- Test: `src/core/economy.test.ts`, `src/core/shop.test.ts`

**Interfaces:**
- Produces (`economy.ts`): `BASE_DIE_PRICE = 8`, `DIE_PRICE_STEP = 4`, `MIN_DIE_PRICE = 3`, `MIN_FACE_PRICE = 1`, `STARTING_DICE = 2`; `interface EV { gold: number; pv: number }`; `interface EvContext { permanentDice: number; cards: number }`; `permanentDice(p): Die[]`, `hasCard(p, id)`, `discountFor(p, 'face'|'die')`, `facePrice(faceId, p)`, `cardPrice(cardId)`, `diePrice(p)`, `itemPrice(item, p)`, `itemId(item): string` (`face:g3` / `card:card_income`), `faceEV(faceId, ctx): EV` (por tirada DE ESA CARA), `dieEV(die, ctx): EV` (por tirada del dado = media de sus 6 caras), `evContext(p): EvContext`.
- Produces (`shop.ts`): `SHOP_SLOTS = 5`, `MAX_PURCHASES_PER_TURN = 2`, `FACE_COPIES = 3`, `CARD_COPIES = 2`; `buildDeck(): ShopItem[]`, `createShop(rng): ShopState`, `takeSlot(shop, slot): { shop, item }`, `refreshShop(shop, rng): ShopState`.

**Done when:** tests verdes; `buildDeck()` tiene 64 ítems.

- [ ] **Step 1: Test rojo de economía** — `src/core/economy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { createDie } from './dice';
import { dieEV, diePrice, faceEV, facePrice, itemId, itemPrice } from './economy';
import type { PlayerState } from './types';

const p = (over: Partial<PlayerState> = {}): PlayerState => ({
  seat: 0, name: 'P', kind: 'human', gold: 0, pv: 0, dice: [createDie(1), createDie(2)], cards: [], objective: 'obj_purist', ...over,
});

describe('precios', () => {
  it('facePrice aplica el Gremio con mínimo 1 y rechaza caras no comprables', () => {
    expect(facePrice('g3', p())).toBe(3);
    expect(facePrice('g3', p({ cards: ['card_cheapfaces'] }))).toBe(2);
    expect(facePrice('meta_cards', p({ cards: ['card_cheapfaces', 'card_cheapfaces', 'card_cheapfaces'] }))).toBe(1);
    expect(() => facePrice('g1', p())).toThrow(/no es comprable/);
  });

  it('diePrice escala 8, 12, 16; Fundición resta 3 con mínimo 3; los temporales no cuentan', () => {
    expect(diePrice(p())).toBe(8);
    expect(diePrice(p({ dice: [createDie(1), createDie(2), createDie(3)] }))).toBe(12);
    expect(diePrice(p({ dice: [createDie(1), createDie(2), createDie(3), createDie(4)] }))).toBe(16);
    expect(diePrice(p({ cards: ['card_cheapdice'] }))).toBe(5);
    expect(diePrice(p({ dice: [createDie(1)], cards: ['card_cheapdice'] }))).toBe(3);
    expect(diePrice(p({ dice: [createDie(1), createDie(2), createDie(3, STARTER_FACES, true)] }))).toBe(8);
  });

  it('itemPrice e itemId', () => {
    expect(itemPrice({ kind: 'card', cardId: 'card_income' }, p())).toBe(6);
    expect(itemPrice({ kind: 'face', faceId: 'pv3' }, p())).toBe(8);
    expect(itemId({ kind: 'face', faceId: 'g3' })).toBe('face:g3');
    expect(itemId({ kind: 'card', cardId: 'card_tax' })).toBe('card:card_tax');
  });
});

describe('valor esperado', () => {
  const ctx = { permanentDice: 2, cards: 0 };
  it('valores de referencia por familia', () => {
    expect(faceEV('g3', ctx)).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('risk_gold', ctx)).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('risk_pv', ctx)).toEqual({ gold: 0, pv: 2 });
    expect(faceEV('combo_pv', ctx)).toEqual({ gold: 0, pv: 1 });
    expect(faceEV('blank', ctx)).toEqual({ gold: 0, pv: 0 });
    expect(faceEV('meta_dice', { permanentDice: 5, cards: 0 })).toEqual({ gold: 0, pv: 2 });
    expect(faceEV('meta_cards', { permanentDice: 2, cards: 3 })).toEqual({ gold: 3, pv: 0 });
    expect(faceEV('x2gold', ctx).gold).toBeGreaterThan(0);
  });
  it('dieEV del starter es 1 oro y 1/6 PV por tirada', () => {
    expect(dieEV(createDie(1), ctx)).toEqual({ gold: 1, pv: 1 / 6 });
  });
});
```

- [ ] **Step 2: Test rojo de tienda** — `src/core/shop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { buildDeck, createShop, refreshShop, takeSlot } from './shop';
import type { ShopState } from './types';

describe('shop', () => {
  it('el mazo tiene 64 ítems: 16 caras ×3 y 8 cartas ×2', () => {
    const d = buildDeck();
    expect(d).toHaveLength(64);
    expect(d.filter((i) => i.kind === 'face')).toHaveLength(48);
    expect(d.filter((i) => i.kind === 'card')).toHaveLength(16);
  });

  it('createShop llena 5 slots, deja 59 en el mazo y es determinista', () => {
    const s = createShop(Rng.fromSeed(1));
    expect(s.slots.every(Boolean)).toBe(true);
    expect(s.deck).toHaveLength(59);
    expect(s.slotAge).toEqual([0, 0, 0, 0, 0]);
    expect(s).toEqual(createShop(Rng.fromSeed(1)));
  });

  it('takeSlot vacía el slot sin tocar el mazo y lanza si está vacío', () => {
    const s = createShop(Rng.fromSeed(1));
    const t = takeSlot(s, 2);
    expect(t.item).toEqual(s.slots[2]);
    expect(t.shop.slots[2]).toBeNull();
    expect(t.shop.deck).toHaveLength(59);
    expect(() => takeSlot(t.shop, 2)).toThrow(RangeError);
    expect(() => takeSlot(s, 5)).toThrow(RangeError);
  });

  it('refreshShop descarta el ocupado más antiguo, envejece el resto y rellena huecos', () => {
    const rng = Rng.fromSeed(2);
    let s = createShop(rng);
    s = takeSlot(s, 2).shop;
    const before = [...s.slots];
    s = refreshShop(s, rng);
    expect(s.slots.every(Boolean)).toBe(true);
    expect(s.slots[0]).not.toBe(before[0]);
    expect(s.discard).toEqual([before[0]]);
    expect(s.slotAge).toEqual([0, 1, 0, 1, 1]);
    expect(s.deck).toHaveLength(57);
  });

  it('cuando el mazo se agota se rebaraja el descarte', () => {
    const s: ShopState = {
      slots: [null, null, null, null, null], slotAge: [0, 0, 0, 0, 0], deck: [],
      discard: [{ kind: 'face', faceId: 'g3' }, { kind: 'card', cardId: 'card_income' }],
    };
    const out = refreshShop(s, Rng.fromSeed(3));
    expect(out.slots.filter(Boolean)).toHaveLength(2);
    expect(out.discard).toEqual([]);
    expect(out.deck).toEqual([]);
  });
});
```

- [ ] **Step 3: Rojo**: `npx vitest run src/core/economy.test.ts src/core/shop.test.ts` → FAIL.

- [ ] **Step 4: `src/core/economy.ts`**:

```ts
import { card } from './data/cards';
import { face } from './data/faces';
import type { CardId, Die, FaceId, PlayerState, ShopItem } from './types';

export const BASE_DIE_PRICE = 8;
export const DIE_PRICE_STEP = 4;
export const MIN_DIE_PRICE = 3;
export const MIN_FACE_PRICE = 1;
export const STARTING_DICE = 2;

export interface EV {
  gold: number;
  pv: number;
}
export interface EvContext {
  permanentDice: number;
  cards: number;
}

export function permanentDice(p: PlayerState): Die[] {
  return p.dice.filter((d) => !d.temporary);
}

export function hasCard(p: PlayerState, id: CardId): boolean {
  return p.cards.includes(id);
}

export function discountFor(p: PlayerState, target: 'face' | 'die'): number {
  let total = 0;
  for (const id of p.cards) {
    const e = card(id).effect;
    if (e.kind === 'discount' && e.target === target) total += e.amount;
  }
  return total;
}

export function facePrice(faceId: FaceId, p: PlayerState): number {
  const cost = face(faceId).cost;
  if (cost === null) throw new Error(`La cara ${faceId} no es comprable`);
  return Math.max(MIN_FACE_PRICE, cost - discountFor(p, 'face'));
}

export function cardPrice(cardId: CardId): number {
  return card(cardId).cost;
}

export function diePrice(p: PlayerState): number {
  const n = permanentDice(p).length;
  return Math.max(MIN_DIE_PRICE, BASE_DIE_PRICE + DIE_PRICE_STEP * (n - STARTING_DICE) - discountFor(p, 'die'));
}

export function itemPrice(item: ShopItem, p: PlayerState): number {
  return item.kind === 'face' ? facePrice(item.faceId, p) : cardPrice(item.cardId);
}

export function itemId(item: ShopItem): string {
  return item.kind === 'face' ? `face:${item.faceId}` : `card:${item.cardId}`;
}

/**
 * Valor esperado POR TIRADA DE ESA CARA (no por tirada del dado). Heurístico para
 * bots y simulador; no lo usa el resolver.
 */
export function faceEV(faceId: FaceId, ctx: EvContext): EV {
  const e = face(faceId).effect;
  switch (e.kind) {
    case 'blank':
      return { gold: 0, pv: 0 };
    case 'gain':
      return { gold: e.gold ?? 0, pv: e.pv ?? 0 };
    case 'risk':
      return { gold: (e.gold ?? 0) * e.chance, pv: (e.pv ?? 0) * e.chance };
    case 'multiplier':
      // Duplica ~1 oro por cada OTRO dado de la tirada.
      return { gold: Math.max(0, ctx.permanentDice - 1), pv: 0 };
    case 'combo':
      return { gold: (e.gold ?? 0) * 0.5, pv: (e.pv ?? 0) * 0.5 };
    case 'spawn':
      return e.permanent ? { gold: 2, pv: 0.33 } : { gold: 1, pv: 0.17 };
    case 'control':
      return e.mode === 'copyBest' ? { gold: 1.5, pv: 0.3 } : { gold: 0.5, pv: 0 };
    case 'convert':
      return { gold: -e.amount * 0.8, pv: e.yield * 0.8 };
    case 'scaling': {
      const n = e.per === 'dice' ? ctx.permanentDice : ctx.cards;
      const t = Math.floor(n / e.every);
      return { gold: (e.gold ?? 0) * t, pv: (e.pv ?? 0) * t };
    }
  }
}

export function dieEV(die: Die, ctx: EvContext): EV {
  let gold = 0;
  let pv = 0;
  for (const id of die.faces) {
    const ev = faceEV(id, ctx);
    gold += ev.gold;
    pv += ev.pv;
  }
  return { gold: gold / 6, pv: pv / 6 };
}

export function evContext(p: PlayerState): EvContext {
  return { permanentDice: permanentDice(p).length, cards: p.cards.length };
}
```

- [ ] **Step 5: `src/core/shop.ts`**:

```ts
import { CARD_IDS } from './data/cards';
import { BUYABLE_FACE_IDS } from './data/faces';
import type { RandomSource } from './rng';
import type { ShopItem, ShopState } from './types';

export const SHOP_SLOTS = 5;
export const MAX_PURCHASES_PER_TURN = 2;
export const FACE_COPIES = 3;
export const CARD_COPIES = 2;

export function buildDeck(): ShopItem[] {
  const deck: ShopItem[] = [];
  for (const faceId of BUYABLE_FACE_IDS) for (let i = 0; i < FACE_COPIES; i++) deck.push({ kind: 'face', faceId });
  for (const cardId of CARD_IDS) for (let i = 0; i < CARD_COPIES; i++) deck.push({ kind: 'card', cardId });
  return deck;
}

function fillEmpty(shop: ShopState, rng: RandomSource): ShopState {
  const slots = [...shop.slots];
  const slotAge = [...shop.slotAge];
  let deck = [...shop.deck];
  let discard = [...shop.discard];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    if (slots[i]) continue;
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = rng.shuffle(discard);
      discard = [];
    }
    slots[i] = deck.shift() as ShopItem;
    slotAge[i] = 0;
  }
  return { slots, slotAge, deck, discard };
}

export function createShop(rng: RandomSource): ShopState {
  return fillEmpty(
    { slots: Array<ShopItem | null>(SHOP_SLOTS).fill(null), slotAge: Array<number>(SHOP_SLOTS).fill(0), deck: rng.shuffle(buildDeck()), discard: [] },
    rng,
  );
}

export function takeSlot(shop: ShopState, slot: number): { shop: ShopState; item: ShopItem } {
  const item = slot >= 0 && slot < SHOP_SLOTS ? shop.slots[slot] : null;
  if (!item) throw new RangeError(`Slot vacío o inválido: ${slot}`);
  const slots = [...shop.slots];
  slots[slot] = null;
  return { shop: { ...shop, slots }, item };
}

/** Fin de ronda: descarta el ocupado más antiguo (empate → índice menor), envejece y rellena. */
export function refreshShop(shop: ShopState, rng: RandomSource): ShopState {
  const slots = [...shop.slots];
  const slotAge = [...shop.slotAge];
  const discard = [...shop.discard];
  let oldest = -1;
  for (let i = 0; i < SHOP_SLOTS; i++) {
    if (!slots[i]) continue;
    if (oldest === -1 || (slotAge[i] as number) > (slotAge[oldest] as number)) oldest = i;
  }
  if (oldest !== -1) {
    discard.push(slots[oldest] as ShopItem);
    slots[oldest] = null;
  }
  for (let i = 0; i < SHOP_SLOTS; i++) if (slots[i]) slotAge[i] = (slotAge[i] as number) + 1;
  return fillEmpty({ ...shop, slots, slotAge, discard }, rng);
}
```

- [ ] **Step 6: Verde**: `npx vitest run src/core/economy.test.ts src/core/shop.test.ts` → `10 passed`.
- [ ] **Step 7: Commit**: `npm run check && git add src/core/economy.ts src/core/shop.ts src/core/economy.test.ts src/core/shop.test.ts && git commit -m "feat(CORE.4): economía (precios, descuentos, EV) y tienda con mazo de 64"`.

---

### Tarea 7: Objetivos y puntuación final `[CORE.5]`

**Goal:** Evaluar los 8 objetivos secretos con progreso (para la UI y los bots) y calcular la puntuación final con cartas de puntuación y desempate por oro.

**Files:**
- Create: `src/core/objectives.ts`, `src/core/scoring.ts`
- Test: `src/core/objectives.test.ts`, `src/core/scoring.test.ts`

**Interfaces:**
- Produces: `interface ObjectiveProgress { objective: ObjectiveDef; current: number; target: number; achieved: boolean }`; `objectiveProgress(p): ObjectiveProgress`; `cardEndScore(p): number`; `finalScores(players): FinalScore[]`; `determineWinners(scores): number[]`.

**Done when:** un test por objetivo (cumplido y no cumplido), cartas de puntuación y desempates verdes.

- [ ] **Step 1: Test rojo** — `src/core/objectives.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STARTER_FACES } from './data/faces';
import { createDie, replaceFace } from './dice';
import { objectiveProgress } from './objectives';
import type { DieFaces, PlayerState } from './types';

const p = (objective: string, over: Partial<PlayerState> = {}): PlayerState => ({
  seat: 0, name: 'P', kind: 'human', gold: 0, pv: 0, dice: [createDie(1), createDie(2)], cards: [], objective, ...over,
});
const F = (...ids: string[]): DieFaces => ids as DieFaces;

describe('objectiveProgress', () => {
  it('Ingeniero: ≥ 4 dados permanentes (los temporales no cuentan)', () => {
    expect(objectiveProgress(p('obj_engineer'))).toMatchObject({ current: 2, target: 4, achieved: false });
    const four = p('obj_engineer', { dice: [createDie(1), createDie(2), createDie(3), createDie(4), createDie(5, STARTER_FACES, true)] });
    expect(objectiveProgress(four)).toMatchObject({ current: 4, achieved: true });
  });
  it('Magnate: ≥ 12 oro', () => {
    expect(objectiveProgress(p('obj_magnate', { gold: 11 })).achieved).toBe(false);
    expect(objectiveProgress(p('obj_magnate', { gold: 12 })).achieved).toBe(true);
  });
  it('Purista: ningún blank', () => {
    expect(objectiveProgress(p('obj_purist'))).toMatchObject({ current: 0, target: 2, achieved: false });
    const clean = p('obj_purist', { dice: [replaceFace(createDie(1), 5, 'g3'), replaceFace(createDie(2), 5, 'pv2')] });
    expect(objectiveProgress(clean).achieved).toBe(true);
  });
  it('Apostador: ≥ 3 caras de riesgo', () => {
    const d = createDie(1, F('risk_gold', 'risk_pv', 'risk_gold', 'g1', 'g1', 'blank'));
    expect(objectiveProgress(p('obj_gambler', { dice: [d] }))).toMatchObject({ current: 3, achieved: true });
    expect(objectiveProgress(p('obj_gambler')).achieved).toBe(false);
  });
  it('Coleccionista: ≥ 3 cartas', () => {
    expect(objectiveProgress(p('obj_collector', { cards: ['card_tax', 'card_reroll', 'card_income'] })).achieved).toBe(true);
    expect(objectiveProgress(p('obj_collector', { cards: ['card_tax'] })).achieved).toBe(false);
  });
  it('Forjador: ≥ 6 caras compradas', () => {
    const d = createDie(1, F('g3', 'g3', 'g4', 'pv2', 'pv3', 'x2gold'));
    expect(objectiveProgress(p('obj_smith', { dice: [d] }))).toMatchObject({ current: 6, achieved: true });
    expect(objectiveProgress(p('obj_smith')).current).toBe(0);
  });
  it('Puntuador: ≥ 4 caras PV', () => {
    const d = createDie(1, F('pv1', 'pv2', 'pv3', 'pv1', 'g1', 'blank'));
    expect(objectiveProgress(p('obj_scorer', { dice: [d] })).achieved).toBe(true);
    expect(objectiveProgress(p('obj_scorer')).current).toBe(2);
  });
  it('Equilibrado: cada dado con ≥ 1 PV y ≥ 1 economía', () => {
    expect(objectiveProgress(p('obj_balanced')).achieved).toBe(true);
    const bad = p('obj_balanced', { dice: [createDie(1), createDie(2, F('g1', 'g1', 'g2', 'g2', 'g3', 'blank'))] });
    expect(objectiveProgress(bad)).toMatchObject({ current: 1, target: 2, achieved: false });
  });
});
```

`src/core/scoring.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createDie } from './dice';
import { cardEndScore, determineWinners, finalScores } from './scoring';
import type { PlayerState } from './types';

const p = (seat: number, over: Partial<PlayerState> = {}): PlayerState => ({
  seat, name: `P${seat}`, kind: 'bot', gold: 0, pv: 0, dice: [createDie(1), createDie(2)], cards: [], objective: 'obj_purist', ...over,
});

describe('scoring', () => {
  it('Arsenal: +2 PV por dado a partir del tercero', () => {
    expect(cardEndScore(p(0, { cards: ['card_score_dice'] }))).toBe(0);
    expect(cardEndScore(p(0, { cards: ['card_score_dice'], dice: [createDie(1), createDie(2), createDie(3)] }))).toBe(2);
    expect(cardEndScore(p(0, { cards: ['card_score_dice'], dice: [1, 2, 3, 4, 5].map((i) => createDie(i)) }))).toBe(6);
  });
  it('Tesoro: +1 PV por cada 4 oro', () => {
    expect(cardEndScore(p(0, { cards: ['card_score_gold'], gold: 9 }))).toBe(2);
    expect(cardEndScore(p(0, { cards: ['card_score_gold'], gold: 3 }))).toBe(0);
  });
  it('finalScores suma PV base + objetivo + cartas', () => {
    const magnate = p(0, { objective: 'obj_magnate', gold: 12, pv: 10, cards: ['card_score_gold'] });
    const [s] = finalScores([magnate]);
    expect(s).toMatchObject({ seat: 0, basePv: 10, objectivePv: 5, objectiveAchieved: true, cardPv: 3, total: 18, gold: 12 });
  });
  it('gana el mayor total; empate → más oro; empate total → varios ganadores', () => {
    const scores = finalScores([p(0, { pv: 10, gold: 3 }), p(1, { pv: 10, gold: 5 }), p(2, { pv: 4, gold: 30 })]);
    expect(determineWinners(scores)).toEqual([1]);
    const tie = finalScores([p(0, { pv: 10, gold: 5 }), p(1, { pv: 10, gold: 5 })]);
    expect(determineWinners(tie)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/core/objectives.test.ts src/core/scoring.test.ts` → FAIL.

- [ ] **Step 3: `src/core/objectives.ts`**:

```ts
import { face } from './data/faces';
import { objective } from './data/objectives';
import { countFaces } from './dice';
import { permanentDice } from './economy';
import type { ObjectiveDef, PlayerState } from './types';

export interface ObjectiveProgress {
  objective: ObjectiveDef;
  current: number;
  target: number;
  achieved: boolean;
}

export function objectiveProgress(p: PlayerState): ObjectiveProgress {
  const def = objective(p.objective);
  const dice = permanentDice(p);
  const c = def.check;
  let current = 0;
  let target = 1;
  switch (c.kind) {
    case 'minDice':
      current = dice.length; target = c.count; break;
    case 'minGold':
      current = p.gold; target = c.amount; break;
    case 'noBlank':
      current = dice.filter((d) => !d.faces.includes('blank')).length; target = dice.length; break;
    case 'minFamilyFaces':
      current = countFaces(dice, (f) => f.family === c.family); target = c.count; break;
    case 'minCards':
      current = p.cards.length; target = c.count; break;
    case 'minBoughtFaces':
      current = countFaces(dice, (f) => f.cost !== null); target = c.count; break;
    case 'everyDieHas':
      current = dice.filter((d) => c.families.every((fam) => d.faces.some((id) => face(id).family === fam))).length;
      target = dice.length;
      break;
  }
  return { objective: def, current, target, achieved: target > 0 && current >= target };
}
```

`src/core/scoring.ts`:
```ts
import { card } from './data/cards';
import { permanentDice } from './economy';
import { objectiveProgress } from './objectives';
import type { FinalScore, PlayerState } from './types';

export function cardEndScore(p: PlayerState): number {
  let pv = 0;
  const dice = permanentDice(p).length;
  for (const id of p.cards) {
    const e = card(id).effect;
    if (e.kind !== 'endScore') continue;
    if (e.per === 'dice') pv += Math.max(0, dice - ((e.from ?? 1) - 1)) * e.pv;
    else pv += Math.floor(p.gold / (e.every ?? 1)) * e.pv;
  }
  return pv;
}

export function finalScores(players: readonly PlayerState[]): FinalScore[] {
  return players.map((p) => {
    const prog = objectiveProgress(p);
    const objectivePv = prog.achieved ? prog.objective.pv : 0;
    const cardPv = cardEndScore(p);
    return { seat: p.seat, basePv: p.pv, objectivePv, objectiveAchieved: prog.achieved, cardPv, total: p.pv + objectivePv + cardPv, gold: p.gold };
  });
}

export function determineWinners(scores: readonly FinalScore[]): number[] {
  const maxTotal = Math.max(...scores.map((s) => s.total));
  const top = scores.filter((s) => s.total === maxTotal);
  const maxGold = Math.max(...top.map((s) => s.gold));
  return top.filter((s) => s.gold === maxGold).map((s) => s.seat);
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/core/objectives.test.ts src/core/scoring.test.ts` → `12 passed`.
- [ ] **Step 5: Commit**: `npm run check && git add src/core/objectives.ts src/core/scoring.ts src/core/objectives.test.ts src/core/scoring.test.ts && git commit -m "feat(CORE.5): objetivos secretos con progreso y puntuación final"`.

---

### Tarea 8: Máquina de estados de partida + save `[CORE.6]`

**Goal:** Un reducer puro `applyAction(state, action)` que lleva una partida de principio a fin (rondas, turnos rotatorios, tirada, mitigación, resolución, tienda, límite de compras, dados temporales, impuesto del Recaudador, puntuación final) y un `legalActions(state)` que enumera lo posible. Más serialización con validación para el autosave.

**Files:**
- Create: `src/core/game.ts`, `src/core/serialize.ts`
- Test: `src/core/game.test.ts`, `src/core/serialize.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `class IllegalActionError extends Error`; constantes `DEFAULT_ROUNDS = 8`, `MIN_ROUNDS = 2`, `MAX_ROUNDS = 8`, `MIN_PLAYERS = 2`, `MAX_PLAYERS = 4`, `STARTING_GOLD = 5`, `REROLL_COST = 2`, `LOG_LIMIT = 200`; `seatForTurn(playerCount, round, turnIndex): number`; `createGame(config): GameState`; `currentPlayer(state): PlayerState`; `remainingRounds(state): number` (= `rounds − round`, tiradas futuras que verán una compra); `rerollCost(state): number`; `applyAction(state, action): GameState` (puro; lanza `IllegalActionError`); `legalActions(state): GameAction[]` (`endTurn`/`pass` siempre en posición 0 cuando aplican). `serialize.ts`: `SAVE_VERSION = 1`, `toSave(state, savedAt: number): string`, `fromSave(json: string): GameState | null`.

**Done when:** tests verdes; una partida de 2 jugadores × 2 rondas se completa con solo `roll/pass/endTurn`; misma semilla + mismas acciones ⇒ mismo JSON final.

- [ ] **Step 1: Test rojo** — `src/core/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diePrice } from './economy';
import { IllegalActionError, applyAction, createGame, currentPlayer, legalActions, seatForTurn } from './game';
import type { DieFaces, GameAction, GameConfig, GameState } from './types';

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({
  seats: [{ name: 'Ana', kind: 'human' }, { name: 'Bot', kind: 'bot', archetype: 'balanced' }],
  rounds: 2,
  seed: 7,
  ...over,
});
const act = (s: GameState, ...actions: GameAction[]): GameState => actions.reduce((st, a) => applyAction(st, a), s);
/** Turno mínimo: tirar, pasar, terminar. */
const skipTurn = (s: GameState): GameState => act(s, { type: 'roll' }, { type: 'pass' }, { type: 'endTurn' });
const withPlayer = (s: GameState, seat: number, patch: Partial<GameState['players'][number]>): GameState => ({
  ...s,
  players: s.players.map((p) => (p.seat === seat ? { ...p, ...patch } : p)),
});

describe('createGame', () => {
  it('estado inicial: 5 oro, 0 PV, 2 dados starter, objetivo único, tienda llena', () => {
    const s = createGame(cfg());
    expect(s.phase).toBe('roll');
    expect(s.round).toBe(1);
    expect(s.currentSeat).toBe(0);
    for (const p of s.players) {
      expect(p.gold).toBe(5);
      expect(p.pv).toBe(0);
      expect(p.dice).toHaveLength(2);
    }
    expect(new Set(s.players.map((p) => p.objective)).size).toBe(2);
    expect(s.shop.slots.every(Boolean)).toBe(true);
    expect(s.nextDieId).toBe(5);
  });

  it('valida jugadores y rondas', () => {
    expect(() => createGame(cfg({ seats: [{ name: 'Solo', kind: 'human' }] }))).toThrow(RangeError);
    expect(() => createGame(cfg({ rounds: 9 }))).toThrow(RangeError);
    expect(() => createGame(cfg({ rounds: 1 }))).toThrow(RangeError);
  });

  it('misma configuración ⇒ mismo estado', () => {
    expect(JSON.stringify(createGame(cfg()))).toBe(JSON.stringify(createGame(cfg())));
  });
});

describe('flujo de turno', () => {
  it('roll → mitigate → pass → shop → endTurn → siguiente jugador', () => {
    let s = createGame(cfg());
    s = applyAction(s, { type: 'roll' });
    expect(s.phase).toBe('mitigate');
    expect(s.roll?.results).toHaveLength(2);
    s = applyAction(s, { type: 'pass' });
    expect(s.phase).toBe('shop');
    expect(s.lastResolution).not.toBeNull();
    s = applyAction(s, { type: 'endTurn' });
    expect(s.currentSeat).toBe(1);
    expect(s.phase).toBe('roll');
    expect(s.round).toBe(1);
  });

  it('acciones fuera de fase lanzan IllegalActionError', () => {
    const s = createGame(cfg());
    expect(() => applyAction(s, { type: 'pass' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'endTurn' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'buyDie' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, { type: 'reroll', dieId: 1 })).toThrow(IllegalActionError);
  });

  it('el orden de turno rota cada ronda', () => {
    expect(seatForTurn(3, 1, 0)).toBe(0);
    expect(seatForTurn(3, 2, 0)).toBe(1);
    expect(seatForTurn(3, 2, 2)).toBe(0);
    let s = createGame(cfg({ seats: [{ name: 'A', kind: 'bot' }, { name: 'B', kind: 'bot' }, { name: 'C', kind: 'bot' }], rounds: 3 }));
    s = skipTurn(skipTurn(skipTurn(s)));
    expect(s.round).toBe(2);
    expect(s.currentSeat).toBe(1);
  });

  it('la partida termina tras la última ronda con puntuaciones y ganadores', () => {
    let s = createGame(cfg());
    for (let i = 0; i < 4; i++) s = skipTurn(s);
    expect(s.phase).toBe('gameOver');
    expect(s.finalScores).toHaveLength(2);
    expect(s.winners?.length).toBeGreaterThan(0);
    expect(() => applyAction(s, { type: 'roll' })).toThrow(IllegalActionError);
    expect(legalActions(s)).toEqual([]);
  });

  it('la tirada abona al jugador actual exactamente lo que dice la resolución', () => {
    let s = createGame(cfg());
    s = act(s, { type: 'roll' }, { type: 'pass' });
    const me = currentPlayer(s);
    expect(me.gold - 5).toBe(s.lastResolution?.gold);
    expect(me.pv).toBe(s.lastResolution?.pv);
    expect(s.log).toEqual(s.lastResolution?.events);
  });
});

describe('mitigación', () => {
  it('relanzar cuesta 2 oro, solo una vez, y cambia solo ese dado', () => {
    let s = applyAction(createGame(cfg()), { type: 'roll' });
    const before = s.roll!.results;
    s = applyAction(s, { type: 'reroll', dieId: before[1]!.dieId });
    expect(currentPlayer(s).gold).toBe(3);
    expect(s.roll!.results[0]).toEqual(before[0]);
    expect(s.roll!.rerollUsed).toBe(true);
    expect(() => applyAction(s, { type: 'reroll', dieId: before[0]!.dieId })).toThrow(IllegalActionError);
    expect(legalActions(s)).toEqual([{ type: 'pass' }]);
  });

  it('relanzar es gratis con Dado cargado y no se ofrece sin oro', () => {
    let s = withPlayer(createGame(cfg()), 0, { cards: ['card_reroll'] });
    s = applyAction(s, { type: 'roll' });
    expect(s.roll!.freeReroll).toBe(true);
    s = applyAction(s, { type: 'reroll', dieId: 1 });
    expect(currentPlayer(s).gold).toBe(5);
    let poor = withPlayer(createGame(cfg()), 0, { gold: 1 });
    poor = applyAction(poor, { type: 'roll' });
    expect(legalActions(poor)).toEqual([{ type: 'pass' }]);
  });
});

describe('tienda', () => {
  function shopState(gold = 50): GameState {
    let s = createGame(cfg());
    s = { ...s, players: s.players.map((p) => ({ ...p, gold })) };
    return act(s, { type: 'roll' }, { type: 'pass' });
  }

  it('comprar cara la forja en el dado/lado elegido, cobra y vacía el slot', () => {
    let s = shopState();
    const slot = s.shop.slots.findIndex((i) => i?.kind === 'face');
    const item = s.shop.slots[slot]!;
    const faceId = item.kind === 'face' ? item.faceId : '';
    const goldBefore = currentPlayer(s).gold;
    s = applyAction(s, { type: 'buyFace', slot, dieId: 1, side: 5 });
    expect(currentPlayer(s).dice[0]!.faces[5]).toBe(faceId);
    expect(s.shop.slots[slot]).toBeNull();
    expect(s.purchasesThisTurn).toBe(1);
    expect(currentPlayer(s).gold).toBeLessThan(goldBefore);
  });

  it('no se puede forjar sin oro, en un dado ajeno ni en un temporal', () => {
    const slot = shopState().shop.slots.findIndex((i) => i?.kind === 'face');
    expect(() => applyAction(shopState(0), { type: 'buyFace', slot, dieId: 1, side: 0 })).toThrow(/oro/);
    expect(() => applyAction(shopState(), { type: 'buyFace', slot, dieId: 3, side: 0 })).toThrow(/permanentes propios/);
  });

  it('comprar dado escala el precio y paga al Recaudador de los demás', () => {
    let s = withPlayer(shopState(), 1, { cards: ['card_tax'] });
    const p0 = diePrice(currentPlayer(s));
    s = applyAction(s, { type: 'buyDie' });
    expect(currentPlayer(s).dice).toHaveLength(3);
    expect(currentPlayer(s).gold).toBe(50 - p0);
    expect(diePrice(currentPlayer(s))).toBe(p0 + 4);
    expect(s.players[1]!.gold).toBe(51);
    expect(s.log.at(-1)).toMatchObject({ step: 'tax', gold: 1, params: { seat: 1, from: 0 } });
  });

  it('comprar carta la añade al jugador', () => {
    let s = shopState();
    let cardSlot = s.shop.slots.findIndex((i) => i?.kind === 'card');
    if (cardSlot < 0) {
      s = { ...s, shop: { ...s.shop, slots: [{ kind: 'card', cardId: 'card_income' }, ...s.shop.slots.slice(1)] } };
      cardSlot = 0;
    }
    s = applyAction(s, { type: 'buyCard', slot: cardSlot });
    expect(currentPlayer(s).cards).toHaveLength(1);
    expect(s.shop.slots[cardSlot]).toBeNull();
  });

  it('máximo 2 compras por turno', () => {
    const s = act(shopState(), { type: 'buyDie' }, { type: 'buyDie' });
    expect(() => applyAction(s, { type: 'buyDie' })).toThrow(/2 compras/);
    expect(legalActions(s)).toEqual([{ type: 'endTurn' }]);
  });

  it('legalActions enumera lo comprable (12 forjas por cara con 2 dados)', () => {
    const acts = legalActions(shopState(50));
    expect(acts[0]).toEqual({ type: 'endTurn' });
    expect(acts.some((a) => a.type === 'buyDie')).toBe(true);
    expect(acts.filter((a) => a.type === 'buyFace').length % 12).toBe(0);
  });

  it('el hueco sigue vacío durante la ronda y se rellena al terminarla', () => {
    let s = shopState();
    const slot = s.shop.slots.findIndex((i) => i?.kind === 'face');
    s = act(s, { type: 'buyFace', slot, dieId: 1, side: 5 }, { type: 'endTurn' });
    expect(s.shop.slots[slot]).toBeNull();
    s = skipTurn(s);
    expect(s.shop.slots.every(Boolean)).toBe(true);
  });
});

describe('dados temporales', () => {
  it('Chispa crea un dado temporal que se tira una vez y desaparece', () => {
    const allSpawn: DieFaces = ['spawn_temp', 'spawn_temp', 'spawn_temp', 'spawn_temp', 'spawn_temp', 'spawn_temp'];
    let s = createGame(cfg());
    s = withPlayer(s, 0, { dice: [{ id: 1, faces: allSpawn, temporary: false }, s.players[0]!.dice[1]!] });
    s = act(s, { type: 'roll' }, { type: 'pass' });
    const firstTemp = currentPlayer(s).dice.find((d) => d.temporary);
    expect(firstTemp).toBeDefined();
    s = applyAction(s, { type: 'endTurn' }); // → asiento 1, ronda 1
    s = skipTurn(s); // → ronda 2, empieza el asiento 1
    s = skipTurn(s); // → asiento 0
    expect(s.currentSeat).toBe(0);
    s = applyAction(s, { type: 'roll' });
    expect(s.roll!.results).toHaveLength(3);
    s = applyAction(s, { type: 'pass' });
    const temps = currentPlayer(s).dice.filter((d) => d.temporary);
    expect(temps).toHaveLength(1);
    expect(temps[0]!.id).not.toBe(firstTemp!.id);
  });
});

describe('determinismo', () => {
  it('misma semilla y mismas acciones ⇒ mismo estado final', () => {
    const play = (): string => {
      let s = createGame(cfg({ rounds: 3 }));
      let guard = 0;
      while (s.phase !== 'gameOver') {
        const a = legalActions(s);
        s = applyAction(s, a[a.length - 1]!);
        if (++guard > 1000) throw new Error('bucle');
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});
```

`src/core/serialize.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { fromSave, toSave } from './serialize';

describe('serialize', () => {
  it('toSave/fromSave hacen roundtrip y rechazan basura', () => {
    const s = createGame({ seats: [{ name: 'A', kind: 'human' }, { name: 'B', kind: 'bot' }], rounds: 2, seed: 1 });
    expect(fromSave(toSave(s, 123))).toEqual(s);
    expect(fromSave('{}')).toBeNull();
    expect(fromSave('no json')).toBeNull();
    expect(fromSave(JSON.stringify({ v: 99, state: s }))).toBeNull();
    expect(fromSave(JSON.stringify({ v: 1, state: { ...s, phase: 'nope' } }))).toBeNull();
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/core/game.test.ts src/core/serialize.test.ts` → FAIL.

- [ ] **Step 3: `src/core/game.ts`**:

```ts
import { card } from './data/cards';
import { OBJECTIVE_IDS } from './data/objectives';
import { createDie, replaceFace, rollDice } from './dice';
import { STARTING_DICE, cardPrice, diePrice, facePrice, hasCard, permanentDice } from './economy';
import { hasFreeRerollFace, resolveRoll } from './resolver';
import { Rng } from './rng';
import { determineWinners, finalScores } from './scoring';
import { MAX_PURCHASES_PER_TURN, SHOP_SLOTS, createShop, refreshShop, takeSlot } from './shop';
import type { GameAction, GameConfig, GameState, PlayerState, RollEvent, ShopItem } from './types';

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

export const DEFAULT_ROUNDS = 8;
export const MIN_ROUNDS = 2;
export const MAX_ROUNDS = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const STARTING_GOLD = 5;
export const REROLL_COST = 2;
export const LOG_LIMIT = 200;

function fail(message: string): never {
  throw new IllegalActionError(message);
}

/** Asiento que juega en la posición `turnIndex` de la ronda `round` (1-based). Rota cada ronda. */
export function seatForTurn(playerCount: number, round: number, turnIndex: number): number {
  return (round - 1 + turnIndex) % playerCount;
}

export function createGame(config: GameConfig): GameState {
  const n = config.seats.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Jugadores: ${n} (${MIN_PLAYERS}-${MAX_PLAYERS})`);
  if (!Number.isInteger(config.rounds) || config.rounds < MIN_ROUNDS || config.rounds > MAX_ROUNDS) {
    throw new RangeError(`Rondas: ${config.rounds} (${MIN_ROUNDS}-${MAX_ROUNDS})`);
  }
  const rng = Rng.fromSeed(config.seed);
  const objectives = rng.shuffle(OBJECTIVE_IDS);
  let nextDieId = 1;
  const players: PlayerState[] = config.seats.map((s, i) => {
    const dice = [];
    for (let k = 0; k < STARTING_DICE; k++) dice.push(createDie(nextDieId++));
    const p: PlayerState = { seat: i, name: s.name, kind: s.kind, gold: STARTING_GOLD, pv: 0, dice, cards: [], objective: objectives[i] as string };
    if (s.archetype) p.archetype = s.archetype;
    return p;
  });
  const shop = createShop(rng);
  return {
    version: 1, config, rngState: rng.state(), round: 1, turnIndex: 0, currentSeat: seatForTurn(n, 1, 0), phase: 'roll',
    players, shop, roll: null, purchasesThisTurn: 0, nextDieId, lastResolution: null, log: [], finalScores: null, winners: null,
  };
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentSeat] as PlayerState;
}

/** Rondas que quedan DESPUÉS de la actual = tiradas futuras que verán una compra hecha ahora. */
export function remainingRounds(state: GameState): number {
  return state.config.rounds - state.round;
}

export function rerollCost(state: GameState): number {
  return state.roll?.freeReroll ? 0 : REROLL_COST;
}

function replacePlayer(state: GameState, p: PlayerState): PlayerState[] {
  return state.players.map((x) => (x.seat === p.seat ? p : x));
}

function appendLog(log: RollEvent[], events: RollEvent[]): RollEvent[] {
  const out = [...log, ...events];
  return out.length > LOG_LIMIT ? out.slice(out.length - LOG_LIMIT) : out;
}

function requireShop(state: GameState): void {
  if (state.phase !== 'shop') fail('La tienda no está abierta');
  if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) fail(`Máximo ${MAX_PURCHASES_PER_TURN} compras por turno`);
}

function slotItem(state: GameState, slot: number): ShopItem {
  const item = slot >= 0 && slot < SHOP_SLOTS ? state.shop.slots[slot] : null;
  if (!item) fail('Slot vacío');
  return item;
}

function advanceTurn(state: GameState, rng: Rng): GameState {
  const n = state.players.length;
  const turnIndex = state.turnIndex + 1;
  if (turnIndex < n) {
    return { ...state, turnIndex, currentSeat: seatForTurn(n, state.round, turnIndex), phase: 'roll', roll: null, purchasesThisTurn: 0, lastResolution: null };
  }
  const shop = refreshShop(state.shop, rng);
  const round = state.round + 1;
  if (round > state.config.rounds) {
    const scores = finalScores(state.players);
    return { ...state, shop, phase: 'gameOver', roll: null, lastResolution: null, finalScores: scores, winners: determineWinners(scores) };
  }
  return { ...state, shop, round, turnIndex: 0, currentSeat: seatForTurn(n, round, 0), phase: 'roll', roll: null, purchasesThisTurn: 0, lastResolution: null };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase === 'gameOver') fail('La partida ha terminado');
  const rng = Rng.fromState(state.rngState);
  const me = currentPlayer(state);
  let next: GameState;

  switch (action.type) {
    case 'roll': {
      if (state.phase !== 'roll') fail('No es momento de lanzar');
      const results = rollDice(me.dice, rng);
      const freeReroll = hasFreeRerollFace(me, results) || hasCard(me, 'card_reroll');
      next = { ...state, phase: 'mitigate', roll: { results, rerollUsed: false, freeReroll } };
      break;
    }
    case 'reroll': {
      if (state.phase !== 'mitigate' || !state.roll) fail('No es momento de relanzar');
      if (state.roll.rerollUsed) fail('Ya has relanzado este turno');
      const die = me.dice.find((d) => d.id === action.dieId);
      if (!die || !state.roll.results.some((r) => r.dieId === action.dieId)) fail('Ese dado no está en la tirada');
      const cost = rerollCost(state);
      if (me.gold < cost) fail('No tienes oro para relanzar');
      const [r] = rollDice([die], rng);
      const results = state.roll.results.map((x) => (x.dieId === action.dieId && r ? r : x));
      next = { ...state, players: replacePlayer(state, { ...me, gold: me.gold - cost }), roll: { ...state.roll, results, rerollUsed: true } };
      break;
    }
    case 'pass': {
      if (state.phase !== 'mitigate' || !state.roll) fail('No hay tirada que resolver');
      const out = resolveRoll({ player: me, rolled: state.roll.results, nextDieId: state.nextDieId }, rng);
      const rolledIds = new Set(state.roll.results.map((r) => r.dieId));
      // Los temporales que se acaban de tirar caducan; el recién creado (no tirado) sobrevive.
      const dice = out.player.dice.filter((d) => !d.temporary || !rolledIds.has(d.id));
      next = {
        ...state, phase: 'shop', players: replacePlayer(state, { ...out.player, dice }), nextDieId: out.nextDieId,
        lastResolution: out.resolution, log: appendLog(state.log, out.resolution.events), purchasesThisTurn: 0,
      };
      break;
    }
    case 'buyFace': {
      requireShop(state);
      const item = slotItem(state, action.slot);
      if (item.kind !== 'face') fail('Ese slot no es una cara');
      const price = facePrice(item.faceId, me);
      if (me.gold < price) fail('No tienes oro suficiente');
      const die = me.dice.find((d) => d.id === action.dieId);
      if (!die || die.temporary) fail('Solo puedes forjar dados permanentes propios');
      const dice = me.dice.map((d) => (d.id === die.id ? replaceFace(d, action.side, item.faceId) : d));
      next = {
        ...state, players: replacePlayer(state, { ...me, gold: me.gold - price, dice }),
        shop: takeSlot(state.shop, action.slot).shop, purchasesThisTurn: state.purchasesThisTurn + 1,
      };
      break;
    }
    case 'buyCard': {
      requireShop(state);
      const item = slotItem(state, action.slot);
      if (item.kind !== 'card') fail('Ese slot no es una carta');
      const price = cardPrice(item.cardId);
      if (me.gold < price) fail('No tienes oro suficiente');
      next = {
        ...state, players: replacePlayer(state, { ...me, gold: me.gold - price, cards: [...me.cards, item.cardId] }),
        shop: takeSlot(state.shop, action.slot).shop, purchasesThisTurn: state.purchasesThisTurn + 1,
      };
      break;
    }
    case 'buyDie': {
      requireShop(state);
      const price = diePrice(me);
      if (me.gold < price) fail('No tienes oro suficiente');
      const taxEvents: RollEvent[] = [];
      const players = state.players.map((p) => {
        if (p.seat === me.seat) return { ...p, gold: p.gold - price, dice: [...p.dice, createDie(state.nextDieId)] };
        let gold = p.gold;
        for (const id of p.cards) {
          const e = card(id).effect;
          if (e.kind === 'tax' && e.trigger === 'buyDie') {
            gold += e.gold;
            taxEvents.push({ step: 'tax', cardId: id, gold: e.gold, pv: 0, textKey: 'ev.tax', params: { seat: p.seat, from: me.seat } });
          }
        }
        return gold === p.gold ? p : { ...p, gold };
      });
      next = { ...state, players, nextDieId: state.nextDieId + 1, purchasesThisTurn: state.purchasesThisTurn + 1, log: appendLog(state.log, taxEvents) };
      break;
    }
    case 'endTurn': {
      if (state.phase !== 'shop') fail('No es momento de terminar el turno');
      next = advanceTurn(state, rng);
      break;
    }
    default:
      fail('Acción desconocida');
  }
  return { ...next, rngState: rng.state() };
}

export function legalActions(state: GameState): GameAction[] {
  const me = currentPlayer(state);
  switch (state.phase) {
    case 'roll':
      return [{ type: 'roll' }];
    case 'mitigate': {
      const acts: GameAction[] = [{ type: 'pass' }];
      if (state.roll && !state.roll.rerollUsed && me.gold >= rerollCost(state)) {
        for (const r of state.roll.results) acts.push({ type: 'reroll', dieId: r.dieId });
      }
      return acts;
    }
    case 'shop': {
      const acts: GameAction[] = [{ type: 'endTurn' }];
      if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) return acts;
      state.shop.slots.forEach((item, slot) => {
        if (!item) return;
        if (item.kind === 'card') {
          if (me.gold >= cardPrice(item.cardId)) acts.push({ type: 'buyCard', slot });
          return;
        }
        if (me.gold < facePrice(item.faceId, me)) return;
        for (const d of permanentDice(me)) for (let side = 0; side < 6; side++) acts.push({ type: 'buyFace', slot, dieId: d.id, side });
      });
      if (me.gold >= diePrice(me)) acts.push({ type: 'buyDie' });
      return acts;
    }
    case 'gameOver':
      return [];
  }
}
```

`src/core/serialize.ts`:
```ts
import type { GameState } from './types';

export const SAVE_VERSION = 1;

export interface SaveFile {
  v: number;
  savedAt: number;
  state: GameState;
}

const PHASES = new Set(['roll', 'mitigate', 'shop', 'gameOver']);

/** `savedAt` lo pasa el llamador (Date.now()): core no lee el reloj. */
export function toSave(state: GameState, savedAt: number): string {
  const file: SaveFile = { v: SAVE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

export function fromSave(json: string): GameState | null {
  try {
    const data = JSON.parse(json) as Partial<SaveFile>;
    if (data.v !== SAVE_VERSION || !data.state || typeof data.state !== 'object') return null;
    const s = data.state;
    if (s.version !== 1 || !Array.isArray(s.players) || typeof s.round !== 'number' || !PHASES.has(s.phase) || typeof s.rngState !== 'number' || !s.shop) return null;
    return s;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/core/game.test.ts src/core/serialize.test.ts` → `19 passed`.
- [ ] **Step 5: Commit**: `npm run check && git add src/core/game.ts src/core/serialize.ts src/core/game.test.ts src/core/serialize.test.ts && git commit -m "feat(CORE.6): máquina de estados de partida, acciones legales y save/load"`.

---

### Tarea 9: Bots `[CORE.7]`

**Goal:** Un bot determinista por arquetipo que juega turnos completos con una política heurística en "PV-equivalente" (valor esperado × tiradas restantes × peso de familia − precio × valor del oro) y que empuja su objetivo secreto. Suficiente para que el simulador mida el balance y para que el humano tenga rivales creíbles.

**Files:**
- Create: `src/core/bots.ts`
- Test: `src/core/bots.test.ts`

**Interfaces:**
- Produces: `ARCHETYPE_WEIGHTS: Record<BotArchetype, Partial<Record<FaceFamily | 'die' | 'card', number>>>`; `goldValue(horizon, rounds): number` (= `0.15 + 0.5·horizon/rounds`); `decideBotAction(state): GameAction` (determinista, sin RNG propio); `scorePurchase(state, me, arch, action, horizon, gv): number`.

**Done when:** tests verdes (legalidad en 50 semillas, determinismo, compra algo, ingeniero > puntuador en dados).

- [ ] **Step 1: Test rojo** — `src/core/bots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideBotAction, goldValue } from './bots';
import { applyAction, createGame, legalActions } from './game';
import type { BotArchetype, GameAction, GameConfig, GameState } from './types';

const cfg = (archs: BotArchetype[], seed = 1, rounds = 8): GameConfig => ({
  seats: archs.map((a, i) => ({ name: `B${i}`, kind: 'bot', archetype: a })),
  rounds,
  seed,
});
const isLegal = (s: GameState, a: GameAction): boolean =>
  legalActions(s).some((l) => JSON.stringify(l) === JSON.stringify(a));

function playOut(s: GameState, assertLegal = false): GameState {
  let guard = 0;
  while (s.phase !== 'gameOver') {
    const a = decideBotAction(s);
    if (assertLegal) expect(isLegal(s, a)).toBe(true);
    s = applyAction(s, a);
    if (++guard > 5000) throw new Error('bucle');
  }
  return s;
}

describe('bots', () => {
  it('siempre devuelven una acción legal y terminan la partida (50 semillas)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playOut(createGame(cfg(['magnate', 'scorer', 'engineer', 'casino'], seed)), true);
      expect(s.winners?.length).toBeGreaterThan(0);
    }
  });

  it('son deterministas', () => {
    const a = playOut(createGame(cfg(['balanced', 'balanced'], 3)));
    const b = playOut(createGame(cfg(['balanced', 'balanced'], 3)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('compran algo a lo largo de la partida', () => {
    const s = playOut(createGame(cfg(['balanced', 'balanced'], 5)));
    const p = s.players[0]!;
    const starter = new Set(['g1', 'g2', 'pv1', 'blank']);
    const bought = p.dice.length > 2 || p.cards.length > 0 || p.dice.some((d) => d.faces.some((f) => !starter.has(f)));
    expect(bought).toBe(true);
  });

  it('el ingeniero acaba con más dados que el puntuador (30 partidas)', () => {
    let eng = 0;
    let sco = 0;
    for (let seed = 100; seed < 130; seed++) {
      const s = playOut(createGame(cfg(['engineer', 'scorer'], seed)));
      eng += s.players[0]!.dice.length;
      sco += s.players[1]!.dice.length;
    }
    expect(eng).toBeGreaterThan(sco);
  });

  it('goldValue decrece hacia el final de la partida', () => {
    expect(goldValue(8, 8)).toBeGreaterThan(goldValue(0, 8));
    expect(goldValue(0, 8)).toBeCloseTo(0.15);
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/core/bots.test.ts` → FAIL.

- [ ] **Step 3: `src/core/bots.ts`**:

```ts
import { card } from './data/cards';
import { face } from './data/faces';
import { createDie, faceOf } from './dice';
import { type EV, cardPrice, diePrice, dieEV, evContext, faceEV, facePrice, permanentDice } from './economy';
import { applyAction, currentPlayer, legalActions, remainingRounds, rerollCost } from './game';
import { objectiveProgress } from './objectives';
import { MAX_PURCHASES_PER_TURN } from './shop';
import type { BotArchetype, CardId, FaceFamily, GameAction, GameState, PlayerState } from './types';

type Weights = Partial<Record<FaceFamily | 'die' | 'card', number>>;

export const ARCHETYPE_WEIGHTS: Record<BotArchetype, Weights> = {
  magnate: { economy: 1.5, multiplier: 1.3, meta: 1.2 },
  scorer: { pv: 1.5, conversion: 1.3, combo: 1.1 },
  engineer: { generator: 2, die: 1.5 },
  casino: { risk: 1.6, multiplier: 1.2 },
  balanced: {},
};

/** Valor de 1 oro en PV según lo que queda de partida: al final el oro casi no vale. */
export function goldValue(horizon: number, rounds: number): number {
  return 0.15 + 0.5 * (horizon / rounds);
}

function pvEq(ev: EV, gv: number): number {
  return ev.pv + ev.gold * gv;
}

export function decideBotAction(state: GameState): GameAction {
  const me = currentPlayer(state);
  const arch: BotArchetype = me.archetype ?? 'balanced';
  switch (state.phase) {
    case 'roll':
      return { type: 'roll' };
    case 'mitigate':
      return decideMitigate(state, me);
    case 'shop':
      return decideShop(state, me, arch);
    case 'gameOver':
      throw new Error('La partida ha terminado');
  }
}

/** Relanza el peor dado si su cara vale ≤ 0 (vacía) y puede pagarlo sin quedarse sin oro. */
function decideMitigate(state: GameState, me: PlayerState): GameAction {
  const roll = state.roll;
  if (!roll || roll.rerollUsed) return { type: 'pass' };
  const cost = rerollCost(state);
  if (cost > 0 && me.gold < cost + 2) return { type: 'pass' };
  const ctx = evContext(me);
  const gv = goldValue(remainingRounds(state), state.config.rounds);
  let worst: { dieId: number; v: number } | null = null;
  for (const r of roll.results) {
    const d = me.dice.find((x) => x.id === r.dieId);
    if (!d) continue;
    const v = pvEq(faceEV(faceOf(d, r.faceIndex).id, ctx), gv);
    if (!worst || v < worst.v) worst = { dieId: r.dieId, v };
  }
  return worst && worst.v <= 0 ? { type: 'reroll', dieId: worst.dieId } : { type: 'pass' };
}

function decideShop(state: GameState, me: PlayerState, arch: BotArchetype): GameAction {
  if (state.purchasesThisTurn >= MAX_PURCHASES_PER_TURN) return { type: 'endTurn' };
  const horizon = remainingRounds(state);
  const gv = goldValue(horizon, state.config.rounds);
  let best: { action: GameAction; score: number } | null = null;
  for (const a of legalActions(state)) {
    if (a.type === 'endTurn') continue;
    const score = scorePurchase(state, me, arch, a, horizon, gv);
    if (!best || score > best.score) best = { action: a, score };
  }
  return best && best.score > 0 ? best.action : { type: 'endTurn' };
}

/** Beneficio en PV-equivalente menos precio en PV-equivalente. > 0 ⇒ merece la pena. */
export function scorePurchase(state: GameState, me: PlayerState, arch: BotArchetype, a: GameAction, horizon: number, gv: number): number {
  const w = ARCHETYPE_WEIGHTS[arch];
  const ctx = evContext(me);
  let benefit = 0;
  let price = 0;
  if (a.type === 'buyFace') {
    const item = state.shop.slots[a.slot];
    const die = me.dice.find((d) => d.id === a.dieId);
    if (!item || item.kind !== 'face' || !die) return -Infinity;
    const gain = pvEq(faceEV(item.faceId, ctx), gv) - pvEq(faceEV(die.faces[a.side] as string, ctx), gv);
    // La cara sale 1 de cada 6 tiradas del dado.
    benefit = (gain / 6) * horizon * (w[face(item.faceId).family] ?? 1);
    price = facePrice(item.faceId, me);
  } else if (a.type === 'buyCard') {
    const item = state.shop.slots[a.slot];
    if (!item || item.kind !== 'card') return -Infinity;
    benefit = cardBenefit(state, me, item.cardId, horizon, gv) * (w.card ?? 1);
    price = cardPrice(item.cardId);
  } else if (a.type === 'buyDie') {
    benefit = pvEq(dieEV(createDie(0), ctx), gv) * horizon * (w.die ?? 1);
    price = diePrice(me);
  } else {
    return -Infinity;
  }
  benefit += objectiveBonus(state, a, horizon);
  return benefit - price * gv;
}

function cardBenefit(state: GameState, me: PlayerState, cardId: CardId, horizon: number, gv: number): number {
  const e = card(cardId).effect;
  const nDice = permanentDice(me).length;
  const players = state.players.length;
  switch (e.kind) {
    case 'rollBonus':
      return e.gold * gv * horizon * (e.minDice !== undefined && nDice < e.minDice ? 0.5 : 1);
    case 'discount':
      return e.amount * gv * Math.min(horizon, 3);
    case 'endScore':
      return e.per === 'dice'
        ? Math.max(0, nDice + horizon * 0.3 - ((e.from ?? 1) - 1)) * e.pv
        : Math.floor((me.gold + horizon * 2) / (e.every ?? 1)) * e.pv * 0.6;
    case 'freeReroll':
      return 0.3 * horizon;
    case 'tax':
      return e.gold * gv * 0.25 * (players - 1) * horizon;
  }
}

/** PV-equivalente extra si la acción acerca el objetivo secreto (se simula la acción). */
function objectiveBonus(state: GameState, a: GameAction, horizon: number): number {
  const before = objectiveProgress(currentPlayer(state));
  if (before.achieved) return 0;
  let after;
  try {
    after = objectiveProgress(currentPlayer(applyAction(state, a)));
  } catch {
    return 0;
  }
  const delta = after.current - before.current;
  if (delta <= 0) return 0;
  const urgency = 1 + (1 - horizon / state.config.rounds);
  return before.objective.pv * (delta / Math.max(1, before.target)) * urgency;
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/core/bots.test.ts` → `5 passed`. Si "el ingeniero acaba con más dados" falla, subir `engineer.die` a 2 y `engineer.generator` a 2.5 en `ARCHETYPE_WEIGHTS` (y anotarlo en `docs/DECISIONS.md`).
- [ ] **Step 5: Commit**: `npm run check && git add src/core/bots.ts src/core/bots.test.ts && git commit -m "feat(CORE.7): bots por arquetipo con política de PV-equivalente"`.

---

### Tarea 10: Simulador headless + métricas + CLI `[SIM.1]`

**Goal:** "Simular miles de partidas antes de publicar cartas" (diseño §9.2, §10): un `runBatch` determinista que juega N partidas entre bots rotando los arquetipos por asiento y produce las métricas que deciden el balance, un `checkThresholds` con los umbrales de la Tarea 11 y una CLI que escribe `docs/balance/latest.md`.

**Files:**
- Create: `src/core/sim/simulate.ts`, `src/core/sim/metrics.ts`, `src/core/sim/cli.ts`
- Test: `src/core/sim/simulate.test.ts`
- Modify: `README.md` (sección "Simulador de balance")

**Interfaces:**
- Produces (`simulate.ts`): `type BuildLabel = 'Ingeniero' | 'Casino' | 'Combo' | 'Coleccionista' | 'Puntuador' | 'Magnate' | 'Mixto'`; `classifyBuild(p): BuildLabel`; `interface GameSummary { seed; rounds; seats; winners; scores; offered: Record<string, number>; bought: Record<string, number>; leaderByRound: number[]; diceAtEnd: number[]; builds: BuildLabel[] }`; `playGame(config): GameSummary`.
- Produces (`metrics.ts`): `interface BatchOptions { games; archetypes: BotArchetype[]; rounds; seed }`; `interface BatchMetrics { games; rounds; winRateByArchetype: Record<string, number>; winRateBySeat: number[]; avgWinnerTotal; avgTotal; avgGoldLeft; avgDice; leaderMidWinRate; blowoutRate; itemStats: Record<string, { offered; bought; rate; winRateWhenBought }>; buildDistribution: Record<BuildLabel, number>; objectiveRate }`; `runBatch(opts): BatchMetrics`; `checkThresholds(m): { ok: boolean; failures: string[] }`; `renderMarkdown(m): string`.
- CLI: `npm run sim -- --games 2000 --seats magnate,scorer,engineer,casino --rounds 8 --seed 1 --out docs/balance/latest.md`.

**Umbrales (`checkThresholds`, con `n` = nº de arquetipos):**
1. `winRateByArchetype[a] ∈ [0.7/n, 1.3/n]` para todo `a` (con 4: 0.175–0.325).
2. `max(winRateBySeat) − min(winRateBySeat) ≤ 0.10` (el orden de turno no decide).
3. `leaderMidWinRate ≤ 0.60` (anti-snowball: el líder a mitad de partida no gana "siempre").
4. `blowoutRate ≤ 0.25` (ganador ≥ 2× el segundo).
5. Para cada ítem comprable con `offered ≥ 30`: `0.03 ≤ rate ≤ 0.60` (ni ítems muertos ni dominantes).
6. `avgWinnerTotal ∈ [15, 40]`; `avgDice ∈ [2.5, 6]`.

**Done when:** `npm run sim -- --games 200` escribe `docs/balance/latest.md` con tablas + bloque `UMBRALES`; tests verdes; dos ejecuciones con la misma semilla producen el mismo fichero.

- [ ] **Step 1: Test rojo** — `src/core/sim/simulate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createDie } from '../dice';
import type { PlayerState } from '../types';
import { checkThresholds, renderMarkdown, runBatch } from './metrics';
import { classifyBuild, playGame } from './simulate';

const seats = (['magnate', 'scorer', 'engineer', 'casino'] as const).map((a, i) => ({ name: `B${i}`, kind: 'bot' as const, archetype: a }));

describe('playGame', () => {
  it('juega una partida completa y resume compras, ofertas y líderes por ronda', () => {
    const g = playGame({ seats, rounds: 8, seed: 1 });
    expect(g.winners.length).toBeGreaterThan(0);
    expect(g.scores).toHaveLength(4);
    expect(g.leaderByRound).toHaveLength(8);
    expect(Object.values(g.offered).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(g.diceAtEnd.every((n) => n >= 2)).toBe(true);
    expect(g.builds).toHaveLength(4);
  });

  it('classifyBuild etiqueta por prioridad', () => {
    const p = (over: Partial<PlayerState>): PlayerState => ({
      seat: 0, name: 'P', kind: 'bot', gold: 0, pv: 0, dice: [createDie(1), createDie(2)], cards: [], objective: 'obj_purist', ...over,
    });
    expect(classifyBuild(p({}))).toBe('Mixto');
    expect(classifyBuild(p({ dice: [1, 2, 3, 4, 5].map((i) => createDie(i)) }))).toBe('Ingeniero');
    expect(classifyBuild(p({ cards: ['card_tax', 'card_reroll', 'card_income'] }))).toBe('Coleccionista');
    expect(classifyBuild(p({ dice: [createDie(1, ['risk_gold', 'risk_gold', 'risk_pv', 'g1', 'g1', 'blank'])] }))).toBe('Casino');
  });
});

describe('runBatch', () => {
  it('es determinista y sus tasas suman 1', () => {
    const a = runBatch({ games: 40, archetypes: ['magnate', 'scorer', 'engineer', 'casino'], rounds: 8, seed: 1 });
    const b = runBatch({ games: 40, archetypes: ['magnate', 'scorer', 'engineer', 'casino'], rounds: 8, seed: 1 });
    expect(a).toEqual(b);
    const sum = Object.values(a.winRateByArchetype).reduce((x, y) => x + y, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(a.winRateBySeat.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 5);
    expect(a.games).toBe(40);
  });

  it('renderMarkdown incluye las secciones y checkThresholds devuelve una lista de fallos', () => {
    const m = runBatch({ games: 20, archetypes: ['balanced', 'balanced'], rounds: 4, seed: 2 });
    const md = renderMarkdown(m);
    for (const h of ['## Victorias por arquetipo', '## Victorias por asiento', '## Ítems', '## Builds', '## Umbrales']) expect(md).toContain(h);
    const t = checkThresholds(m);
    expect(Array.isArray(t.failures)).toBe(true);
    expect(t.ok).toBe(t.failures.length === 0);
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/core/sim` → FAIL.

- [ ] **Step 3: `src/core/sim/simulate.ts`**:

```ts
import { decideBotAction } from '../bots';
import { countFaces } from '../dice';
import { itemId, permanentDice } from '../economy';
import { applyAction, createGame } from '../game';
import type { FaceFamily, FinalScore, GameConfig, GameState, PlayerState, SeatConfig } from '../types';

export type BuildLabel = 'Ingeniero' | 'Casino' | 'Combo' | 'Coleccionista' | 'Puntuador' | 'Magnate' | 'Mixto';

export interface GameSummary {
  seed: number;
  rounds: number;
  seats: SeatConfig[];
  winners: number[];
  scores: FinalScore[];
  /** ítem → veces que estaba en la tienda al abrirla un jugador. */
  offered: Record<string, number>;
  /** ítem → veces comprado ('die' para dados). */
  bought: Record<string, number>;
  /** ítem → asientos que lo compraron (sin repetir). */
  boughtBy: Record<string, number[]>;
  /** Asiento líder en PV (empate → oro) al cerrar cada ronda. */
  leaderByRound: number[];
  diceAtEnd: number[];
  builds: BuildLabel[];
}

/** Etiqueta la build final por prioridad (diseño §4). */
export function classifyBuild(p: PlayerState): BuildLabel {
  const dice = permanentDice(p);
  const fam = (f: FaceFamily): number => countFaces(dice, (x) => x.family === f);
  if (dice.length >= 5) return 'Ingeniero';
  if (fam('risk') >= 3) return 'Casino';
  if (fam('combo') >= 2) return 'Combo';
  if (p.cards.length >= 3) return 'Coleccionista';
  if (fam('pv') >= 5) return 'Puntuador';
  if (countFaces(dice, (x) => x.cost !== null && x.family === 'economy') >= 4) return 'Magnate';
  return 'Mixto';
}

function leader(s: GameState): number {
  let best = s.players[0] as PlayerState;
  for (const p of s.players) if (p.pv > best.pv || (p.pv === best.pv && p.gold > best.gold)) best = p;
  return best.seat;
}

const bump = (rec: Record<string, number>, key: string): void => {
  rec[key] = (rec[key] ?? 0) + 1;
};

export function playGame(config: GameConfig): GameSummary {
  let s = createGame(config);
  const offered: Record<string, number> = {};
  const bought: Record<string, number> = {};
  const boughtBy: Record<string, number[]> = {};
  const leaderByRound: number[] = [];
  const noteBuy = (id: string, seat: number): void => {
    bump(bought, id);
    const seats = (boughtBy[id] ??= []);
    if (!seats.includes(seat)) seats.push(seat);
  };
  let shopSeen = '';
  let guard = 0;
  while (s.phase !== 'gameOver') {
    if (s.phase === 'shop') {
      const key = `${s.round}:${s.currentSeat}`;
      if (key !== shopSeen) {
        shopSeen = key;
        for (const it of s.shop.slots) if (it) bump(offered, itemId(it));
      }
    }
    const a = decideBotAction(s);
    if (a.type === 'buyFace' || a.type === 'buyCard') {
      const it = s.shop.slots[a.slot];
      if (it) noteBuy(itemId(it), s.currentSeat);
    } else if (a.type === 'buyDie') {
      noteBuy('die', s.currentSeat);
    }
    const next = applyAction(s, a);
    if (next.round !== s.round || next.phase === 'gameOver') leaderByRound.push(leader(next));
    s = next;
    if (++guard > 20_000) throw new Error('Partida sin fin');
  }
  return {
    seed: config.seed, rounds: config.rounds, seats: config.seats, winners: s.winners ?? [], scores: s.finalScores ?? [],
    offered, bought, boughtBy, leaderByRound, diceAtEnd: s.players.map((p) => permanentDice(p).length), builds: s.players.map(classifyBuild),
  };
}
```

- [ ] **Step 4: `src/core/sim/metrics.ts`**:

```ts
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
  objectiveRate: number;
}

const BUILDS: BuildLabel[] = ['Ingeniero', 'Casino', 'Combo', 'Coleccionista', 'Puntuador', 'Magnate', 'Mixto'];

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
    const game: GameSummary = playGame({ seats, rounds: opts.rounds, seed: opts.seed * 1_000_003 + g });
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
    for (const [id, c] of Object.entries(game.offered)) itemOffered[id] = (itemOffered[id] ?? 0) + c;
    for (const [id, c] of Object.entries(game.bought)) itemBought[id] = (itemBought[id] ?? 0) + c;
    // "Gana cuando se compra": partidas en las que algún comprador del ítem ganó / partidas en las que se compró.
    for (const [id, seats] of Object.entries(game.boughtBy)) {
      itemGamesBought[id] = (itemGamesBought[id] ?? 0) + 1;
      if (seats.some((seat) => game.winners.includes(seat))) itemWins[id] = (itemWins[id] ?? 0) + 1;
    }
    for (const b of game.builds) builds[b]++;
  }

  const players = opts.games * n;
  const itemIds = [...BUYABLE_FACE_IDS.map((f) => `face:${f}`), ...CARD_IDS.map((c) => `card:${c}`), 'die'];
  const itemStats: Record<string, ItemStat> = {};
  for (const id of itemIds) {
    const offered = id === 'die' ? opts.games * n * opts.rounds : (itemOffered[id] ?? 0);
    const bought = itemBought[id] ?? 0;
    const gamesBought = itemGamesBought[id] ?? 0;
    itemStats[id] = { offered, bought, rate: offered > 0 ? bought / offered : 0, winRateWhenBought: gamesBought > 0 ? (itemWins[id] ?? 0) / gamesBought : 0 };
  }
  const norm = (rec: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v / opts.games]));

  return {
    games: opts.games, rounds: opts.rounds, archetypes: opts.archetypes,
    winRateByArchetype: norm(winByArch),
    winRateBySeat: winBySeat.map((v) => v / opts.games),
    avgWinnerTotal: winnerTotal / opts.games, avgTotal: total / players, avgGoldLeft: goldLeft / players, avgDice: dice / players,
    leaderMidWinRate: leaderMid / opts.games, blowoutRate: blowouts / opts.games,
    itemStats, buildDistribution: builds, objectiveRate: objectives / players,
  };
}

export function checkThresholds(m: BatchMetrics): { ok: boolean; failures: string[] } {
  const f: string[] = [];
  const n = m.archetypes.length;
  for (const a of m.archetypes) {
    const r = m.winRateByArchetype[a] ?? 0;
    if (r < 0.7 / n || r > 1.3 / n) f.push(`winrate ${a} = ${r.toFixed(3)} fuera de [${(0.7 / n).toFixed(3)}, ${(1.3 / n).toFixed(3)}]`);
  }
  const seatSpread = Math.max(...m.winRateBySeat) - Math.min(...m.winRateBySeat);
  if (seatSpread > 0.1) f.push(`ventaja por asiento = ${seatSpread.toFixed(3)} > 0.10`);
  if (m.leaderMidWinRate > 0.6) f.push(`líder a mitad gana ${m.leaderMidWinRate.toFixed(3)} > 0.60 (snowball)`);
  if (m.blowoutRate > 0.25) f.push(`blowouts ${m.blowoutRate.toFixed(3)} > 0.25`);
  for (const [id, s] of Object.entries(m.itemStats)) {
    if (id === 'die' || s.offered < 30) continue;
    if (s.rate < 0.03) f.push(`ítem muerto ${id}: rate ${s.rate.toFixed(3)} < 0.03`);
    if (s.rate > 0.6) f.push(`ítem dominante ${id}: rate ${s.rate.toFixed(3)} > 0.60`);
  }
  if (m.avgWinnerTotal < 15 || m.avgWinnerTotal > 40) f.push(`PV medio del ganador ${m.avgWinnerTotal.toFixed(1)} fuera de [15, 40]`);
  if (m.avgDice < 2.5 || m.avgDice > 6) f.push(`dados medios ${m.avgDice.toFixed(2)} fuera de [2.5, 6]`);
  return { ok: f.length === 0, failures: f };
}

export function renderMarkdown(m: BatchMetrics): string {
  const pct = (v: number): string => `${(v * 100).toFixed(1)} %`;
  const lines: string[] = [];
  lines.push(`# Informe de balance — ${m.games} partidas · ${m.rounds} rondas · ${m.archetypes.join(', ')}`, '');
  lines.push('## Resumen', '', `- PV medio del ganador: ${m.avgWinnerTotal.toFixed(1)} · PV medio: ${m.avgTotal.toFixed(1)} · oro sobrante medio: ${m.avgGoldLeft.toFixed(1)} · dados medios: ${m.avgDice.toFixed(2)}`);
  lines.push(`- Líder a mitad gana: ${pct(m.leaderMidWinRate)} · blowouts: ${pct(m.blowoutRate)} · objetivos cumplidos: ${pct(m.objectiveRate)}`, '');
  lines.push('## Victorias por arquetipo', '', '| Arquetipo | Winrate |', '|---|---|');
  for (const a of m.archetypes) lines.push(`| ${a} | ${pct(m.winRateByArchetype[a] ?? 0)} |`);
  lines.push('', '## Victorias por asiento', '', '| Asiento | Winrate |', '|---|---|');
  m.winRateBySeat.forEach((v, i) => lines.push(`| ${i} | ${pct(v)} |`));
  lines.push('', '## Ítems', '', '| Ítem | Ofrecido | Comprado | Tasa | Gana cuando se compra |', '|---|---|---|---|---|');
  for (const [id, s] of Object.entries(m.itemStats).sort((a, b) => b[1].rate - a[1].rate)) {
    lines.push(`| ${id} | ${s.offered} | ${s.bought} | ${pct(s.rate)} | ${pct(s.winRateWhenBought)} |`);
  }
  lines.push('', '## Builds', '', '| Build | Jugadores |', '|---|---|');
  for (const [b, c] of Object.entries(m.buildDistribution)) lines.push(`| ${b} | ${c} |`);
  const t = checkThresholds(m);
  lines.push('', '## Umbrales', '', t.ok ? '✅ Todos los umbrales cumplidos.' : `❌ ${t.failures.length} fallos:`, '');
  for (const x of t.failures) lines.push(`- ${x}`);
  lines.push('');
  return lines.join('\n');
}
```

- [ ] **Step 5: `src/core/sim/cli.ts`**:

```ts
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

const archetypes = String(values.seats).split(',').map((s) => s.trim());
for (const a of archetypes) if (!ARCHS.has(a)) throw new Error(`Arquetipo desconocido: ${a}`);

const started = Date.now();
const metrics = runBatch({ games: Number(values.games), archetypes: archetypes as BotArchetype[], rounds: Number(values.rounds), seed: Number(values.seed) });
const md = renderMarkdown(metrics);
const out = String(values.out);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(md);
console.log(`Escrito ${out} en ${((Date.now() - started) / 1000).toFixed(1)} s`);
```

- [ ] **Step 6: Verde y CLI**: `npx vitest run src/core/sim` → `4 passed`. Luego `npm run sim -- --games 200 --out docs/balance/latest.md` → imprime el informe y termina en < 30 s. Ejecutarlo dos veces y comparar: `git diff --stat docs/balance/latest.md` vacío tras la segunda.
- [ ] **Step 7: README** — añadir sección:

```markdown
## Simulador de balance

```bash
npm run sim -- --games 2000 --seats magnate,scorer,engineer,casino --rounds 8 --seed 1
```
Escribe `docs/balance/latest.md` (winrates, ítems, builds, umbrales). Los números del juego viven en `src/core/data/*.ts`; cada cambio se anota en `docs/balance/CHANGELOG.md`.
```

- [ ] **Step 8: Commit**: `npm run check && git add src/core/sim README.md docs/balance/latest.md && git commit -m "feat(SIM.1): simulador headless con métricas de balance y CLI"`.

---

### Tarea 11: Primer pase de balance `[BAL.1]`

**Goal:** Que los valores iniciales cumplan los umbrales de la Tarea 10 con 2000 partidas, tocando SOLO `src/core/data/*.ts` (costes, valores, probabilidades) y, si hace falta, `ARCHETYPE_WEIGHTS`; dejar un test de regresión que corra en el gate.

**Files:**
- Modify: `src/core/data/faces.ts`, `src/core/data/cards.ts`, `src/core/data/objectives.ts` (solo números), `src/core/bots.ts` (solo pesos), `docs/balance/CHANGELOG.md`, `docs/balance/latest.md`, `docs/rules.md` (tablas sincronizadas con los datos)
- Test: `src/core/balance.test.ts`

**Done when:** `npm run sim -- --games 2000` termina con `✅ Todos los umbrales cumplidos`; `src/core/balance.test.ts` verde; cada cambio de número registrado en el changelog y reflejado en `docs/rules.md`; los tests de catálogo (Tarea 4) actualizados si cambió un valor de referencia.

- [ ] **Step 1: Test de regresión** — `src/core/balance.test.ts` (400 partidas, determinista):

```ts
import { describe, expect, it } from 'vitest';
import { checkThresholds, runBatch } from './sim/metrics';

describe('balance v0.1', () => {
  it('400 partidas de 4 arquetipos cumplen los umbrales', () => {
    const m = runBatch({ games: 400, archetypes: ['magnate', 'scorer', 'engineer', 'casino'], rounds: 8, seed: 11 });
    const t = checkThresholds(m);
    expect(t.failures).toEqual([]);
  });

  it('2 jugadores balanced: sin ventaja de asiento', () => {
    const m = runBatch({ games: 300, archetypes: ['balanced', 'balanced'], rounds: 8, seed: 12 });
    expect(Math.abs((m.winRateBySeat[0] ?? 0) - (m.winRateBySeat[1] ?? 0))).toBeLessThanOrEqual(0.12);
  });
});
```

- [ ] **Step 2: Medir**: `npm run sim -- --games 2000 --seed 1` y leer el bloque `## Umbrales`.

- [ ] **Step 3: Iterar (máximo 8 iteraciones; si no converge, documentar el mejor punto y seguir).** Palancas, en este orden:
  1. Arquetipo que gana demasiado → subir 1 el coste de las 2 caras más compradas por ese arquetipo (columna "Tasa").
  2. Ítem muerto (`rate < 0.03`) → bajar 1 su coste o subir 1 su valor (`gold`/`pv`), nunca ambos a la vez.
  3. Ítem dominante (`rate > 0.60`) → subir 1-2 su coste.
  4. Snowball (`leaderMidWinRate > 0.60`) → subir `DIE_PRICE_STEP` de 4 a 5 (Tarea 6, `economy.ts`, es el único número fuera de `data/` permitido) y/o subir el PV de los objetivos a 6-7.
  5. Ventaja de asiento > 0.10 → revisar `refreshShop` (rotación) antes que los números.
  6. `avgWinnerTotal < 15` → bajar costes de PV directo (`pv2`, `pv3`); `> 40` → subirlos.
  Tras cada cambio: `npm run sim -- --games 2000` y anotar en `docs/balance/CHANGELOG.md`: `- 2026-MM-DD · faces.ts · pv3.cost 8 → 9 · pv3 rate 0.71 dominante`.

- [ ] **Step 4: Sincronizar** `docs/rules.md` (tablas) y los valores de referencia de `src/core/data/catalog.test.ts` y `src/core/economy.test.ts` si cambiaron.
- [ ] **Step 5: Verde**: `npm run check` (incluye `balance.test.ts`, ~10 s).
- [ ] **Step 6: Commit**: `git add src/core docs && git commit -m "feat(BAL.1): primer pase de balance dentro de umbrales (2000 partidas)"`.

---

# Pista B — Física y render (`src/physics/`, `src/render/`)

`src/physics/` corre en Node (los tests usan `@dimforge/rapier3d-compat` con el wasm embebido) y en el navegador. `src/render/` solo en el navegador; sus helpers puros se testean en Node. Puede ejecutarse en paralelo con la pista A a partir de la Tarea 4 (necesita `types.ts` y `data/faces.ts`).

### Tarea 12: Mundo Rapier: mesa, dados, lanzamiento, reposo y lado superior `[PHY.1]`

**Goal:** Un mundo físico acotado (mesa con paredes y techo, diseño §9.1 "mesa acotada"), cuerpos de dado con bordes redondeados y CCD, parámetros de lanzamiento generados desde un `RandomSource`, detección de reposo, cálculo puro del lado superior y eventos de contacto con fuerza (para el audio).

**Files:**
- Create: `src/physics/world.ts`, `src/physics/dieBody.ts`
- Test: `src/physics/world.test.ts`

**Interfaces:**
- Produces (`world.ts`): `type Rapier = typeof RAPIER`; `PHYSICS_DT = 1/60`; `GRAVITY = {x:0, y:-40, z:0}`; `TABLE = { halfX: 5, halfZ: 3, wallHeight: 4, wallThickness: 0.5, floorThickness: 0.5, friction: 0.6, restitution: 0.3 }`; `CONTACT_FORCE_THRESHOLD = 15`; `initPhysics(): Promise<Rapier>` (memoizada); `interface PhysicsWorld { R; world; events; bodies: Map<dieId, handle>; colliderToDie: Map<handle, dieId>; step: number }`; `createPhysicsWorld(R): PhysicsWorld`; `type ContactListener = (dieId, force) => void`; `stepWorld(pw, onContact?)`; `freeWorld(pw)`.
- Produces (`dieBody.ts`): `Vec3`, `Quat`, `ThrowParams { position; rotation; linvel; angvel }`; `DIE_HALF = 0.5`, `DIE_RADIUS = 0.08`, `SIDE_NORMALS` (orden `+X, −X, +Y, −Y, +Z, −Z` = grupos de `BoxGeometry`), `COCKED_DOT = 0.85`; `randomQuat(rng)`, `makeThrowParams(rng, index, count)`, `addDie(pw, dieId, params): handle`, `addRestingDie(pw, dieId, position, rotation): handle` (cuerpo fijo), `getBody(pw, dieId)`, `rotateVec(q, v)`, `topSide(rotation): { side, dot }`, `isSettled(body)`, `readTransform(body): { position, rotation }`, `nudge(body, n)`.

**Done when:** tests verdes: matemática de `topSide` exacta, un dado reposa en < 900 pasos dentro de la mesa con `dot > 0.95`, determinismo bit a bit entre dos mundos, eventos de contacto con fuerza > umbral.

- [ ] **Step 1: Test rojo** — `src/physics/world.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import { addDie, getBody, isSettled, makeThrowParams, readTransform, rotateVec, topSide } from './dieBody';
import { CONTACT_FORCE_THRESHOLD, type Rapier, TABLE, createPhysicsWorld, freeWorld, initPhysics, stepWorld } from './world';

let R: Rapier;
beforeAll(async () => {
  R = await initPhysics();
});

describe('topSide (matemática pura)', () => {
  const s = Math.SQRT1_2;
  it('identidad ⇒ +Y (lado 2) con dot 1', () => {
    expect(topSide({ x: 0, y: 0, z: 0, w: 1 })).toEqual({ side: 2, dot: 1 });
  });
  it('+90° sobre X ⇒ −Z (lado 5); −90° ⇒ +Z (lado 4)', () => {
    expect(topSide({ x: s, y: 0, z: 0, w: s }).side).toBe(5);
    expect(topSide({ x: -s, y: 0, z: 0, w: s }).side).toBe(4);
  });
  it('+90° sobre Z ⇒ +X (lado 0); −90° ⇒ −X (lado 1)', () => {
    expect(topSide({ x: 0, y: 0, z: s, w: s }).side).toBe(0);
    expect(topSide({ x: 0, y: 0, z: -s, w: s }).side).toBe(1);
  });
  it('rotateVec de +90° sobre Y lleva +X a −Z', () => {
    const v = rotateVec({ x: 0, y: s, z: 0, w: s }, { x: 1, y: 0, z: 0 });
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-1);
  });
});

describe('mundo', () => {
  it('un dado lanzado reposa en < 900 pasos, dentro de la mesa y con una cara clara arriba', () => {
    const pw = createPhysicsWorld(R);
    addDie(pw, 1, makeThrowParams(Rng.fromSeed(1), 0, 1));
    let steps = 0;
    while (steps < 900 && !isSettled(getBody(pw, 1))) {
      stepWorld(pw);
      steps++;
    }
    expect(steps).toBeLessThan(900);
    const { position, rotation } = readTransform(getBody(pw, 1));
    expect(position.y).toBeGreaterThan(0.3);
    expect(position.y).toBeLessThan(0.7);
    expect(Math.abs(position.x)).toBeLessThan(TABLE.halfX);
    expect(Math.abs(position.z)).toBeLessThan(TABLE.halfZ);
    expect(topSide(rotation).dot).toBeGreaterThan(0.95);
    freeWorld(pw);
  });

  it('es determinista bit a bit: dos mundos con la misma secuencia acaban idénticos', () => {
    const run = (): unknown => {
      const pw = createPhysicsWorld(R);
      const rng = Rng.fromSeed(7);
      for (let i = 0; i < 3; i++) addDie(pw, i + 1, makeThrowParams(rng, i, 3));
      for (let s = 0; s < 400; s++) stepWorld(pw);
      const out = [1, 2, 3].map((id) => readTransform(getBody(pw, id)));
      freeWorld(pw);
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('emite eventos de contacto con fuerza al golpear la mesa', () => {
    const pw = createPhysicsWorld(R);
    addDie(pw, 1, makeThrowParams(Rng.fromSeed(2), 0, 1));
    const hits: number[] = [];
    for (let s = 0; s < 300; s++) stepWorld(pw, (dieId, f) => { if (dieId === 1) hits.push(f); });
    expect(hits.length).toBeGreaterThan(0);
    expect(Math.max(...hits)).toBeGreaterThan(CONTACT_FORCE_THRESHOLD);
    freeWorld(pw);
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/physics/world.test.ts` → FAIL.

- [ ] **Step 3: `src/physics/world.ts`**:

```ts
import RAPIER from '@dimforge/rapier3d-compat';

export type Rapier = typeof RAPIER;

/** Unidades: 1 = arista de un dado. Gravedad alta para que el dado "pese" a esa escala. */
export const PHYSICS_DT = 1 / 60;
export const GRAVITY = { x: 0, y: -40, z: 0 } as const;
export const TABLE = {
  halfX: 5, halfZ: 3, wallHeight: 4, wallThickness: 0.5, floorThickness: 0.5, friction: 0.6, restitution: 0.3,
} as const;
export const CONTACT_FORCE_THRESHOLD = 15;

let ready: Promise<Rapier> | null = null;
export function initPhysics(): Promise<Rapier> {
  if (!ready) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}

export interface PhysicsWorld {
  R: Rapier;
  world: RAPIER.World;
  events: RAPIER.EventQueue;
  /** dieId → handle del rigid body. */
  bodies: Map<number, number>;
  /** handle de collider → dieId. */
  colliderToDie: Map<number, number>;
  /** Pasos dados desde la creación. */
  step: number;
}

/** Mesa acotada: suelo (cara superior en y = 0), 4 paredes y techo. Misma secuencia de creación siempre. */
export function createPhysicsWorld(R: Rapier): PhysicsWorld {
  const world = new R.World({ x: GRAVITY.x, y: GRAVITY.y, z: GRAVITY.z });
  world.timestep = PHYSICS_DT;
  const ground = world.createRigidBody(R.RigidBodyDesc.fixed());
  const { halfX, halfZ, wallHeight: h, wallThickness: t, floorThickness: ft } = TABLE;
  const box = (hx: number, hy: number, hz: number, x: number, y: number, z: number): void => {
    world.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(TABLE.friction).setRestitution(TABLE.restitution),
      ground,
    );
  };
  box(halfX + t, ft / 2, halfZ + t, 0, -ft / 2, 0);
  box(t / 2, h / 2, halfZ + t, halfX + t / 2, h / 2, 0);
  box(t / 2, h / 2, halfZ + t, -(halfX + t / 2), h / 2, 0);
  box(halfX + t, h / 2, t / 2, 0, h / 2, halfZ + t / 2);
  box(halfX + t, h / 2, t / 2, 0, h / 2, -(halfZ + t / 2));
  box(halfX + t, t / 2, halfZ + t, 0, h + t / 2, 0);
  return { R, world, events: new R.EventQueue(true), bodies: new Map(), colliderToDie: new Map(), step: 0 };
}

export type ContactListener = (dieId: number, force: number) => void;

export function stepWorld(pw: PhysicsWorld, onContact?: ContactListener): void {
  pw.world.step(pw.events);
  pw.step++;
  if (!onContact) return;
  pw.events.drainContactForceEvents((e) => {
    const d1 = pw.colliderToDie.get(e.collider1());
    const d2 = pw.colliderToDie.get(e.collider2());
    const f = e.totalForceMagnitude();
    if (d1 !== undefined) onContact(d1, f);
    if (d2 !== undefined && d2 !== d1) onContact(d2, f);
  });
}

export function freeWorld(pw: PhysicsWorld): void {
  pw.events.free();
  pw.world.free();
  pw.bodies.clear();
  pw.colliderToDie.clear();
}
```

Nota para el implementador: si la firma de `world.step` de la versión instalada no acepta `EventQueue` (comprobar en `node_modules/@dimforge/rapier3d-compat/rapier.d.ts` buscando `step(`), adaptar SOLO `stepWorld` y anotarlo en `docs/DECISIONS.md`. Nada más en el proyecto llama a `world.step`.

- [ ] **Step 4: `src/physics/dieBody.ts`**:

```ts
import type RAPIER from '@dimforge/rapier3d-compat';
import type { RandomSource } from '../core/rng';
import { CONTACT_FORCE_THRESHOLD, type PhysicsWorld, TABLE } from './world';

export interface Vec3 { x: number; y: number; z: number }
export interface Quat { x: number; y: number; z: number; w: number }
export interface ThrowParams { position: Vec3; rotation: Quat; linvel: Vec3; angvel: Vec3 }
export interface Transform { position: Vec3; rotation: Quat }

export const DIE_HALF = 0.5;
export const DIE_RADIUS = 0.08;
export const DIE_FRICTION = 0.5;
export const DIE_RESTITUTION = 0.35;
/** Lado físico = grupo de BoxGeometry de three: 0:+X 1:−X 2:+Y 3:−Y 4:+Z 5:−Z. */
export const SIDE_NORMALS: readonly Vec3[] = [
  { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
];
/** Por debajo de este coseno el dado está "de canto" y hay que empujarlo. */
export const COCKED_DOT = 0.85;
export const SETTLE_LINVEL = 0.05;
export const SETTLE_ANGVEL = 0.05;

/** Cuaternión unitario uniforme (Shoemake). Consume 3 números del RNG. */
export function randomQuat(rng: RandomSource): Quat {
  const u1 = rng.next();
  const u2 = rng.next() * 2 * Math.PI;
  const u3 = rng.next() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return { x: a * Math.sin(u2), y: a * Math.cos(u2), z: b * Math.sin(u3), w: b * Math.cos(u3) };
}

/** Lanzamiento desde el borde −X hacia el centro; los dados salen en fila a lo largo de Z. */
export function makeThrowParams(rng: RandomSource, index: number, count: number): ThrowParams {
  const spread = Math.min(4.5, count * 0.9);
  const z = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
  const j = (): number => rng.next() - 0.5;
  return {
    position: { x: -TABLE.halfX + 1 + j() * 0.4, y: 2 + rng.next() * 0.8, z: z + j() * 0.3 },
    rotation: randomQuat(rng),
    linvel: { x: 9 + rng.next() * 4, y: 1 + rng.next() * 1.5, z: j() * 3 },
    angvel: { x: j() * 24, y: j() * 24, z: j() * 24 },
  };
}

function dieCollider(R: PhysicsWorld['R']): RAPIER.ColliderDesc {
  const h = DIE_HALF - DIE_RADIUS;
  return R.ColliderDesc.roundCuboid(h, h, h, DIE_RADIUS).setFriction(DIE_FRICTION).setRestitution(DIE_RESTITUTION).setDensity(1);
}

export function addDie(pw: PhysicsWorld, dieId: number, p: ThrowParams): number {
  const { R, world } = pw;
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(p.position.x, p.position.y, p.position.z)
      .setRotation(p.rotation)
      .setLinvel(p.linvel.x, p.linvel.y, p.linvel.z)
      .setAngvel(p.angvel)
      .setCcdEnabled(true)
      .setAngularDamping(0.4)
      .setLinearDamping(0.05),
  );
  const col = world.createCollider(
    dieCollider(R).setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(CONTACT_FORCE_THRESHOLD),
    body,
  );
  pw.bodies.set(dieId, body.handle);
  pw.colliderToDie.set(col.handle, dieId);
  return body.handle;
}

/** Dado en reposo de una tirada anterior, como cuerpo FIJO: obstáculo determinista para relanzamientos. */
export function addRestingDie(pw: PhysicsWorld, dieId: number, position: Vec3, rotation: Quat): number {
  const { R, world } = pw;
  const body = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z).setRotation(rotation));
  const col = world.createCollider(dieCollider(R), body);
  pw.bodies.set(dieId, body.handle);
  pw.colliderToDie.set(col.handle, dieId);
  return body.handle;
}

export function getBody(pw: PhysicsWorld, dieId: number): RAPIER.RigidBody {
  const h = pw.bodies.get(dieId);
  const body = h === undefined ? null : pw.world.getRigidBody(h);
  if (!body) throw new Error(`Sin cuerpo para el dado ${dieId}`);
  return body;
}

/** q · v · q* (misma fórmula que Vector3.applyQuaternion de three). */
export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const { x, y, z, w } = q;
  const ix = w * v.x + y * v.z - z * v.y;
  const iy = w * v.y + z * v.x - x * v.z;
  const iz = w * v.z + x * v.y - y * v.x;
  const iw = -x * v.x - y * v.y - z * v.z;
  return {
    x: ix * w + iw * -x + iy * -z - iz * -y,
    y: iy * w + iw * -y + iz * -x - ix * -z,
    z: iz * w + iw * -z + ix * -y - iy * -x,
  };
}

/** Lado cuya normal apunta más hacia +Y y cuánto (coseno). */
export function topSide(rotation: Quat): { side: number; dot: number } {
  let side = 0;
  let dot = -2;
  SIDE_NORMALS.forEach((n, i) => {
    const d = rotateVec(rotation, n).y;
    if (d > dot) {
      dot = d;
      side = i;
    }
  });
  return { side, dot };
}

export function isSettled(body: RAPIER.RigidBody): boolean {
  if (body.isSleeping()) return true;
  const l = body.linvel();
  const a = body.angvel();
  return Math.hypot(l.x, l.y, l.z) < SETTLE_LINVEL && Math.hypot(a.x, a.y, a.z) < SETTLE_ANGVEL;
}

export function readTransform(body: RAPIER.RigidBody): Transform {
  const t = body.translation();
  const r = body.rotation();
  return { position: { x: t.x, y: t.y, z: t.z }, rotation: { x: r.x, y: r.y, z: r.z, w: r.w } };
}

/** Empujón determinista para un dado de canto: salto + giro que depende de n. */
export function nudge(body: RAPIER.RigidBody, n: number): void {
  body.applyImpulse({ x: 0, y: 6, z: 0 }, true);
  body.applyTorqueImpulse({ x: 2 + (n % 3), y: 1, z: 2 - (n % 2) }, true);
}
```

- [ ] **Step 5: Verde**: `npx vitest run src/physics/world.test.ts` → `7 passed`. Si "reposa en < 900 pasos" falla, subir `setAngularDamping` a 0.6 y `DIE_FRICTION` a 0.6 (anotar en `docs/DECISIONS.md`). Si falla la asserción de `dot > 0.95` (dado apoyado en pared), reducir `linvel.x` a `7 + rng.next()*3`.
- [ ] **Step 6: Commit**: `npm run check && git add src/physics && git commit -m "feat(PHY.1): mundo Rapier acotado, cuerpo de dado, reposo y lado superior"`.

---

### Tarea 13: Pre-roll determinista `[PHY.2]`

**Goal:** `planRoll` decide, ANTES de que el jugador vea nada, qué lado físico quedará arriba en cada dado y devuelve el `sideMap` que pinta la cara elegida por `core` en ese lado; `buildRollWorld` + `stepRoll` reproducen la misma simulación en pantalla. Incluye empujones programados para dados de canto y soporte de relanzar un solo dado con los demás en reposo.

**Files:**
- Create: `src/physics/preroll.ts`
- Test: `src/physics/preroll.test.ts`

**Interfaces:**
- Consumes: Tarea 12.
- Produces: `DieSpec { dieId; faceIndex }`, `RestingDie { dieId; position; rotation }`, `Nudge { step; dieId; n }`, `RollPlan { visualSeed; throws: { dieId; params }[]; resting; nudges; settleStep; topSides: Map; sideMaps: Map<number, number[]>; forced: boolean }`; `MAX_PLAN_STEPS = 1200`, `MAX_NUDGES = 4`; `sideMapFor(topSide, faceIndex): number[]`; `buildRollWorld(R, plan): PhysicsWorld`; `stepRoll(pw, plan, onContact?)`; `allSettled(pw, dieIds)`; `planRoll(R, dice, resting, visualSeed, maxSteps?): RollPlan`.

**Done when:** tests verdes en 25 semillas (replay = predicción, `dot ≥ COCKED_DOT`, `sideMap[topSide] = faceIndex`), relanzamiento con dados fijos reproducible, 8 dados reposan sin `forced`.

- [ ] **Step 1: Test rojo** — `src/physics/preroll.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { COCKED_DOT, getBody, readTransform, topSide } from './dieBody';
import { MAX_PLAN_STEPS, buildRollWorld, planRoll, sideMapFor, stepRoll } from './preroll';
import { type Rapier, freeWorld, initPhysics } from './world';

let R: Rapier;
beforeAll(async () => {
  R = await initPhysics();
});

describe('sideMapFor', () => {
  it('pone la cara elegida en el lado superior y es una permutación de 0..5', () => {
    const m = sideMapFor(4, 2);
    expect(m[4]).toBe(2);
    expect([...m].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sideMapFor(0, 0)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('planRoll', () => {
  it('el replay reproduce exactamente la pre-simulación (25 semillas, 3 dados)', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const dice = [
        { dieId: 1, faceIndex: seed % 6 },
        { dieId: 2, faceIndex: (seed * 7) % 6 },
        { dieId: 3, faceIndex: (seed * 11) % 6 },
      ];
      const plan = planRoll(R, dice, [], seed);
      expect(plan.forced).toBe(false);
      expect(plan.settleStep).toBeLessThan(MAX_PLAN_STEPS);
      const pw = buildRollWorld(R, plan);
      while (pw.step < plan.settleStep) stepRoll(pw, plan);
      for (const d of dice) {
        const { side, dot } = topSide(readTransform(getBody(pw, d.dieId)).rotation);
        expect(side).toBe(plan.topSides.get(d.dieId));
        expect(dot).toBeGreaterThanOrEqual(COCKED_DOT);
        expect(plan.sideMaps.get(d.dieId)?.[side]).toBe(d.faceIndex);
      }
      freeWorld(pw);
    }
  });

  it('relanzar un dado con el otro en reposo (fijo) es reproducible y no mueve al fijo', () => {
    const first = planRoll(R, [{ dieId: 1, faceIndex: 0 }, { dieId: 2, faceIndex: 3 }], [], 99);
    const pw = buildRollWorld(R, first);
    while (pw.step < first.settleStep) stepRoll(pw, first);
    const rest = readTransform(getBody(pw, 2));
    freeWorld(pw);
    const re = planRoll(R, [{ dieId: 1, faceIndex: 5 }], [{ dieId: 2, ...rest }], 100);
    const pw2 = buildRollWorld(R, re);
    while (pw2.step < re.settleStep) stepRoll(pw2, re);
    expect(topSide(readTransform(getBody(pw2, 1)).rotation).side).toBe(re.topSides.get(1));
    expect(readTransform(getBody(pw2, 2))).toEqual(rest);
    freeWorld(pw2);
  });

  it('8 dados reposan sin forzar (5 semillas)', () => {
    for (let seed = 200; seed < 205; seed++) {
      const dice = Array.from({ length: 8 }, (_, i) => ({ dieId: i + 1, faceIndex: i % 6 }));
      const plan = planRoll(R, dice, [], seed);
      expect(plan.forced).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/physics/preroll.test.ts` → FAIL.

- [ ] **Step 3: `src/physics/preroll.ts`**:

```ts
import { Rng } from '../core/rng';
import {
  COCKED_DOT, type Quat, type ThrowParams, type Vec3, addDie, addRestingDie, getBody, isSettled, makeThrowParams, nudge, readTransform, topSide,
} from './dieBody';
import { type ContactListener, type PhysicsWorld, type Rapier, createPhysicsWorld, freeWorld, stepWorld } from './world';

export interface DieSpec { dieId: number; faceIndex: number }
export interface RestingDie { dieId: number; position: Vec3; rotation: Quat }
export interface Nudge { step: number; dieId: number; n: number }

export interface RollPlan {
  visualSeed: number;
  throws: { dieId: number; params: ThrowParams }[];
  resting: RestingDie[];
  nudges: Nudge[];
  /** Paso en el que la pre-simulación dio todos los dados por reposados. */
  settleStep: number;
  /** dieId → lado físico que queda arriba. */
  topSides: Map<number, number>;
  /** dieId → sideMap (lado → índice de cara) con sideMap[topSide] = faceIndex. */
  sideMaps: Map<number, number[]>;
  /** true si se agotó el presupuesto sin reposo estable; la salvaguarda del controlador lo cubre. */
  forced: boolean;
}

export const MAX_PLAN_STEPS = 1200;
export const MAX_NUDGES = 4;

/** Relleno cíclico: cada cara aparece exactamente una vez y la elegida cae en topSide. */
export function sideMapFor(topSide: number, faceIndex: number): number[] {
  return Array.from({ length: 6 }, (_, s) => (((faceIndex + s - topSide) % 6) + 6) % 6);
}

/** Mundo nuevo con mesa + dados en reposo (fijos) + dados lanzados. La MISMA secuencia de operaciones siempre. */
export function buildRollWorld(R: Rapier, plan: Pick<RollPlan, 'throws' | 'resting'>): PhysicsWorld {
  const pw = createPhysicsWorld(R);
  for (const r of plan.resting) addRestingDie(pw, r.dieId, r.position, r.rotation);
  for (const t of plan.throws) addDie(pw, t.dieId, t.params);
  return pw;
}

/** Un paso de la tirada: aplica los empujones programados para este índice de paso y avanza. */
export function stepRoll(pw: PhysicsWorld, plan: Pick<RollPlan, 'nudges'>, onContact?: ContactListener): void {
  for (const n of plan.nudges) if (n.step === pw.step) nudge(getBody(pw, n.dieId), n.n);
  stepWorld(pw, onContact);
}

export function allSettled(pw: PhysicsWorld, dieIds: number[]): boolean {
  return dieIds.every((id) => isSettled(getBody(pw, id)));
}

export function planRoll(R: Rapier, dice: DieSpec[], resting: RestingDie[], visualSeed: number, maxSteps = MAX_PLAN_STEPS): RollPlan {
  const rng = Rng.fromSeed(visualSeed);
  const throws = dice.map((d, i) => ({ dieId: d.dieId, params: makeThrowParams(rng, i, dice.length) }));
  const ids = dice.map((d) => d.dieId);
  const nudges: Nudge[] = [];
  const pw = buildRollWorld(R, { throws, resting });
  let forced = false;
  let settleStep = 0;
  for (;;) {
    stepRoll(pw, { nudges });
    if (pw.step >= maxSteps) {
      forced = true;
      settleStep = pw.step;
      break;
    }
    if (pw.step % 5 !== 0 || !allSettled(pw, ids)) continue;
    const cocked = ids.filter((id) => topSide(readTransform(getBody(pw, id)).rotation).dot < COCKED_DOT);
    if (cocked.length === 0) {
      settleStep = pw.step;
      break;
    }
    if (nudges.length >= MAX_NUDGES) {
      forced = true;
      settleStep = pw.step;
      break;
    }
    // Se aplica en el siguiente stepRoll (mismo índice de paso en el replay).
    for (const id of cocked) nudges.push({ step: pw.step, dieId: id, n: nudges.length + 1 });
  }
  const topSides = new Map<number, number>();
  const sideMaps = new Map<number, number[]>();
  for (const d of dice) {
    const { side } = topSide(readTransform(getBody(pw, d.dieId)).rotation);
    topSides.set(d.dieId, side);
    sideMaps.set(d.dieId, sideMapFor(side, d.faceIndex));
  }
  freeWorld(pw);
  return { visualSeed, throws, resting, nudges, settleStep, topSides, sideMaps, forced };
}
```

- [ ] **Step 4: Verde**: `npx vitest run src/physics/preroll.test.ts` → `4 passed` (tarda unos segundos: 25+5 simulaciones). Si algún dado queda de canto tras 4 empujones, subir `MAX_NUDGES` a 6 y el impulso de `nudge` a `y: 8`.
- [ ] **Step 5: Commit**: `npm run check && git add src/physics/preroll.ts src/physics/preroll.test.ts && git commit -m "feat(PHY.2): pre-roll determinista con sideMap y empujones programados"`.

---

### Tarea 14: Escena Three.js `[REN.1]`

**Goal:** Renderer, cámara orbital acotada (diseño §9.1 "cámaras controladas"), luces con sombras y mesa visual que coincide con la mesa física.

**Files:**
- Create: `src/render/scene.ts`, `src/render/table.ts`, `src/ui/styles.css` (solo el bloque del canvas; la Tarea 17 lo amplía)
- Modify: `src/main.ts` (montar la escena cuando `?dev=scene`)
- Test: `e2e/scene.spec.ts`

**Interfaces:**
- Produces: `interface SceneCtx { renderer; scene; camera; controls; resize(); render(); dispose() }`; `createScene(canvas, opts?: { shadows?: boolean; maxPixelRatio?: number }): SceneCtx`; `createTable(scene): THREE.Group`.

**Done when:** `npm run build` verde; e2e `scene.spec.ts` (`/?dev=scene`) no registra errores de consola y el canvas tiene tamaño > 0; captura manual en `npm run dev` muestra mesa con borde y sombra.

- [ ] **Step 1: `src/render/scene.ts`**:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  resize(): void;
  render(): void;
  dispose(): void;
}

export interface SceneOptions {
  shadows?: boolean;
  maxPixelRatio?: number;
}

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions = {}): SceneCtx {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.maxPixelRatio ?? 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = opts.shadows ?? true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1f2a);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 9, 8);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 14;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.15;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a2f3a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 10, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  scene.add(sun);

  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, scene, camera, controls, resize,
    render: () => {
      controls.update();
      renderer.render(scene, camera);
    },
    dispose: () => {
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
    },
  };
}
```

- [ ] **Step 2: `src/render/table.ts`** (mismas medidas que `TABLE` de física; el borde visual es bajo, las paredes físicas altas son invisibles):

```ts
import * as THREE from 'three';
import { TABLE } from '../physics/world';

export function createTable(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const { halfX, halfZ, wallThickness: t } = TABLE;
  const felt = new THREE.Mesh(
    new THREE.BoxGeometry((halfX + t) * 2, TABLE.floorThickness, (halfZ + t) * 2),
    new THREE.MeshStandardMaterial({ color: 0x2e6b4f, roughness: 0.95 }),
  );
  felt.position.y = -TABLE.floorThickness / 2;
  felt.receiveShadow = true;
  g.add(felt);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.7 });
  const rimH = 0.35;
  const mk = (w: number, d: number, x: number, z: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, rimH, d), rimMat);
    m.position.set(x, rimH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  mk(t, (halfZ + t) * 2, halfX + t / 2, 0);
  mk(t, (halfZ + t) * 2, -(halfX + t / 2), 0);
  mk((halfX + t) * 2, t, 0, halfZ + t / 2);
  mk((halfX + t) * 2, t, 0, -(halfZ + t / 2));
  scene.add(g);
  return g;
}
```

- [ ] **Step 3: CSS del canvas** — `src/ui/styles.css`:

```css
:root { color-scheme: dark; --bg: #1b1f2a; --panel: rgba(20, 24, 33, 0.88); --fg: #f2f0ea; --accent: #f5c542; --pv: #b39dff; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--fg); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; overflow: hidden; }
#scene { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; touch-action: none; }
#app { position: fixed; inset: 0; pointer-events: none; }
#app > * { pointer-events: auto; }
```

- [ ] **Step 4: Modo dev en `src/main.ts`** — antes del `boot()` actual:

```ts
import './ui/styles.css';
import { createScene } from './render/scene';
import { createTable } from './render/table';

const params = new URLSearchParams(location.search);
if (params.get('dev') === 'scene') {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const ctx = createScene(canvas);
  createTable(ctx.scene);
  const tick = (): void => {
    ctx.render();
    requestAnimationFrame(tick);
  };
  tick();
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.textContent = 'OK scene';
  document.getElementById('app')?.append(status);
} else {
  boot().catch(/* como antes */);
}
```

- [ ] **Step 5: e2e** — `e2e/scene.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('la escena con mesa se renderiza sin errores', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?dev=scene');
  await expect(page.getByTestId('boot-status')).toHaveText('OK scene');
  const size = await page.locator('#scene').evaluate((c) => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height]);
  expect(size[0]).toBeGreaterThan(0);
  expect(size[1]).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 6: Verificar**: `npm run check && npm run build && npm run e2e` → verdes. Abrir `npm run dev` → `http://localhost:5173/?dev=scene`: mesa verde con borde marrón, sombra suave, la cámara orbita sin pasar bajo la mesa.
- [ ] **Step 7: Commit**: `git add src/render src/ui/styles.css src/main.ts e2e/scene.spec.ts && git commit -m "feat(REN.1): escena Three.js con cámara acotada, luces y mesa"`.

---

### Tarea 15: Malla de dado + texturas de cara `[REN.2]`

**Goal:** Un `DieMesh` con `RoundedBoxGeometry` y 6 materiales (uno por lado físico) cuyas texturas se generan en un canvas a partir de `FaceDef` (glifo + color por familia + nombre), que acepta un `sideMap`, se sincroniza desde una transformada física y resalta el lado superior.

**Files:**
- Create: `src/render/faceGlyph.ts` (puro), `src/render/faceTexture.ts`, `src/render/dieMesh.ts`
- Test: `src/render/faceGlyph.test.ts`

**Interfaces:**
- Produces: `FAMILY_COLORS: Record<FaceFamily, { bg: string; fg: string }>`; `faceGlyph(f: FaceDef): string`; `getFaceTexture(f: FaceDef): THREE.CanvasTexture` (cache por id); `class DieMesh { readonly mesh: THREE.Mesh; constructor(faces: DieFaces); setFaces(faces); applySideMap(sideMap: number[]); syncFrom(t: Transform); highlight(side: number | null); dispose() }`.

**Done when:** test de glifos verde; en `?dev=roll` (Tarea 16) se ven dados con caras distintas legibles.

- [ ] **Step 1: Test rojo** — `src/render/faceGlyph.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FACES, face } from '../core/data/faces';
import { FAMILY_COLORS, faceGlyph } from './faceGlyph';

describe('faceGlyph', () => {
  it('glifos de referencia', () => {
    expect(faceGlyph(face('g3'))).toBe('+3');
    expect(faceGlyph(face('pv2'))).toBe('+2★');
    expect(faceGlyph(face('x2gold'))).toBe('×2');
    expect(faceGlyph(face('risk_pv'))).toBe('25%');
    expect(faceGlyph(face('blank'))).toBe('');
  });
  it('toda familia tiene colores y toda cara tiene glifo definido', () => {
    for (const f of Object.values(FACES)) {
      expect(FAMILY_COLORS[f.family]).toBeDefined();
      expect(typeof faceGlyph(f)).toBe('string');
    }
  });
});
```

- [ ] **Step 2: `src/render/faceGlyph.ts`**:

```ts
import type { FaceDef, FaceFamily } from '../core/types';

export const FAMILY_COLORS: Record<FaceFamily, { bg: string; fg: string }> = {
  economy: { bg: '#f5c542', fg: '#3b2a00' },
  pv: { bg: '#7c5cff', fg: '#ffffff' },
  multiplier: { bg: '#ff7a3d', fg: '#2b0f00' },
  combo: { bg: '#38c8ff', fg: '#00202b' },
  generator: { bg: '#5be07a', fg: '#00240b' },
  risk: { bg: '#ff4d6d', fg: '#ffffff' },
  control: { bg: '#c9d1ff', fg: '#1a1f4d' },
  conversion: { bg: '#b78cff', fg: '#1d0c3d' },
  meta: { bg: '#ffd6f0', fg: '#4d1140' },
  blank: { bg: '#e9e4d8', fg: '#8a8375' },
};

/** Texto grande de la cara. Corto: se lee a distancia sobre el dado. */
export function faceGlyph(f: FaceDef): string {
  const e = f.effect;
  switch (e.kind) {
    case 'blank': return '';
    case 'gain': return [e.gold ? `+${e.gold}` : '', e.pv ? `+${e.pv}★` : ''].filter(Boolean).join(' ');
    case 'risk': return `${Math.round(e.chance * 100)}%`;
    case 'multiplier': return `×${e.factor}`;
    case 'combo': return '⚡';
    case 'spawn': return e.permanent ? '✦' : '✧';
    case 'control': return e.mode === 'copyBest' ? '⇄' : '↻';
    case 'convert': return '⚗';
    case 'scaling': return '◈';
  }
}
```

- [ ] **Step 3: `src/render/faceTexture.ts`**:

```ts
import * as THREE from 'three';
import type { FaceDef, FaceId } from '../core/types';
import { FAMILY_COLORS, faceGlyph } from './faceGlyph';

const SIZE = 256;
const cache = new Map<FaceId, THREE.CanvasTexture>();

export function getFaceTexture(f: FaceDef): THREE.CanvasTexture {
  const hit = cache.get(f.id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sin contexto 2D');
  const { bg, fg } = FAMILY_COLORS[f.family];
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = bg;
  roundRect(ctx, 14, 14, SIZE - 28, SIZE - 28, 28);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = faceGlyph(f);
  ctx.font = `bold ${glyph.length > 3 ? 72 : 96}px system-ui, sans-serif`;
  ctx.fillText(glyph, SIZE / 2, SIZE / 2 - 14);
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(f.name.toUpperCase(), SIZE / 2, SIZE - 46);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(f.id, tex);
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
```

- [ ] **Step 4: `src/render/dieMesh.ts`**:

```ts
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { face } from '../core/data/faces';
import type { DieFaces } from '../core/types';
import type { Transform } from '../physics/dieBody';
import { getFaceTexture } from './faceTexture';

const IDENTITY = [0, 1, 2, 3, 4, 5];

export class DieMesh {
  readonly mesh: THREE.Mesh;
  private readonly materials: THREE.MeshStandardMaterial[];
  private faces: DieFaces;
  private sideMap: number[] = [...IDENTITY];

  constructor(faces: DieFaces) {
    let geometry: THREE.BufferGeometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.08);
    if (geometry.groups.length !== 6) {
      // RoundedBoxGeometry hereda los 6 grupos de BoxGeometry; si una versión los pierde, caemos a cubo simple.
      console.warn('[DieMesh] RoundedBoxGeometry sin 6 grupos; usando BoxGeometry');
      geometry.dispose();
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    this.materials = Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }));
    this.mesh = new THREE.Mesh(geometry, this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.faces = [...faces] as DieFaces;
    this.applySideMap(this.sideMap);
  }

  setFaces(faces: DieFaces): void {
    this.faces = [...faces] as DieFaces;
    this.applySideMap(this.sideMap);
  }

  /** sideMap[lado físico] = índice de cara del dado. */
  applySideMap(sideMap: number[]): void {
    this.sideMap = [...sideMap];
    for (let s = 0; s < 6; s++) {
      const m = this.materials[s] as THREE.MeshStandardMaterial;
      m.map = getFaceTexture(face(this.faces[this.sideMap[s] as number] as string));
      m.needsUpdate = true;
    }
  }

  syncFrom(t: Transform): void {
    this.mesh.position.set(t.position.x, t.position.y, t.position.z);
    this.mesh.quaternion.set(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w);
  }

  highlight(side: number | null): void {
    this.materials.forEach((m, i) => {
      m.emissive.set(i === side ? '#ffd166' : '#000000');
      m.emissiveIntensity = i === side ? 0.55 : 0;
    });
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
```

- [ ] **Step 5: Verde**: `npx vitest run src/render/faceGlyph.test.ts` → `2 passed`; `npm run check && npm run build` verdes.
- [ ] **Step 6: Commit**: `git add src/render && git commit -m "feat(REN.2): malla de dado con texturas de cara generadas y sideMap"`.

---

### Tarea 16: Bucle de timestep fijo + primera tirada visible `[REN.3]`

**Goal:** Un bucle de física a 60 Hz fijos con acumulador (independiente del framerate: imprescindible para que el replay coincida con la pre-simulación) y un `RollRunner` reutilizable que lanza dados en pantalla, espera al reposo, verifica el lado superior contra el plan y resalta la cara. Se prueba con un modo `?dev=roll` que la Tarea 19 sustituye por el juego real.

**Files:**
- Create: `src/render/loop.ts`, `src/app/RollRunner.ts`, `src/app/rollDemo.ts`
- Modify: `src/main.ts` (`?dev=roll`)
- Test: `src/render/loop.test.ts`, `e2e/roll.spec.ts`

**Interfaces:**
- Produces (`loop.ts`): `interface LoopDeps { raf; caf; now }`; `createLoop(opts: { step(): void; render(alpha: number): void; dt?: number; maxStepsPerFrame?: number }, deps?): { start(); stop(); setSpeed(m: number); readonly running: boolean }`.
- Produces (`RollRunner.ts`): `interface RollOutcome { transforms: Map<number, Transform>; topSides: Map<number, number>; mismatches: number; forced: boolean }`; `class RollRunner { constructor(R: Rapier, ctx: SceneCtx, meshes: Map<number, DieMesh>, opts?: { onContact?: ContactListener }); roll(dice: DieSpec[], resting: RestingDie[], visualSeed: number, speed?: number): Promise<RollOutcome>; cancel(): void }`.
- `window.__df` (solo `import.meta.env.DEV` o `?dev=`): `{ rolls: number; mismatches: number; lastTopSides: Record<number, number> }`.

**Done when:** test del bucle verde; e2e `roll.spec.ts`: 5 tiradas en `/?dev=roll&seed=3` con `window.__df.mismatches === 0` y sin errores de consola.

- [ ] **Step 1: Test rojo del bucle** — `src/render/loop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLoop } from './loop';

function fakeDeps() {
  let t = 0;
  const frames: FrameRequestCallback[] = [];
  return {
    deps: {
      raf: (cb: FrameRequestCallback): number => { frames.push(cb); return frames.length; },
      caf: (): void => { frames.length = 0; },
      now: (): number => t,
    },
    tick(ms: number): void { t += ms; const cb = frames.shift(); if (cb) cb(t); },
  };
}

describe('createLoop', () => {
  it('avanza pasos fijos de 1/60 según el tiempo transcurrido y renderiza una vez por frame', () => {
    const f = fakeDeps();
    let steps = 0;
    let renders = 0;
    const loop = createLoop({ step: () => steps++, render: () => renders++ }, f.deps);
    loop.start();
    f.tick(50); // 3 pasos (50 ms / 16.67)
    expect(steps).toBe(3);
    expect(renders).toBe(1);
    f.tick(16.7); // 1 paso (+ resto acumulado)
    expect(steps).toBe(4);
  });
  it('limita los pasos por frame tras una pestaña dormida y respeta la velocidad', () => {
    const f = fakeDeps();
    let steps = 0;
    const loop = createLoop({ step: () => steps++, render: () => {}, maxStepsPerFrame: 8 }, f.deps);
    loop.start();
    f.tick(5000);
    expect(steps).toBe(8);
    loop.setSpeed(2);
    f.tick(50);
    expect(steps).toBe(14); // 100 ms simulados → 6 pasos
    loop.stop();
    expect(loop.running).toBe(false);
  });
});
```

- [ ] **Step 2: `src/render/loop.ts`**:

```ts
import { PHYSICS_DT } from '../physics/world';

export interface LoopDeps {
  raf: (cb: FrameRequestCallback) => number;
  caf: (id: number) => void;
  now: () => number;
}
export interface LoopOptions {
  step: () => void;
  render: (alpha: number) => void;
  dt?: number;
  maxStepsPerFrame?: number;
}
export interface LoopHandle {
  start(): void;
  stop(): void;
  setSpeed(mult: number): void;
  readonly running: boolean;
}

const browserDeps = (): LoopDeps => ({
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
});

/** Timestep fijo con acumulador: el número de pasos NO depende del framerate. */
export function createLoop(opts: LoopOptions, deps: LoopDeps = browserDeps()): LoopHandle {
  const dt = opts.dt ?? PHYSICS_DT;
  const maxSteps = opts.maxStepsPerFrame ?? 8;
  let acc = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let speed = 1;
  const frame = (now: number): void => {
    if (!running) return;
    acc += Math.min(0.25, (now - last) / 1000) * speed;
    last = now;
    let n = 0;
    while (acc >= dt && n < maxSteps) {
      opts.step();
      acc -= dt;
      n++;
    }
    if (n === maxSteps) acc = 0; // pestaña dormida: no intentar recuperar el tiempo perdido
    opts.render(acc / dt);
    raf = deps.raf(frame);
  };
  return {
    start() {
      if (running) return;
      running = true;
      last = deps.now();
      acc = 0;
      raf = deps.raf(frame);
    },
    stop() {
      running = false;
      deps.caf(raf);
    },
    setSpeed(m) {
      speed = m;
    },
    get running() {
      return running;
    },
  };
}
```

- [ ] **Step 3: `src/app/RollRunner.ts`**:

```ts
import { type DieMesh } from '../render/dieMesh';
import { createLoop, type LoopHandle } from '../render/loop';
import type { SceneCtx } from '../render/scene';
import { type Transform, getBody, readTransform, topSide } from '../physics/dieBody';
import { type DieSpec, type RestingDie, type RollPlan, buildRollWorld, planRoll, stepRoll } from '../physics/preroll';
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

  roll(dice: DieSpec[], resting: RestingDie[], visualSeed: number, speed = 1): Promise<RollOutcome> {
    this.cancel();
    const plan = planRoll(this.R, dice, resting, visualSeed);
    for (const d of dice) this.meshes.get(d.dieId)?.applySideMap(plan.sideMaps.get(d.dieId) ?? [0, 1, 2, 3, 4, 5]);
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
        mesh?.applySideMap(Array.from({ length: 6 }, (_, s) => (((d.faceIndex + s - side) % 6) + 6) % 6));
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
```

- [ ] **Step 4: `src/app/rollDemo.ts`** (modo dev; la Tarea 19 lo deja solo para e2e):

```ts
import { STARTER_FACES } from '../core/data/faces';
import { Rng, deriveSeed } from '../core/rng';
import { DieMesh } from '../render/dieMesh';
import { createScene } from '../render/scene';
import { createTable } from '../render/table';
import { initPhysics } from '../physics/world';
import { RollRunner } from './RollRunner';

declare global {
  interface Window {
    __df?: { rolls: number; mismatches: number; lastTopSides: Record<number, number> };
  }
}

export async function mountRollDemo(canvas: HTMLCanvasElement, root: HTMLElement, seed: number): Promise<void> {
  const R = await initPhysics();
  const ctx = createScene(canvas);
  createTable(ctx.scene);
  const meshes = new Map<number, DieMesh>();
  for (let id = 1; id <= 3; id++) {
    const m = new DieMesh(STARTER_FACES);
    m.mesh.position.set(-3 + id * 1.5, 0.5, 0);
    ctx.scene.add(m.mesh);
    meshes.set(id, m);
  }
  const runner = new RollRunner(R, ctx, meshes);
  const rng = Rng.fromSeed(seed);
  window.__df = { rolls: 0, mismatches: 0, lastTopSides: {} };

  const btn = document.createElement('button');
  btn.dataset.testid = 'demo-roll';
  btn.textContent = 'Lanzar';
  const status = document.createElement('p');
  status.dataset.testid = 'demo-status';
  status.textContent = 'idle';
  root.append(btn, status);
  ctx.render();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'rolling';
    const dice = [1, 2, 3].map((dieId) => ({ dieId, faceIndex: rng.int(0, 5) }));
    const out = await runner.roll(dice, [], deriveSeed(seed, window.__df?.rolls ?? 0));
    const df = window.__df;
    if (df) {
      df.rolls++;
      df.mismatches += out.mismatches;
      df.lastTopSides = Object.fromEntries(out.topSides);
    }
    status.textContent = 'settled';
    btn.disabled = false;
  });
}
```

En `src/main.ts` añadir la rama `params.get('dev') === 'roll'` → `mountRollDemo(canvas, app, Number(params.get('seed') ?? 1))`.

- [ ] **Step 5: e2e** — `e2e/roll.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('5 tiradas físicas coinciden con la pre-simulación', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?dev=roll&seed=3');
  await expect(page.getByTestId('demo-status')).toHaveText('idle');
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('demo-roll').click();
    await expect(page.getByTestId('demo-status')).toHaveText('settled', { timeout: 30_000 });
  }
  const df = await page.evaluate(() => window.__df);
  expect(df?.rolls).toBe(5);
  expect(df?.mismatches).toBe(0);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 6: Verificar**: `npx vitest run src/render/loop.test.ts` → `2 passed`; `npm run check && npm run build && npm run e2e` verdes. A mano (`npm run dev`, `/?dev=roll`): los dados entran desde la izquierda, rebotan, reposan en < 3 s y la cara superior queda iluminada.
- [ ] **Step 7: Commit**: `git add src/render/loop.ts src/render/loop.test.ts src/app e2e/roll.spec.ts src/main.ts && git commit -m "feat(REN.3): bucle fijo, RollRunner y primera tirada visible verificada"`.

---

# Integración — UI y controlador (`src/ui/`, `src/app/`)

Los componentes de UI son funciones `mountX(root, store, actions)` que se suscriben al store, re-renderizan su propio contenedor y devuelven una función de desmontaje. No conocen physics ni render; solo `GameState`, `UiState` y `UiActions`. Los tests de `src/ui/**` corren en jsdom (proyecto `jsdom` de Vitest; NO hace falta pragma).

### Tarea 17: Base de UI `[UI.1]`

**Goal:** Los cimientos de la interfaz: todos los textos, un store mínimo, helpers DOM, y los componentes que no dependen de la tienda: menú de nueva partida, HUD, controles de tirada, log "Qué ha pasado", panel de objetivo, pantalla final y overlay hot-seat. Todo con `data-testid` estables para Playwright.

**Files:**
- Create: `src/ui/strings.es.ts`, `src/ui/eventText.ts`, `src/ui/store.ts`, `src/ui/dom.ts`, `src/ui/uiState.ts`, `src/ui/Menu.ts`, `src/ui/Hud.ts`, `src/ui/RollControls.ts`, `src/ui/Log.ts`, `src/ui/ObjectivePanel.ts`, `src/ui/EndScreen.ts`, `src/ui/HotSeatOverlay.ts`
- Modify: `src/ui/styles.css`
- Test: `src/ui/strings.test.ts`, `src/ui/store.test.ts`, `src/ui/dom.test.ts`, `src/ui/components.test.ts`

**Interfaces:**
- `strings.es.ts`: `S` (objeto de textos, ver abajo), `fmt(template, params)`, `delta(gold, pv)`.
- `eventText.ts`: `EVENT_KEYS` (todas las `textKey` que emite el resolver), `describeEvent(e: RollEvent, state: GameState): string`.
- `store.ts`: `createStore<T>(initial): Store<T>` con `get()`, `set(patch | fn)`, `subscribe(fn): unsubscribe` (notifica solo si cambió algo, comparación superficial por clave).
- `dom.ts`: `h(tag, attrs?, ...children)` (attrs: `class`, `testid` → `data-testid`, `on*` listeners, `disabled`, `value`, cualquier atributo string), `clear(el)`, `mount(root, render: (s) => Node, store)` (helper que re-renderiza en cada cambio y devuelve unsubscribe).
- `uiState.ts`: `type Screen = 'menu' | 'game' | 'end'`; `interface Settings { volume: number; muted: boolean; reduceMotion: boolean; botSpeed: 'normal' | 'fast' | 'instant' }`; `DEFAULT_SETTINGS = { volume: 0.8, muted: false, reduceMotion: false, botSpeed: 'fast' }`; `interface UiState { screen; game: GameState | null; rolling: boolean; botThinking: boolean; forgeSlot: number | null; handoffSeat: number | null; settings: Settings; resumeAvailable: boolean; hintsSeen: string[] }`; `interface UiActions { startGame(cfg: GameConfig): void; resumeGame(): void; roll(): void; reroll(dieId: number): void; pass(): void; buyFace(slot, dieId, side): void; buyCard(slot): void; buyDie(): void; endTurn(): void; openForge(slot): void; closeForge(): void; confirmHandoff(): void; playAgain(): void; backToMenu(): void; updateSettings(patch: Partial<Settings>): void; dismissHint(id: string): void }`; `initialUiState(): UiState`; `humanSeat(state: GameState): boolean` (¿el asiento actual es humano?).
- Cada componente: `mountMenu(root, store, actions, prefill?: Partial<{ players; rounds; seed; seats: string[] }>)`, `mountHud`, `mountRollControls`, `mountLog`, `mountObjectivePanel`, `mountEndScreen`, `mountHotSeatOverlay` → todas devuelven `() => void`.

**Contrato DOM (testids) que usan los e2e:**
- Menú: `menu`, `menu-players` (select 2–4), `menu-seat-<i>` (select con valores `human | magnate | scorer | engineer | casino | balanced`), `menu-rounds` (select 2–8, defecto 8), `menu-seed` (input number, vacío = aleatorio), `start-game`, `resume-game` (solo si `resumeAvailable`).
- HUD: `hud-round` ("Ronda r / n"), `hud-turn`, `hud-gold`, `hud-pv`, `hud-dice`, filas `hud-player-<seat>` con `data-active="true"` en el asiento actual.
- Controles: contenedor `roll-controls` con atributo `data-phase` = fase actual (`roll | mitigate | shop | gameOver`) y `data-busy` siempre presente con valor `"true"` (si `rolling || botThinking`) o `"false"`; botones `btn-roll`, `btn-reroll-<dieId>`, `btn-pass`; texto `roll-summary` tras resolver.
- Log: `log` con `log-entry` (máximo 30 visibles, el más reciente arriba).
- Objetivo: `objective`, `objective-progress`.
- Final: `end-screen`, filas `end-row-<seat>`, `btn-again`, `btn-menu`.
- Hot-seat: `handoff`, `btn-handoff-ok`.

**Done when:** tests jsdom verdes; `S` no contiene cadenas vacías; `EVENT_KEYS` ⊆ claves de `S.ev`; los componentes renderizan un `GameState` real de `createGame` sin lanzar.

- [ ] **Step 1: Textos** — `src/ui/strings.es.ts`:

```ts
export const S = {
  app: { title: 'Dice Foundry', tagline: 'Lanza. Cobra. Forja. Repite.' },
  menu: {
    title: 'Nueva partida', players: 'Jugadores', seat: 'Asiento {n}', human: 'Humano',
    archetype: { magnate: 'Bot · Magnate', scorer: 'Bot · Puntuador', engineer: 'Bot · Ingeniero', casino: 'Bot · Casino', balanced: 'Bot · Equilibrado' },
    rounds: 'Rondas', seed: 'Semilla (opcional)', start: 'Jugar', resume: 'Reanudar partida', settings: 'Ajustes',
    howto: 'Cómo se juega',
    howtoText: 'Cada turno lanzas todos tus dados y cobras lo que muestran. Con el oro compras caras nuevas (y las forjas en un dado), cartas o más dados. Gana quien tenga más PV al acabar las rondas. Tu objetivo secreto da PV extra.',
  },
  hud: { round: 'Ronda {round} / {rounds}', turn: 'Turno de {name}', gold: 'Oro', pv: 'PV', dice: 'Dados', you: 'Tú' },
  roll: {
    roll: 'Lanzar dados', rolling: 'Lanzando…', reroll: 'Relanzar dado {id} ({cost} oro)', rerollFree: 'Relanzar dado {id} (gratis)',
    pass: 'Continuar', botTurn: '{name} está jugando…', summary: 'Esta tirada: {delta}',
  },
  shop: {
    title: 'Tienda', face: 'Cara', card: 'Carta', price: '{n} oro', buy: 'Comprar', buyDie: 'Comprar dado ({n} oro)',
    purchasesLeft: 'Compras restantes: {n}', endTurn: 'Terminar turno', empty: 'Vendido', cantAfford: 'Sin oro suficiente',
  },
  forge: { title: 'Forjar: {name}', hint: 'Elige el dado y la cara que quieres sustituir.', die: 'Dado {id}', cancel: 'Cancelar' },
  log: { title: 'Qué ha pasado', empty: 'Todavía no has lanzado.' },
  objective: { title: 'Objetivo secreto', progress: '{current} / {target}', reward: '+{pv} PV al final' },
  end: {
    title: 'Fin de la partida', winner: 'Gana {name}', tie: 'Empate: {names}', base: 'PV', objective: 'Objetivo', cards: 'Cartas',
    total: 'Total', achieved: 'cumplido', failed: 'no cumplido', again: 'Otra partida', menu: 'Menú',
  },
  handoff: { title: 'Pasa el dispositivo a {name}', ok: 'Estoy listo' },
  settings: {
    title: 'Ajustes', volume: 'Volumen', mute: 'Silencio', reduceMotion: 'Reducir movimiento', botSpeed: 'Velocidad de los bots',
    speed: { normal: 'Normal', fast: 'Rápida', instant: 'Instantánea' }, close: 'Cerrar',
  },
  hints: {
    roll: 'Pulsa Lanzar: cada dado muestra una cara y cobras lo que dice.',
    shop: 'Compra una cara y fórjala en un dado: así construyes tu build.',
    objective: 'Tu objetivo secreto da PV extra al final. Los rivales no lo ven.',
  },
  families: {
    economy: 'Economía', pv: 'Puntos', multiplier: 'Multiplicador', combo: 'Combo', generator: 'Generador',
    risk: 'Riesgo', control: 'Control', conversion: 'Conversión', meta: 'Meta', blank: 'Vacía',
  },
  ev: {
    gain: '{face}: {delta}', riskHit: '{face}: ¡acierto! {delta}', riskMiss: '{face}: fallo, nada', scaling: '{face}: {delta} (×{n})',
    comboHit: '{face}: combo, {delta}', comboMiss: '{face}: sin combo', multiplier: '{face}: oro ×{factor} ({delta})',
    cardBonus: '{card}: {delta}', convert: '{face}: 3 oro → 2 PV', convertFail: '{face}: sin oro para convertir',
    spawnTemp: '{face}: dado temporal para tu próxima tirada', spawnPerm: '{face}: ¡dado nuevo permanente!',
    mirror: '{face}: copia {copied}', mirrorNone: '{face}: nada que copiar', tax: '{card}: +1 oro para {name}',
  },
} as const;

/** Sustituye {clave} por params[clave]; deja la clave visible si falta (se ve en tests). */
export function fmt(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export function delta(gold: number, pv: number): string {
  const parts: string[] = [];
  if (gold) parts.push(`${gold > 0 ? '+' : ''}${gold} oro`);
  if (pv) parts.push(`${pv > 0 ? '+' : ''}${pv} PV`);
  return parts.join(', ') || '0';
}
```

`src/ui/eventText.ts`:
```ts
import { card } from '../core/data/cards';
import { face } from '../core/data/faces';
import type { GameState, RollEvent } from '../core/types';
import { S, delta, fmt } from './strings.es';

export const EVENT_KEYS = [
  'ev.gain', 'ev.riskHit', 'ev.riskMiss', 'ev.scaling', 'ev.comboHit', 'ev.comboMiss', 'ev.multiplier', 'ev.cardBonus',
  'ev.convert', 'ev.convertFail', 'ev.spawnTemp', 'ev.spawnPerm', 'ev.mirror', 'ev.mirrorNone', 'ev.tax',
] as const;

export function describeEvent(e: RollEvent, state: GameState): string {
  const key = e.textKey.replace(/^ev\./, '') as keyof typeof S.ev;
  const template = S.ev[key] ?? e.textKey;
  const params: Record<string, string | number> = { ...(e.params ?? {}), delta: delta(e.gold, e.pv) };
  if (e.faceId) params.face = face(e.faceId).name;
  if (e.cardId) params.card = card(e.cardId).name;
  if (typeof e.params?.seat === 'number') params.name = state.players[e.params.seat]?.name ?? '';
  return fmt(template, params);
}
```

- [ ] **Step 2: Test rojo de textos** — `src/ui/strings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../core/game';
import { EVENT_KEYS, describeEvent } from './eventText';
import { S, delta, fmt } from './strings.es';

function walk(obj: unknown, path: string, out: string[]): void {
  if (typeof obj === 'string') {
    if (obj.trim() === '') out.push(path);
    return;
  }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`, out);
}

describe('strings.es', () => {
  it('no tiene cadenas vacías', () => {
    const empties: string[] = [];
    walk(S, 'S', empties);
    expect(empties).toEqual([]);
  });
  it('fmt y delta', () => {
    expect(fmt('Ronda {round} / {rounds}', { round: 2, rounds: 8 })).toBe('Ronda 2 / 8');
    expect(fmt('{x}', {})).toBe('{x}');
    expect(delta(3, 0)).toBe('+3 oro');
    expect(delta(-3, 2)).toBe('-3 oro, +2 PV');
    expect(delta(0, 0)).toBe('0');
  });
  it('todas las textKey del resolver tienen texto', () => {
    for (const k of EVENT_KEYS) expect(S.ev[k.replace('ev.', '') as keyof typeof S.ev]).toBeTruthy();
  });
  it('describeEvent resuelve nombres de cara, carta y jugador', () => {
    const state = createGame({ seats: [{ name: 'Ana', kind: 'human' }, { name: 'Bot', kind: 'bot' }], rounds: 2, seed: 1 });
    expect(describeEvent({ step: 'gain', faceId: 'g3', gold: 3, pv: 0, textKey: 'ev.gain' }, state)).toBe('Bolsa: +3 oro');
    expect(describeEvent({ step: 'tax', cardId: 'card_tax', gold: 1, pv: 0, textKey: 'ev.tax', params: { seat: 1, from: 0 } }, state)).toBe('Recaudador: +1 oro para Bot');
    expect(describeEvent({ step: 'multiplier', faceId: 'x2gold', gold: 3, pv: 0, textKey: 'ev.multiplier', params: { factor: 2 } }, state)).toBe('Forja ardiente: oro ×2 (+3 oro)');
  });
});
```

- [ ] **Step 3: Store y DOM** — `src/ui/store.ts`:

```ts
export type Patch<T> = Partial<T> | ((s: T) => Partial<T>);
export interface Store<T extends object> {
  get(): T;
  set(patch: Patch<T>): void;
  subscribe(fn: (s: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<(s: T) => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      let changed = false;
      for (const k of Object.keys(p) as (keyof T)[]) if (p[k] !== state[k]) { changed = true; break; }
      if (!changed) return;
      state = { ...state, ...p };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state);
      return () => subs.delete(fn);
    },
  };
}
```

`src/ui/dom.ts`:
```ts
import type { Store } from './store';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((ev: Event) => void) | undefined>;

export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'testid') el.dataset.testid = String(v);
    else if (k === 'class') el.className = String(v);
    else if (k === 'disabled' || k === 'selected' || k === 'checked') (el as unknown as Record<string, boolean>)[k] = v === true;
    else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Re-renderiza `root` con `render(state)` en cada cambio del store. */
export function mount<T extends object>(root: HTMLElement, store: Store<T>, render: (s: T) => Node | null): () => void {
  return store.subscribe((s) => {
    clear(root);
    const node = render(s);
    if (node) root.append(node);
  });
}
```

Tests `src/ui/store.test.ts` (notifica al suscribir y al cambiar; no notifica si nada cambió; `set` con función; unsubscribe) y `src/ui/dom.test.ts` (`h` pone testid/class/listeners/disabled; `mount` re-renderiza al cambiar el store). Escribirlos con 3-4 `it` cada uno siguiendo el estilo de los tests anteriores.

- [ ] **Step 4: `src/ui/uiState.ts`** con las interfaces del bloque Interfaces y:

```ts
export function initialUiState(): UiState {
  return { screen: 'menu', game: null, rolling: false, botThinking: false, forgeSlot: null, handoffSeat: null, settings: { ...DEFAULT_SETTINGS }, resumeAvailable: false, hintsSeen: [] };
}
export function humanSeat(state: GameState): boolean {
  return state.players[state.currentSeat]?.kind === 'human';
}
```

- [ ] **Step 5: Componentes.** Reglas comunes: cada `mountX` crea su contenedor con `class="panel <nombre>"` dentro de `root`, usa `mount(root, store, render)` y devuelve el unsubscribe. Todo texto desde `S`/`fmt`. Los botones llaman a `actions.*` y NO tocan el store.

`Menu.ts` — `mountMenu(root, store, actions, prefill)`: visible solo si `screen === 'menu'`. Render: título + tagline; select `menu-players` (2–4, defecto `prefill.players ?? 2`); por cada asiento `i < players` un select `menu-seat-<i>` (asiento 0 defecto `human`, resto `balanced`; `prefill.seats[i]` gana); select `menu-rounds` (2..8, defecto `prefill.rounds ?? 8`); input `menu-seed` (`prefill.seed`); botón `start-game` → `actions.startGame({ seats, rounds, seed })` donde `seed = Number(input) || deriveSeed(Date.now() >>> 0, Math.floor(performance.now()))` y `seats[i] = value === 'human' ? { name: 'Jugador i+1', kind: 'human' } : { name: S.menu.archetype[value] sin el prefijo 'Bot · ' + ' i+1', kind: 'bot', archetype: value }`; botón `resume-game` si `resumeAvailable` → `actions.resumeGame()`; bloque `howto` plegable (`<details>`). Al cambiar `menu-players` se re-renderiza la lista de asientos (guardar la selección en un estado local del componente, no en el store).

`Hud.ts` — `mountHud`: visible si `screen === 'game'` y `game`. Muestra `hud-round`, `hud-turn` (`S.hud.turn` con el nombre del asiento actual; si es humano y hay un solo humano, `S.hud.you`), y para el asiento actual `hud-gold`, `hud-pv`, `hud-dice` (permanentes + temporales como "3 (+1)"). Lista `hud-player-<seat>` con nombre · oro · PV · dados y `data-active`.

`RollControls.ts` — `mountRollControls`: contenedor `roll-controls` con `data-phase` y `data-busy`. Fase `roll` + humano + no busy → `btn-roll`; fase `mitigate` → por cada resultado un `btn-reroll-<dieId>` (deshabilitado si `rerollUsed` o sin oro; texto `reroll`/`rerollFree` con `cost = rerollCost(state)`) y `btn-pass`; fase `shop` → `roll-summary` con `S.roll.summary` (`delta(lastResolution.gold, lastResolution.pv)`); bot pensando → texto `S.roll.botTurn`.

`Log.ts` — `mountLog`: `log` con hasta 30 `log-entry` (`state.log` invertido) usando `describeEvent`; `S.log.empty` si vacío.

`ObjectivePanel.ts` — `mountObjectivePanel`: solo para el asiento humano actual (si el actual es bot, muestra el del último humano que jugó… simplificar: muestra el objetivo del asiento 0 si es humano; en hot-seat, del asiento actual). Nombre, descripción, `objective-progress` con `objectiveProgress(player)` y `S.objective.reward`.

`EndScreen.ts` — `mountEndScreen`: visible si `screen === 'end'`. Título, `S.end.winner`/`S.end.tie`, tabla con `end-row-<seat>`: nombre, PV base, objetivo (nombre + `achieved/failed` + PV), cartas, total, oro. Botones `btn-again` → `actions.playAgain()` y `btn-menu` → `actions.backToMenu()`.

`HotSeatOverlay.ts` — `mountHotSeatOverlay`: visible si `handoffSeat !== null`; cubre toda la pantalla (para que el siguiente humano no vea el objetivo del anterior), `S.handoff.title` con el nombre y `btn-handoff-ok` → `actions.confirmHandoff()`.

CSS (`styles.css`): paneles con `--panel`, esquinas 12 px, tipografía 14–16 px; layout desktop en grid: HUD arriba-izquierda, objetivo arriba-derecha, controles abajo-centro, log abajo-izquierda, tienda (Tarea 18) derecha; `[data-busy="true"] button { opacity: .5; pointer-events: none }`; menú y final centrados con fondo semitransparente.

- [ ] **Step 6: Test de componentes** — `src/ui/components.test.ts` (jsdom):

```ts
import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountEndScreen } from './EndScreen';
import { mountHotSeatOverlay } from './HotSeatOverlay';
import { mountHud } from './Hud';
import { mountLog } from './Log';
import { mountMenu } from './Menu';
import { mountObjectivePanel } from './ObjectivePanel';
import { mountRollControls } from './RollControls';
import { createStore } from './store';
import { type UiActions, initialUiState } from './uiState';

const actions = (): UiActions => ({
  startGame: vi.fn(), resumeGame: vi.fn(), roll: vi.fn(), reroll: vi.fn(), pass: vi.fn(), buyFace: vi.fn(), buyCard: vi.fn(),
  buyDie: vi.fn(), endTurn: vi.fn(), openForge: vi.fn(), closeForge: vi.fn(), confirmHandoff: vi.fn(), playAgain: vi.fn(),
  backToMenu: vi.fn(), updateSettings: vi.fn(), dismissHint: vi.fn(),
});
const game = () => createGame({ seats: [{ name: 'Ana', kind: 'human' }, { name: 'Bot', kind: 'bot', archetype: 'balanced' }], rounds: 2, seed: 3 });
const q = (root: HTMLElement, id: string) => root.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('Menu', () => {
  it('arranca una partida con la configuración elegida', () => {
    const root = document.createElement('div');
    const a = actions();
    mountMenu(root, createStore(initialUiState()), a, { players: 3, rounds: 4, seed: 42 });
    expect(q(root, 'menu-seat-2')).not.toBeNull();
    q(root, 'start-game')!.click();
    expect(a.startGame).toHaveBeenCalledWith(expect.objectContaining({ rounds: 4, seed: 42 }));
    const cfg = (a.startGame as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(cfg.seats).toHaveLength(3);
    expect(cfg.seats[0].kind).toBe('human');
  });
});

describe('Hud + RollControls + Log + Objective', () => {
  it('muestran el estado y disparan acciones por fase', () => {
    const root = document.createElement('div');
    const store = createStore({ ...initialUiState(), screen: 'game' as const, game: game() });
    const a = actions();
    mountHud(root, store);
    mountRollControls(root, store, a);
    mountLog(root, store);
    mountObjectivePanel(root, store);
    expect(q(root, 'hud-round')!.textContent).toBe('Ronda 1 / 2');
    expect(q(root, 'hud-gold')!.textContent).toContain('5');
    expect(q(root, 'roll-controls')!.dataset.phase).toBe('roll');
    q(root, 'btn-roll')!.click();
    expect(a.roll).toHaveBeenCalled();
    let g = applyAction(store.get().game!, { type: 'roll' });
    store.set({ game: g });
    expect(q(root, 'roll-controls')!.dataset.phase).toBe('mitigate');
    expect(root.querySelectorAll('[data-testid^="btn-reroll-"]')).toHaveLength(2);
    q(root, 'btn-pass')!.click();
    expect(a.pass).toHaveBeenCalled();
    g = applyAction(g, { type: 'pass' });
    store.set({ game: g });
    expect(q(root, 'roll-summary')!.textContent).toContain('Esta tirada');
    expect(root.querySelectorAll('[data-testid="log-entry"]').length).toBe(g.log.length);
    expect(q(root, 'objective-progress')).not.toBeNull();
    store.set({ botThinking: true });
    expect(q(root, 'roll-controls')!.dataset.busy).toBe('true');
  });
});

describe('EndScreen + HotSeat', () => {
  it('pantalla final con filas por jugador y overlay de hot-seat', () => {
    const root = document.createElement('div');
    let g = game();
    for (let i = 0; i < 4; i++) g = applyAction(applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' }), { type: 'endTurn' });
    const store = createStore({ ...initialUiState(), screen: 'end' as const, game: g, handoffSeat: 1 });
    const a = actions();
    mountEndScreen(root, store, a);
    mountHotSeatOverlay(root, store, a);
    expect(q(root, 'end-row-0')).not.toBeNull();
    expect(q(root, 'end-row-1')).not.toBeNull();
    q(root, 'btn-again')!.click();
    expect(a.playAgain).toHaveBeenCalled();
    expect(q(root, 'handoff')!.textContent).toContain('Bot');
    q(root, 'btn-handoff-ok')!.click();
    expect(a.confirmHandoff).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Verde**: `npx vitest run src/ui` → todos verdes (strings 4, store ~4, dom ~4, components 3).
- [ ] **Step 8: Commit**: `npm run check && git add src/ui && git commit -m "feat(UI.1): strings, store, helpers DOM y componentes base (menú, HUD, controles, log, objetivo, final, hot-seat)"`.

---

### Tarea 18: Tienda y forja `[UI.2]`

**Goal:** El panel de tienda (5 slots + comprar dado + compras restantes + terminar turno) y la modal de forja (elegir dado y lado). Es donde vive la pregunta central del juego: "¿qué cara quiero cambiar y por qué?" (diseño §9.4).

**Files:**
- Create: `src/ui/Shop.ts`, `src/ui/Forge.ts`, `src/ui/faceCard.ts` (helper: tarjeta HTML de una `FaceDef`/`CardDef` con glifo, nombre, familia, descripción, precio)
- Modify: `src/ui/styles.css`
- Test: `src/ui/Shop.test.ts`, `src/ui/Forge.test.ts`

**Interfaces:**
- `mountShop(root, store, actions)`, `mountForge(root, store, actions)`; `renderItemCard(item: ShopItem, price: number, opts: { disabled: boolean; reason?: string }): HTMLElement`.
- Testids: `shop` (visible en fase `shop` del humano), `shop-slot-<i>` (con `data-kind="face|card|empty"`), `buy-<i>`, `buy-die`, `purchases-left`, `btn-end-turn`; `forge` (visible si `forgeSlot !== null`), `forge-die-<dieId>-side-<s>`, `forge-cancel`.

**Reglas de UI:**
- Precio mostrado = `itemPrice(item, jugador)`; si hay descuento, se muestra el precio tachado original.
- `buy-<i>` deshabilitado (con `title` = `S.shop.cantAfford`) si no hay oro, si `purchasesThisTurn ≥ 2` o si `rolling/botThinking`. Slot vacío muestra `S.shop.empty`.
- Comprar cara → `actions.openForge(slot)`; comprar carta → `actions.buyCard(slot)`; `buy-die` → `actions.buyDie()`; `btn-end-turn` → `actions.endTurn()`.
- Forja: cabecera con la cara nueva (`renderItemCard`), `S.forge.hint`, y por cada dado permanente del jugador actual una rejilla 3×2 con `forge-die-<id>-side-<s>` mostrando glifo + nombre de la cara actual; clic → `actions.buyFace(forgeSlot, dieId, side)`; `forge-cancel` → `actions.closeForge()`. Los dados temporales no aparecen.

**Done when:** tests jsdom verdes; e2e de la Tarea 19 compra una cara vía forja.

- [ ] **Step 1: Test rojo** — `src/ui/Shop.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountShop } from './Shop';
import { createStore } from './store';
import { type UiActions, initialUiState } from './uiState';

const actions = () => ({ openForge: vi.fn(), buyCard: vi.fn(), buyDie: vi.fn(), endTurn: vi.fn() }) as unknown as UiActions;
const shopState = (gold: number) => {
  let g = createGame({ seats: [{ name: 'Ana', kind: 'human' }, { name: 'Bot', kind: 'bot' }], rounds: 2, seed: 5 });
  g = { ...g, players: g.players.map((p) => ({ ...p, gold })) };
  return applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' });
};
const q = (root: HTMLElement, id: string) => root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;

describe('Shop', () => {
  it('renderiza 5 slots, comprar dado, compras restantes y terminar turno', () => {
    const root = document.createElement('div');
    const a = actions();
    mountShop(root, createStore({ ...initialUiState(), screen: 'game', game: shopState(50) }), a);
    for (let i = 0; i < 5; i++) expect(q(root, `shop-slot-${i}`)).not.toBeNull();
    expect(q(root, 'purchases-left')!.textContent).toContain('2');
    q(root, 'buy-die')!.click();
    expect(a.buyDie).toHaveBeenCalled();
    q(root, 'btn-end-turn')!.click();
    expect(a.endTurn).toHaveBeenCalled();
  });
  it('sin oro todo está deshabilitado; con oro, comprar cara abre la forja y carta compra', () => {
    const root = document.createElement('div');
    const a = actions();
    const store = createStore({ ...initialUiState(), screen: 'game', game: shopState(0) });
    mountShop(root, store, a);
    for (let i = 0; i < 5; i++) expect(q(root, `buy-${i}`)!.disabled).toBe(true);
    expect(q(root, 'buy-die')!.disabled).toBe(true);
    store.set({ game: shopState(50) });
    const g = store.get().game!;
    const faceSlot = g.shop.slots.findIndex((s) => s?.kind === 'face');
    q(root, `buy-${faceSlot}`)!.click();
    expect(a.openForge).toHaveBeenCalledWith(faceSlot);
    const cardSlot = g.shop.slots.findIndex((s) => s?.kind === 'card');
    if (cardSlot >= 0) {
      q(root, `buy-${cardSlot}`)!.click();
      expect(a.buyCard).toHaveBeenCalledWith(cardSlot);
    }
  });
});
```

`src/ui/Forge.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../core/game';
import { mountForge } from './Forge';
import { createStore } from './store';
import { type UiActions, initialUiState } from './uiState';

describe('Forge', () => {
  it('muestra 6 celdas por dado permanente y compra al elegir una', () => {
    let g = createGame({ seats: [{ name: 'Ana', kind: 'human' }, { name: 'Bot', kind: 'bot' }], rounds: 2, seed: 5 });
    g = applyAction(applyAction(g, { type: 'roll' }), { type: 'pass' });
    const slot = g.shop.slots.findIndex((s) => s?.kind === 'face');
    const root = document.createElement('div');
    const a = { buyFace: vi.fn(), closeForge: vi.fn() } as unknown as UiActions;
    const store = createStore({ ...initialUiState(), screen: 'game', game: g, forgeSlot: slot });
    mountForge(root, store, a);
    expect(root.querySelectorAll('[data-testid^="forge-die-"]')).toHaveLength(12);
    (root.querySelector('[data-testid="forge-die-1-side-5"]') as HTMLElement).click();
    expect(a.buyFace).toHaveBeenCalledWith(slot, 1, 5);
    (root.querySelector('[data-testid="forge-cancel"]') as HTMLElement).click();
    expect(a.closeForge).toHaveBeenCalled();
    store.set({ forgeSlot: null });
    expect(root.querySelector('[data-testid="forge"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Rojo**: `npx vitest run src/ui/Shop.test.ts src/ui/Forge.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `faceCard.ts`, `Shop.ts`, `Forge.ts` según el contrato (usar `face()`, `card()`, `itemPrice`, `diePrice`, `MAX_PURCHASES_PER_TURN`, `permanentDice`, `faceGlyph`, `FAMILY_COLORS` como color de borde de la tarjeta) y el CSS: la tienda es una columna a la derecha (ancho 320 px) con scroll; la forja, una modal centrada con rejillas 3×2 de celdas de 64 px.
- [ ] **Step 4: Verde**: `npx vitest run src/ui` → verdes.
- [ ] **Step 5: Commit**: `npm run check && git add src/ui && git commit -m "feat(UI.2): panel de tienda y modal de forja"`.

---

### Tarea 19: GameController: partida completa jugable `[APP.1]`

**Goal:** El único módulo donde core, physics, render, ui y (después) audio/telemetría se tocan. Con esta tarea el juego se juega de principio a fin en el navegador contra bots o en hot-seat: es el "Vertical slice → MVP jugable" del diseño §11 fases 1-2.

**Files:**
- Create: `src/app/GameController.ts`, `src/app/emitter.ts`, `src/app/params.ts`
- Modify: `src/main.ts` (arranque real; los modos `?dev=` siguen disponibles), `src/ui/styles.css` (layout final)
- Test: `src/app/emitter.test.ts`, `src/app/params.test.ts`, `e2e/game.spec.ts`

**Interfaces:**
- `emitter.ts`: `createEmitter<Events extends Record<string, unknown[]>>()` con `on(name, fn): () => void` y `emit(name, ...args)`.
- `params.ts`: `readParams(search: string): { seed?: number; rounds?: number; players?: number; seats?: string[]; bots?: 'normal'|'fast'|'instant'; dev?: string }`.
- `GameController`:
  ```ts
  export type ControllerEvents = {
    state: [GameState];                 // tras cada applyAction
    'roll:start': [seat: number, dice: DieSpec[]];
    'roll:contact': [dieId: number, force: number];
    'roll:settled': [outcome: RollOutcome];
    resolved: [seat: number, resolution: RollResolution];
    purchase: [seat: number, action: GameAction];
    turn: [seat: number];
    gameover: [FinalScore[]];
    screen: [Screen];
  };
  export class GameController implements UiActions {
    constructor(deps: { R: Rapier; canvas: HTMLCanvasElement; root: HTMLElement; store: Store<UiState>; prefill: ReturnType<typeof readParams> });
    readonly events: Emitter<ControllerEvents>;
    mount(): void;      // crea escena, mesa, monta todos los componentes de UI
    getState(): GameState | null;
    // + todos los métodos de UiActions
  }
  ```
- `window.__df` (si `import.meta.env.DEV` o `?dev=` o `?e2e=1`): `{ getState(): GameState | null; rolls: number; mismatches: number }`.

**Flujo (contrato exacto):**
1. `startGame(cfg)`: `state = createGame(cfg)`; `store.set({ screen: 'game', game, forgeSlot: null })`; `syncDiceMeshes()` (crea un `DieMesh` por dado del jugador actual, en fila en la "bandeja" `x = −4, y = 0.5, z = −2 + i`); `emit('turn')`; si el actual es bot → `runBotTurn()`.
2. `roll()`: solo si fase `roll`, humano y no busy. `state = applyAction(roll)`; `store.set({ rolling: true })`; `visualSeed = deriveSeed(cfg.seed, round, seat, 0)`; `outcome = await runner.roll(results → DieSpec[], [], visualSeed, 1)`; guardar `restTransforms`; `rolls++`, `mismatches += outcome.mismatches`; `store.set({ rolling: false, game })`; `emit('roll:settled')`.
3. `reroll(dieId)`: `state = applyAction(reroll)`; física solo para ese dado con `resting = restTransforms` de los demás; `visualSeed = deriveSeed(cfg.seed, round, seat, 1)`.
4. `pass()`: `state = applyAction(pass)`; `emit('resolved')`; `store.set({ game })`. (El resaltado de caras permanece hasta el siguiente roll.)
5. `buyFace/buyCard/buyDie`: `applyAction`; `emit('purchase')`; `closeForge()`; si `buyDie` o `buyFace` → `syncDiceMeshes()` (añade/retextura).
6. `endTurn()`: `applyAction(endTurn)`; si `gameOver` → `store.set({ screen: 'end' })`, `emit('gameover')`; si el nuevo asiento es bot → `runBotTurn()`; si es humano y hay ≥ 2 humanos → `store.set({ handoffSeat })` y esperar `confirmHandoff()`; en todo caso `syncDiceMeshes()` y `emit('turn')`.
7. `runBotTurn()`: `store.set({ botThinking: true })`; bucle `while (fase !== gameOver && asiento es bot)`: `a = decideBotAction(state)`; si `a.type === 'roll'` → aplicar y, según `settings.botSpeed`: `instant` → colocar cada mesh en identidad con `applySideMap(sideMapFor(2, faceIndex))` y sin física; `fast` → `runner.roll(..., 3)`; `normal` → `runner.roll(..., 1.5)`; si `reroll` → igual con un dado; si compra/pass/endTurn → aplicar y `await delay(botSpeed === 'instant' ? 0 : 350)`. Al salir: `store.set({ botThinking: false })` y continuar con el paso 6 para el nuevo asiento.
8. `playAgain()`: misma config con `seed + 1`. `backToMenu()`: `runner.cancel()`, limpiar meshes, `screen: 'menu'`.
9. Todos los errores `IllegalActionError` se capturan y se ignoran con `console.warn` (la UI ya deshabilita lo ilegal).

**Done when:** e2e `game.spec.ts` verde; a mano se completa una partida de 8 rondas contra 3 bots sin errores de consola y en menos de 15 minutos con bots en `fast`.

- [ ] **Step 1: Tests unitarios pequeños** — `src/app/emitter.test.ts` (on/emit/unsubscribe) y `src/app/params.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readParams } from './params';

describe('readParams', () => {
  it('lee semilla, rondas, jugadores, asientos y velocidad de bots', () => {
    expect(readParams('?seed=42&rounds=2&players=3&seats=human,human,casino&bots=instant')).toEqual({
      seed: 42, rounds: 2, players: 3, seats: ['human', 'human', 'casino'], bots: 'instant',
    });
    expect(readParams('')).toEqual({});
    expect(readParams('?rounds=99&bots=nope')).toEqual({});
  });
});
```

- [ ] **Step 2: e2e** — `e2e/game.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { captureConsoleErrors } from './harness';

async function phase(page: Page): Promise<string> {
  return (await page.getByTestId('roll-controls').getAttribute('data-phase')) ?? '';
}

test('partida completa de 2 rondas contra un bot instantáneo', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?seed=42&rounds=2&players=2&bots=instant&e2e=1');
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  let bought = false;
  for (let guard = 0; guard < 6; guard++) {
    if (await page.getByTestId('end-screen').isVisible()) break;
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'roll', { timeout: 30_000 });
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-busy', 'false');
    await page.getByTestId('btn-roll').click();
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'mitigate', { timeout: 30_000 });
    await page.getByTestId('btn-pass').click();
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
    if (!bought) {
      const enabled = page.locator('[data-testid^="buy-"]:not([data-testid="buy-die"]):enabled');
      if ((await enabled.count()) > 0) {
        const slot = page.locator('[data-testid^="shop-slot-"][data-kind="face"]').first();
        const idx = (await slot.getAttribute('data-testid'))!.replace('shop-slot-', '');
        if (await page.getByTestId(`buy-${idx}`).isEnabled()) {
          await page.getByTestId(`buy-${idx}`).click();
          await page.getByTestId('forge-die-1-side-5').click();
          await expect(page.getByTestId('forge')).toBeHidden();
          bought = true;
        }
      }
    }
    await page.getByTestId('btn-end-turn').click();
  }
  await expect(page.getByTestId('end-screen')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('end-row-0')).toBeVisible();
  await expect(page.getByTestId('end-row-1')).toBeVisible();
  const df = await page.evaluate(() => window.__df);
  expect(df?.mismatches).toBe(0);
  expect(errors).toEqual([]);
  expect(await phase(page)).toBe('gameOver');
});
```

- [ ] **Step 3: Implementar** `emitter.ts`, `params.ts`, `GameController.ts` y el `main.ts` final:

```ts
// src/main.ts (final)
import './ui/styles.css';
import { GameController } from './app/GameController';
import { readParams } from './app/params';
import { mountRollDemo } from './app/rollDemo';
import { initPhysics } from './physics/world';
import { createStore } from './ui/store';
import { initialUiState } from './ui/uiState';

async function main(): Promise<void> {
  const params = readParams(location.search);
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const root = document.getElementById('app') as HTMLElement;
  if (params.dev === 'roll') return mountRollDemo(canvas, root, params.seed ?? 1);
  const R = await initPhysics();
  const store = createStore(initialUiState());
  if (params.bots) store.set({ settings: { ...store.get().settings, botSpeed: params.bots } });
  const controller = new GameController({ R, canvas, root, store, prefill: params });
  controller.mount();
  if (import.meta.env.DEV || params.dev || params.e2e) {
    window.__df = { getState: () => controller.getState(), rolls: 0, mismatches: 0 };
    controller.events.on('roll:settled', (o) => { window.__df!.rolls++; window.__df!.mismatches += o.mismatches; });
  }
}
main().catch((err: unknown) => console.error(err));
```
(Actualizar la declaración global de `window.__df` en `rollDemo.ts` a `{ rolls; mismatches; lastTopSides?; getState? }` para que ambas formas compilen; `readParams` debe devolver también `e2e?: boolean` y `dev?: string`.)

- [ ] **Step 4: Verificar**: `npm run check && npm run build && npm run e2e` verdes. A mano: partida de 8 rondas vs 3 bots (`fast`), comprobar que el log explica cada tirada, que la forja cambia la cara visible del dado y que el final revela los objetivos.
- [ ] **Step 5: Commit**: `git add src/app src/main.ts src/ui/styles.css e2e/game.spec.ts && git commit -m "feat(APP.1): GameController, partida completa contra bots y hot-seat"`.

---

# Fase 2 — Completar el MVP (feedback, persistencia, telemetría, e2e, balance, móvil, deploy)

Todas estas tareas se enganchan a `controller.events` (Tarea 19) sin modificar el flujo del controlador, salvo donde se indica.

### Tarea 20: Audio sintetizado `[AUD.1]`

**Goal:** "Sonido de dados, UI y feedback" (diseño §6) sin assets: impactos de dado proporcionales a la fuerza de contacto de Rapier, monedas, PV, compra, error y victoria, con volumen y silencio en un panel de ajustes.

**Files:**
- Create: `src/audio/synth.ts` (puro), `src/audio/AudioEngine.ts`, `src/app/wireAudio.ts`, `src/ui/SettingsPanel.ts`
- Modify: `src/app/GameController.ts` (añadir evento `illegal: [reason: string]` y emitirlo en el `catch` de `IllegalActionError`; montar `SettingsPanel`)
- Test: `src/audio/synth.test.ts`

**Interfaces:**
- `synth.ts`: `class RateLimiter { constructor(minGapMs: number); allow(key: string, now: number): boolean }`; `midiToHz(midi: number): number`; `MAX_VOICES = 12`.
- `AudioEngine`: `constructor(opts?: { ctxFactory?: () => AudioContext })`; `unlock(): void` (crea/resume el contexto; llamar en el primer `pointerdown`/`keydown`); `setVolume(v: 0..1)`; `setMuted(m)`; `whoosh()`; `click(dieId: number, force: number)`; `coin(count: number)`; `pv()`; `buy()`; `error()`; `win()`.
- `wireAudio(controller, store, engine): () => void`.
- `SettingsPanel`: botón `settings-open` (esquina superior derecha, visible en menú y partida) que abre una modal `settings` con `settings-volume` (range 0–1), `settings-mute` (checkbox), `settings-motion` (checkbox), `settings-botspeed` (select) y `settings-close`; cada cambio → `actions.updateSettings(patch)`.

**Diseño de cada sonido (Web Audio, sin ficheros):**
- Cadena: voz → `DynamicsCompressor` (threshold −6, ratio 12, attack 0.002, release 0.15) → `master` (gain = volumen, 0 si mute) → `destination` (patrón de `Incremental/src/core/audio.ts`: el compresor ANTES del master).
- `click(dieId, force)`: ruido blanco 40 ms (buffer precalculado de 0,05 s) → `BiquadFilter` bandpass (freq 1400 + jitter ±500 Hz, Q 1.2) → gain con decay exponencial 35 ms; ganancia `clamp(force / 120, 0.08, 1) × 0.6`; `RateLimiter(45 ms)` por `dieId`; máximo `MAX_VOICES` simultáneas (se ignoran las demás). El jitter sale de un `Rng.fromSeed(1)` propio del motor (Math.random está prohibido).
- `whoosh()`: ruido 250 ms lowpass 400 → 3000 Hz con rampa, gain 0.25.
- `coin(n)`: `min(n, 6)` blips escalonados 55 ms: sine 880 → 1320 Hz (rampa 30 ms), 70 ms, gain 0.35.
- `pv()`: tríada C5-E5-G5 (`midiToHz(72/76/79)`) triangle 220 ms, gain 0.3.
- `buy()`: sine 220 Hz 120 ms + click sintético; `error()`: square 110 Hz 150 ms gain 0.2; `win()`: arpegio C5-E5-G5-C6 sawtooth+lowpass, 4×120 ms.

**Cableado (`wireAudio`):** `roll:start` → `whoosh`; `roll:contact` → `click`; `resolved` → `coin(gold)` y, si `pv > 0`, `pv()` a los 150 ms; `purchase` → `buy`; `illegal` → `error`; `gameover` → `win`; cambios de `settings.volume/muted` → `setVolume/setMuted`; `document.addEventListener('pointerdown', unlock, { once: true })` y lo mismo con `keydown`.

**Done when:** `synth.test.ts` verde; en el navegador los dados suenan al rebotar (más fuerte cuanto más fuerte golpean), cobrar suena a monedas, y `settings-mute` silencia todo de inmediato.

- [ ] **Step 1: Test rojo** — `src/audio/synth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_VOICES, RateLimiter, midiToHz } from './synth';

describe('synth helpers', () => {
  it('midiToHz: A4 = 440, C5 ≈ 523.25', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(72)).toBeCloseTo(523.25, 1);
  });
  it('RateLimiter deja pasar la primera, bloquea dentro del hueco y por clave', () => {
    const rl = new RateLimiter(45);
    expect(rl.allow('d1', 0)).toBe(true);
    expect(rl.allow('d1', 20)).toBe(false);
    expect(rl.allow('d2', 20)).toBe(true);
    expect(rl.allow('d1', 46)).toBe(true);
  });
  it('MAX_VOICES es 12', () => {
    expect(MAX_VOICES).toBe(12);
  });
});
```

- [ ] **Step 2: Implementar** `synth.ts`, `AudioEngine.ts` (cada `play*` comprueba `this.ctx` y `voices < MAX_VOICES`; cada voz se desconecta en `onended`), `wireAudio.ts`, `SettingsPanel.ts` y el cableado en `main.ts`: `const audio = new AudioEngine(); wireAudio(controller, store, audio);`.
- [ ] **Step 3: Verde**: `npm run check && npm run build && npm run e2e` (los e2e siguen sin errores de consola: el `AudioContext` solo se crea tras un gesto).
- [ ] **Step 4: Commit**: `git add src/audio src/app src/ui src/main.ts && git commit -m "feat(AUD.1): audio sintetizado con Web Audio, panel de ajustes y cableado por eventos"`.

---

### Tarea 21: Feedback visual de la recompensa `[FX.1]`

**Goal:** "Feedback de la recompensa es parte del gameplay" (diseño §1): números flotantes sobre cada dado al resolver, chorro de monedas cuando una cara paga ≥ 3 oro, pulso en la cara superior, y respeto de `reduceMotion`.

**Files:**
- Create: `src/render/effects.ts`, `src/app/wireEffects.ts`
- Modify: `src/app/RollRunner.ts` (opción `onRender?: () => void` llamada en cada frame del bucle), `src/app/GameController.ts` (bucle ambiente: `createLoop({ step: () => {}, render: () => { effects.update(); ctx.render(); } })` que corre cuando NO hay tirada; el runner lo para/reanuda)
- Test: `src/render/effects.test.ts`

**Interfaces:**
- `projectToScreen(v: Vec3, camera: THREE.Camera, width: number, height: number): { x: number; y: number; visible: boolean }`.
- `class FloatingLabels { constructor(layer: HTMLElement, camera); show(text: string, world: Vec3, cls: 'gold' | 'pv' | 'neutral', opts?: { durationMs?: number; rise?: boolean }); update(now?: number): void; clear() }` — cada etiqueta es un `<span class="fx-label fx-gold">` posicionado con `transform: translate(x, y)`; sube 40 px y se desvanece en `durationMs` (900; 600 sin subir si `reduceMotion`).
- `class CoinBurst { constructor(scene); burst(world: Vec3, count: number); update(dt: number) }` — `THREE.Points` con 24 partículas doradas, velocidad inicial aleatoria (`Rng.fromSeed(2)` propio), gravedad −25, vida 0,7 s; con `reduceMotion` no se crea.
- `wireEffects(controller, store, deps: { labels; burst; meshes: Map<number, DieMesh> }): () => void`.

**Cableado:** `resolved` → por cada `RollEvent` con `dieId` y (`gold` o `pv`) ≠ 0, etiqueta `delta(gold, pv)` sobre la posición del mesh del dado (clase `gold` si solo oro, `pv` si hay PV), escalonadas 120 ms; si `gold ≥ 3` → `burst` en ese dado; eventos de carta (`cardId`) → etiqueta sobre el centro de la mesa `{0, 1.2, 0}`. `purchase` → etiqueta neutral `−{precio} oro` sobre la bandeja de dados. La capa de etiquetas es un `<div id="fx-layer">` con `pointer-events: none` dentro de `#app`.

**Done when:** `effects.test.ts` verde; e2e `game.spec.ts` sigue verde; a mano, al resolver aparecen números sobre los dados y con `settings-motion` activado no hay partículas.

- [ ] **Step 1: Test rojo** — `src/render/effects.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { projectToScreen } from './effects';

describe('projectToScreen', () => {
  it('un punto delante de la cámara cae dentro del viewport; uno detrás no es visible', () => {
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    cam.position.set(0, 9, 8);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const p = projectToScreen({ x: 0, y: 0.5, z: 0 }, cam, 1600, 900);
    expect(p.visible).toBe(true);
    expect(p.x).toBeGreaterThan(700);
    expect(p.x).toBeLessThan(900);
    expect(projectToScreen({ x: 0, y: 9, z: 20 }, cam, 1600, 900).visible).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar** `effects.ts` (`projectToScreen` usa `new THREE.Vector3(...).project(camera)`, `visible = z < 1 && |x|,|y| ≤ 1`), `wireEffects.ts`, los cambios en `RollRunner`/`GameController` y el CSS de `.fx-label` (fuente 20 px negrita, sombra, `.fx-gold` color `--accent`, `.fx-pv` color `--pv`, animación por JS, no CSS, para poder desactivarla).
- [ ] **Step 3: Verde**: `npm run check && npm run build && npm run e2e`.
- [ ] **Step 4: Commit**: `git add src/render src/app src/ui/styles.css && git commit -m "feat(FX.1): números flotantes, chorro de monedas y bucle ambiente"`.

---

### Tarea 22: Persistencia local `[PERS.1]`

**Goal:** Ajustes, autosave de la partida en curso con reanudación, estadísticas locales y pistas vistas en `localStorage` versionado con cuarentena de saves corruptos (patrón de `Incremental/src/core/save.ts` y `Brisca/src/store/settingsStore.ts`).

**Files:**
- Create: `src/app/persistence.ts`
- Modify: `src/app/GameController.ts` (`resumeGame`, autosave en `state`, `resumeAvailable`), `src/main.ts`, `src/ui/Menu.ts` (botón `resume-game` ya previsto)
- Test: `src/app/persistence.test.ts`, `e2e/resume.spec.ts`

**Interfaces:**
- `interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }`; `KEYS = { settings: 'df.settings.v1', save: 'df.save.v1', saveCorrupt: 'df.save.corrupt', stats: 'df.stats.v1', hints: 'df.hints.v1', anon: 'df.anon.v1' }`.
- `loadSettings(storage): Settings` (cada campo validado individualmente; inválido → `DEFAULT_SETTINGS`), `saveSettings(storage, s)`.
- `saveGame(storage, state, now)`, `loadGame(storage): GameState | null` (si hay texto pero `fromSave` devuelve null → copiar a `saveCorrupt`, borrar `save`, devolver null), `clearGame(storage)`.
- `interface Stats { gamesStarted: number; gamesFinished: number; playAgainClicks: number; lastPlayedAt: number }`; `loadStats(storage): Stats`; `bumpStat(storage, key: keyof Stats, now): Stats`.
- `loadHints(storage): string[]`, `saveHints(storage, ids)`.
- Todas envuelven `getItem/setItem` en `try/catch` (storage lleno o bloqueado → seguir sin persistir).

**Cableado:** `main.ts` carga ajustes al arrancar (`store.set({ settings })`) y `resumeAvailable = loadGame(localStorage) !== null`. Controlador: `state` → `saveGame` si `phase !== 'gameOver'`, si no `clearGame` + `bumpStat('gamesFinished')`; `startGame` → `bumpStat('gamesStarted')`; `playAgain` → `bumpStat('playAgainClicks')`; `updateSettings` → `saveSettings`; `beforeunload` → `saveGame`. `resumeGame()`: `state = loadGame()`; si `null` → volver al menú; `screen: 'game'`; `syncDiceMeshes()`; si `phase === 'mitigate'` → colocar los dados en reposo con identidad y `applySideMap(sideMapFor(2, faceIndex))` (sin física); si el asiento actual es bot → `runBotTurn()`.

**Done when:** tests verdes; e2e `resume.spec.ts`: tirar + pasar, recargar, `resume-game` visible, reanudar, `hud-round` = "Ronda 1 / 2" y `data-phase="shop"`.

- [ ] **Step 1: Test rojo** — `src/app/persistence.test.ts` (storage en memoria):

```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../core/game';
import { DEFAULT_SETTINGS } from '../ui/uiState';
import { KEYS, type StorageLike, bumpStat, clearGame, loadGame, loadSettings, loadStats, saveGame, saveSettings } from './persistence';

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
const cfg = { seats: [{ name: 'A', kind: 'human' as const }, { name: 'B', kind: 'bot' as const }], rounds: 2, seed: 1 };

describe('persistence', () => {
  it('guarda y recupera la partida; clearGame la borra', () => {
    const st = memStorage();
    const g = createGame(cfg);
    saveGame(st, g, 100);
    expect(loadGame(st)).toEqual(g);
    clearGame(st);
    expect(loadGame(st)).toBeNull();
  });
  it('pone en cuarentena un save corrupto', () => {
    const st = memStorage();
    st.setItem(KEYS.save, '{"v":1,"state":{"nope":true}}');
    expect(loadGame(st)).toBeNull();
    expect(st.getItem(KEYS.save)).toBeNull();
    expect(st.getItem(KEYS.saveCorrupt)).toContain('nope');
  });
  it('valida los ajustes campo a campo', () => {
    const st = memStorage();
    expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
    st.setItem(KEYS.settings, JSON.stringify({ volume: 7, muted: true, botSpeed: 'warp', reduceMotion: 'yes' }));
    expect(loadSettings(st)).toEqual({ ...DEFAULT_SETTINGS, muted: true });
    saveSettings(st, { ...DEFAULT_SETTINGS, volume: 0.3 });
    expect(loadSettings(st).volume).toBe(0.3);
  });
  it('estadísticas: incrementa y conserva lastPlayedAt', () => {
    const st = memStorage();
    expect(loadStats(st).gamesStarted).toBe(0);
    bumpStat(st, 'gamesStarted', 5);
    const s = bumpStat(st, 'gamesStarted', 9);
    expect(s.gamesStarted).toBe(2);
    expect(s.lastPlayedAt).toBe(9);
  });
  it('un storage que lanza no rompe nada', () => {
    const broken: StorageLike = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); }, removeItem: () => {} };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveGame(broken, createGame(cfg), 1)).not.toThrow();
    expect(loadGame(broken)).toBeNull();
  });
});
```

`e2e/resume.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('recargar a mitad de partida permite reanudar en la misma fase', async ({ page }) => {
  await page.goto('/?seed=42&rounds=2&players=2&bots=instant&e2e=1');
  await page.getByTestId('start-game').click();
  await page.getByTestId('btn-roll').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'mitigate', { timeout: 30_000 });
  await page.getByTestId('btn-pass').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
  const gold = await page.getByTestId('hud-gold').textContent();
  await page.reload();
  await page.getByTestId('resume-game').click();
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
  await expect(page.getByTestId('hud-gold')).toHaveText(gold ?? '');
});
```

- [ ] **Step 2: Implementar** y cablear. **Step 3: Verde**: `npm run check && npm run e2e`. **Step 4: Commit**: `git add src/app src/main.ts src/ui e2e/resume.spec.ts && git commit -m "feat(PERS.1): ajustes, autosave con reanudación y stats en localStorage"`.

---

### Tarea 23: Telemetría `[TEL.1]`

**Goal:** Medir lo que el diseño §14 dice que decidirá si merece la pena monetizar, sin backend propio: eventos con propiedades a un sink enchufable (consola en dev, PostHog por HTTP si hay clave, Vercel Analytics para páginas vistas), y un documento que mapea métrica ↔ evento.

**Files:**
- Create: `src/app/telemetry.ts`, `src/app/wireTelemetry.ts`, `docs/telemetry.md`, `.env.example`
- Modify: `src/main.ts`, `src/app/GameController.ts` (emitir `round: [round]` al cambiar de ronda)
- Test: `src/app/telemetry.test.ts`

**Interfaces:**
- `type TelemetryEvent = 'app_open' | 'game_start' | 'roll' | 'reroll' | 'purchase' | 'round_end' | 'game_end' | 'play_again' | 'game_abandon' | 'physics_mismatch'`; `type Props = Record<string, string | number | boolean>`; `interface TelemetrySink { send(name: TelemetryEvent, props: Props): void }`; `createTelemetry(sinks: TelemetrySink[], base: Props): { track(name, props?) }` (añade `base` + `ts` a cada evento; nunca lanza).
- `consoleSink: TelemetrySink`; `posthogSink(opts: { key: string; host: string; distinctId: string; beacon?: (url: string, body: string) => boolean }): TelemetrySink` → `POST {host}/capture/` con `{ api_key, event, distinct_id, properties, timestamp }` vía `navigator.sendBeacon` (inyectable) con fallback `fetch(..., { keepalive: true })`.
- `anonId(storage): string` → `crypto.randomUUID()` persistido en `KEYS.anon`.
- Env (`import.meta.env`): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (defecto `https://eu.i.posthog.com`). Sin clave → solo consola (dev) / nada (prod). `@vercel/analytics`: `inject()` en `main.ts` si `import.meta.env.PROD` (páginas vistas, gratis).

**Eventos y propiedades (`wireTelemetry`):** `app_open {}` al montar; `game_start { players, humans, rounds, seed }`; `roll { round, seat, dice, isBot }`; `reroll { round, cost }`; `purchase { round, kind: 'face'|'card'|'die', id, price }`; `round_end { round, leaderSeat }`; `game_end { rounds, winnerSeat, winnerIsHuman, durationMs, humanTotal, builds }` (`builds` = etiquetas `classifyBuild` unidas por coma); `play_again {}`; `game_abandon { round, phase }` en `beforeunload` con partida en curso; `physics_mismatch { count }` cuando `outcome.mismatches > 0`.

**`docs/telemetry.md`:** tabla "Métrica (diseño §14) → evento(s) → cómo se calcula": partidas/usuario/día ← `game_start` por `distinct_id`; % que termina su primera partida ← `game_end`/`game_start` del primer día; repetición inmediata ← `play_again`; retención D1/D7/D30 ← `app_open` por `distinct_id`; duración media ← `game_end.durationMs`; abandono durante la tirada ← `game_abandon.phase in (roll, mitigate)`; uso de builds ← `game_end.builds`; win rate de caras/cartas ← `purchase.id` × `game_end.winnerSeat`; conversión/ARPPU ← N/A hasta monetizar. Y la nota: "la métrica crítica no es el dinero: es si tras una partida el usuario piensa «quiero probar otra build»" ← `play_again / game_end`.

**Done when:** tests verdes (fake sink recibe eventos con `base` y `ts`; `posthogSink` construye el payload correcto con un `beacon` falso; `createTelemetry` no propaga excepciones del sink); `.env.example` documenta las variables; `docs/telemetry.md` existe.

- [ ] **Step 1: Test rojo** — `src/app/telemetry.test.ts` (3 `it` según el Done when; el payload esperado: `JSON.parse(body)` con `api_key: 'k'`, `event: 'roll'`, `distinct_id: 'u1'`, `properties.round: 2`, `properties.app: 'dice-foundry'`).
- [ ] **Step 2: Implementar** y cablear en `main.ts`: `const telemetry = createTelemetry(sinks, { app: 'dice-foundry', version: APP_VERSION }); wireTelemetry(controller, store, telemetry);`.
- [ ] **Step 3: Verde**: `npm run check && npm run e2e`. **Step 4: Commit**: `git add src/app src/main.ts docs/telemetry.md .env.example && git commit -m "feat(TEL.1): telemetría con sinks consola/PostHog/Vercel y documento de métricas"`.

👤 HUMANO (documentado en README, no bloquea): crear proyecto en PostHog (plan gratuito) y añadir `VITE_POSTHOG_KEY` en las variables de entorno de Vercel; activar "Web Analytics" en el panel de Vercel.

---

### Tarea 24: Suite e2e completa + CI `[E2E.1]`

**Goal:** Consolidar los e2e en una suite estable (helpers compartidos, esperas por atributos `data-phase`, cero `waitForTimeout`) que cubra boot, escena, tirada física, partida contra bot, hot-seat y reanudación, y que corra en GitHub Actions en cada push.

**Files:**
- Modify: `e2e/harness.ts` (helpers `startGame(page, params)`, `playHumanTurn(page, opts?: { buyFace?: boolean })`, `untilEndOrPhase(page)`), `e2e/game.spec.ts` (usar helpers), `.github/workflows/ci.yml` (ya ejecuta `npm run e2e`; añadir `timeout-minutes: 20`)
- Create: `e2e/hotseat.spec.ts`
- Modify: `package.json` (`"test:all": "npm run check && npm run e2e"`)

`e2e/hotseat.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('dos humanos: overlay de pasar el dispositivo entre turnos', async ({ page }) => {
  await page.goto('/?seed=7&rounds=2&players=2&seats=human,human&e2e=1');
  await page.getByTestId('start-game').click();
  await page.getByTestId('btn-roll').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'mitigate', { timeout: 30_000 });
  await page.getByTestId('btn-pass').click();
  await page.getByTestId('btn-end-turn').click();
  await expect(page.getByTestId('handoff')).toBeVisible();
  await expect(page.getByTestId('handoff')).toContainText('Jugador 2');
  await page.getByTestId('btn-handoff-ok').click();
  await expect(page.getByTestId('handoff')).toBeHidden();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'roll');
  await expect(page.getByTestId('hud-turn')).toContainText('Jugador 2');
});
```

**Done when:** `npm run e2e` ejecuta 6 specs verdes en local (< 4 min) y el workflow `CI` está verde en GitHub para el commit de esta tarea (`gh run watch --exit-status`).

- [ ] Steps: refactor de helpers → `npm run e2e` verde → commit `test(E2E.1): suite e2e completa (boot, escena, tirada, partida, hot-seat, reanudar)` → push → `gh run watch --exit-status`.

---

### Tarea 25: Segundo pase de balance + builds de referencia `[BAL.2]`

**Goal:** Con el juego completo, volver a balancear con 5000 partidas y en 2, 3 y 4 jugadores; medir el winrate por build final y comprobar que las 6 builds del diseño §4 emergen.

**Files:**
- Modify: `src/core/sim/metrics.ts` (añadir `buildWinRate: Record<BuildLabel, number>` = P(ganar | build) y `buildShare`), `src/core/sim/simulate.ts` si hace falta, `src/core/data/*.ts` (números), `src/core/balance.test.ts` (añadir caso de 3 jugadores, 200 partidas), `docs/balance/latest.md`, `docs/balance/CHANGELOG.md`, `docs/rules.md`
- Create: `docs/balance/builds.md` (tabla build → frecuencia, winrate, caras/cartas típicas)

**Umbrales adicionales:** los de la Tarea 10 en las tres configuraciones (`--seats magnate,scorer,engineer,casino`, `--seats balanced,scorer,engineer`, `--seats magnate,balanced`); ninguna build con `buildWinRate > 0.45` teniendo `buildShare > 0.10`; cada una de las 6 builds de referencia con `buildShare ≥ 0.03` o anotada en el CHANGELOG como deuda con una hipótesis (p. ej. "Combo no emerge: los bots no valoran pares de caras; añadir bonus de sinergia al bot en UX.2").

**Done when:** `npm run sim -- --games 5000` en las tres configuraciones cumple umbrales; `builds.md` escrito; `npm run check` verde (balance.test con 3 configuraciones, < 25 s).

- [ ] Steps: métricas nuevas con test → 3 ejecuciones de 5000 → iterar con las palancas de la Tarea 11 → docs → commit `feat(BAL.2): segundo pase de balance y análisis de builds`.

---

### Tarea 26: Móvil / responsive `[MOB.1]`

**Goal:** "Funciona bien en desktop y puede adaptarse a móvil" (diseño §19.10): jugable a 390 px de ancho con dedo, sin perder rendimiento.

**Files:**
- Modify: `src/ui/styles.css` (breakpoint ≤ 768 px), `src/ui/Shop.ts` (bottom sheet con `shop-toggle` que muestra "Tienda · N compras"), `src/ui/Log.ts` (plegable, `log-toggle`), `src/render/scene.ts` (opciones desde `main.ts`: `maxPixelRatio: 1.5` y `shadows: false` si `matchMedia('(pointer: coarse)').matches || innerWidth < 768`), `src/ui/Forge.ts` (modal a pantalla completa), `playwright.config.ts` (proyecto `mobile` con `devices['iPhone 13']` y `testMatch: /mobile\.spec\.ts/`; el proyecto `chromium` con `testIgnore: /mobile\.spec\.ts/`)
- Create: `e2e/mobile.spec.ts` (misma partida de 2 rondas que `game.spec.ts` usando `shop-toggle` antes de comprar/terminar turno; comprueba que no hay scroll horizontal: `document.documentElement.scrollWidth <= innerWidth`)

**Reglas:** botón Lanzar ≥ 56 px de alto y ancho completo abajo; HUD en una barra superior de una línea (ronda · oro · PV · dados); objetivo como chip que abre un popover; `touch-action: none` en el canvas; sin hover-only; tipografía ≥ 14 px; zonas seguras con `env(safe-area-inset-*)`.

**Done when:** `npm run e2e` (incluye `mobile`) verde; captura manual con DevTools a 390×844 sin solapes.

- [ ] Steps: CSS + componentes → config Playwright → spec → verde → commit `feat(MOB.1): layout móvil, bottom sheet de tienda y ajustes de render táctil`.

---

### Tarea 27: Deploy en Vercel + landing + analytics `[REL.1]`

**Goal:** Versión gratuita jugable en una URL pública (diseño §11 fase 4) desplegada con la CLI de Vercel ya autenticada, con cabeceras de seguridad, metadatos de landing y verificación automática contra producción.

**Files:**
- Create: `vercel.json`
- Modify: `index.html` (OpenGraph/Twitter meta, `theme-color`, `<noscript>`), `src/main.ts` (`inject()` de `@vercel/analytics` en PROD), `playwright.config.ts` (`baseURL: process.env.BASE_URL ?? 'http://localhost:4173'`; `webServer` solo si no hay `BASE_URL`), `README.md` (sección Deploy + URL), `.gitignore` (`.vercel` ya está)

`vercel.json` (patrón de `ColorEveryday/vercel.json`, sin funciones):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 1**: ficheros de arriba; `npm run check && npm run build`.
- [ ] **Step 2: Enlazar y desplegar** (la CLI está autenticada como `adrianwheels`):

```bash
cd "D:/Proyectos/Dice Foundry" && vercel link --yes --project dice-foundry && vercel --prod --yes
```
Expected: la última línea imprime la URL de producción (`https://dice-foundry-….vercel.app` o `https://dice-foundry.vercel.app`). Si `vercel link` pide scope, repetir con `--scope adrianwheels`.

- [ ] **Step 3: Verificar producción**:

```bash
curl -sI "https://<url-de-produccion>" | head -1 && BASE_URL="https://<url-de-produccion>" npx playwright test e2e/boot.spec.ts e2e/roll.spec.ts
```
Expected: `HTTP/2 200` y 2 specs verdes contra producción.

- [ ] **Step 4: Documentar** en `README.md` ("Deploy: `npm run deploy`; producción: <URL>") y commit `chore(REL.1): deploy en Vercel, landing y analytics` + `git push`.

👤 HUMANO (opcional, documentado en README): dominio propio (`dice.adrianrueda.dev`) en el panel de Vercel; activar Web Analytics; `VITE_POSTHOG_KEY`.

---

### Tarea 28: Pistas de primera partida `[UX.1]`

**Goal:** Tres pistas contextuales descartables (lanzar, forjar, objetivo) que solo aparecen en la primera partida del dispositivo (diseño §9.4: "la interfaz debe explicar inmediatamente").

**Files:**
- Create: `src/ui/Hints.ts`
- Modify: `src/app/GameController.ts` (`dismissHint` → store + `saveHints`), `src/main.ts` (`hintsSeen = loadHints(localStorage)`)
- Test: `src/ui/Hints.test.ts` (jsdom), `e2e/hints.spec.ts`

**Contrato:** `mountHints(root, store, actions)`; pista `roll` visible en fase `roll` del primer turno humano si `!hintsSeen.includes('roll')`; `shop` en la primera fase `shop`; `objective` tras la primera resolución. Cada pista: `hint-<id>` con texto `S.hints[id]` y botón `hint-dismiss-<id>` → `actions.dismissHint(id)`. Máximo una pista visible a la vez (prioridad roll > shop > objective). e2e: en `/?seed=1&rounds=2&players=2&bots=instant&e2e=1` aparece `hint-roll`; descartar; tras recargar y empezar otra partida no aparece.

**Done when:** tests verdes; commit `feat(UX.1): pistas de primera partida persistidas`.

---

### Tarea 29: Cierre `[SETUP.2]`

**Goal:** Dejar el proyecto entregado para Adrian: Kanban al día, ficha del vault con estado y URL, hito actualizado (no marcado), README completo y un resumen final.

**Files:**
- Modify: `D:/Proyectos/CONTROL/Proyectos/Activos/Dice Foundry/Resumen.md` (sección Estado: fecha, URL de producción, cómo jugar, cómo balancear, siguientes pasos = fase 3 playtest del diseño §11 con la checklist §19), `D:/Proyectos/CONTROL/Tableros/Hitos.md` (añadir bajo `## 🔥 Esta semana`: `- [ ] **<fecha+7d>** [Dice Foundry] Adrian juega 3 partidas y pasa la checklist §19 (docs/DECISIONS.md)`; NO marcar el hito de octubre: eso lo hace él), `README.md`, `docs/DECISIONS.md`

- [ ] **Step 1**: `cd "D:/Proyectos/Dice Foundry" && npm run test:all` verde; `git status` limpio; `git push`.
- [ ] **Step 2**: `cd "D:/Proyectos/CONTROL" && node scripts/kanban.js list "Dice Foundry"` → todas las tarjetas de las tareas 1-28 en `Completada - Pendiente Revisión` (mover con `node scripts/kanban.js done "Dice Foundry" <^id>` las que falten). NUNCA a `Done`.
- [ ] **Step 3**: Editar `Resumen.md` e `Hitos.md`; `node scripts/portfolio-status.js`; commit del vault: `cd "D:/Proyectos" && git add "CONTROL/Proyectos/Activos/Dice Foundry" CONTROL/Tableros/Hitos.md && git commit -m "docs(vault): Dice Foundry MVP entregado (kanban, resumen, hito)"`.
- [ ] **Step 4**: Mensaje final a Adrian con: URL de producción, comandos (`npm run dev`, `npm run sim`, `npm run deploy`), estado del balance (umbrales), deuda anotada en `docs/DECISIONS.md`/`CHANGELOG.md`, y los pasos humanos pendientes (PostHog, Web Analytics, dominio, playtest §19).

---

# Verificación end-to-end del plan

Ejecutar en este orden al terminar (y en cualquier punto intermedio tras la Tarea 19):

```bash
cd "D:/Proyectos/Dice Foundry" && npm run check && npm run build && npm run e2e && npm run sim -- --games 2000
```

Esperado: lint/typecheck/tests verdes (≈ 90 tests unitarios, < 60 s), build sin warnings de tamaño > 1 MB, 7 specs e2e verdes (chromium + mobile), informe de balance con `✅ Todos los umbrales cumplidos`. Después, con `npm run dev`:

| Pregunta del diseño §19 | Cómo se verifica |
|---|---|
| ¿Lanzar los dados resulta satisfactorio sin contexto? | `/?dev=roll`: rebotes, sonido (Tarea 20), reposo < 3 s, cara iluminada. Juicio humano de Adrian. |
| ¿El jugador entiende inmediatamente qué ha obtenido? | Números flotantes por dado (21) + `roll-summary` + log "Qué ha pasado" (17). |
| ¿Cambiar una cara produce una decisión real? | Forja con precio, descuento y cara sustituida visible (18); bots compran (9). |
| ¿Hay al menos tres builds viables? | `docs/balance/builds.md` (25): ≥ 3 builds con `buildShare ≥ 0.03` y winrate ≥ 0.15. |
| ¿Una partida dura menos de 20 minutos? | Cronometrar 8 rondas vs 3 bots en `fast`; objetivo ≤ 15 min. |
| ¿Hay una razón para jugar otra partida? | Objetivos secretos distintos por partida (7), `btn-again` con semilla nueva (19), stats locales (22). |
| ¿El azar genera emoción sin quitar agencia? | Reroll pagado/gratis (8), tope 8 PV por cara, `risk` con probabilidades visibles en la cara (15). |
| ¿La economía evita que el líder se escape? | `leaderMidWinRate ≤ 0.60` y `blowoutRate ≤ 0.25` en el simulador (10, 11, 25). |
| ¿La interfaz permite ver estado y tienda sin saturación? | HUD + tienda lateral (desktop) / bottom sheet (móvil); captura a 1440 px y 390 px (26). |
| ¿Funciona en desktop y se adapta a móvil? | e2e `mobile.spec.ts` (26) + proyecto Playwright `mobile`. |

# Fuera de alcance (diseño §16 — no hacer aunque parezca fácil)

- No fijar 100 cartas: el catálogo es 20 caras + 8 cartas + 8 objetivos hasta que el playtest diga otra cosa.
- No backend, no cuentas, no multiplayer online, no WebSocket.
- No temporadas, no anuncios, no compras, no cosméticos de pago, no dados con mejores probabilidades.
- No tercer recurso (cristal): `FaceEffect` ya admite ampliarlo; queda para después del playtest.
- No i18n: solo `strings.es.ts`; traducir es añadir un fichero.
- No frameworks de UI ni de estado; no `react`, no `zustand`.

# Riesgos conocidos y plan B

| Riesgo | Señal | Plan B |
|---|---|---|
| Rapier no es determinista entre la pre-simulación y el replay en el navegador | `window.__df.mismatches > 0` en `roll.spec.ts` | La salvaguarda del `RollRunner` ya corrige el `sideMap` al reposar; investigar si `stepRoll` recibe distinto número de pasos (bucle) antes que la física. Registrar `physics_mismatch` en telemetría. |
| `RoundedBoxGeometry` sin 6 grupos en r185 | warning `[DieMesh]` en consola | Fallback automático a `BoxGeometry` (Tarea 15). |
| WebGL no disponible en Chromium headless (CI) | e2e `scene`/`roll` fallan solo en CI | Flags `--use-angle=swiftshader` ya puestos; añadir `--ignore-gpu-blocklist`; último recurso: marcar `roll.spec.ts` como `test.skip(!!process.env.CI)` y dejar `boot`/`game` con bots `instant`. |
| Versión fijada que no instala (`vitest@5`, `typescript-eslint` con TS 5.9) | `npm install` o `npm run lint` fallan en la Tarea 1 | Bajar UNA major y anotar en `docs/DECISIONS.md` (Global Constraints). |
| Bots que no compran o compran mal | `bots.test.ts` "compran algo" / "ingeniero > puntuador" en rojo | Ajustar `ARCHETYPE_WEIGHTS` y `goldValue` (Tarea 9) antes que las reglas. |
| Balance que no converge en 8 iteraciones | `checkThresholds` sigue con fallos | Documentar el mejor punto en `CHANGELOG.md`, relajar SOLO el umbral que falla en `balance.test.ts` con comentario, seguir; Adrian decide en el playtest. |
| `vercel link` interactivo | la CLI pide scope/proyecto | `vercel link --yes --project dice-foundry --scope adrianwheels`; si sigue, `vercel --prod --yes` directamente crea el proyecto. |

# Cobertura del documento de diseño (self-review)

| Sección del diseño | Tarea(s) |
|---|---|
| §2 Core loop (lanzar → cobrar → decidir → forjar → repetir) | 8, 19 |
| §3.1 Dados / §3.2 Tipos de caras (10 familias) | 4, 5 (familia `resource` diferida con el cristal) |
| §3.3 Tienda común con competencia | 6, 18 |
| §3.4 Cartas (5 tipos; interacción ligera = Recaudador) | 4, 5, 8 |
| §3.5 Objetivos secretos | 7, 17 |
| §4 Builds de ejemplo | 25 (`classifyBuild`, `builds.md`) |
| §5 Estructura de partida (2 dados, 6-8 rondas, 2-4 jugadores, 10-20 min) | 8, 19 |
| §6 Arquitectura técnica | 1 (Vite/TS/Three/Rapier/estado propio/HTML-CSS/Web Audio/localStorage/sin backend/analytics/Vercel) |
| §7 Separar simulación y presentación | 3, 8, 13, 16 |
| §8 MVP técnico (14 puntos) | mesa+cámara 14 · dados físicos 12-13 · animación+sonido+feedback 16, 20, 21 · caras 4 · recursos oro+PV 4 · tienda 6, 18 · forja 8, 18 · comprar dados 8 · rondas 8 · objetivos 7 · final 17 · bots/hot-seat 9, 19 · guardar 22 |
| §9.1 Física legible | 12 (mesa acotada, techo), 13 (empujones), 14 (cámara acotada) |
| §9.2 Snowball | 6 (precio de dado creciente), 10-11 (umbral líder a mitad), 25 |
| §9.3 Estrategia dominante | 10 (winrate por ítem/arquetipo), 23 (telemetría), 25 |
| §9.4 Complejidad | catálogo pequeño, log explicativo 17, pistas 28 |
| §9.5 RNG frustrante | 8 (reroll), caras Control 5, tope 8 PV |
| §9.6 Multiplayer demasiado pronto | fuera de alcance |
| §10 Balance y economía (EV, varianza, payback, tempo, escalado) | 6 (`faceEV`), 10 (métricas), 11, 25 |
| §11 Roadmap fases 0-2 (+4 web pública) | 0-11 (fase 0), 12-19 (fase 1), 20-26 (fase 2), 27 (fase 4) |
| §12-13 Monetización | fuera de alcance por diseño (0 € hasta playtest) |
| §14 Métricas | 23 (`docs/telemetry.md`) |
| §15 Orden de implementación | respetado: dados físicos (12-16) y RNG reproducible (3) primero; forja/economía/tienda/rondas (4-8); caras (4); objetivos (7); bots (9); audio y feedback (20-21); telemetría (23); playtest (Adrian) |
| §16 Decisiones que NO tomar | sección "Fuera de alcance" |
| §17 Hipótesis de producto / §18 Conclusión | validación en fase 3 con la tabla de §19 |
| §19 Checklist del primer prototipo | tabla "Verificación end-to-end" |

**Consistencia de tipos revisada:** `RngState = number` (Tarea 3) ↔ `GameState.rngState` (4) ↔ `fromSave` (8). `RolledDie { dieId, faceIndex }` (4) ↔ `DieSpec { dieId, faceIndex }` (13): misma forma, tipos distintos por capa (el controlador pasa `roll.results` directamente). `Transform` (12) ↔ `RestingDie = { dieId } & Transform` (13) ↔ `RollOutcome.transforms` (16). `sideMapFor` (13) reutilizada en 16, 19, 22. `describeEvent` (17) cubre las 15 `textKey` del resolver (5) + `tax` (8). `UiActions` (17) implementada por `GameController` (19) y ampliada con `dismissHint` (28).
