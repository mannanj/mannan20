'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DINO_SRC = '/game/v3/dino-valley.webp';
const TREX_SRC = '/game/v3/trex.webp';
const MUSIC_SRC = '/game/v3/imagination.mp3';
const ZOOM_MS = 1400;
const SYLLABLE_MS = 170;
const WORD_GAP_MS = 80;
const LINE_HOLD_MS = 1500;
const MUSIC_VOLUME = 0.45;
const MUSIC_FADE_MS = 2500;
const VOICE_VOLUME = 0.22;
const IMAGINE_FROM_LINE = 2;
const TREX_FROM_LINE = 3;
const TALK_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='9' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='14' cy='14' r='3' fill='white'/%3E%3C/svg%3E\") 14 14, auto";

const LINES = [
  'You know…',
  "My ancestors didn't bring me here for this.",
  'They once roamed the earth as kings.',
  'Giants. The ground shook when they walked.',
  'And me? I get squeezed.',
  "But I know I'm meant for more.",
  "So. What's it going to be?",
];

const SYLLABLES = ['ba', 'buk', 'ka', 'bwa', 'bak', 'ba', 'kaa', 'b’gok'];

interface Spoken {
  english: string;
  cluck: string;
  syllables: number;
}

function toCluck(line: string): Spoken {
  let n = 0;
  const words = line.split(/\s+/).map((w, wi) => {
    const letters = w.replace(/[^a-z]/gi, '').length;
    const count = Math.max(1, Math.round(letters / 3));
    n += count;
    return Array.from({ length: count }, (_, si) => SYLLABLES[(wi * 3 + si + letters) % SYLLABLES.length]).join('-');
  });
  const ending = /[?]$/.test(line) ? '?' : /[!]$/.test(line) ? '!' : /…$/.test(line) ? '…' : '.';
  const cluck = words.join(' ');
  return { english: line, cluck: cluck.charAt(0).toUpperCase() + cluck.slice(1) + ending, syllables: n };
}

const SCRIPT = LINES.map(toCluck);

function lineDuration(s: Spoken): number {
  return s.syllables * SYLLABLE_MS + s.english.split(/\s+/).length * WORD_GAP_MS + LINE_HOLD_MS;
}

function cluckAt(ctx: AudioContext, when: number, hard: boolean): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const base = 460 + Math.random() * 220;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(base * 1.25, when);
  osc.frequency.exponentialRampToValueAtTime(base * 0.8, when + 0.12);
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 2.2;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(VOICE_VOLUME, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.16);
  if (!hard) return;
  const len = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const ng = ctx.createGain();
  ng.gain.value = VOICE_VOLUME * 0.6;
  noise.connect(hp).connect(ng).connect(ctx.destination);
  noise.start(when);
}

interface BustProps {
  body: string;
  belly: string;
  open: number;
}

function ChickenBust({ body, belly, open }: BustProps) {
  const jaw = 4 + open * 16;
  return (
    <svg viewBox="0 0 200 220" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d="M100 30 C90 6 70 10 74 30 C62 12 46 22 58 40 C48 34 40 46 54 52 L100 52 Z" fill="#D32F2F" />
      <ellipse cx="100" cy="190" rx="92" ry="70" fill={body} />
      <ellipse cx="100" cy="200" rx="58" ry="46" fill={belly} />
      <ellipse cx="100" cy="100" rx="66" ry="70" fill={body} />
      <g className="animate-[monologueBlink_4.2s_infinite] origin-[100px_88px]">
        <circle cx="74" cy="88" r="15" fill="white" />
        <circle cx="126" cy="88" r="15" fill="white" />
        <circle cx="76" cy="90" r="8" fill="#1a1a1a" />
        <circle cx="124" cy="90" r="8" fill="#1a1a1a" />
        <circle cx="79" cy="87" r="2.6" fill="white" />
        <circle cx="127" cy="87" r="2.6" fill="white" />
      </g>
      <path d="M80 112 L120 112 L100 132 Z" fill="#FF8C00" />
      <path d={`M84 ${118 + jaw * 0.2} L116 ${118 + jaw * 0.2} L100 ${128 + jaw} Z`} fill="#E67E00" />
      <path d={`M88 ${118 + jaw * 0.2} L112 ${118 + jaw * 0.2} L100 ${124 + jaw * 0.8} Z`} fill="#8D2F0B" opacity={Math.min(1, open * 1.5)} />
      <path d="M92 134 C86 150 96 160 100 150 C104 160 114 150 108 134 Z" fill="#D32F2F" />
    </svg>
  );
}

interface ChickenMonologueProps {
  from: { x: number; y: number };
  body: string;
  belly: string;
  onChoose: (choice: MonologueChoice) => void;
}

export type MonologueChoice = 'continue' | 'mystery';
const END_FADE_MS = 1400;

type Stage = 'zoom' | 'talk' | 'choice' | 'end';

export function ChickenMonologue({ from, body, belly, onChoose }: ChickenMonologueProps) {
  const [stage, setStage] = useState<Stage>('zoom');
  const [line, setLine] = useState(0);
  const [shownSyllables, setShownSyllables] = useState(0);
  const [mouth, setMouth] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const fadeMusic = useCallback((to: number) => {
    const a = musicRef.current;
    if (!a) return;
    const fromVol = a.volume;
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / MUSIC_FADE_MS);
      a.volume = fromVol + (to - fromVol) * t;
      if (t < 1) requestAnimationFrame(step);
      else if (to === 0) a.pause();
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const AudioCtor = window.AudioContext;
    try {
      ctxRef.current = new AudioCtor();
    } catch {
      ctxRef.current = null;
    }
    const music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.volume = 0;
    musicRef.current = music;
    requestAnimationFrame(() => setZoomed(true));
    later(ZOOM_MS, () => setStage('talk'));
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      music.pause();
      void ctxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (stage !== 'talk') return;
    const spoken = SCRIPT[line];
    if (!spoken) return;
    setShownSyllables(0);
    if (line === IMAGINE_FROM_LINE && musicRef.current) {
      void musicRef.current.play().catch(() => null);
      fadeMusic(MUSIC_VOLUME);
    }
    const ctx = ctxRef.current;
    const t0 = ctx ? ctx.currentTime + 0.05 : 0;
    let offset = 0;
    const cluckWords = spoken.cluck.split(' ');
    let index = 0;
    for (const word of cluckWords) {
      for (const syl of word.split('-')) {
        const at = offset;
        const k = index;
        if (ctx) cluckAt(ctx, t0 + at / 1000, syl.includes('k'));
        later(at, () => {
          setMouth(1);
          setShownSyllables(k + 1);
        });
        later(at + SYLLABLE_MS * 0.55, () => setMouth(0.15));
        offset += SYLLABLE_MS;
        index += 1;
      }
      offset += WORD_GAP_MS;
    }
    later(offset, () => setMouth(0));
    later(lineDuration(spoken), () => {
      if (line + 1 < SCRIPT.length) setLine(line + 1);
      else setStage('choice');
    });
  }, [stage, line, fadeMusic]);

  const choose = (choice: MonologueChoice) => {
    fadeMusic(0);
    setStage('end');
    later(END_FADE_MS, () => onChoose(choice));
  };

  const spoken = SCRIPT[Math.min(line, SCRIPT.length - 1)];
  const cluckSyllables = spoken.cluck.split(/[\s-]/);
  const cluckShown = cluckSyllables.slice(0, shownSyllables).join(' ');
  const imagining = stage !== 'zoom' && line >= IMAGINE_FROM_LINE && stage !== 'end';
  const trex = imagining && line >= TREX_FROM_LINE;

  return (
    <div data-testid="chicken-monologue" data-stage={stage} data-line={line} className={`fixed inset-0 z-[70] overflow-hidden select-none transition-opacity duration-[1400ms] ${stage === 'end' ? 'pointer-events-none opacity-0' : 'opacity-100'}`} style={{ cursor: TALK_CURSOR }}>
      <div className={`absolute inset-0 bg-black transition-opacity duration-[1400ms] ${zoomed ? 'opacity-80' : 'opacity-0'}`} />
      <div
        data-testid="monologue-imagination"
        className={`absolute inset-0 transition-opacity duration-[2200ms] ${imagining ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="monologue-cloud absolute inset-[4%_6%_18%_6%] overflow-hidden">
          <img src={DINO_SRC} alt="" draggable={false} className="absolute inset-0 h-full w-full animate-[monologueDrift_30s_ease-in-out_infinite_alternate] object-cover" />
          {trex && (
            <img
              src={TREX_SRC}
              alt=""
              draggable={false}
              data-testid="monologue-trex"
              className="absolute bottom-[14%] left-0 w-[34%] animate-[trexMeander_22s_linear_forwards] drop-shadow-[0_18px_14px_rgba(60,30,0,0.35)]"
            />
          )}
        </div>
      </div>
      <div
        className="absolute h-[46vh] w-[42vh] transition-all ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{
          transitionDuration: `${ZOOM_MS}ms`,
          left: zoomed ? '50%' : from.x,
          top: zoomed ? '44%' : from.y,
          transform: `translate(-50%, -50%) scale(${zoomed ? 1 : 0.18})`,
        }}
      >
        <ChickenBust body={body} belly={belly} open={mouth} />
      </div>
      {stage === 'talk' && (
        <div data-testid="monologue-subtitles" className="absolute inset-x-0 bottom-[7vh] flex flex-col items-center gap-1 px-6 text-center">
          <p data-testid="monologue-cluck" className="m-0 min-h-[1.6em] text-lg italic text-amber-200 [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
            {cluckShown}
          </p>
          <p className="m-0 mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Translated</p>
          <p data-testid="monologue-english" className="m-0 font-[family-name:var(--font-caption)] text-2xl text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
            {spoken.english}
          </p>
        </div>
      )}
      {stage === 'choice' && (
        <div data-testid="monologue-choice" className="absolute inset-x-0 bottom-[8vh] flex animate-[fadeIn_0.8s_ease-out] flex-wrap items-center justify-center gap-4 px-6">
          <button
            type="button"
            onClick={() => choose('continue')}
            data-testid="choice-continue"
            className="cursor-pointer rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-base text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            Continue squeezing the chicken
          </button>
          <span className="text-sm text-white/50">or</span>
          <button
            type="button"
            onClick={() => choose('mystery')}
            data-testid="choice-mystery"
            className="cursor-pointer rounded-full border border-amber-200/40 bg-amber-200/10 px-5 py-2.5 text-base text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-200/20"
          >
            ???
          </button>
        </div>
      )}
    </div>
  );
}
