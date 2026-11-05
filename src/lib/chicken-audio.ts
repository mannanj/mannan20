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

export const HAWKS: SoundDef[] = [
  { key: 'hawk-1', file: 'hawk-scream-1.mp3', volume: 0.8 },
  { key: 'hawk-2', file: 'hawk-scream-2.mp3', volume: 0.8 },
  { key: 'hawk-3', file: 'hawk-scream-3.mp3', volume: 0.8 },
];
const HAWK_MIN_GAP_MS = 60;
const HAWK_RATE_JITTER = 0.1;

export const SCREAM_TUNING: Record<string, { weight: number; rateMul: number }> = {
  panic: { weight: 0.5, rateMul: 1.22 },
  dramatic: { weight: 0.5, rateMul: 1.22 },
};

const SCREAM_VOLUMES = new Map(SCREAMS.map((def) => [def.key, def.volume]));
const SCREAM_FADE_OUT_MS = 28;

export type CreatureSoundKey = 'meow' | 'hiss' | 'growl' | 'roar' | 'rumble' | 'snake' | 'bark' | 'creak' | 'chop' | 'swordpull' | 'slash' | 'jeff';
export const CREATURE_SOUNDS: Record<CreatureSoundKey, SoundDef> = {
  meow: { key: 'meow', file: 'cat-meow.mp3', volume: 0.7 },
  jeff: { key: 'jeff', file: 'my-name-jeff.mp3', volume: 1 },
  hiss: { key: 'hiss', file: 'cat-hiss.mp3', volume: 0.6 },
  growl: { key: 'growl', file: 'tiger-growl.mp3', volume: 0.7 },
  roar: { key: 'roar', file: 'lion-roar.mp3', volume: 0.75 },
  rumble: { key: 'rumble', file: 'giant-rumble.mp3', volume: 0.6 },
  snake: { key: 'snake', file: 'snake-hiss.mp3', volume: 0.65 },
  bark: { key: 'bark', file: 'dog-bark.mp3', volume: 0.7 },
  creak: { key: 'creak', file: 'tree-creak.mp3', volume: 0.7 },
  chop: { key: 'chop', file: 'wood-chop.mp3', volume: 0.55 },
  swordpull: { key: 'swordpull', file: 'sword-pull.mp3', volume: 0.7 },
  slash: { key: 'slash', file: 'sword-slash.mp3', volume: 0.45 },
};

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

const SIZZLE_LOOP_S = 2.4;
const SIZZLE_BASE_HZ = 3200;
const SIZZLE_Q = 0.7;
const SIZZLE_RAMP_S = 0.35;
const SIZZLE_MAX_GAIN = 0.22;
const SIZZLE_POP_CHANCE = 0.0006;
const SIZZLE_POP_DECAY = 0.985;

class EffectsSynth {
  private ctx: AudioContext;
  private sizzleSource: AudioBufferSourceNode | null = null;
  private sizzleGain: GainNode | null = null;
  private sizzleFilter: BiquadFilterNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  sizzle(level: number): void {
    const t = this.ctx.currentTime;
    if (level <= 0) {
      if (!this.sizzleSource || !this.sizzleGain) return;
      const src = this.sizzleSource;
      this.sizzleGain.gain.cancelScheduledValues(t);
      this.sizzleGain.gain.linearRampToValueAtTime(0, t + SIZZLE_RAMP_S);
      setTimeout(() => src.stop(), SIZZLE_RAMP_S * 1000 + 40);
      this.sizzleSource = null;
      this.sizzleGain = null;
      this.sizzleFilter = null;
      return;
    }
    if (!this.sizzleSource || !this.sizzleGain || !this.sizzleFilter) {
      const length = Math.ceil(this.ctx.sampleRate * SIZZLE_LOOP_S);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let pop = 0;
      let smooth = 0;
      for (let i = 0; i < length; i++) {
        if (Math.random() < SIZZLE_POP_CHANCE) pop = 0.6 + Math.random() * 0.4;
        pop *= SIZZLE_POP_DECAY;
        smooth = smooth * 0.3 + (Math.random() * 2 - 1) * 0.7;
        data[i] = smooth * (0.35 + pop);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = SIZZLE_BASE_HZ;
      bp.Q.value = SIZZLE_Q;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(bp);
      bp.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
      this.sizzleSource = src;
      this.sizzleGain = gain;
      this.sizzleFilter = bp;
    }
    const lv = Math.min(1, level);
    this.sizzleGain.gain.cancelScheduledValues(t);
    this.sizzleGain.gain.linearRampToValueAtTime(SIZZLE_MAX_GAIN * lv, t + SIZZLE_RAMP_S);
    this.sizzleFilter.frequency.linearRampToValueAtTime(SIZZLE_BASE_HZ * (1 + lv * 0.6), t + SIZZLE_RAMP_S);
  }

  crackle(): void {
    const t = this.ctx.currentTime;
    const duration = 0.26;
    const length = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;
    for (let i = 0; i < length; i++) {
      smoothed = smoothed * 0.6 + (Math.random() * 2 - 1) * 0.4;
      data[i] = smoothed;
    }
    const sizzle = this.ctx.createBufferSource();
    sizzle.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(5200, t);
    bp.frequency.exponentialRampToValueAtTime(850, t + duration);
    const sizzleGain = this.ctx.createGain();
    sizzleGain.gain.setValueAtTime(EXP_FLOOR, t);
    sizzleGain.gain.exponentialRampToValueAtTime(0.13, t + 0.014);
    sizzleGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration);
    const buzz = this.ctx.createGain();
    buzz.gain.value = 0.55;
    const buzzLfo = this.ctx.createOscillator();
    buzzLfo.type = 'square';
    buzzLfo.frequency.value = 92;
    const buzzDepth = this.ctx.createGain();
    buzzDepth.gain.value = 0.45;
    buzzLfo.connect(buzzDepth);
    buzzDepth.connect(buzz.gain);
    sizzle.connect(bp);
    bp.connect(sizzleGain);
    sizzleGain.connect(buzz);
    buzz.connect(this.ctx.destination);
    sizzle.start(t);
    sizzle.stop(t + duration + 0.02);
    buzzLfo.start(t);
    buzzLfo.stop(t + duration + 0.02);
    const zap = this.ctx.createOscillator();
    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(1600, t);
    zap.frequency.exponentialRampToValueAtTime(150, t + 0.16);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 60;
    const vibGain = this.ctx.createGain();
    vibGain.gain.value = 90;
    vib.connect(vibGain);
    vibGain.connect(zap.frequency);
    const zapGain = this.ctx.createGain();
    zapGain.gain.setValueAtTime(EXP_FLOOR, t);
    zapGain.gain.exponentialRampToValueAtTime(0.05, t + 0.018);
    zapGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + 0.19);
    zap.connect(zapGain);
    zapGain.connect(this.ctx.destination);
    zap.start(t);
    zap.stop(t + 0.22);
    vib.start(t);
    vib.stop(t + 0.22);
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(44, t + 0.2);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(EXP_FLOOR, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.055, t + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + 0.24);
    thump.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);
    thump.start(t);
    thump.stop(t + 0.28);
  }

  squeak(depth: number): void {
    const t = this.ctx.currentTime;
    const d = Math.max(0, Math.min(1, depth));
    const duration = 0.14 + 0.1 * d;
    const start = 920 + 260 * d;
    const makeVoice = (mult: number, level: number) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(start * mult, t);
      osc.frequency.exponentialRampToValueAtTime(560 * mult, t + duration);
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 26;
      const vibGain = this.ctx.createGain();
      vibGain.gain.value = 14 * mult;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1250 * mult;
      bp.Q.value = 6;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(EXP_FLOOR, t);
      gain.gain.exponentialRampToValueAtTime(level, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration);
      osc.connect(bp);
      bp.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
      vib.start(t);
      vib.stop(t + duration + 0.03);
    };
    makeVoice(1, 0.045 + 0.03 * d);
    makeVoice(2.01, 0.016 + 0.01 * d);
  }

  riser(final: boolean): void {
    const t = this.ctx.currentTime;
    const duration = final ? 1.1 : 0.8;
    const sweep = this.ctx.createBiquadFilter();
    sweep.type = 'bandpass';
    sweep.Q.value = 1.4;
    sweep.frequency.setValueAtTime(260, t);
    sweep.frequency.exponentialRampToValueAtTime(final ? 3200 : 2400, t + duration);
    sweep.connect(this.ctx.destination);
    for (const detune of [0, 9]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(final ? 660 : 540, t + duration);
      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(EXP_FLOOR, t);
      oscGain.gain.exponentialRampToValueAtTime(0.1, t + duration);
      oscGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration + 0.25);
      osc.connect(oscGain);
      oscGain.connect(sweep);
      osc.start(t);
      osc.stop(t + duration + 0.3);
    }
    const shimmerLen = Math.ceil(this.ctx.sampleRate * duration);
    const shimmerBuf = this.ctx.createBuffer(1, shimmerLen, this.ctx.sampleRate);
    const shimmerData = shimmerBuf.getChannelData(0);
    for (let i = 0; i < shimmerLen; i++) {
      shimmerData[i] = (Math.random() * 2 - 1) * Math.pow(i / shimmerLen, 2);
    }
    const shimmer = this.ctx.createBufferSource();
    shimmer.buffer = shimmerBuf;
    const shimmerHp = this.ctx.createBiquadFilter();
    shimmerHp.type = 'highpass';
    shimmerHp.frequency.value = 5200;
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.setValueAtTime(EXP_FLOOR, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.05, t + duration);
    shimmerGain.gain.exponentialRampToValueAtTime(EXP_FLOOR, t + duration + 0.2);
    shimmer.connect(shimmerHp);
    shimmerHp.connect(shimmerGain);
    shimmerGain.connect(this.ctx.destination);
    shimmer.start(t);
    shimmer.stop(t + duration + 0.25);
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
  private hawks = new Map<string, Howl>();
  private hawkIndex = 0;
  private creatures = new Map<CreatureSoundKey, Howl>();
  private lastHawkAt = 0;
  private listeners = new Set<ProgressListener>();
  private progress: LoadProgress = {
    loaded: 0,
    failed: 0,
    total: SCREAMS.length + RISERS.length + HAWKS.length,
    done: false,
  };
  private initialized = false;
  private currentScreamKey: string | null = null;
  private screamClicks = 0;
  private rotateAt = SCREAM_ROTATE_MIN;
  private lastScreamAt = 0;
  private lastPlay: { key: string; howl: Howl; id: number } | null = null;
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
    for (const def of HAWKS) {
      loadWithFallback(def, (howl) => {
        if (howl) this.hawks.set(def.key, howl);
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
    const total = pool.reduce((sum, k) => sum + (SCREAM_TUNING[k]?.weight ?? 1), 0);
    let roll = Math.random() * total;
    let picked = pool[pool.length - 1];
    for (const k of pool) {
      roll -= SCREAM_TUNING[k]?.weight ?? 1;
      if (roll <= 0) {
        picked = k;
        break;
      }
    }
    this.currentScreamKey = picked;
    this.screamClicks = 0;
    this.rotateAt = SCREAM_ROTATE_MIN + Math.floor(Math.random() * SCREAM_ROTATE_SPREAD);
  }

  private fadeOutLastScream(): void {
    const last = this.lastPlay;
    if (!last) return;
    this.lastPlay = null;
    if (!last.howl.playing(last.id)) return;
    last.howl.fade(SCREAM_VOLUMES.get(last.key) ?? 0.75, 0, SCREAM_FADE_OUT_MS, last.id);
    setTimeout(() => last.howl.stop(last.id), SCREAM_FADE_OUT_MS + 12);
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
    this.fadeOutLastScream();
    const effectiveRate = rate * (SCREAM_TUNING[key]?.rateMul ?? 1);
    const id = howl.play();
    howl.volume(SCREAM_VOLUMES.get(key) ?? 0.75, id);
    howl.rate(effectiveRate, id);
    this.lastPlay = { key, howl, id };
    return { key, rate: effectiveRate };
  }

  playHawk(): ScreamResult | null {
    this.resumeContext();
    const keys = HAWKS.map((d) => d.key).filter((k) => this.hawks.has(k));
    if (keys.length === 0) return null;
    const now = Date.now();
    if (now - this.lastHawkAt < HAWK_MIN_GAP_MS) return null;
    this.lastHawkAt = now;
    const key = keys[this.hawkIndex % keys.length];
    this.hawkIndex += 1;
    const howl = this.hawks.get(key);
    if (!howl) return null;
    const rate = 1 - HAWK_RATE_JITTER / 2 + Math.random() * HAWK_RATE_JITTER;
    const id = howl.play();
    howl.volume(HAWKS.find((d) => d.key === key)?.volume ?? 0.8, id);
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

  playCreature(key: CreatureSoundKey): void {
    this.resumeContext();
    const def = CREATURE_SOUNDS[key];
    let howl = this.creatures.get(key);
    if (!howl) {
      howl = new Howl({ src: [`${LOCAL_SOUND_BASE}/${def.file}`], volume: def.volume });
      this.creatures.set(key, howl);
    }
    howl.play();
  }

  crackle(): void {
    this.resumeContext();
    this.ensureSynth()?.crackle();
  }

  squeak(depth: number): void {
    this.resumeContext();
    this.ensureSynth()?.squeak(depth);
  }

  sizzle(level: number): void {
    if (level > 0) this.resumeContext();
    this.ensureSynth()?.sizzle(level);
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
