'use client';

import { useState, useCallback, useRef } from 'react';
import { BlueprintPopout } from './blueprint-popout';

export function HealthArticleBody() {
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const companiesRef = useRef<HTMLButtonElement>(null);

  const openPopout = useCallback((e?: React.MouseEvent) => {
    if (e) {
      setAnchorPos({ x: e.clientX - 100, y: e.clientY });
    } else if (companiesRef.current) {
      const rect = companiesRef.current.getBoundingClientRect();
      setAnchorPos({ x: rect.left, y: rect.bottom });
    }
    setPopoutOpen(true);
  }, []);

  const closePopout = useCallback(() => {
    setPopoutOpen(false);
  }, []);

  return (
    <>
      <div className="space-y-6 text-sm text-white/70 leading-relaxed">
        <p>
          I grew up eating fast food. That was the norm &mdash; quick, convenient, and nobody
          questioned it. It wasn&apos;t until my early twenties that I started paying attention
          to what I was putting into my body, and once I did, everything changed.
        </p>

        <p>
          Around 2015, I fell into the world of biohacking through Tim Ferriss and Dave Asprey.
          What started as curiosity became a serious practice. I tracked sleep, experimented with
          fasting protocols, optimized my light exposure, and built routines around recovery. Over
          the next decade, health optimization stopped being a hobby and became the foundation of
          how I live.
        </p>

        <p>
          The turning point was reversing my own prediabetes. Doctors had flagged it, and the
          conventional path was medication. Instead, I restructured everything &mdash; diet,
          movement, stress management, sleep. It worked. That experience proved to me that the
          body responds to systems, not just interventions.
        </p>

        <p>
          Since then, I&apos;ve become the person friends and family turn to for health guidance.
          Not because I have credentials on a wall, but because I&apos;ve lived the work.
          I&apos;ve spent the last 5&ndash;10 years remedying conditions said to be incurable
          and helping family do the same.
        </p>

        <p>
          Last year, I finally admitted something to myself: health and wellbeing isn&apos;t just
          a personal interest &mdash; it&apos;s the thing I need to align my professional life to.
          I&apos;d been circling it for years, building adjacent projects (a meal delivery startup,
          a circadian scheduling system, digital wellbeing coaching), but I hadn&apos;t committed
          to making it the center.
        </p>

        <p>
          What excites me about the longevity space right now is the shift in framing. Most health
          companies start from the product and work backward &mdash; here&apos;s a supplement,
          here&apos;s an app, good luck. The companies that will matter are the ones that start
          from the actual problem: the daily complexity of staying healthy is what defeats people,
          not the cost of any single intervention. That reframe matters because it means the
          interface is the product.
        </p>

        <p>
          I&apos;ve been interested in{' '}
          <button
            ref={companiesRef}
            onClick={openPopout}
            className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            companies
          </button>
          {' '}taking this same approach to health. I like that artful intuition and rigorous
          measurement is combined with genuine personalization rather than selling supplements
          with a quiz. We need powerful philosophies and frameworks to resonate as a genuine
          answer to some of the hardest questions ahead &mdash; such as how humanity aligns its
          interests as technology accelerates into super intelligence.
        </p>

        <p>
          I believe health can be a unifying framework during a revolutionary period in human
          history. When I needed an anchor, improving my own health was the most reliable thing I
          found. The mission to make wellbeing accessible to everyone &mdash; not just those with
          the time or money to optimize &mdash; is the product I&apos;ve been building on my own.
          It&apos;s ready to be done at scale.
        </p>
      </div>

      <div className="mt-16 border-t border-white/10 pt-10">
        <h2 className="text-lg font-medium text-white mb-6">Additional Reading</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            data-testid="interesting-companies-card"
            onClick={openPopout}
            className="text-left rounded-lg border border-[#2d5a27]/40 bg-[#0f1a0d]/60 p-4 hover:border-[#2d5a27]/70 transition-colors duration-200"
          >
            <h3 className="text-sm font-medium text-white mb-1">Interesting Companies</h3>
            <p className="text-xs text-white/40">Companies I like</p>
          </button>

          <div className="rounded-lg border border-dashed border-white/15 p-4 opacity-30 flex flex-col items-center justify-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span className="text-[10px] text-white/30">Coming soon</span>
          </div>

          <div className="rounded-lg border border-dashed border-white/15 p-4 opacity-30 flex flex-col items-center justify-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[10px] text-white/30">Coming soon</span>
          </div>
        </div>
      </div>

      <BlueprintPopout open={popoutOpen} onClose={closePopout} anchorPosition={anchorPos} />
    </>
  );
}
