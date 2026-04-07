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
  heroVisible: boolean;
}

export function SideMarginTimeline({ eras, activeEra, heroVisible }: SideMarginTimelineProps) {
  const datedEras = eras.filter((e) => e.type === 'dated');

  const scrollToEra = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <nav
        className={`hidden lg:flex fixed left-[max(1rem,calc(50vw-400px-140px))] top-1/2 -translate-y-1/2 flex-col z-10 transition-opacity duration-500 ${
          heroVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative flex flex-col">
          {datedEras.map((era, i) => {
            const isActive = activeEra === era.id;

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
                  <div
                    className={`flex-shrink-0 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-[7px] h-[7px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                        : 'w-[5px] h-[5px] bg-white/30'
                    }`}
                  />
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className={`text-[11px] font-mono transition-colors duration-300 ${
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
          heroVisible ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
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
