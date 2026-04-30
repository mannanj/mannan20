'use client';

import Link from 'next/link';
import { useState } from 'react';

export function AiPocketCard() {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href="/garden/article/ai-false-positives"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="AI -+."
      className="group hidden md:flex fixed right-0 top-1/2 z-[60] cursor-pointer"
      style={{
        animation: 'shadowTabDrift 9s ease-in-out infinite',
        transform: 'translateY(-50%)',
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: '30px',
          height: '128px',
          background: 'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          borderLeft: '1px solid rgba(255,255,255,0.14)',
          borderTopLeftRadius: '10px',
          borderBottomLeftRadius: '10px',
          marginRight: hover ? '6px' : '0px',
          opacity: hover ? 1 : 0.55,
          transition:
            'margin 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease, background 300ms ease',
        }}
      >
        <span
          className="font-medium tracking-[0.32em] text-white/85 select-none"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '10px',
            textTransform: 'uppercase',
          }}
        >
          AI&nbsp;-+.
        </span>
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[1px]"
          style={{
            width: '1px',
            height: hover ? '60%' : '34%',
            background:
              'linear-gradient(to bottom, transparent, rgba(255,255,255,0.55), transparent)',
            transition: 'height 350ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </Link>
  );
}
