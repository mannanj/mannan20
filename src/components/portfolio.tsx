'use client';

import { useEffect } from 'react';
import { AppProvider, useApp } from '@/context/app-context';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import type { AboutData } from '@/lib/types';
import { Header } from './header';
import { Hero } from './hero';
import { About } from './about';
import { Contact } from './contact';
import { ContactModal } from './contact-modal';
import { KeyboardCommandsModal } from './keyboard-commands-modal';
import { ResumeDownloadFlow } from './resume-download-flow';
import { RobotsGuidedFlow } from './robots-guided-flow';

interface PortfolioInnerProps {
  data: AboutData;
}

function PortfolioInner({ data }: PortfolioInnerProps) {
  const { setActiveSection } = useApp();
  useScrollSpy(setActiveSection);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || hash === 'download-resume' || hash === 'robots-flow' || hash === 'robotics-flow') return;
    const scroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 75;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };
    const timer = setTimeout(scroll, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="font-sans">
      <div id="header">
        <Header />
      </div>

      <main id="body" className="mx-auto w-full max-w-[880px] px-6 md:px-8 pt-28 pb-32">
        <section id="home" className="scroll-mt-[88px]">
          <Hero />
        </section>

        <section id="about" className="scroll-mt-[88px] mt-24 md:mt-32">
          <About data={data} />
        </section>

        <section id="contact" className="scroll-mt-[88px] mt-24 md:mt-32">
          <Contact />
        </section>
      </main>

      <KeyboardCommandsModal />
      <ContactModal />
      <ResumeDownloadFlow />
      <RobotsGuidedFlow />
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
