'use client';

import { GoldInfectionProvider } from '@/context/gold-infection-context';
import { GoldParticleCanvas } from './gold-particle-canvas';

export function GoldInfectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <GoldInfectionProvider>
      {children}
      <GoldParticleCanvas />
    </GoldInfectionProvider>
  );
}
