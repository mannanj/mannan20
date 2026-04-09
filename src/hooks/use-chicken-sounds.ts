'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Howl } from 'howler';

const SOUND_COUNT = 8;
const SOUND_PATHS = Array.from(
  { length: SOUND_COUNT },
  (_, i) => `/sounds/chicken/scream-${i + 1}.mp3`
);

export function useChickenSounds() {
  const howlsRef = useRef<Howl[]>([]);
  const lastPlayedRef = useRef(-1);

  useEffect(() => {
    howlsRef.current = SOUND_PATHS.map(
      (src) =>
        new Howl({
          src: [src],
          preload: true,
          volume: 0.7,
        })
    );
    return () => {
      howlsRef.current.forEach((h) => h.unload());
      howlsRef.current = [];
    };
  }, []);

  const playRandom = useCallback(() => {
    const howls = howlsRef.current;
    if (howls.length === 0) return;
    let idx = Math.floor(Math.random() * howls.length);
    if (idx === lastPlayedRef.current && howls.length > 1) {
      idx = (idx + 1) % howls.length;
    }
    lastPlayedRef.current = idx;
    howls[idx].play();
  }, []);

  return { playRandom };
}
