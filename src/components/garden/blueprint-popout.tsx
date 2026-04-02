'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const POPOUT_WIDTH = 400;

const ALIGNMENT_FACTS = [
  'Grew up eating fast food, grew out of birth religion, ended up obsessed with health — a parallel journey discussed in the article above',
  '10+ years of health optimization and biohacker interventions since 2015 (Tim Ferriss, Dave Asprey)',
  'Reversed own prediabetes through lifestyle restructuring — proving the body responds to systems, not just interventions',
  'The person friends and family turn to for health guidance — spent 5\u201310 years remedying conditions said to be incurable',
  'Built adjacent projects: Meal Fairy (meal delivery startup), Sun Signal (circadian-aligned scheduling), digital wellbeing coaching',
  'Vision for integrated circadian hardware/software systems — breaking the industrial clock-based schedule',
  'Hardware + software experience from college robotics to full-stack web development',
  'Frontend engineering expertise with a bias toward beautiful aesthetics (React, TypeScript, Next.js)',
  'Drawn to the team\u2019s honesty, care, and track record of execution',
  '\u201CHealth optimization isn\u2019t a career move — it\u2019s a calling I\u2019ve been living for a decade.\u201D',
];

interface BlueprintPopoutProps {
  open: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}

export function BlueprintPopout({ open, onClose, anchorPosition }: BlueprintPopoutProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [closeHover, setCloseHover] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const positionInitialized = useRef(false);

  useEffect(() => {
    if (open && anchorPosition) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = anchorPosition.x;
      let y = anchorPosition.y - 40;

      x = Math.max(12, Math.min(x, vw - POPOUT_WIDTH - 12));
      y = Math.max(12, Math.min(y, vh - 500));

      setPosition({ x, y });
      positionInitialized.current = true;
    }
  }, [open, anchorPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    e.preventDefault();
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };

    const handleMouseUp = () => {
      setDragOffset(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const blockBgScroll = (e: WheelEvent) => {
      const popout = popoutRef.current;
      if (popout && !popout.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', blockBgScroll, { passive: false });
    return () => document.removeEventListener('wheel', blockBgScroll);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        ref={popoutRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: POPOUT_WIDTH,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '24px',
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          cursor: dragOffset ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        data-testid="blueprint-popout"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <button
          type="button"
          data-testid="blueprint-popout-close"
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '18px',
            zIndex: 1,
            background: 'none',
            border: 'none',
            color: closeHover ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        <h3 className="text-base font-medium text-white mb-1 pr-6">Interesting Companies</h3>
        <div className="max-h-[50vh] overflow-y-auto overscroll-contain popout-scroll -mr-[21px] pr-[21px]">
          <div className="flex items-baseline gap-2 mb-1.5 mt-2.5">
            <span className="text-xs text-white/50">Blueprint</span>
            <a
              href="https://blueprint.bryanjohnson.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#039be5] hover:text-[#4fc3f7] text-xs font-normal cursor-pointer no-underline transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="inline-block ml-0.5 text-[16px] rotate-180 scale-x-[-1]">&#10555;</span>
            </a>
          </div>
          <ul className="space-y-2.5">
            {ALIGNMENT_FACTS.map((fact, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-white/60 leading-relaxed">
                <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
