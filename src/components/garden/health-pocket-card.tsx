'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  DraggablePopout,
  type DraggablePopoutHandle,
} from './draggable-popout';

type PopoutId = 'essentials' | 'baking-soda' | 'coffee';

interface PopoutView {
  id: PopoutId;
  title: string;
  render: (push: (id: PopoutId) => void) => ReactNode;
}

const VIEWS: Record<PopoutId, PopoutView> = {
  essentials: {
    id: 'essentials',
    title: 'Pocket Essentials',
    render: (push) => (
      <ul className="space-y-3 text-xs text-white/65 leading-relaxed">
        <li>
          <div className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <button
              type="button"
              onClick={() => push('baking-soda')}
              className="text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200 cursor-pointer underline underline-offset-2 decoration-[#039be5]/40 hover:decoration-[#4fc3f7]/60"
            >
              Baking soda
            </button>
          </div>
          <ul className="mt-1.5 ml-5 space-y-1.5">
            <li className="flex gap-2.5">
              <span className="text-white/30 mt-0.5 shrink-0">&#8211;</span>
              <button
                type="button"
                onClick={() => push('coffee')}
                className="text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200 cursor-pointer underline underline-offset-2 decoration-[#039be5]/40 hover:decoration-[#4fc3f7]/60"
              >
                Coffee
              </button>
            </li>
          </ul>
        </li>
      </ul>
    ),
  },
  'baking-soda': {
    id: 'baking-soda',
    title: 'Baking soda',
    render: (push) => (
      <div className="text-xs text-white/65 leading-relaxed space-y-3">
        <p>Carry a small tube. One ingredient, many uses.</p>
        <ul className="space-y-2">
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Disinfects produce and strips pesticide residue</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Raises pH in liquids, kills opportunistic bacteria</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Neutralizes indigestion and high stomach acid</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>
              See{' '}
              <button
                type="button"
                onClick={() => push('coffee')}
                className="text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200 cursor-pointer underline underline-offset-2 decoration-[#039be5]/40 hover:decoration-[#4fc3f7]/60"
              >
                coffee
              </button>
            </span>
          </li>
        </ul>
      </div>
    ),
  },
  coffee: {
    id: 'coffee',
    title: 'Coffee',
    render: () => (
      <div className="text-xs text-white/65 leading-relaxed space-y-3">
        <p>A dash of baking soda in coffee.</p>
        <ul className="space-y-2">
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Lowers acidity without noticeably changing taste</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Eases indigestion and reflux from coffee</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Softens the afternoon crash</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
            <span>Improves how the body utilizes the caffeine</span>
          </li>
        </ul>
      </div>
    ),
  },
};

export function HealthPocketCard() {
  const [stack, setStack] = useState<PopoutId[]>([]);
  const [savedStack, setSavedStack] = useState<PopoutId[]>(['essentials']);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cardHover, setCardHover] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const popoutRef = useRef<DraggablePopoutHandle>(null);

  const open = stack.length > 0;
  const currentId = stack[stack.length - 1];
  const currentView = currentId ? VIEWS[currentId] : null;

  const handleCardClick = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorPos({ x: rect.right + 16, y: rect.top });
    }
    setStack(savedStack);
  }, [savedStack]);

  const handleClose = useCallback(() => {
    setSavedStack(stack.length > 0 ? stack : savedStack);
    setStack([]);
  }, [stack, savedStack]);

  const push = useCallback((id: PopoutId) => {
    setStack((prev) => [...prev, id]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        onClick={open ? handleClose : handleCardClick}
        onMouseEnter={() => setCardHover(true)}
        onMouseLeave={() => setCardHover(false)}
        aria-label={open ? 'Close Pocket Essentials' : 'Open Pocket Essentials'}
        className="group hidden md:flex fixed top-[300px] z-[60] flex-col items-center text-center cursor-pointer"
        style={{
          left: 'max(12px, calc((100vw - 672px) / 4 - 75px))',
          width: '150px',
          padding: '10px 6px',
          background: 'transparent',
          border: 'none',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.85))',
          animation: 'pocketDrift 22s ease-in-out infinite',
          transition: 'filter 300ms ease',
        }}
      >
        <div
          aria-hidden
          className="absolute -inset-8 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at 25% 35%, rgba(239,68,68,0.35), transparent 65%), ' +
              'radial-gradient(ellipse 55% 60% at 75% 40%, rgba(34,197,94,0.28), transparent 65%), ' +
              'radial-gradient(ellipse 60% 55% at 50% 75%, rgba(59,130,246,0.38), transparent 65%)',
            backgroundRepeat: 'no-repeat',
            filter: cardHover || open ? 'blur(22px)' : 'blur(18px)',
            mixBlendMode: 'screen',
            opacity: cardHover || open ? 0.55 : 0.4,
            animation: 'pocketAura 14s ease-in-out infinite',
            transition: 'opacity 300ms ease, filter 300ms ease',
            zIndex: 0,
          }}
        />
        <span className="relative z-10 text-[9px] uppercase tracking-[0.16em] text-white/60">
          Health
        </span>
        <span className="relative z-10 mt-0.5 text-[11px] font-medium text-white">
          Pocket Essentials
        </span>

        {open && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-hidden
            className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-black/70 border border-white/25 text-white/70 hover:text-white hover:border-white/50 transition-colors duration-200"
            style={{ fontSize: '12px', lineHeight: 1 }}
          >
            &times;
          </span>
        )}
      </button>

      {currentView && (
        <DraggablePopout
          ref={popoutRef}
          open={open}
          onClose={handleClose}
          anchorPosition={anchorPos}
          minimizable
          width={200}
          miniWidth={140}
          header={
            <div className="flex items-center gap-2 mb-1">
              {stack.length > 1 && (
                <button
                  type="button"
                  onClick={pop}
                  aria-label="Back"
                  className="text-white/50 hover:text-white/90 transition-colors duration-200 cursor-pointer"
                  style={{ padding: '0 2px', lineHeight: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <h3 className="text-base font-medium text-white">
                {currentView.title}
              </h3>
            </div>
          }
        >
          {currentView.render(push)}
        </DraggablePopout>
      )}
    </>
  );
}
