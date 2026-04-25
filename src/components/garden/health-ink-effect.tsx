'use client';

import type { CSSProperties } from 'react';

const FILTER_ID = 'garden-health-ink';

const AURA_GRADIENT = [
  'radial-gradient(ellipse 42% 58% at 26% 50%, rgba(239,68,68,0.60) 0%, rgba(239,68,68,0.60) 38%, transparent 78%)',
  'radial-gradient(ellipse 40% 54% at 50% 50%, rgba(34,197,94,0.48) 0%, rgba(34,197,94,0.48) 38%, transparent 78%)',
  'radial-gradient(ellipse 44% 58% at 76% 50%, rgba(59,130,246,0.62) 0%, rgba(59,130,246,0.62) 38%, transparent 78%)',
].join(', ');

const INK_STYLE: CSSProperties = {
  background: AURA_GRADIENT,
  backgroundRepeat: 'no-repeat',
  padding: '24px',
  WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
  WebkitMaskClip: 'content-box, border-box',
  WebkitMaskComposite: 'xor',
  maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
  maskClip: 'content-box, border-box',
  maskComposite: 'exclude',
  filter: `url(#${FILTER_ID})`,
  mixBlendMode: 'screen',
  opacity: 0.6,
  transform: 'translateZ(0)',
  zIndex: 0,
};

export function HealthInkEffect() {
  return (
    <>
      <svg
        aria-hidden
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none' }}
      >
        <defs>
          <filter id={FILTER_ID} x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.022"
              numOctaves="2"
              seed="6"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="90"
              result="inked"
            />
            <feGaussianBlur in="inked" stdDeviation="8" result="blurred" />
            <feColorMatrix
              in="blurred"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 20 -9
              "
            />
          </filter>
        </defs>
      </svg>

      <div
        aria-hidden
        className="absolute -inset-6 pointer-events-none rounded-lg"
        style={INK_STYLE}
      />
    </>
  );
}
