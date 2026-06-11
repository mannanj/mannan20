'use client';

import { useEffect, useState } from 'react';

const PANEL_ID = 'chicken-info-panel';

const SECTIONS = [
  {
    title: 'The origin',
    body: 'Commissioned in April 2026 as an homage to the classic rubber screaming-chicken toy: it floats, it dodges your cursor, it screams when you click it, and every click makes it faster.',
  },
  {
    title: 'The screams',
    body: 'Seven real screams — a rubber-chicken wail, a panic bawk, a rooster crow, one very loud BWACK — randomized so no two clicks sound alike, served from Cloudflare, and pitched deeper with every form.',
  },
  {
    title: 'The evolution',
    body: 'Each click cracks shards of skin off, revealing what’s underneath: Yard Bird → Azure Comet at 20 → Jade Tempest at 45 → Crimson Fury at 75 → Golden God at 110. Saiyan hair arrives with the first transformation; the aura and bio-electricity follow.',
  },
  {
    title: 'The mercy',
    body: 'Leave it uncaught long enough and it gets smug and slows down — the first shipped piece of its personality. Never impossible forever.',
  },
  {
    title: 'Still in the coop',
    body: 'Demonic mode, chicken friends, fire trails, skins, a chat panel for special requests, and a leaderboard for anyone who reaches 100.',
  },
];

function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5.2" r="0.9" fill="currentColor" />
      <path d="M8 7.5 V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CaretGlyph({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      fill="none"
      aria-hidden="true"
      data-testid="chicken-info-caret"
    >
      <path
        d="M2.5 7.5 L6 4 L9.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GameInfoPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div
        id={PANEL_ID}
        data-testid="chicken-info-panel"
        role="region"
        aria-label="About this game"
        aria-hidden={!open}
        className={`fixed bottom-[68px] right-5 z-40 w-[340px] max-w-[calc(100vw-40px)] rounded-2xl border border-white/10 bg-[#121214]/90 p-5 shadow-2xl backdrop-blur-md transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
      >
        <h2 className="text-sm font-semibold tracking-wide text-white/90">About this chicken</h2>
        {SECTIONS.map((section) => (
          <div key={section.title} className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#4FC3F7]">
              {section.title}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{section.body}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label="About this game"
        data-testid="chicken-info-button"
        className="fixed bottom-5 right-5 z-40 flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/50 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/80"
      >
        <InfoGlyph />
        <CaretGlyph open={open} />
      </button>
    </>
  );
}
