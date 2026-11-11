'use client';

import { useEffect, useRef, useState } from 'react';

const ROLL_MIN_DELTA = 20;
const ROLL_MS = 650;
const CLINK_CHANCE = 0.35;
const CLINK_MIN_GAP_MS = 4000;
const CLINK_NOTES = [1568, 2093, 2637, 3136];
const CLINK_STEP_S = 0.06;
const CLINK_VOLUME = 0.12;

let audio: AudioContext | null = null;
let lastClinkAt = 0;

function clink(): void {
  const now = performance.now();
  if (now - lastClinkAt < CLINK_MIN_GAP_MS || Math.random() > CLINK_CHANCE) return;
  lastClinkAt = now;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const t0 = audio.currentTime;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const freq = CLINK_NOTES[Math.floor(Math.random() * CLINK_NOTES.length)];
      const at = t0 + i * CLINK_STEP_S;
      for (const [mult, level] of [[1, 1], [2.76, 0.35]] as const) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * mult;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(CLINK_VOLUME * level, at + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        osc.connect(gain).connect(audio.destination);
        osc.start(at);
        osc.stop(at + 0.25);
      }
    }
  } catch {}
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useRollingScore(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    const delta = value - from;
    if (delta < ROLL_MIN_DELTA) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    clink();
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / ROLL_MS);
      const next = t >= 1 ? value : Math.floor(from + delta * easeOut(t));
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      shownRef.current = value;
    };
  }, [value]);

  return shown;
}

export function RollingScoreText({ value }: { value: number }) {
  const shown = useRollingScore(value);
  return <>{shown.toLocaleString('en-US')}</>;
}
