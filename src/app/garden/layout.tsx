import { Header } from '@/components/header';
import { GoldInfectionWrapper } from '@/components/effects/gold-infection-wrapper';
import { PageMagnifier } from '@/components/garden/page-magnifier';
import { InventoryProvider } from '@/components/garden/article-inventory';

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoldInfectionWrapper>
      <InventoryProvider>
        <Header />
        {children}
        <PageMagnifier />
      </InventoryProvider>
    </GoldInfectionWrapper>
  );
}
