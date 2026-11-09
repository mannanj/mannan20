'use client';

import { useEffect, useRef } from 'react';

export const SAVED_SCORE_KEY = 'chicken-v3-score';
const PROGRESS_URL = '/api/game/progress';
const GAME_ID = 'chicken-v3';
const PUSH_DEBOUNCE_MS = 4000;

export function readSavedScore(): number {
  try {
    const n = Number(localStorage.getItem(SAVED_SCORE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeSavedScore(score: number): void {
  if (score <= readSavedScore()) return;
  try {
    localStorage.setItem(SAVED_SCORE_KEY, String(score));
  } catch {}
}

async function fetchAccountScore(): Promise<number | null> {
  try {
    const res = await fetch(`${PROGRESS_URL}?game=${GAME_ID}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { score?: unknown };
    return typeof body.score === 'number' ? body.score : null;
  } catch {
    return null;
  }
}

function pushAccountScore(score: number): void {
  void fetch(PROGRESS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ game: GAME_ID, score }),
  }).catch(() => null);
}

interface SavedScoreOptions {
  enabled: boolean;
  ready: boolean;
  score: number;
  resume: (score: number) => void;
}

export function useSavedScore({ enabled, ready, score, resume }: SavedScoreOptions): void {
  const signedInRef = useRef(false);
  const resumedRef = useRef(false);
  const resumeRef = useRef(resume);
  resumeRef.current = resume;

  useEffect(() => {
    if (!enabled || !ready || resumedRef.current) return;
    resumedRef.current = true;
    void (async () => {
      const local = readSavedScore();
      const account = await fetchAccountScore();
      signedInRef.current = account !== null;
      const best = Math.max(local, account ?? 0);
      writeSavedScore(best);
      if (account !== null && local > account) pushAccountScore(local);
      if (best > 0) resumeRef.current(best);
    })();
  }, [enabled, ready]);

  useEffect(() => {
    if (!enabled || !resumedRef.current || score <= 0) return;
    writeSavedScore(score);
    if (!signedInRef.current) return;
    const timer = window.setTimeout(() => pushAccountScore(score), PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, score]);
}
