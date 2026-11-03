import type { Metadata } from 'next';
import { ChickenGame } from '@/components/game/chicken-game';
import { ChickenGameV2 } from '@/components/game/chicken-game-v2';
import { TestStartMarker } from '@/components/game/test-start-marker';
import { GAME_VARIANT_PARAM, isNextGameVariant, testStartScore } from '@/lib/game-variant';

export const metadata: Metadata = {
  title: 'Floating Chicken Game',
  description: 'Click the screaming chicken. How high can you score?',
};

interface GamePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const params = await searchParams;
  const start = process.env.NODE_ENV === 'production' ? null : testStartScore(params.start);
  const game = isNextGameVariant(params[GAME_VARIANT_PARAM]) ? <ChickenGameV2 /> : <ChickenGame />;
  return (
    <>
      {game}
      {start !== null && <TestStartMarker start={start} />}
    </>
  );
}
