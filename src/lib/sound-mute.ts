const MUTE_KEY = 'chicken-sound-muted';
const MUTE_PARAM = 'mute';

const masters = new Set<GainNode>();
const media = new Set<WeakRef<HTMLMediaElement>>();
const listeners = new Set<(muted: boolean) => void>();
let muted = false;
let installed = false;

function readMuted(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get(MUTE_PARAM) === '1') return true;
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function muteMedia(el: HTMLMediaElement, on: boolean): void {
  if (on && !el.muted) {
    el.muted = true;
    el.dataset.soundMuted = '1';
  } else if (!on && el.dataset.soundMuted) {
    el.muted = false;
    delete el.dataset.soundMuted;
  }
}

export function installSoundMute(): void {
  if (installed || typeof window === 'undefined' || typeof AudioNode === 'undefined') return;
  installed = true;
  muted = readMuted();
  const connect = AudioNode.prototype.connect as (this: AudioNode, ...args: unknown[]) => unknown;
  const byContext = new WeakMap<BaseAudioContext, GainNode>();
  const routed = function (this: AudioNode, ...args: unknown[]) {
    const dest = args[0];
    if (!(dest instanceof AudioDestinationNode)) return connect.apply(this, args);
    let master = byContext.get(dest.context);
    if (!master) {
      master = dest.context.createGain();
      master.gain.value = muted ? 0 : 1;
      connect.call(master, dest);
      byContext.set(dest.context, master);
      masters.add(master);
    }
    return connect.call(this, master, ...args.slice(1));
  };
  AudioNode.prototype.connect = routed as typeof AudioNode.prototype.connect;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    if (!this.dataset.soundTracked) {
      this.dataset.soundTracked = '1';
      media.add(new WeakRef(this));
    }
    muteMedia(this, muted);
    return play.call(this);
  };
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean): void {
  muted = next;
  for (const master of masters) master.gain.value = next ? 0 : 1;
  for (const ref of media) {
    const el = ref.deref();
    if (el) muteMedia(el, next);
    else media.delete(ref);
  }
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {}
  for (const listen of listeners) listen(next);
}

export function onSoundMuted(listen: (muted: boolean) => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}
