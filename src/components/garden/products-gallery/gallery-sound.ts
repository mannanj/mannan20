type SoundListener = (enabled: boolean) => void;

const MASTER_LEVEL = 0.5;
const AMBIENT_LEVEL = 0.12;

class GallerySound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioScheduledSourceNode[] = [];
  private enabled = false;
  private listeners = new Set<SoundListener>();

  isEnabled() {
    return this.enabled;
  }

  subscribe(listener: SoundListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) listener(this.enabled);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = MASTER_LEVEL;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  setEnabled(next: boolean) {
    if (next === this.enabled) return;
    this.enabled = next;
    if (next) {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === "suspended") void ctx.resume();
      this.startAmbient();
    } else {
      this.stopAmbient();
      if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
    }
    this.emit();
  }

  toggle() {
    this.setEnabled(!this.enabled);
  }

  private startAmbient() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.ambientNodes.length) return;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(AMBIENT_LEVEL, ctx.currentTime + 1.4);
    gain.connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 6;
    filter.connect(gain);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = 110;
    const b = ctx.createOscillator();
    b.type = "triangle";
    b.frequency.value = 110.4;
    const c = ctx.createOscillator();
    c.type = "sine";
    c.frequency.value = 55;
    a.connect(filter);
    b.connect(filter);
    c.connect(filter);
    a.start();
    b.start();
    c.start();

    this.ambientGain = gain;
    this.ambientNodes = [lfo, a, b, c];
  }

  private stopAmbient() {
    const ctx = this.ctx;
    if (!ctx) return;
    const gain = this.ambientGain;
    const nodes = this.ambientNodes;
    this.ambientGain = null;
    this.ambientNodes = [];
    if (gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    }
    for (const node of nodes) {
      try {
        node.stop(ctx.currentTime + 0.55);
      } catch {}
    }
  }

  private blip(
    freq: number,
    duration: number,
    level: number,
    type: OscillatorType,
    slideTo?: number,
  ) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  hover() {
    this.blip(880, 0.08, 0.05, "sine");
  }

  select() {
    this.blip(523.25, 0.12, 0.08, "triangle", 1046.5);
  }

  zoom(direction: 1 | -1) {
    const from = direction > 0 ? 440 : 660;
    const to = direction > 0 ? 660 : 440;
    this.blip(from, 0.16, 0.06, "sine", to);
  }

  whoosh() {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.5);
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(now);
    src.stop(now + 0.62);
  }
}

let instance: GallerySound | null = null;

export function getGallerySound(): GallerySound {
  if (!instance) instance = new GallerySound();
  return instance;
}
