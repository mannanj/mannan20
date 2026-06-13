'use client';

import { BottomSheet } from './bottom-sheet';

const PANEL_ID = 'chicken-info-panel';

const SECTIONS = [
  {
    title: 'Origin',
    body: 'A rubber screaming-chicken homage. It floats, it dodges, it screams, it speeds up.',
  },
  {
    title: 'Screams',
    body: 'Seven real screams. Each sticks around a while, then swaps. Deeper every form.',
  },
  {
    title: 'Evolution',
    body: 'Clicks morph it — blue at 20, green at 45, red at 75, gold at 110. Hair, aura, lightning follow.',
  },
  {
    title: 'Mercy',
    body: 'Ignore it and it gets smug and slow. Never impossible.',
  },
  {
    title: 'Coming',
    body: 'Demon mode. Chicken friends. Fire. Skins. Chat.',
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

interface GameInfoPanelProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function GameInfoPanel({ open, onToggle, onClose }: GameInfoPanelProps) {
  return (
    <>
      <BottomSheet
        id={PANEL_ID}
        open={open}
        onClose={onClose}
        label="About this game"
        testId="chicken-info-panel"
      >
        <h2 className="text-sm font-semibold tracking-wide text-white/90">About this chicken</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#b1442c]">
                {section.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/60">{section.body}</p>
            </div>
          ))}
        </div>
      </BottomSheet>
      <button
        type="button"
        onClick={onToggle}
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
