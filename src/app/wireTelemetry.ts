import { cardPrice, diePrice, facePrice } from '../core/economy';
import { classifyBuild } from '../core/sim/simulate';
import type { GameState } from '../core/types';
import type { Store } from '../ui/store';
import type { UiState } from '../ui/uiState';
import type { GameController } from './GameController';
import type { Telemetry } from './telemetry';

/** Eventos del diseño §14. Devuelve el desmontaje. */
export function wireTelemetry(
  controller: GameController,
  store: Store<UiState>,
  telemetry: Telemetry,
): () => void {
  const offs: (() => void)[] = [];
  let startedAt = 0;

  telemetry.track('app_open');

  offs.push(
    controller.events.on('turn', () => {
      const g = controller.getState();
      if (!g) return;
      if (startedAt === 0) {
        startedAt = Date.now();
        telemetry.track('game_start', {
          players: g.players.length,
          humans: g.players.filter((p) => p.kind === 'human').length,
          rounds: g.config.rounds,
          seed: g.config.seed,
        });
      }
    }),
  );

  offs.push(
    controller.events.on('roll:start', (seat, dice) => {
      const g = controller.getState();
      if (!g) return;
      telemetry.track('roll', {
        round: g.round,
        seat,
        dice: dice.length,
        isBot: g.players[seat]?.kind === 'bot',
      });
    }),
  );

  offs.push(
    controller.events.on('reroll', (round, cost) => telemetry.track('reroll', { round, cost })),
  );

  offs.push(
    controller.events.on('roll:settled', (outcome) => {
      if (outcome.mismatches > 0)
        telemetry.track('physics_mismatch', { count: outcome.mismatches });
    }),
  );

  offs.push(
    controller.events.on('purchase', (_seat, action) => {
      const g = controller.getState();
      const me = g?.players[g.currentSeat];
      if (!g || !me) return;
      if (action.type === 'buyDie') {
        telemetry.track('purchase', {
          round: g.round,
          kind: 'die',
          id: 'die',
          price: diePrice(me),
        });
        return;
      }
      if (action.type !== 'buyCard' && action.type !== 'buyFace') return;
      const item = g.shop.slots[action.slot];
      if (!item) return;
      telemetry.track('purchase', {
        round: g.round,
        kind: item.kind,
        id: item.kind === 'face' ? item.faceId : item.cardId,
        price: item.kind === 'face' ? facePrice(item.faceId, me) : cardPrice(item.cardId),
      });
    }),
  );

  let lastRound = 1;
  offs.push(
    controller.events.on('state', (g: GameState) => {
      if (g.round === lastRound) return;
      const leader = [...g.players].sort((a, b) => b.pv - a.pv || b.gold - a.gold)[0];
      telemetry.track('round_end', { round: lastRound, leaderSeat: leader?.seat ?? 0 });
      lastRound = g.round;
    }),
  );

  offs.push(
    controller.events.on('gameover', (scores) => {
      const g = controller.getState();
      if (!g) return;
      const winner = g.winners?.[0] ?? scores[0]?.seat ?? 0;
      const human = g.players.find((p) => p.kind === 'human');
      telemetry.track('game_end', {
        rounds: g.config.rounds,
        winnerSeat: winner,
        winnerIsHuman: g.players[winner]?.kind === 'human',
        durationMs: startedAt === 0 ? 0 : Date.now() - startedAt,
        humanTotal: scores.find((s) => s.seat === human?.seat)?.total ?? 0,
        builds: g.players.map((p) => classifyBuild(p)).join(','),
      });
      startedAt = 0;
      lastRound = 1;
    }),
  );

  const onUnload = (): void => {
    const g = controller.getState();
    if (g && g.phase !== 'gameOver') {
      telemetry.track('game_abandon', { round: g.round, phase: g.phase });
    }
  };
  window.addEventListener('beforeunload', onUnload);
  offs.push(() => window.removeEventListener('beforeunload', onUnload));

  // `play_again` se detecta por el store: la pantalla vuelve a 'game' desde 'end'.
  let lastScreen = store.get().screen;
  offs.push(
    store.subscribe((s) => {
      if (lastScreen === 'end' && s.screen === 'game') telemetry.track('play_again');
      lastScreen = s.screen;
    }),
  );

  return () => {
    for (const off of offs) off();
  };
}
