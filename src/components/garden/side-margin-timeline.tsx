'use client';

import { useCallback } from 'react';

interface TimelineEra {
  id: string;
  year: string;
  title: string;
  side: 'left' | 'right';
  type: 'dated' | 'thematic';
}

interface SideMarginTimelineProps {
  eras: TimelineEra[];
  activeEra: string;
  visible: boolean;
}

export function SideMarginTimeline({ eras, activeEra, visible }: SideMarginTimelineProps) {
  const scrollToEra = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const precedingDatedId = (() => {
    const activeIdx = eras.findIndex((e) => e.id === activeEra);
    if (activeIdx < 0 || eras[activeIdx].type !== 'thematic') return null;
    for (let i = activeIdx - 1; i >= 0; i--) {
      if (eras[i].type === 'dated') return eras[i].id;
    }
    return null;
  })();

  return (
    <>
      <nav
        className={`hidden lg:flex fixed left-[max(1rem,calc(50vw-400px-140px))] top-1/2 -translate-y-1/2 flex-col z-10 transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative flex flex-col">
          {eras.map((era, i) => {
            const isActive = activeEra === era.id;
            const isThematic = era.type === 'thematic';
            const isDotActive = isActive || era.id === precedingDatedId;

            return (
              <div key={era.id}>
                {i > 0 && (
                  <div className="flex">
                    <div className="w-[7px] flex justify-center">
                      <div className="w-px h-7 bg-white/[0.08]" />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => scrollToEra(era.id)}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  {isThematic ? (
                    <div className="relative flex-shrink-0 w-[7px] h-[7px]">
                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-px transition-all duration-300 ${
                          isActive
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                            : 'bg-white/20'
                        }`}
                        style={{ width: isActive ? 52 : 8 }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`flex-shrink-0 rounded-full transition-all duration-300 ${
                        isDotActive
                          ? 'w-[7px] h-[7px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : 'w-[5px] h-[5px] bg-white/30'
                      }`}
                    />
                  )}
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className={`text-[11px] font-mono min-w-[28px] transition-colors duration-300 ${
                      isActive ? 'text-white/60' : 'text-white/30'
                    }`}>
                      {era.year}
                    </span>
                    <span className={`text-[12px] transition-colors duration-300 ${
                      isActive ? 'text-white/90' : 'text-white/45'
                    } group-hover:text-white/70`}>
                      {era.title}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      <div
        className={`lg:hidden fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="bg-[#0b0b0b]/90 backdrop-blur-sm border-b border-white/[0.06] px-6 py-2.5">
          <span className="text-[10px] font-mono text-white/30 mr-2">
            {eras.find((e) => e.id === activeEra)?.year}
          </span>
          <span className="text-[11px] text-white/50">
            {eras.find((e) => e.id === activeEra)?.title}
          </span>
        </div>
      </div>
    </>
  );
}
