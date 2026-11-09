'use client';

import { useCallback, useEffect, useState } from 'react';
import { ENDLESS_ERAS } from './endless-eras';
import { Caret, GLASS_PANEL } from './version-picker';

export const BACKYARD_SCENE_ID = 'backyard';
export const SCENE_LOG_KEY = 'chicken-v3-scenes';

const SCENE_DOTS: Record<string, string> = {
  [BACKYARD_SCENE_ID]: '#8bd17c',
  fire: '#ff7a3d',
  'big-cats': '#f2b632',
  jungle: '#3fbf6b',
  'myth-1': '#d9c08a',
  'myth-2': '#a58bff',
  forest: '#5fd3c4',
};

export const SCENES = [{ id: BACKYARD_SCENE_ID, label: 'Backyard' }, ...ENDLESS_ERAS.map((e) => ({ id: e.id, label: e.label }))];

function readLog(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCENE_LOG_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function useSceneLog(current: string, score: number, enabled: boolean): Set<string> {
  const [played, setPlayed] = useState<Set<string>>(() => new Set([BACKYARD_SCENE_ID]));
  useEffect(() => {
    if (!enabled) return;
    setPlayed((prev) => new Set([...prev, ...readLog()]));
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const reached = ENDLESS_ERAS.filter((e) => score >= e.from).map((e) => e.id);
    setPlayed((prev) => {
      const fresh = [current, ...reached].filter((id) => !prev.has(id));
      if (fresh.length === 0) return prev;
      const next = new Set([...prev, ...fresh]);
      try {
        localStorage.setItem(SCENE_LOG_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, [current, score, enabled]);
  return played;
}

interface ScenePickerProps {
  current: string;
  played: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
}

function Dot({ id }: { id: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" style={{ backgroundColor: SCENE_DOTS[id] ?? '#fff' }} />;
}

export function ScenePicker({ current, played, open, onOpenChange, onPick }: ScenePickerProps) {
  const label = SCENES.find((s) => s.id === current)?.label ?? 'Backyard';
  const pick = useCallback(
    (id: string) => {
      onPick(id);
      onOpenChange(false);
    },
    [onPick, onOpenChange]
  );
  return (
    <div data-testid="scene-picker" data-scene={current} className={`flex flex-col items-end ${GLASS_PANEL}`}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        data-testid="scene-picker-toggle"
        className="flex cursor-pointer items-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
      >
        <Dot id={current} />
        <span data-testid="scene-picker-current">{label}</span>
        <Caret open={open} />
      </button>
      {open && (
        <ol data-testid="scene-picker-list" className="flex w-full flex-col gap-0.5 border-t border-white/15 p-1.5">
          {SCENES.map((s, i) => {
            const unlocked = played.has(s.id);
            const here = s.id === current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => pick(s.id)}
                  data-testid={`scene-option-${s.id}`}
                  data-current={here ? '1' : '0'}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${here ? 'bg-white/20 font-semibold text-white' : unlocked ? 'cursor-pointer text-white/85 hover:bg-white/12' : 'cursor-not-allowed text-white/35'}`}
                >
                  <span className="w-3 text-[10px] tabular-nums text-white/45">{i + 1}</span>
                  <Dot id={s.id} />
                  <span className="whitespace-nowrap">{unlocked ? s.label : '???'}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
