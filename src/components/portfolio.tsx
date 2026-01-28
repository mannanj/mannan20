'use client';

import { AppProvider, useApp } from '@/context/app-context';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import type { AboutData } from '@/lib/types';
import { Header } from './header';
import { Hero } from './hero';
import { About } from './about';
import { Contact } from './contact';
import { ContactModal } from './contact-modal';
import { KeyboardCommandsModal } from './keyboard-commands-modal';

interface PortfolioInnerProps {
  data: AboutData;
}

function PortfolioInner({ data }: PortfolioInnerProps) {
  const { setActiveSection } = useApp();
  useScrollSpy(setActiveSection);

  return (
    <div className="font-[Lucida_Grande]">
      <div id="header">
        <Header />
      </div>

      <div id="body" className="my-[20vh] md:my-[10vh] w-full max-w-[321px] mx-auto px-5">
        <div id="home" className="mt-[33vh]">
          <Hero />
        </div>

        <div id="about" className="mt-[66vh]">
          <About data={data} />
        </div>

        <div id="contact" className="mt-[33vh] h-[44vh]">
          <Contact />
        </div>
      </div>

      <KeyboardCommandsModal />
      <ContactModal />
    </div>
  );
}

interface PortfolioProps {
  data: AboutData;
}

export function Portfolio({ data }: PortfolioProps) {
  return (
    <AppProvider>
      <PortfolioInner data={data} />
    </AppProvider>
  );
}
