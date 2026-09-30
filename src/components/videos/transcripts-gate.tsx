'use client';

import { useCallback, useEffect, useState } from 'react';
import { DraggablePopout, POPOUT_WIDTH } from '../draggable-popout';
import { TerminalChat, type TerminalChatHistoryEntry } from '../chat/terminal-chat';
import { TurnstileCheck } from '../turnstile-check';

const PLACEHOLDER = 'Where are you coming from?';
const TURN_CAP = 3;
const ERROR_TEXT = "Couldn't check that just now — give it another go in a moment.";
const SUN_NOTE = 'Mannan made these available for select people';
const SUN_HINTS = ['hint: say where you work', 'hint: say who you are'];
const POPOUT_GAP = 12;
const CLOSE_CLEARANCE = 24;

interface VerifyResponse {
  message?: unknown;
  unlocked?: unknown;
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="none">
      <path
        d="M14 9.5A1.5 1.5 0 0 1 12.5 11H5.7L3 13.2V4.5A1.5 1.5 0 0 1 4.5 3h8A1.5 1.5 0 0 1 14 4.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function withFilm(path: string, film?: string) {
  return film ? `${path}?film=${encodeURIComponent(film)}` : path;
}

export function TranscriptsGate({
  film,
  note = SUN_NOTE,
  hints = SUN_HINTS,
}: {
  film?: string;
  note?: string;
  hints?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [verified, setVerified] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!open || unlocked) return;
    let cancelled = false;
    fetch(withFilm('/api/transcripts/verify', film))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VerifyResponse | null) => {
        if (!cancelled && data?.unlocked === true) setUnlocked(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, unlocked, film]);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.right - POPOUT_WIDTH, y: rect.bottom + POPOUT_GAP });
    setOpen(true);
  }, []);

  const send = useCallback(async (value: string, _history: TerminalChatHistoryEntry[]) => {
    const res = await fetch(withFilm('/api/transcripts/verify', film), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: value }),
    });

    let data: VerifyResponse;
    try {
      data = await res.json();
    } catch {
      throw new Error('transcripts verify returned a non-JSON response');
    }

    if (typeof data.message !== 'string') {
      throw new Error('transcripts verify returned no message');
    }

    if (data.unlocked === true) setUnlocked(true);

    return { message: data.message };
  }, [film]);

  return (
    <>
      <button
        type="button"
        data-testid="transcripts-download-button"
        onClick={handleOpen}
        className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-mono text-xs text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
      >
        Download Transcripts
        <ChatIcon className="h-3.5 w-3.5" />
      </button>

      <DraggablePopout
        isOpen={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        testId="transcripts-gate-modal"
        backdropTestId="transcripts-gate-backdrop"
        closeTestId="transcripts-gate-close"
      >
        {unlocked ? (
          <a
            data-testid="transcripts-download-link"
            href={withFilm('/api/transcripts/download', film)}
            style={{ marginTop: CLOSE_CLEARANCE }}
            className="mx-1 mb-1 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none">
              <path d="M8 2v8m0 0L5 7m3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {film ? 'Download transcript.zip' : 'Download transcripts.zip'}
          </a>
        ) : !verified ? (
          <TurnstileCheck onPass={() => setVerified(true)} testIdPrefix="transcripts-gate-turnstile" />
        ) : (
          <div style={{ paddingTop: CLOSE_CLEARANCE }}>
          <TerminalChat
            placeholder={PLACEHOLDER}
            turnCap={TURN_CAP}
            errorText={ERROR_TEXT}
            send={send}
            testIdPrefix="transcript-gate"
            footer={
              <span data-testid="transcript-gate-hints" style={{ display: 'block' }}>
                <span style={{ display: 'block' }}>{note}</span>
                {hints.map((hint) => (
                  <span key={hint} style={{ display: 'block' }}>
                    {hint}
                  </span>
                ))}
              </span>
            }
          />
          </div>
        )}
      </DraggablePopout>
    </>
  );
}
