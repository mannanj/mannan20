'use client';

import { useState, useCallback, type RefObject } from 'react';

interface TimelineEra {
  id: string;
  year: string;
  title: string;
  side: 'left' | 'right';
  type: 'dated' | 'thematic';
  preview: string;
}

interface HeroTimelineProps {
  eras: TimelineEra[];
  heroRef: RefObject<HTMLDivElement | null>;
}

const LEFT_MAX_W = 83;
const GAP = 16;
const CENTER = LEFT_MAX_W + GAP;

export function HeroTimeline({ eras, heroRef }: HeroTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const datedEras = eras.filter((e) => e.type === 'dated');

  const scrollToEra = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleClick = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
      scrollToEra(id);
    },
    [scrollToEra],
  );

  return (
    <div ref={heroRef} className="relative pb-4">
      <div className="hidden md:block relative">
        <div
          className="absolute top-0 bottom-0 w-px bg-white/[0.12]"
          style={{ left: CENTER }}
        />

        <div className="flex flex-col">
          {datedEras.map((era) => {
            const isExpanded = expandedId === era.id;
            const isLeft = era.side === 'left';

            return (
              <div
                key={era.id}
                className={`relative h-[32px] flex items-center cursor-pointer ${isExpanded ? 'z-20' : 'z-0'}`}
                onClick={() => handleClick(era.id)}
                onMouseEnter={() => setExpandedId(era.id)}
                onMouseLeave={() => setExpandedId(null)}
              >
                <div
                  className={`absolute -translate-x-1/2 z-10 rounded-full transition-all duration-300 ${
                    isExpanded
                      ? 'w-[7px] h-[7px] bg-white'
                      : 'w-[5px] h-[5px] bg-white/50'
                  }`}
                  style={{ left: CENTER }}
                />

                {isLeft ? (
                  <>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-right"
                      style={{ left: 0, width: LEFT_MAX_W }}
                    >
                      <span className={`relative inline-block whitespace-nowrap font-light tracking-wide transition-colors duration-300 ${
                        isExpanded ? 'text-[13px] text-white' : 'text-[12px] text-white/60'
                      }`}>
                        {era.title}
                        {era.preview && (
                          <span
                            className={`absolute left-0 top-full -mt-0.5 text-[11px] text-white/30 whitespace-nowrap pointer-events-none transition-opacity duration-300 ${
                              isExpanded ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {era.preview}
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: CENTER + GAP }}
                    >
                      <span className="text-[11px] font-mono text-white/35">{era.year}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: CENTER + GAP }}
                    >
                      <span className={`relative inline-block whitespace-nowrap font-light tracking-wide transition-colors duration-300 ${
                        isExpanded ? 'text-[13px] text-white' : 'text-[12px] text-white/60'
                      }`}>
                        {era.title}
                        {era.preview && (
                          <span
                            className={`absolute left-0 top-full -mt-0.5 text-[11px] text-white/30 whitespace-nowrap pointer-events-none transition-opacity duration-300 ${
                              isExpanded ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {era.preview}
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-right"
                      style={{ left: 0, width: LEFT_MAX_W }}
                    >
                      <span className="text-[11px] font-mono text-white/35">{era.year}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {datedEras.map((era, i) => (
          <button
            key={era.id}
            onClick={() => scrollToEra(era.id)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">{era.year}</span>
            {i < datedEras.length - 1 && <div className="w-4 h-px bg-white/10" />}
          </button>
        ))}
      </div>
    </div>
  );
}
