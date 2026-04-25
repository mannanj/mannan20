'use client';

import { useState, useCallback, type RefObject, type ReactNode } from 'react';

export interface TimelineEra {
  id: string;
  year: string;
  title: string;
  side: 'left' | 'right';
  type: 'dated' | 'thematic';
  preview: string;
}

interface TimelineProps {
  eras: TimelineEra[];
  view: 'staggered' | 'linear';
  size?: 'sm' | 'md' | 'lg';
  hideThematic?: boolean;
  activeEra?: string;
  visible?: boolean;
  heroRef?: RefObject<HTMLDivElement | null>;
  previewMaxWidth?: number;
  topOffset?: number;
  onHoverChange?: (eraId: string | null, position?: { x: number; y: number }) => void;
  onItemClick?: (eraId: string, position: { x: number; y: number }) => void;
  hoverActions?: (eraId: string) => ReactNode;
}

const STAGGERED_LEFT_MAX_W = 83;
const STAGGERED_GAP = 16;
const STAGGERED_CENTER = STAGGERED_LEFT_MAX_W + STAGGERED_GAP;

const THEMATIC_LINE_INACTIVE = 8;
const THEMATIC_LINE_ACTIVE = 52;
const DOT_CONTAINER = 7;

const HEADER_HEIGHT = 66;

const RED_DOT = 'w-[7px] h-[7px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
const RED_DOT_LG = 'w-[9px] h-[9px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';

export function Timeline({
  eras,
  view,
  size,
  hideThematic = false,
  activeEra,
  visible = true,
  heroRef,
  previewMaxWidth,
  topOffset = 0,
  onHoverChange,
  onItemClick,
  hoverActions,
}: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const resolvedSize = size ?? (view === 'staggered' ? 'sm' : 'md');

  const filteredEras = hideThematic
    ? eras.filter((e) => e.type === 'dated')
    : eras;

  const scrollToEra = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - 48;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    history.replaceState(null, '', `#${id}`);
  }, []);

  const handleClick = useCallback(
    (id: string, rect?: DOMRect) => {
      if (view === 'staggered' && onItemClick && rect) {
        onItemClick(id, { x: rect.right + 16, y: rect.top });
        return;
      }
      if (view === 'staggered') {
        setHoveredId((prev) => (prev === id ? null : id));
      }
      scrollToEra(id);
    },
    [view, scrollToEra, onItemClick],
  );

  const precedingDatedId = (() => {
    if (view !== 'linear' || !activeEra) return null;
    const activeIdx = eras.findIndex((e) => e.id === activeEra);
    if (activeIdx < 0 || eras[activeIdx].type !== 'thematic') return null;
    for (let i = activeIdx - 1; i >= 0; i--) {
      if (eras[i].type === 'dated') return eras[i].id;
    }
    return null;
  })();

  if (view === 'staggered') {
    const isLg = resolvedSize === 'lg';
    const rowH = isLg ? 40 : 32;
    const titleSize = { inactive: isLg ? 14 : 12, active: isLg ? 15 : 13 };
    const yearSize = isLg ? 13 : 11;
    const previewSize = isLg ? 12 : 11;

    return (
      <div ref={heroRef} className="relative pb-4">
        <div className="hidden md:block relative">
          <div
            className="absolute top-0 bottom-0 w-px bg-white/[0.12]"
            style={{ left: STAGGERED_CENTER }}
          />

          <div className="flex flex-col">
            {filteredEras.map((era) => {
              const isHovered = hoveredId === era.id;
              const isLeft = era.side === 'left';

              return (
                <div
                  key={era.id}
                  className={`relative flex items-center cursor-pointer ${isHovered ? 'z-20' : 'z-0'}`}
                  style={{ height: rowH }}
                  onClick={(e) => handleClick(era.id, e.currentTarget.getBoundingClientRect())}
                  onMouseEnter={(e) => {
                    setHoveredId(era.id);
                    if (onHoverChange) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onHoverChange(era.id, { x: rect.right + 16, y: rect.top });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    onHoverChange?.(null);
                  }}
                >
                  <div
                    className={`absolute -translate-x-1/2 z-10 rounded-full transition-all duration-300 ${
                      isHovered
                        ? (isLg ? RED_DOT_LG : RED_DOT)
                        : (isLg ? 'w-[7px] h-[7px] bg-white/50' : 'w-[5px] h-[5px] bg-white/50')
                    }`}
                    style={{ left: STAGGERED_CENTER }}
                  />

                  {isLeft ? (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 text-right"
                        style={{ left: 0, width: STAGGERED_LEFT_MAX_W }}
                      >
                        <span
                        className={`relative inline-block whitespace-nowrap font-light tracking-wide transition-all duration-300 ${
                          isHovered ? 'text-white' : 'text-white/60'
                        }`}
                        style={{ fontSize: isHovered ? titleSize.active : titleSize.inactive }}
                      >
                          {era.title}
                          {era.preview && (
                            <span
                              className={`absolute left-0 top-full -mt-0.5 block leading-none text-white/30 ${previewMaxWidth ? 'whitespace-normal' : 'whitespace-nowrap'} pointer-events-none transition-opacity duration-300 ${
                                isHovered ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{ fontSize: previewSize, width: previewMaxWidth, textAlign: 'left' }}
                            >
                              {era.preview}
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ left: STAGGERED_CENTER + STAGGERED_GAP }}
                      >
                        <span className="font-mono text-white/35" style={{ fontSize: yearSize }}>{era.year}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ left: STAGGERED_CENTER + STAGGERED_GAP }}
                      >
                        <span
                        className={`relative inline-block whitespace-nowrap font-light tracking-wide transition-all duration-300 ${
                          isHovered ? 'text-white' : 'text-white/60'
                        }`}
                        style={{ fontSize: isHovered ? titleSize.active : titleSize.inactive }}
                      >
                          {era.title}
                          {era.preview && (
                            <span
                              className={`absolute left-0 top-full -mt-0.5 block leading-none text-white/30 ${previewMaxWidth ? 'whitespace-normal' : 'whitespace-nowrap'} pointer-events-none transition-opacity duration-300 ${
                                isHovered ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{ fontSize: previewSize, width: previewMaxWidth, textAlign: 'left' }}
                            >
                              {era.preview}
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 text-right"
                        style={{ left: 0, width: STAGGERED_LEFT_MAX_W }}
                      >
                        <span className="font-mono text-white/35" style={{ fontSize: yearSize }}>{era.year}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:hidden flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {filteredEras.map((era, i) => (
            <button
              key={era.id}
              onClick={() => scrollToEra(era.id)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">{era.year}</span>
              {i < filteredEras.length - 1 && <div className="w-4 h-px bg-white/10" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isLg = resolvedSize === 'lg';
  const titleSize = isLg ? 14 : 12;
  const yearSize = isLg ? 13 : 11;
  const previewSize = isLg ? 12 : 11;
  const yearMinW = isLg ? 32 : 28;
  const connectorH = isLg ? 'h-6' : 'h-5';
  const dotInactive = isLg ? 'w-[7px] h-[7px]' : 'w-[5px] h-[5px]';
  const dotActive = isLg ? RED_DOT_LG : RED_DOT;

  const hoveredIdx = hoveredId ? filteredEras.findIndex(e => e.id === hoveredId) : -1;
  const pushAfterIdx = hoveredIdx >= 0
    && filteredEras[hoveredIdx].type === 'dated'
    && filteredEras[hoveredIdx].preview
    && filteredEras[hoveredIdx + 1]?.type === 'thematic'
    ? hoveredIdx
    : -1;

  return (
    <>
      <nav
        data-side-timeline
        className={`hidden lg:flex fixed left-[max(1rem,calc(50vw-400px-140px))] -translate-y-1/2 flex-col z-10 transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: `calc(50% + 33px + ${topOffset}px)` }}
      >
        <div className="relative flex flex-col">
          {filteredEras.map((era, i) => {
            const isActive = activeEra === era.id;
            const isThematic = era.type === 'thematic';
            const isHovered = hoveredId === era.id;
            const isDotHighlighted = isActive || era.id === precedingDatedId || isHovered;
            const isLineHighlighted = isActive || isHovered;

            return (
              <div
                key={era.id}
                onMouseEnter={(e) => {
                  setHoveredId(era.id);
                  if (onHoverChange) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onHoverChange(era.id, { x: rect.right + 16, y: rect.top });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onHoverChange?.(null);
                }}
                className="transition-transform duration-300"
                style={pushAfterIdx >= 0 && i > pushAfterIdx ? { transform: 'translateY(22px)' } : undefined}
              >
                {i > 0 && (
                  <div className="flex">
                    <div className="w-[7px] flex justify-center">
                      <div className={`w-px ${isThematic ? 'h-2' : connectorH} bg-white/[0.08]`} />
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
                          isLineHighlighted
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                            : 'bg-white/20'
                        }`}
                        style={{ width: isLineHighlighted ? THEMATIC_LINE_ACTIVE : THEMATIC_LINE_INACTIVE }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`flex-shrink-0 rounded-full transition-all duration-300 ${
                        isDotHighlighted
                          ? dotActive
                          : `${dotInactive} bg-white/30`
                      }`}
                    />
                  )}
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span
                      className={`font-mono transition-colors duration-300 ${
                        isActive ? 'text-white/60' : 'text-white/30'
                      }`}
                      style={{ fontSize: yearSize, minWidth: yearMinW }}
                    >
                      {era.year}
                    </span>
                    <span className={`relative inline-block transition-colors duration-300 ${
                      isActive ? 'text-white/90' : 'text-white/45'
                    } group-hover:text-white/70`} style={{ fontSize: titleSize }}>
                      {era.title}
                      {era.preview && (
                        <span
                          className={`absolute left-0 top-full -mt-0.5 block leading-none text-white/30 ${previewMaxWidth ? 'whitespace-normal' : 'whitespace-nowrap'} pointer-events-none transition-opacity duration-300 ${
                            isHovered ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ fontSize: previewSize, width: previewMaxWidth, textAlign: 'left' }}
                        >
                          {era.preview}
                        </span>
                      )}
                    </span>
                    {hoverActions && (
                      <span className={`inline-flex items-center gap-1.5 ml-1.5 transition-opacity duration-300 ${
                        isHovered ? 'opacity-70' : 'opacity-0'
                      }`}>
                        {hoverActions(era.id)}
                      </span>
                    )}
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
