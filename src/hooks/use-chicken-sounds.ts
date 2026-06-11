'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getChickenAudio,
  type LoadProgress,
  type RiserResult,
  type ScreamResult,
} from '@/lib/chicken-audio';

export function useChickenSounds() {
  const [progress, setProgress] = useState<LoadProgress>(() => getChickenAudio().getProgress());

  useEffect(() => {
    const audio = getChickenAudio();
    audio.init();
    const unsubscribe = audio.subscribe(setProgress);
    return () => {
      unsubscribe();
      audio.stopAura();
    };
  }, []);

  const playScream = useCallback(
    (rate: number): ScreamResult | null => getChickenAudio().playScream(rate),
    []
  );
  const playPowerUp = useCallback(
    (final: boolean): RiserResult => getChickenAudio().playRiser(final),
    []
  );
  const setAuraLevel = useCallback(
    (level: number, tier: number) => getChickenAudio().setAuraLevel(level, tier),
    []
  );
  const crackle = useCallback(() => getChickenAudio().crackle(), []);

  return { progress, playScream, playPowerUp, setAuraLevel, crackle };
}
