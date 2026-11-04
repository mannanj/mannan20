'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getChickenAudio,
  type CreatureSoundKey,
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
  const playHawk = useCallback((): ScreamResult | null => getChickenAudio().playHawk(), []);
  const crackle = useCallback(() => getChickenAudio().crackle(), []);
  const squeak = useCallback((depth: number) => getChickenAudio().squeak(depth), []);
  const sizzle = useCallback((level: number) => getChickenAudio().sizzle(level), []);
  const playCreature = useCallback((key: CreatureSoundKey) => getChickenAudio().playCreature(key), []);

  return { progress, playScream, playPowerUp, playHawk, crackle, squeak, sizzle, playCreature };
}
