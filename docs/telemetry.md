# Telemetría

Eventos mínimos para decidir si el juego merece más inversión (diseño §14). Sin backend propio:
consola en desarrollo, PostHog por HTTP si hay clave y Vercel Analytics para páginas vistas.

Configuración: `VITE_POSTHOG_KEY` y `VITE_POSTHOG_HOST` (defecto `https://eu.i.posthog.com`).
Sin clave no se envía nada en producción. El identificador es anónimo (`crypto.randomUUID()`
guardado en `localStorage` bajo `df.anon.v1`); no se recoge ningún dato personal.

## Eventos

| Evento             | Propiedades                                                                   | Cuándo                                    |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------------------------- |
| `app_open`         | —                                                                             | al cargar la página                       |
| `game_start`       | `players`, `humans`, `rounds`, `seed`                                         | primer turno de una partida               |
| `roll`             | `round`, `seat`, `dice`, `isBot`                                              | cada tirada (humana o de bot)             |
| `reroll`           | `round`, `cost`                                                               | al relanzar un dado                       |
| `purchase`         | `round`, `kind` (`face`/`card`/`die`), `id`, `price`                          | cada compra                               |
| `round_end`        | `round`, `leaderSeat`                                                         | al cerrar una ronda                       |
| `game_end`         | `rounds`, `winnerSeat`, `winnerIsHuman`, `durationMs`, `humanTotal`, `builds` | al terminar la partida                    |
| `play_again`       | —                                                                             | al pulsar "Otra partida"                  |
| `game_abandon`     | `round`, `phase`                                                              | cerrar la pestaña con partida en curso    |
| `physics_mismatch` | `count`                                                                       | el lado real no coincidió con el previsto |

Todos los eventos llevan además `app`, `version` y `ts`.

## Métrica → evento

| Métrica (diseño §14)             | Cómo se calcula                                                     |
| -------------------------------- | ------------------------------------------------------------------- |
| Partidas por usuario y día       | `count(game_start)` agrupado por `distinct_id` y día                |
| % que termina su primera partida | `game_end` / `game_start` del primer día de cada `distinct_id`      |
| Repetición inmediata             | `play_again` / `game_end`                                           |
| Retención D1 / D7 / D30          | `app_open` por `distinct_id` frente al día de su primer `app_open`  |
| Duración media de partida        | media de `game_end.durationMs`                                      |
| Abandono durante la tirada       | `game_abandon` con `phase in ('roll', 'mitigate')` / `game_abandon` |
| Uso de builds                    | frecuencia de cada etiqueta en `game_end.builds`                    |
| Win rate de una cara o carta     | `purchase.id` cruzado con `game_end.winnerSeat`                     |
| Salud de la física               | `physics_mismatch` / `roll` (debe ser ≈ 0)                          |
| Conversión / ARPPU               | N/A hasta que exista monetización (diseño §16)                      |

> La métrica crítica no es el dinero: es si tras una partida el usuario piensa "quiero probar otra
> build". Se mide con `play_again / game_end`.
