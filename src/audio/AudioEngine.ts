import { Rng } from '../core/rng';
import { MAX_VOICES, RateLimiter, clamp, midiToHz } from './synth';

export interface AudioEngineOptions {
  ctxFactory?: () => AudioContext;
}

/**
 * Sonidos sintetizados con Web Audio: sin ficheros, sin descargas.
 * Cadena: voz → compresor → master → destino (el compresor va ANTES del master).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = 0;
  private volume = 0.8;
  private muted = false;
  private readonly limiter = new RateLimiter(45);
  private readonly rng = Rng.fromSeed(1);
  private readonly ctxFactory: () => AudioContext;

  constructor(opts: AudioEngineOptions = {}) {
    this.ctxFactory =
      opts.ctxFactory ??
      (() => {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) throw new Error('Sin Web Audio');
        return new Ctor();
      });
  }

  /** Crea o reanuda el contexto. Debe llamarse desde un gesto del usuario. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const ctx = this.ctxFactory();
        const bus = ctx.createDynamicsCompressor();
        bus.threshold.value = -6;
        bus.ratio.value = 12;
        bus.attack.value = 0.002;
        bus.release.value = 0.15;
        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : this.volume;
        bus.connect(master);
        master.connect(ctx.destination);
        this.ctx = ctx;
        this.bus = bus;
        this.master = master;
        this.noise = this.makeNoise(ctx);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // sin audio: el juego sigue funcionando
    }
  }

  setVolume(v: number): void {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  // ------------------------------------------------------------------ sonidos

  /** Lanzamiento: ruido filtrado que se abre. */
  whoosh(): void {
    this.playNoise({ ms: 250, from: 400, to: 3000, gain: 0.25, q: 0.7 });
  }

  /** Impacto de un dado; el volumen sube con la fuerza de contacto de Rapier. */
  click(dieId: number, force: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.canPlay()) return;
    if (!this.limiter.allow(`d${dieId}`, ctx.currentTime * 1000)) return;
    const freq = 1400 + (this.rng.next() - 0.5) * 1000;
    this.playNoise({
      ms: 40,
      from: freq,
      to: freq,
      gain: clamp(force / 120, 0.08, 1) * 0.6,
      q: 1.2,
    });
  }

  /** Monedas: un blip por oro cobrado, hasta 6. */
  coin(count: number): void {
    const n = Math.min(Math.max(count, 0), 6);
    for (let i = 0; i < n; i++) {
      this.tone({ type: 'sine', from: 880, to: 1320, ms: 70, gain: 0.35, delay: i * 0.055 });
    }
  }

  pv(): void {
    for (const m of [72, 76, 79]) {
      this.tone({ type: 'triangle', from: midiToHz(m), to: midiToHz(m), ms: 220, gain: 0.3 });
    }
  }

  buy(): void {
    this.tone({ type: 'sine', from: 220, to: 220, ms: 120, gain: 0.3 });
    this.playNoise({ ms: 40, from: 900, to: 900, gain: 0.2, q: 1 });
  }

  error(): void {
    this.tone({ type: 'square', from: 110, to: 110, ms: 150, gain: 0.2 });
  }

  win(): void {
    [72, 76, 79, 84].forEach((m, i) => {
      this.tone({
        type: 'sawtooth',
        from: midiToHz(m),
        to: midiToHz(m),
        ms: 120,
        gain: 0.22,
        delay: i * 0.12,
        lowpass: 2200,
      });
    });
  }

  // ------------------------------------------------------------------ interno

  private canPlay(): boolean {
    return this.ctx !== null && !this.muted && this.voices < MAX_VOICES;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = this.rng.next() * 2 - 1;
    return buf;
  }

  private track(node: AudioScheduledSourceNode, stop: number): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
      node.disconnect();
    };
    node.stop(stop);
  }

  private playNoise(o: { ms: number; from: number; to: number; gain: number; q: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.noise || !this.canPlay()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = o.q;
    filter.frequency.setValueAtTime(o.from, t);
    if (o.to !== o.from) filter.frequency.linearRampToValueAtTime(o.to, t + o.ms / 1000);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(o.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.ms / 1000);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus);
    src.start(t);
    this.track(src, t + o.ms / 1000 + 0.02);
  }

  private tone(o: {
    type: OscillatorType;
    from: number;
    to: number;
    ms: number;
    gain: number;
    delay?: number;
    lowpass?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.canPlay()) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.from, t);
    if (o.to !== o.from) osc.frequency.linearRampToValueAtTime(o.to, t + 0.03);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.gain, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.ms / 1000);
    let tail: AudioNode = gain;
    osc.connect(gain);
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lowpass;
      gain.connect(lp);
      tail = lp;
    }
    tail.connect(this.bus);
    osc.start(t);
    this.track(osc, t + o.ms / 1000 + 0.05);
  }
}
