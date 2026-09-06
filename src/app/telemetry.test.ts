import { describe, expect, it, vi } from 'vitest';
import { type Props, type TelemetryEvent, createTelemetry, posthogSink } from './telemetry';

function fakeSink() {
  const calls: { name: TelemetryEvent; props: Props }[] = [];
  return { calls, send: (name: TelemetryEvent, props: Props) => void calls.push({ name, props }) };
}

describe('createTelemetry', () => {
  it('añade las props base y un ts a cada evento', () => {
    const sink = fakeSink();
    const t = createTelemetry([sink], { app: 'dice-foundry', version: '0.1.0' });
    t.track('roll', { round: 2 });
    expect(sink.calls).toHaveLength(1);
    expect(sink.calls[0]!.name).toBe('roll');
    expect(sink.calls[0]!.props).toMatchObject({
      app: 'dice-foundry',
      version: '0.1.0',
      round: 2,
    });
    expect(typeof sink.calls[0]!.props.ts).toBe('number');
  });

  it('no propaga las excepciones de un sink y sigue con los demás', () => {
    const ok = fakeSink();
    const broken = {
      send: () => {
        throw new Error('sin red');
      },
    };
    const t = createTelemetry([broken, ok], {});
    expect(() => t.track('app_open')).not.toThrow();
    expect(ok.calls).toHaveLength(1);
  });
});

describe('posthogSink', () => {
  it('construye el payload de captura', () => {
    const beacon = vi.fn(() => true);
    const sink = posthogSink({
      key: 'k',
      host: 'https://eu.i.posthog.com/',
      distinctId: 'u1',
      beacon,
    });
    const t = createTelemetry([sink], { app: 'dice-foundry' });
    t.track('roll', { round: 2 });
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0] as unknown as [string, string];
    expect(url).toBe('https://eu.i.posthog.com/capture/');
    const parsed = JSON.parse(body) as {
      api_key: string;
      event: string;
      distinct_id: string;
      properties: Props;
    };
    expect(parsed.api_key).toBe('k');
    expect(parsed.event).toBe('roll');
    expect(parsed.distinct_id).toBe('u1');
    expect(parsed.properties.round).toBe(2);
    expect(parsed.properties.app).toBe('dice-foundry');
  });
});
