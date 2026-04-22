'use client';

import { useState, useCallback } from 'react';
import { DraggablePopout } from './draggable-popout';

interface ThinkingEntry {
  id: string;
  title: string;
  paragraphs: string[];
}

const ENTRIES: ThinkingEntry[] = [
  {
    id: 'gullibility-and-leadership',
    title: 'Gullibility & Leadership',
    paragraphs: [
      "Gullibility is a leadership transfer. When you can't tell what's true, you hand the steering wheel to whoever sounds most confident. You stop leading your own life and start renting it out — to pundits, gurus, bosses, partners, algorithms, anyone willing to do the thinking for you.",
      'The people holding that wheel have no incentive to give it back. Their status, income, and relevance depend on you staying confused. A guru whose followers become discerning loses followers. A manager whose team thinks for itself loses leverage. A pundit whose audience checks sources loses the audience. So the structures around you will quietly reward your credulity and subtly punish your skepticism — not through conspiracy, but through simple self-interest. Expect this. Stop being surprised by it.',
      "One action, today: Pick something you currently believe because someone you trust told you so — not something you've independently verified. Write down the claim. Then go find the strongest case against it from someone credible. Not to flip your view. To feel what it's like to hold a belief you've actually pressure-tested, versus one you inherited. Do this once a week. That muscle is what gullibility is the absence of.",
    ],
  },
];

export function ThinkingAboutCard() {
  const [expanded, setExpanded] = useState(false);
  const [popoutEntry, setPopoutEntry] = useState<ThinkingEntry | null>(null);
  const [popoutPos, setPopoutPos] = useState<{ x: number; y: number } | undefined>();

  const openEntry = useCallback((entry: ThinkingEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setPopoutEntry(entry);
    setPopoutPos({ x: e.clientX, y: e.clientY });
  }, []);

  const closePopout = useCallback(() => {
    setPopoutEntry(null);
  }, []);

  return (
    <>
      <div
        className="hidden xl:block fixed right-6 top-40 z-20"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block text-left rounded-xl border border-white/10 bg-black/40 backdrop-blur-md hover:border-white/20 transition-all duration-300 overflow-hidden cursor-pointer"
          style={{
            width: expanded ? 220 : 150,
            padding: expanded ? 16 : 12,
          }}
        >
          <div className="text-sm leading-none mb-1.5" aria-hidden="true">{'🤔'}</div>
          <div className="text-[11px] font-medium text-white/80 tracking-tight leading-tight">
            I&apos;m Thinking About
          </div>

          <div
            className="transition-all duration-300 overflow-hidden"
            style={{
              maxHeight: expanded ? 400 : 0,
              opacity: expanded ? 1 : 0,
              marginTop: expanded ? 12 : 0,
            }}
          >
            <ul className="space-y-1.5">
              {ENTRIES.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={(e) => openEntry(entry, e)}
                    className="w-full text-left text-[11px] leading-snug text-white/55 hover:text-white rounded-md px-2 py-1.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </button>
      </div>

      <DraggablePopout
        open={Boolean(popoutEntry)}
        onClose={closePopout}
        anchorPosition={popoutPos}
        width={440}
        header={
          popoutEntry ? (
            <h3 className="text-sm font-medium text-white mb-4">{popoutEntry.title}</h3>
          ) : undefined
        }
      >
        {popoutEntry && (
          <div className="space-y-4 text-[13px] leading-relaxed text-white/75">
            {popoutEntry.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </DraggablePopout>
    </>
  );
}
