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
const SCREAM_ROTATE_MIN = 25;
const SCREAM_ROTATE_SPREAD = 11;
const SCREAM_IDLE_SWAP_MS = 8000;
const REVERB_SECONDS = 0.7;
const REVERB_WET = 0.14;
const EXP_FLOOR = 0.0001;

type ProgressListener = (progress: LoadProgress) => void;

function loadWithFallback(def: SoundDef, onSettled: (howl: Howl | null) => void): void {
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
      onload: () => onSettled(howl),
      onloaderror: () => {
        howl.unload();
        attempt(i + 1);
      },
    });
  };
  attempt(0);
}

class EffectsSynth {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
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
    gain.gain.setValueAtTime(0.14, t);
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
    zapGain.gain.setValueAtTime(0.04, t);
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
}

class ChickenAudio {
  private screams = new Map<string, Howl>();
  private risers = new Map<string, Howl>();
  private listeners = new Set<ProgressListener>();
  private progress: LoadProgress = {
    loaded: 0,
    failed: 0,
    total: SCREAMS.length + RISERS.length,
    done: false,
  };
  private initialized = false;
  private currentScreamKey: string | null = null;
  private screamClicks = 0;
  private rotateAt = SCREAM_ROTATE_MIN;
  private lastScreamAt = 0;
  private synth: EffectsSynth | null = null;
  private reverbReady = false;
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

  private resumeContext(): void {
    const ctx = Howler.ctx;
    if (ctx && ctx.state !== 'running') void ctx.resume();
  }

  private ensureReverb(): void {
    if (this.reverbReady) return;
    const ctx = Howler.ctx;
    const master = Howler.masterGain;
    if (!ctx || !master) return;
    const length = Math.ceil(ctx.sampleRate * REVERB_SECONDS);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = REVERB_WET;
    master.connect(convolver);
    convolver.connect(wet);
    wet.connect(ctx.destination);
    this.reverbReady = true;
  }

  private rotateScream(): void {
    const keys = [...this.screams.keys()];
    if (keys.length === 0) return;
    const pool =
      keys.length > 1 && this.currentScreamKey
        ? keys.filter((k) => k !== this.currentScreamKey)
        : keys;
    this.currentScreamKey = pool[Math.floor(Math.random() * pool.length)];
    this.screamClicks = 0;
    this.rotateAt = SCREAM_ROTATE_MIN + Math.floor(Math.random() * SCREAM_ROTATE_SPREAD);
  }

  playScream(rate: number): ScreamResult | null {
    this.resumeContext();
    this.ensureReverb();
    if (this.screams.size === 0) return null;
    const now = Date.now();
    const idle = this.lastScreamAt > 0 && now - this.lastScreamAt > SCREAM_IDLE_SWAP_MS;
    if (!this.currentScreamKey || this.screamClicks >= this.rotateAt || idle) {
      this.rotateScream();
    }
    const key = this.currentScreamKey;
    if (!key) return null;
    const howl = this.screams.get(key);
    if (!howl) return null;
    this.screamClicks += 1;
    this.lastScreamAt = now;
    howl.stop();
    const id = howl.play();
    howl.rate(rate, id);
    return { key, rate };
  }

  playRiser(final: boolean): RiserResult {
    this.resumeContext();
    this.ensureReverb();
    const key = final ? 'power-up-final' : 'power-up';
    const howl = this.risers.get(key) ?? this.risers.get('power-up');
    if (howl) {
      howl.play();
      return { key, synth: false };
    }
    this.ensureSynth()?.riser(final);
    return { key, synth: true };
  }

  crackle(): void {
    this.resumeContext();
    this.ensureSynth()?.crackle();
  }

  private ensureSynth(): EffectsSynth | null {
    const ctx = Howler.ctx;
    if (!ctx) return null;
    if (!this.synth) this.synth = new EffectsSynth(ctx);
    return this.synth;
  }
}

let instance: ChickenAudio | null = null;

export function getChickenAudio(): ChickenAudio {
  if (!instance) instance = new ChickenAudio();
  return instance;
}
