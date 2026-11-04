const BOOM_NOISE_MS = 1400;
const BOOM_THUMP_HZ_FROM = 140;
const BOOM_THUMP_HZ_TO = 28;
const BOOM_THUMP_S = 1.3;
const BOOM_GAIN = 0.9;
const BOOM_LOWPASS_FROM = 2600;
const BOOM_LOWPASS_TO = 120;
const BOOM_CRACKLE_AT_S = 0.35;
const BOOM_CRACKLE_GAIN = 0.35;

let ctx: AudioContext | null = null;

function noiseBuffer(c: AudioContext, ms: number): AudioBuffer {
  const len = Math.floor((c.sampleRate * ms) / 1000);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  return buf;
}

export function playBoom(): void {
  try {
    ctx = ctx ?? new AudioContext();
    const c = ctx;
    const now = c.currentTime;
    const out = c.createGain();
    out.gain.setValueAtTime(BOOM_GAIN, now);
    out.gain.exponentialRampToValueAtTime(0.001, now + BOOM_THUMP_S + 0.4);
    out.connect(c.destination);
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, BOOM_NOISE_MS);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(BOOM_LOWPASS_FROM, now);
    lp.frequency.exponentialRampToValueAtTime(BOOM_LOWPASS_TO, now + BOOM_NOISE_MS / 1000);
    noise.connect(lp).connect(out);
    noise.start(now);
    const thump = c.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(BOOM_THUMP_HZ_FROM, now);
    thump.frequency.exponentialRampToValueAtTime(BOOM_THUMP_HZ_TO, now + BOOM_THUMP_S);
    thump.connect(out);
    thump.start(now);
    thump.stop(now + BOOM_THUMP_S + 0.4);
    const crackle = c.createBufferSource();
    crackle.buffer = noiseBuffer(c, BOOM_NOISE_MS);
    const g = c.createGain();
    g.gain.value = BOOM_CRACKLE_GAIN;
    crackle.connect(g).connect(c.destination);
    crackle.start(now + BOOM_CRACKLE_AT_S);
  } catch {}
}
