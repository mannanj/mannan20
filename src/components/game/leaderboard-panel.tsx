'use client';

import { useCallback, useEffect, useState } from 'react';
import { BottomSheet } from './bottom-sheet';
import { ContactForm } from '../contact-form';
import { ContactResult } from '../contact-result';
import { CONTACT_DATA } from '../contact-modal';
import { useApp } from '@/context/app-context';

const PANEL_ID = 'chicken-leaderboard-panel';
const NAME_COOKIE = 'chicken-name';
const KIND_COOKIE = 'chicken-kind';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const NAME_MAX = 24;

type Kind = 'human' | 'agent';

interface Entry {
  name: string;
  score: number;
}

interface Boards {
  human: Entry[];
  agent: Entry[];
}

function readCookie(key: string): string | null {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

function writeCookie(key: string, value: string): void {
  document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
}

interface LeaderboardPanelProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  score: number;
}

export function LeaderboardPanel({ open, onToggle, onClose, score }: LeaderboardPanelProps) {
  const { state, setContactResult } = useApp();
  const [boards, setBoards] = useState<Boards | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Kind>('human');
  const [name, setName] = useState('');
  const [isAgent, setIsAgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ name: string; kind: Kind } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const savedName = readCookie(NAME_COOKIE);
    if (savedName) setName(savedName.slice(0, NAME_MAX));
    if (readCookie(KIND_COOKIE) === 'agent') {
      setIsAgent(true);
      setTab('agent');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/game/leaderboard')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: Boards) => {
        if (!cancelled) setBoards(data);
      })
      .catch(() => {
        if (!cancelled) setError('Leaderboard unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = useCallback(async () => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed || score < 1 || submitting) return;
    const kind: Kind = isAgent ? 'agent' : 'human';
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/game/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, score, kind }),
      });
      if (res.status === 429) {
        setError('Easy there — try again in a minute.');
        return;
      }
      if (!res.ok) {
        setError('Could not save your score. Try again.');
        return;
      }
      const data: Boards = await res.json();
      setBoards(data);
      writeCookie(NAME_COOKIE, trimmed);
      writeCookie(KIND_COOKIE, kind);
      setSubmitted({ name: trimmed, kind });
      setTab(kind);
    } catch {
      setError('Could not save your score. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [name, score, isAgent, submitting]);

  const entries = boards?.[tab] ?? [];

  return (
    <>
      <BottomSheet
        id={PANEL_ID}
        open={open}
        onClose={onClose}
        label="Leaderboard"
        testId="chicken-leaderboard-panel"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold tracking-wide text-white/90">Leaderboard</h2>
          <div role="tablist" aria-label="Board" className="flex gap-1 rounded-full border border-white/10 p-0.5">
            {(['human', 'agent'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                data-testid={`leaderboard-tab-${kind}`}
                onClick={() => setTab(kind)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs transition-colors ${tab === kind ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70'}`}
              >
                {kind === 'human' ? 'Humans' : 'Agents'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-[120px]">
          {loading && <p className="text-xs text-white/40">Summoning scores…</p>}
          {!loading && error && <p className="text-xs text-[#FF8A80]">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="text-xs text-white/40">
              {tab === 'human' ? 'No legends yet. Be the first.' : 'No agents on the board yet. Beep boop, make history.'}
            </p>
          )}
          {!loading && entries.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {entries.map((entry, i) => {
                const isMine = submitted?.name === entry.name && submitted.kind === tab;
                return (
                  <li
                    key={`${entry.name}-${i}`}
                    data-testid="leaderboard-row"
                    className={`flex items-baseline gap-3 text-sm ${isMine ? 'text-[#FFD700]' : 'text-white/70'}`}
                  >
                    <span className={`w-6 shrink-0 text-right text-xs tabular-nums ${i === 0 ? 'text-[#FFD700]' : 'text-white/30'}`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                    <span className="tabular-nums text-white/50">{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Your name"
            data-testid="leaderboard-name-input"
            className="w-44 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#4FC3F7]/50"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={isAgent}
              onChange={(e) => setIsAgent(e.target.checked)}
              data-testid="leaderboard-agent-checkbox"
              className="h-3.5 w-3.5 cursor-pointer accent-[#4FC3F7]"
            />
            I’m an agent/AI
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || score < 1 || submitting}
            data-testid="leaderboard-submit"
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          >
            {submitting ? 'Saving…' : `Add my score · ${score}`}
          </button>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          {!feedbackOpen ? (
            <p className="text-xs text-white/40">
              Humans on one board, agents on another — don’t like the division?{' '}
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                data-testid="leaderboard-feedback-toggle"
                className="cursor-pointer text-[#4FC3F7] underline-offset-2 hover:underline"
              >
                Send feedback
              </button>
              {' '}— we’d love to hear your voice.
            </p>
          ) : state.contactRevealed ? (
            <div className="max-w-md">
              <ContactResult result={CONTACT_DATA} />
            </div>
          ) : (
            <div className="max-w-md">
              <ContactForm onReveal={() => setContactResult(CONTACT_DATA)} />
            </div>
          )}
        </div>
      </BottomSheet>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        data-testid="chicken-leaderboard-link"
        className="fixed right-5 top-4 z-40 cursor-pointer text-xs font-medium tracking-wide text-white/40 transition-colors hover:text-white/80"
      >
        Leaderboard
      </button>
    </>
  );
}
