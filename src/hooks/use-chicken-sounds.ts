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
    return audio.subscribe(setProgress);
  }, []);

  const playScream = useCallback(
    (rate: number): ScreamResult | null => getChickenAudio().playScream(rate),
    []
  );
  const playPowerUp = useCallback(
    (final: boolean): RiserResult => getChickenAudio().playRiser(final),
    []
  );
  const crackle = useCallback(() => getChickenAudio().crackle(), []);

  return { progress, playScream, playPowerUp, crackle };
}
