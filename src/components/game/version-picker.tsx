'use client';

import { useState } from 'react';
import { GAME_VERSIONS, gameVersionHref, type GameVersion } from '@/lib/game-variant';

export const GLASS_PANEL =
  'overflow-hidden rounded-2xl border border-white/25 bg-neutral-900/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-150';

export function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
      <path d="M3.5 2 L7 5 L3.5 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VersionPicker({ current, openUp = false }: { current: GameVersion; openUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const here = GAME_VERSIONS.find((v) => v.version === current) ?? GAME_VERSIONS[0];
  return (
    <div data-testid="version-picker" data-version={String(current)} className={`flex ${openUp ? 'flex-col-reverse items-start' : 'flex-col items-end'} ${GLASS_PANEL}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="version-picker-toggle"
        className="flex cursor-pointer items-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
      >
        <span className="text-white/70">Version</span>
        <span data-testid="version-picker-current">{here.label}</span>
        <Caret open={open} />
      </button>
      {open && (
        <ul data-testid="version-picker-list" className={`flex w-full flex-col gap-0.5 p-1.5 ${openUp ? 'border-b' : 'border-t'} border-white/15`}>
          {GAME_VERSIONS.map((v) => {
            const active = v.version === current;
            return (
              <li key={String(v.version)}>
                <a
                  href={gameVersionHref(v.version)}
                  data-testid={`version-option-${v.version}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${active ? 'bg-white/20 font-semibold text-white' : 'text-white/85 hover:bg-white/12'}`}
                >
                  <span>{v.label}</span>
                  {v.note && <span className="text-[10px] text-white/50">{v.note}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
