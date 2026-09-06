# Builds emergentes (BAL.2, 2026-09-07)

5000 partidas por configuración, semilla 1, 8 rondas. `Cuota` = jugadores que acaban con esa
etiqueta; `Gana` = P(ganar | build). La referencia neutra de `Gana` es 1/n (25 % con 4 jugadores,
33 % con 3, 50 % con 2). Clasificador: `classifyBuild` en `src/core/sim/simulate.ts`.

## 4 jugadores (magnate, scorer, engineer, casino)

| Build         | Jugadores | Cuota  | Gana   |
| ------------- | --------- | ------ | ------ |
| Ingeniero     | 86        | 0.4 %  | 36.0 % |
| Casino        | 498       | 2.5 %  | 27.9 % |
| Combo         | 878       | 4.4 %  | 41.7 % |
| Coleccionista | 1708      | 8.5 %  | 9.6 %  |
| Puntuador     | 444       | 2.2 %  | 39.0 % |
| Magnate       | 4         | 0.0 %  | 0.0 %  |
| Mixto         | 16382     | 81.9 % | 25.2 % |

## 3 jugadores (balanced, scorer, engineer)

| Build         | Jugadores | Cuota  | Gana   |
| ------------- | --------- | ------ | ------ |
| Ingeniero     | 78        | 0.5 %  | 35.9 % |
| Casino        | 337       | 2.2 %  | 29.4 % |
| Combo         | 635       | 4.2 %  | 44.0 % |
| Coleccionista | 1213      | 8.1 %  | 21.0 % |
| Puntuador     | 398       | 2.7 %  | 54.5 % |
| Magnate       | 2         | 0.0 %  | 0.0 %  |
| Mixto         | 12337     | 82.2 % | 33.4 % |

## 2 jugadores (magnate, balanced)

| Build         | Jugadores | Cuota  | Gana    |
| ------------- | --------- | ------ | ------- |
| Ingeniero     | 25        | 0.3 %  | 68.0 %  |
| Casino        | 207       | 2.1 %  | 54.1 %  |
| Combo         | 387       | 3.9 %  | 70.0 %  |
| Coleccionista | 802       | 8.0 %  | 43.3 %  |
| Puntuador     | 59        | 0.6 %  | 74.6 %  |
| Magnate       | 1         | 0.0 %  | 100.0 % |
| Mixto         | 8519      | 85.2 % | 49.4 %  |

## Lectura

**Ninguna build domina.** El umbral de "build dominante" (`buildWinRate > 1.8/n` con
`buildShare > 0.10`) se cumple en las tres configuraciones: la única build con cuota > 10 % sería
`Mixto`, y gana justo lo que le toca por azar (25 % con 4 jugadores, 49 % con 2).

**Deuda: las 6 builds de referencia del diseño §4 no emergen.** Solo `Coleccionista` pasa del 3 %
de cuota; el 82-85 % de los jugadores acaba en `Mixto`. Hipótesis, por orden de probabilidad:

1. **El bot no premia comprometerse.** `scorePurchase` valora cada compra por su EV aislado; nunca
   suma un bonus por acumular caras de la misma familia, así que el máximo local casi siempre es
   diversificar. Arreglo propuesto: bonus de sinergia (p. ej. ×1,15 por cada cara ya instalada de
   la familia) en `src/core/bots.ts`.
2. **8 rondas dan para pocas compras.** Con ~4-6 caras compradas por partida es imposible llegar a
   los umbrales del clasificador (5 dados, 3 caras de riesgo, 5 caras de PV). Arreglo posible:
   relajar `classifyBuild` (3 caras de familia en vez de 5) o subir el ritmo económico.
3. **Sobra oro al final (≈ 10 por jugador).** El cuello de botella no es el dinero: es que el bot
   deja de ver compras con margen positivo. Refuerza la hipótesis 1.

**`Coleccionista` es una trampa:** 8 % de cuota y solo 9,6 % de victorias con 4 jugadores (frente al
25 % neutro). Acumular 3 cartas cuesta ~20 oro que no vuelven como PV. Candidato a revisión: subir el
valor de las cartas de puntuación o bajar su precio; se dejó como está para no romper los umbrales de
ítems, que ya se cumplen.

Estas tres cosas son deuda de diseño, no de código: se resuelven con datos y con la política del
bot, y conviene decidirlas después del playtest humano (fase 3 del diseño §11).
