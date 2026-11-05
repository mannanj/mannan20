'use client';

import { useImperativeHandle, useRef, type RefObject } from 'react';
import { MAX_CURSORS, type CursorOffset } from './chicken-orbs';
import type { JevPoint } from './jev-helper';

export type HelperAim = (at: JevPoint, offsets: CursorOffset[], squeezed: boolean) => void;

const SLOTS = Array.from({ length: MAX_CURSORS }, (_, i) => i);
const SQUEEZED_SCALE = 0.86;

export function activeCursors(offsets: CursorOffset[]): CursorOffset[] {
  const shown = offsets.filter((o) => !o.hidden);
  return shown.length > 0 ? shown : [{ dx: 0, dy: 0 }];
}

interface HelperCrosshairsProps {
  aimRef: RefObject<HelperAim | null>;
  tag: string;
  testId: string;
}

export function HelperCrosshairs({ aimRef, tag, testId }: HelperCrosshairsProps) {
  const elsRef = useRef<(HTMLDivElement | null)[]>([]);

  useImperativeHandle(
    aimRef,
    () => (at, offsets, squeezed) => {
      elsRef.current.forEach((el, i) => {
        if (!el) return;
        const offset = offsets[i];
        el.style.display = offset ? 'block' : 'none';
        if (offset) el.style.transform = `translate(${at.x + offset.dx}px, ${at.y + offset.dy}px) scale(${squeezed ? SQUEEZED_SCALE : 1})`;
      });
    },
    []
  );

  return (
    <>
      {SLOTS.map((slot) => (
        <div
          key={slot}
          ref={(el) => {
            elsRef.current[slot] = el;
          }}
          data-testid={slot === 0 ? testId : `${testId}-extra`}
          className="absolute left-0 top-0 hidden h-0 w-0"
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="absolute -left-7 -top-7">
            <circle cx="28" cy="28" r="17" stroke="#ff2020" strokeWidth="2" />
            <path d="M28 2V20M28 36V54M2 28H20M36 28H54" stroke="#ff2020" strokeWidth="2" />
            <circle cx="28" cy="28" r="2" fill="#ff2020" />
          </svg>
          {slot === 0 && <span className="absolute left-8 top-[-34px] rounded bg-[#d11] px-1.5 text-xs font-bold leading-5 text-white">{tag}</span>}
        </div>
      ))}
    </>
  );
}
