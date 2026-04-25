import { Header } from '@/components/header';
import { GoldInfectionWrapper } from '@/components/effects/gold-infection-wrapper';
import { PageMagnifier } from '@/components/garden/page-magnifier';

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoldInfectionWrapper>
      <Header />
      {children}
      <PageMagnifier />
    </GoldInfectionWrapper>
  );
}
