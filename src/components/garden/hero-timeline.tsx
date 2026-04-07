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
      <div className="hidden md:block relative mx-auto overflow-visible" style={{ maxWidth: '420px' }}>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.12]" />

        <div className="flex flex-col overflow-visible">
          {datedEras.map((era) => {
            const isExpanded = expandedId === era.id;
            const isLeft = era.side === 'left';

            return (
              <div
                key={era.id}
                className={`relative h-[52px] flex items-center cursor-pointer ${isExpanded ? 'z-20' : 'z-0'}`}
                onClick={() => handleClick(era.id)}
                onMouseEnter={() => setExpandedId(era.id)}
                onMouseLeave={() => setExpandedId(null)}
              >
                <div
                  className={`absolute left-1/2 -translate-x-1/2 z-10 rounded-full transition-all duration-300 ${
                    isExpanded
                      ? 'w-[7px] h-[7px] bg-white'
                      : 'w-[5px] h-[5px] bg-white/50'
                  }`}
                />

                {isLeft ? (
                  <>
                    <div className="absolute right-[calc(50%+16px)] top-1/2 -translate-y-1/2 text-right">
                      <span className={`font-light tracking-wide transition-colors duration-300 ${
                        isExpanded ? 'text-[13px] text-white' : 'text-[12px] text-white/60'
                      }`}>
                        {era.title}
                      </span>
                    </div>
                    <div className="absolute left-[calc(50%+16px)] top-1/2 -translate-y-1/2">
                      <span className="text-[11px] font-mono text-white/35">{era.year}</span>
                    </div>
                    {era.preview && (
                      <div className={`absolute right-[calc(50%+16px)] top-[calc(50%+3px)] text-right transition-opacity duration-300 pointer-events-none ${
                        isExpanded ? 'opacity-100' : 'opacity-0'
                      }`}>
                        <span className="text-[11px] text-white/30 whitespace-nowrap">{era.preview}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="absolute left-[calc(50%+16px)] top-1/2 -translate-y-1/2">
                      <span className={`font-light tracking-wide transition-colors duration-300 ${
                        isExpanded ? 'text-[13px] text-white' : 'text-[12px] text-white/60'
                      }`}>
                        {era.title}
                      </span>
                    </div>
                    <div className="absolute right-[calc(50%+16px)] top-1/2 -translate-y-1/2 text-right">
                      <span className="text-[11px] font-mono text-white/35">{era.year}</span>
                    </div>
                    {era.preview && (
                      <div className={`absolute left-[calc(50%+16px)] top-[calc(50%+3px)] transition-opacity duration-300 pointer-events-none ${
                        isExpanded ? 'opacity-100' : 'opacity-0'
                      }`}>
                        <span className="text-[11px] text-white/30 whitespace-nowrap">{era.preview}</span>
                      </div>
                    )}
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
