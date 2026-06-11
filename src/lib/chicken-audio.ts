import { Howl, Howler } from 'howler';

export const R2_SOUND_BASE = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/sounds/chicken';
export const LOCAL_SOUND_BASE = '/sounds/chicken';

export interface SoundDef {
  key: string;
  file: string;
  volume: number;
}

export const SCREAMS: SoundDef[] = [
  { key: 'classic', file: 'classic-scream.mp3', volume: 0.75 },
  { key: 'bwack', file: 'loud-bwack.mp3', volume: 0.7 },
  { key: 'panic', file: 'panic-bawk.mp3', volume: 0.9 },
  { key: 'rooster', file: 'rooster-crow.mp3', volume: 0.7 },
  { key: 'short', file: 'short-squawk.mp3', volume: 0.75 },
  { key: 'dramatic', file: 'dramatic-scream.mp3', volume: 0.75 },
  { key: 'cluck', file: 'startled-cluck.mp3', volume: 0.75 },
];

export const RISERS: SoundDef[] = [
  { key: 'power-up', file: 'power-up.mp3', volume: 1 },
  { key: 'power-up-final', file: 'power-up-final.mp3', volume: 1 },
];

export const AURA_LOOP: SoundDef = { key: 'aura-loop', file: 'aura-loop.mp3', volume: 0 };

export interface LoadProgress {
  loaded: number;
  failed: number;
  total: number;
  done: boolean;
}

export interface ScreamResult {
  key: string;
  rate: number;
}

export interface RiserResult {
  key: string;
  synth: boolean;
}

const LOAD_TIMEOUT_MS = 4000;
const AURA_MAX_GAIN = 0.22;
const AURA_RAMP_S = 0.5;
const EXP_FLOOR = 0.0001;

type ProgressListener = (progress: LoadProgress) => void;

function loadWithFallback(
  def: SoundDef,
  onSettled: (howl: Howl | null) => void,
  loop = false
): void {
  const attempts = [
    { src: `${R2_SOUND_BASE}/${def.file}`, html5: false },
    { src: `${LOCAL_SOUND_BASE}/${def.file}`, html5: false },
    { src: `${LOCAL_SOUND_BASE}/${def.file}`, html5: true },
  ];
  const attempt = (i: number): void => {
    if (i >= attempts.length) {
      onSettled(null);
      return;
    }
    const howl: Howl = new Howl({
      src: [attempts[i].src],
      html5: attempts[i].html5,
      preload: true,
      volume: def.volume,
      loop,
      onload: () => onSettled(howl),
      onloaderror: () => {
        howl.unload();
        attempt(i + 1);
      },
    });
  };
  attempt(0);
}

class AuraSynth {
  private ctx: AudioContext;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private lfo: OscillatorNode;
  private subGain: GainNode;
  private noise: AudioBufferSourceNode | null = null;
  private sub: OscillatorNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 220;
    this.filter.Q.value = 0.9;
    this.filter.connect(this.master);
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    this.lfo.start();
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.subGain.connect(this.master);
  }

  private ensureSources(): void {
    if (this.noise) return;
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(this.filter);
    noise.start();
    this.noise = noise;
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 52;
    sub.connect(this.subGain);
    sub.start();
    this.sub = sub;
  }

  setLevel(level: number, tier: number): void {
    if (level > 0) this.ensureSources();
    if (!this.noise) return;
    const clamped = Math.max(0, Math.min(1, level));
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(clamped * AURA_MAX_GAIN, t + AURA_RAMP_S);
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.linearRampToValueAtTime(160 + tier * 90 + clamped * 240, t + AURA_RAMP_S);
    this.lfo.frequency.setTargetAtTime(4 + tier * 1.2 + clamped * 2, t, 0.3);
    this.subGain.gain.setTargetAtTime(tier >= 3 ? 0.05 + clamped * 0.04 : 0, t, 0.4);
  }

  crackle(): void {
    const t = this.ctx.currentTime;
    const duration = 0.07;
    const length = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const burst = this.ctx.createBufferSource();
    burst.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.002, t + duration);
    burst.connect(hp);
    hp.connect(gain);
    gain.connect(this.ctx.destination);
    burst.start(t);
    burst.stop(t + duration + 0.02);
    const zap = this.ctx.createOscillator();
    zap.type = 'square';
    zap.frequency.setValueAtTime(1900, t);
    zap.frequency.exponentialRampToValueAtTime(260, t + 0.05);
    const zapGain = this.ctx.createGain();
    zapGain.gain.setValueAtTime(0.05, t);
    zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    zap.connect(zapGain);
    zapGain.connect(this.ctx.destination);
    zap.start(t);
    zap.stop(t + 0.08);
  }

  riser(final: boolean): void {
    const t = this.ctx.currentTime;
    const duration = final ? 1.1 : 0.8;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(final ? 660 : 540, t + duration);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(EXP_FLOOR, t);
    oscGain.gain.exponentialRampToValueAtTime(0.12, t + duration);
    oscGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration + 0.25);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.3);
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(170, t + duration);
    thump.frequency.exponentialRampToValueAtTime(48, t + duration + 0.22);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(EXP_FLOOR, t);
    thumpGain.gain.setValueAtTime(0.25, t + duration);
    thumpGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration + 0.24);
    thump.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);
    thump.start(t);
    thump.stop(t + duration + 0.3);
  }

  stop(): void {
    try {
      this.noise?.stop();
      this.sub?.stop();
      this.lfo.stop();
    } catch {
      void 0;
    }
    this.master.disconnect();
    this.noise = null;
    this.sub = null;
  }
}

class ChickenAudio {
  private screams = new Map<string, Howl>();
  private risers = new Map<string, Howl>();
  private auraLoop: Howl | null = null;
  private auraLoopActive = false;
  private listeners = new Set<ProgressListener>();
  private progress: LoadProgress = {
    loaded: 0,
    failed: 0,
    total: SCREAMS.length + RISERS.length + 1,
    done: false,
  };
  private initialized = false;
  private lastScreamKey: string | null = null;
  private aura: AuraSynth | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.timeoutId = setTimeout(() => this.finish(), LOAD_TIMEOUT_MS);
    for (const def of SCREAMS) {
      loadWithFallback(def, (howl) => {
        if (howl) this.screams.set(def.key, howl);
        this.settle(howl !== null);
      });
    }
    for (const def of RISERS) {
      loadWithFallback(def, (howl) => {
        if (howl) this.risers.set(def.key, howl);
        this.settle(howl !== null);
      });
    }
    loadWithFallback(
      AURA_LOOP,
      (howl) => {
        this.auraLoop = howl;
        this.settle(howl !== null);
      },
      true
    );
  }

  private settle(loaded: boolean): void {
    if (loaded) {
      this.progress = { ...this.progress, loaded: this.progress.loaded + 1 };
    } else {
      this.progress = { ...this.progress, failed: this.progress.failed + 1 };
    }
    if (this.progress.loaded + this.progress.failed >= this.progress.total) {
      this.finish();
    } else {
      this.notify();
    }
  }

  private finish(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (!this.progress.done) {
      this.progress = { ...this.progress, done: true };
    }
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.progress);
  }

  getProgress(): LoadProgress {
    return this.progress;
  }

  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    listener(this.progress);
    return () => {
      this.listeners.delete(listener);
    };
  }

  playScream(rate: number): ScreamResult | null {
    const keys = [...this.screams.keys()];
    if (keys.length === 0) return null;
    const pool =
      keys.length > 1 && this.lastScreamKey
        ? keys.filter((k) => k !== this.lastScreamKey)
        : keys;
    const key = pool[Math.floor(Math.random() * pool.length)];
    this.lastScreamKey = key;
    const howl = this.screams.get(key);
    if (!howl) return null;
    const id = howl.play();
    howl.rate(rate, id);
    return { key, rate };
  }

  playRiser(final: boolean): RiserResult {
    const key = final ? 'power-up-final' : 'power-up';
    const howl = this.risers.get(key) ?? this.risers.get('power-up');
    if (howl) {
      howl.play();
      return { key, synth: false };
    }
    this.ensureAura()?.riser(final);
    return { key, synth: true };
  }

  setAuraLevel(level: number, tier: number): void {
    this.syncAuraLoop(level, tier);
    if (level <= 0) {
      this.aura?.setLevel(0, tier);
      return;
    }
    this.ensureAura()?.setLevel(level, tier);
  }

  crackle(): void {
    this.aura?.crackle();
  }

  private syncAuraLoop(level: number, tier: number): void {
    const loop = this.auraLoop;
    if (!loop) return;
    if (level <= 0) {
      if (this.auraLoopActive) {
        loop.stop();
        this.auraLoopActive = false;
      }
      return;
    }
    if (!this.auraLoopActive) {
      loop.play();
      this.auraLoopActive = true;
    }
    loop.volume(Math.min(0.3, level * 0.3));
    loop.rate(0.85 + tier * 0.06 + level * 0.1);
  }

  stopAura(): void {
    this.aura?.stop();
    this.aura = null;
    if (this.auraLoop && this.auraLoopActive) {
      this.auraLoop.stop();
      this.auraLoopActive = false;
    }
  }

  private ensureAura(): AuraSynth | null {
    const ctx = Howler.ctx;
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    if (!this.aura) this.aura = new AuraSynth(ctx);
    return this.aura;
  }
}

let instance: ChickenAudio | null = null;

export function getChickenAudio(): ChickenAudio {
  if (!instance) instance = new ChickenAudio();
  return instance;
}
