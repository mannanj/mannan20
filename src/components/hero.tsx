'use client';

import { scrollToSection } from '@/lib/utils';

export function Hero() {
  return (
    <header className="pt-10 md:pt-20">
      <p className="eyebrow">Multi-disciplinary engineer</p>

      <h1 className="font-display font-normal text-ink m-0 mt-5 text-[clamp(46px,8vw,80px)] leading-[1.02] tracking-[-0.015em]">
        Mannan Javid
      </h1>

      <p className="font-display text-ink m-0 mt-6 max-w-[24ch] text-[clamp(21px,3vw,28px)] leading-[1.3]">
        I build technology in service of <em className="italic text-accent">people</em>.
      </p>

      <p className="font-sans text-ink-2 m-0 mt-4 max-w-[54ch] text-[15px] leading-relaxed">
        Founder of Spirit&nbsp;&amp;&nbsp;Hammer. Before — Capital One, Publicis Sapient, Maxar,
        MITRE. Built for non-profits, government, and millions of users.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={() => scrollToSection('about')} className="nav-button">
          See the work
        </button>
        <button onClick={() => scrollToSection('contact')} className="nav-button-ghost">
          Get in touch
        </button>
      </div>
    </header>
  );
}
