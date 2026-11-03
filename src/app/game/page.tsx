import type { Metadata } from 'next';
import { ChickenGame } from '@/components/game/chicken-game';
import { ChickenGameV2 } from '@/components/game/chicken-game-v2';
import { GAME_VARIANT_PARAM, isNextGameVariant } from '@/lib/game-variant';

export const metadata: Metadata = {
  title: 'Floating Chicken Game',
  description: 'Click the screaming chicken. How high can you score?',
};

interface GamePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const params = await searchParams;
  if (isNextGameVariant(params[GAME_VARIANT_PARAM])) return <ChickenGameV2 />;
  return <ChickenGame />;
}
