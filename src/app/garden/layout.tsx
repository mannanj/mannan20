import { Header } from '@/components/header';
import { GoldInfectionWrapper } from '@/components/effects/gold-infection-wrapper';

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoldInfectionWrapper>
      <Header />
      {children}
    </GoldInfectionWrapper>
  );
}
