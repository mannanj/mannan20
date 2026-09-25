'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../modal';
import { TerminalChat, type TerminalChatHistoryEntry } from '../chat/terminal-chat';

const PLACEHOLDER = 'Where are you coming from?';
const TURN_CAP = 3;
const ERROR_TEXT = "Couldn't check that just now — give it another go in a moment.";
const DOWNLOAD_URL = '/api/transcripts/download';
const ALREADY_UNLOCKED_MESSAGE = 'Still unlocked from earlier — help yourself.';

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

export function TranscriptsGate() {
  const [open, setOpen] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const unlocked = unlockMessage !== null;

  useEffect(() => {
    if (!open || unlocked) return;
    let cancelled = false;
    fetch('/api/transcripts/verify')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VerifyResponse | null) => {
        if (!cancelled && data?.unlocked === true) setUnlockMessage(ALREADY_UNLOCKED_MESSAGE);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, unlocked]);

  const send = useCallback(async (value: string, _history: TerminalChatHistoryEntry[]) => {
    const res = await fetch('/api/transcripts/verify', {
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

    if (data.unlocked === true) setUnlockMessage(data.message);

    return { message: data.message };
  }, []);

  return (
    <>
      <button
        type="button"
        data-testid="transcripts-download-button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-mono text-xs text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
      >
        <ChatIcon className="h-3.5 w-3.5" />
        Download
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} maxWidthClassName="max-w-[460px]">
        <div data-testid="transcripts-gate-modal" className="w-[min(400px,80vw)]">
          <h2 className="pr-6 text-base font-medium text-white">Session transcripts</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">
            Mannan made these available for select people. Tell me who I&apos;m talking to.
          </p>

          {!unlocked && (
            <div className="mt-4">
              <TerminalChat
                placeholder={PLACEHOLDER}
                turnCap={TURN_CAP}
                errorText={ERROR_TEXT}
                send={send}
                testIdPrefix="transcript-gate"
                footer={
                  <span data-testid="transcript-gate-hints">
                    hint: say where you work · hint: say who you are
                  </span>
                }
              />
            </div>
          )}

          {unlocked && (
            <p data-testid="transcript-gate-unlocked-note" className="mt-4 font-mono text-[13px] leading-relaxed text-green-400/80">
              {unlockMessage}
            </p>
          )}

          {unlocked && (
            <a
              data-testid="transcripts-download-link"
              href={DOWNLOAD_URL}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none">
                <path d="M8 2v8m0 0L5 7m3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download transcripts.zip
            </a>
          )}
        </div>
      </Modal>
    </>
  );
}
