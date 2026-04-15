import type { Metadata } from 'next';
import { ChickenGame } from '@/components/game/chicken-game';

export const metadata: Metadata = {
  title: 'Floating Chicken Game',
  description: 'Click the screaming chicken. How high can you score?',
};

export default function GamePage() {
  return <ChickenGame />;
}
