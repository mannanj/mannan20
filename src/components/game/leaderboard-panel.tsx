'use client';

import { useCallback, useEffect, useState } from 'react';
import { BottomSheet } from './bottom-sheet';
import { FeedbackPopup } from './feedback-popup';

const PANEL_ID = 'chicken-leaderboard-panel';
const NAME_COOKIE = 'chicken-name';
const KIND_COOKIE = 'chicken-kind';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const NAME_MAX = 24;
const CLAIM_TOAST_MS = 7000;

type Kind = 'human' | 'agent';

interface Entry {
  name: string;
  score: number;
}

interface Boards {
  human: Entry[];
  agent: Entry[];
}

interface Identity {
  names: string[];
  email: string | null;
  verified: boolean;
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
  const [boards, setBoards] = useState<Boards | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Kind>('human');
  const [name, setName] = useState('');
  const [isAgent, setIsAgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ name: string; kind: Kind } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [nameTaken, setNameTaken] = useState<{ emailBound: boolean } | null>(null);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPhase, setClaimPhase] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTo, setRenameTo] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const fetchIdentity = useCallback(async () => {
    try {
      const res = await fetch('/api/game/leaderboard/me');
      if (!res.ok) return;
      setIdentity((await res.json()) as Identity);
    } catch {}
  }, []);

  useEffect(() => {
    const savedName = readCookie(NAME_COOKIE);
    if (savedName) setName(savedName.slice(0, NAME_MAX));
    if (readCookie(KIND_COOKIE) === 'agent') {
      setIsAgent(true);
      setTab('agent');
    }
    void fetchIdentity();
  }, [fetchIdentity]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('claim');
    if (!token) return;
    url.searchParams.delete('claim');
    window.history.replaceState(null, '', url.toString());
    void (async () => {
      try {
        const res = await fetch('/api/game/leaderboard/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = (await res.json()) as { names: string[]; email: string };
          const suffix =
            data.names.length > 0 ? ` — your names: ${data.names.join(', ')}` : '';
          setClaimToast({ text: `Signed in as ${data.email}${suffix}`, ok: true });
          void fetchIdentity();
        } else {
          setClaimToast({ text: 'Sign-in link expired — request a new one.', ok: false });
        }
      } catch {
        setClaimToast({ text: 'Sign-in failed — try again.', ok: false });
      }
    })();
  }, [fetchIdentity]);

  useEffect(() => {
    if (!claimToast) return;
    const id = setTimeout(() => setClaimToast(null), CLAIM_TOAST_MS);
    return () => clearTimeout(id);
  }, [claimToast]);

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
    setNameTaken(null);
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
      if (res.status === 409) {
        const data = (await res.json().catch(() => null)) as { emailBound?: boolean } | null;
        setNameTaken({ emailBound: data?.emailBound === true });
        setClaimFormOpen(true);
        return;
      }
      if (!res.ok) {
        setError('Could not save your score. Try again.');
        return;
      }
      const data = (await res.json()) as Boards & { you?: { name: string } };
      setBoards(data);
      const finalName = data.you?.name ?? trimmed;
      writeCookie(NAME_COOKIE, finalName);
      writeCookie(KIND_COOKIE, kind);
      if (finalName !== trimmed) setName(finalName);
      setSubmitted({ name: finalName, kind });
      setTab(kind);
      void fetchIdentity();
    } catch {
      setError('Could not save your score. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [name, score, isAgent, submitting, fetchIdentity]);

  const requestMagicLink = useCallback(async () => {
    const email = claimEmail.trim();
    if (!email || claimPhase === 'sending') return;
    setClaimPhase('sending');
    setClaimMessage(null);
    setDevLink(null);
    try {
      const res = await fetch('/api/game/leaderboard/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { sent?: boolean; devLink?: string; error?: string }
        | null;
      if (!res.ok) {
        setClaimPhase('idle');
        setClaimMessage(
          res.status === 429 ? 'Too many link requests — try again later.' : 'Invalid email.'
        );
        return;
      }
      setClaimPhase('sent');
      if (data?.sent) {
        setClaimMessage('Magic link sent — check your inbox.');
      } else if (data?.devLink) {
        setClaimMessage('Email is not configured — use the dev link:');
      } else {
        setClaimMessage('Email sign-in is not available right now.');
      }
      if (data?.devLink) setDevLink(data.devLink);
    } catch {
      setClaimPhase('idle');
      setClaimMessage('Could not request a link. Try again.');
    }
  }, [claimEmail, claimPhase]);

  const rename = useCallback(async () => {
    const to = renameTo.trim().replace(/\s+/g, ' ');
    if (!to || renaming) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch('/api/game/leaderboard/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      if (res.status === 409) {
        setRenameError('That name is taken.');
        return;
      }
      if (!res.ok) {
        setRenameError('Rename failed. Try again.');
        return;
      }
      const data = (await res.json()) as Boards & { ok: boolean };
      setBoards(data);
      writeCookie(NAME_COOKIE, to);
      setName(to);
      setRenameOpen(false);
      setRenameTo('');
      void fetchIdentity();
    } catch {
      setRenameError('Rename failed. Try again.');
    } finally {
      setRenaming(false);
    }
  }, [renameTo, renaming, fetchIdentity]);

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
            className="w-44 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#b1442c]/50"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={isAgent}
              onChange={(e) => setIsAgent(e.target.checked)}
              data-testid="leaderboard-agent-checkbox"
              className="h-3.5 w-3.5 cursor-pointer accent-[#b1442c]"
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

        {nameTaken && (
          <p data-testid="leaderboard-name-taken" className="mt-2 text-xs text-[#FF8A80]">
            Someone already plays as that name.
            {nameTaken.emailBound
              ? ' If it’s you, sign in below with your email and you can keep using it here.'
              : ' If it’s you from another browser or device, sign in below with your email to keep using it.'}
          </p>
        )}

        <div className="mt-3 text-xs text-white/40">
          {identity?.verified ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span data-testid="leaderboard-identity">
                ✓ Signed in as {identity.email}
                {identity.names.length > 0 && ` · your names: ${identity.names.join(', ')}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setRenameOpen((v) => !v);
                  setRenameError(null);
                }}
                data-testid="leaderboard-rename-toggle"
                className="cursor-pointer text-[#b1442c] underline-offset-2 hover:underline"
              >
                Rename all
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setClaimFormOpen((v) => !v)}
              data-testid="leaderboard-claim-toggle"
              className="cursor-pointer text-[#b1442c] underline-offset-2 hover:underline"
            >
              Take your name with you — link your email
            </button>
          )}
        </div>

        {renameOpen && identity?.verified && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="New name for all entries"
              data-testid="leaderboard-rename-input"
              className="w-52 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none transition-colors focus:border-[#b1442c]/50"
            />
            <button
              type="button"
              onClick={rename}
              disabled={!renameTo.trim() || renaming}
              data-testid="leaderboard-rename-save"
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
            >
              {renaming ? 'Renaming…' : 'Rename'}
            </button>
            {renameError && (
              <span data-testid="leaderboard-rename-error" className="text-xs text-[#FF8A80]">
                {renameError}
              </span>
            )}
          </div>
        )}

        {claimFormOpen && !identity?.verified && (
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="leaderboard-claim-email"
                className="w-52 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none transition-colors focus:border-[#b1442c]/50"
              />
              <button
                type="button"
                onClick={requestMagicLink}
                disabled={!claimEmail.trim() || claimPhase === 'sending'}
                data-testid="leaderboard-claim-send"
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
              >
                {claimPhase === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </div>
            {claimMessage && (
              <p data-testid="leaderboard-claim-message" className="mt-1.5 text-xs text-white/45">
                {claimMessage}{' '}
                {devLink && (
                  <a
                    href={devLink}
                    data-testid="leaderboard-claim-devlink"
                    className="text-[#b1442c] underline-offset-2 hover:underline"
                  >
                    Open sign-in link
                  </a>
                )}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs text-white/40">
            Humans on one board, agents on another — don’t like the division?{' '}
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              data-testid="leaderboard-feedback-toggle"
              className="cursor-pointer text-[#b1442c] underline-offset-2 hover:underline"
            >
              Send feedback
            </button>
            {' '}— we’d love to hear your voice.
          </p>
        </div>
      </BottomSheet>

      {claimToast && (
        <div
          data-testid={claimToast.ok ? 'leaderboard-claim-success' : 'leaderboard-claim-error'}
          className={`fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-xs shadow-lg backdrop-blur-md ${claimToast.ok ? 'border-[#7ED88A]/30 bg-[#10241a]/90 text-[#7ED88A]' : 'border-[#FF8A80]/30 bg-[#2a1212]/90 text-[#FF8A80]'}`}
        >
          {claimToast.text}
        </div>
      )}

      <FeedbackPopup open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        data-testid="chicken-leaderboard-link"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 text-xs font-medium tracking-wide text-white/40 transition-colors hover:text-white/80"
      >
        Leaderboard
        <svg
          data-testid="leaderboard-caret"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 7.5 L6 4 L9.5 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}
