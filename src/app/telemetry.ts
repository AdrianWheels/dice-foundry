export type TelemetryEvent =
  | 'app_open'
  | 'game_start'
  | 'roll'
  | 'reroll'
  | 'purchase'
  | 'round_end'
  | 'game_end'
  | 'play_again'
  | 'game_abandon'
  | 'physics_mismatch';

export type Props = Record<string, string | number | boolean>;

export interface TelemetrySink {
  send(name: TelemetryEvent, props: Props): void;
}

export interface Telemetry {
  track(name: TelemetryEvent, props?: Props): void;
}

/** Añade las props base y `ts` a cada evento. Nunca propaga errores de un sink. */
export function createTelemetry(sinks: TelemetrySink[], base: Props = {}): Telemetry {
  return {
    track(name, props = {}) {
      const payload: Props = { ...base, ...props, ts: Date.now() };
      for (const sink of sinks) {
        try {
          sink.send(name, payload);
        } catch {
          // la telemetría nunca rompe el juego
        }
      }
    },
  };
}

export const consoleSink: TelemetrySink = {
  send(name, props) {
    console.info(`[telemetry] ${name}`, props);
  },
};

export interface PosthogOptions {
  key: string;
  host: string;
  distinctId: string;
  /** Inyectable para poder probarlo sin red. */
  beacon?: (url: string, body: string) => boolean;
}

export function posthogSink(opts: PosthogOptions): TelemetrySink {
  const url = `${opts.host.replace(/\/$/, '')}/capture/`;
  const beacon =
    opts.beacon ??
    ((u: string, body: string): boolean => {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        return navigator.sendBeacon(u, new Blob([body], { type: 'application/json' }));
      }
      void fetch(u, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => undefined);
      return true;
    });
  return {
    send(name, props) {
      const body = JSON.stringify({
        api_key: opts.key,
        event: name,
        distinct_id: opts.distinctId,
        properties: props,
        timestamp: new Date(typeof props.ts === 'number' ? props.ts : Date.now()).toISOString(),
      });
      beacon(url, body);
    },
  };
}
