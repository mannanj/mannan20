'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/app-context';
import { CONTACT_DATA } from '../contact-modal';
import type { LLMValidationResult } from '@/lib/types';

const VALIDATION_DEBOUNCE_MS = 1100;
const FEEDBACK_MAX = 2000;
const VALIDATION_PLACEHOLDER = "Validation: please enter your name, email, and/or why you're here";
const FAIL_TEXT = "Include your name, email, or why you're here.";
const PARTIAL_TEXT = 'Keep going…';

type Stage = 'compose' | 'validate';
type SendPhase = 'idle' | 'sending' | 'sent';
type ValStatus = 'idle' | 'checking' | 'fail' | 'partial' | 'ok';

interface FeedbackPopupProps {
  open: boolean;
  onClose: () => void;
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FeedbackPopup({ open, onClose }: FeedbackPopupProps) {
  const { state, setContactResult } = useApp();
  const [feedback, setFeedback] = useState('');
  const [stage, setStage] = useState<Stage>('compose');
  const [visited, setVisited] = useState(false);
  const [sendPhase, setSendPhase] = useState<SendPhase>('idle');
  const [valText, setValText] = useState('');
  const [valStatus, setValStatus] = useState<ValStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setFeedback('');
    setStage('compose');
    setVisited(false);
    setSendPhase('idle');
    setValText('');
    setValStatus('idle');
    setError(null);
    sentRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const doSend = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSendPhase('sending');
    setError(null);
    try {
      const res = await fetch('/api/game/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedback.trim() }),
      });
      if (!res.ok) throw new Error();
      setSendPhase('sent');
    } catch {
      sentRef.current = false;
      setSendPhase('idle');
      setError('Could not send feedback. Try again.');
    }
  }, [feedback]);

  const runValidation = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setValStatus('checking');
      try {
        const res = await fetch('/api/validate-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok) {
          setValStatus('fail');
          return;
        }
        const result = (await res.json()) as LLMValidationResult;
        const found = result.name?.found || result.email?.found || result.reason?.found;
        const partial = result.name?.partial || result.email?.partial || result.reason?.partial;
        if (found) {
          setValStatus('ok');
          setContactResult(CONTACT_DATA);
          setStage('compose');
          void doSend();
        } else {
          setValStatus(partial ? 'partial' : 'fail');
        }
      } catch {
        setValStatus('fail');
      }
    },
    [setContactResult, doSend]
  );

  const onValChange = useCallback(
    (text: string) => {
      setValText(text);
      setValStatus('idle');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void runValidation(text), VALIDATION_DEBOUNCE_MS);
    },
    [runValidation]
  );

  const onSendClick = useCallback(() => {
    if (sendPhase !== 'idle' || !feedback.trim()) return;
    if (state.contactRevealed) {
      void doSend();
    } else {
      setVisited(true);
      setStage('validate');
    }
  }, [sendPhase, feedback, state.contactRevealed, doSend]);

  if (!open) return null;

  const validationStatusText =
    valStatus === 'checking'
      ? 'Checking…'
      : valStatus === 'partial'
        ? PARTIAL_TEXT
        : valStatus === 'fail'
          ? FAIL_TEXT
          : valStatus === 'ok'
            ? 'Validated ✓'
            : '';

  return (
    <div
      data-testid="feedback-popup"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,460px)] rounded-xl border border-white/10 bg-[#141416] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] animate-[feedbackPopIn_0.22s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-white/90">Send feedback</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="feedback-close"
            className="cursor-pointer text-white/40 transition-colors hover:text-white/80"
          >
            &times;
          </button>
        </div>

        {sendPhase === 'sent' ? (
          <p
            data-testid="feedback-received"
            className="mt-5 mb-2 text-center text-sm text-[#7ED88A]"
          >
            Feedback received.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-hidden">
              <div
                data-testid="feedback-slider"
                data-stage={stage}
                className="flex w-[200%] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0.33,1)]"
                style={{ transform: stage === 'validate' ? 'translateX(-50%)' : 'translateX(0)' }}
              >
                <div className="relative w-1/2 pr-1">
                  <input
                    type="text"
                    value={feedback}
                    maxLength={FEEDBACK_MAX}
                    onChange={(e) => setFeedback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSendClick();
                    }}
                    placeholder="Your feedback…"
                    data-testid="feedback-input"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-3 pr-9 text-sm text-white outline-none transition-colors focus:border-[#b1442c]/50"
                  />
                  {visited && (
                    <button
                      type="button"
                      onClick={() => setStage('validate')}
                      aria-label="To validation"
                      data-testid="feedback-arrow-right"
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/25 transition-colors hover:text-white/70"
                    >
                      →
                    </button>
                  )}
                </div>
                <div className="relative w-1/2 pl-1">
                  {visited && (
                    <>
                      <button
                        type="button"
                        onClick={() => setStage('compose')}
                        aria-label="Back to your feedback"
                        data-testid="feedback-arrow-left"
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-white/40 transition-colors hover:text-white/80"
                      >
                        ←
                      </button>
                      <input
                        type="text"
                        value={valText}
                        onChange={(e) => onValChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            void runValidation(valText);
                          }
                        }}
                        placeholder={VALIDATION_PLACEHOLDER}
                        data-testid="feedback-validation-input"
                        className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-[#b1442c]/50"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {stage === 'validate' && validationStatusText && (
              <p
                data-testid="feedback-validation-status"
                className={`mt-2 text-xs ${valStatus === 'ok' ? 'text-[#7ED88A]' : 'text-white/45'}`}
              >
                {validationStatusText}
              </p>
            )}
            {error && (
              <p data-testid="feedback-error" className="mt-2 text-xs text-[#FF8A80]">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onSendClick}
                disabled={sendPhase !== 'idle' || !feedback.trim()}
                data-testid="feedback-send"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
              >
                {sendPhase === 'sending' && <Spinner />}
                {sendPhase === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
