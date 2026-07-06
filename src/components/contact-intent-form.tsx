'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContactIntentResult, ContactIntentTurn } from '@/lib/types';

const PLACEHOLDER = "Your name, and/or why you're here";
const DEBOUNCE_MS = 900;
const MAX_PENDING_MS = 3000;
const MAX_INPUT_LENGTH = 1000;
const TURN_CAP = 3;
const HISTORY_MAX_HEIGHT = 168;
const SPINNER_INTERVAL_MS = 80;
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const ERROR_TEXT = "Couldn't send that — no worries, I still have your info above.";
const MONO_FONT = 'ui-monospace, "SF Mono", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';
const PROMPT_COLOR = 'rgba(76, 194, 241, 0.9)';

type Status = 'idle' | 'sending' | 'error';

export function ContactIntentForm() {
  const [turns, setTurns] = useState<ContactIntentTurn[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [spinnerFrame, setSpinnerFrame] = useState(SPINNER_FRAMES[0]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSinceRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  const capped = turns.length >= TURN_CAP;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [text, resize]);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, pendingText]);

  useEffect(() => {
    if (status !== 'sending') return;
    let frame = 0;
    setSpinnerFrame(SPINNER_FRAMES[0]);
    const id = setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length;
      setSpinnerFrame(SPINNER_FRAMES[frame]);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === 'idle' && !capped && turns.length > 0) {
      textareaRef.current?.focus();
    }
  }, [turns.length, status, capped]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const send = useCallback(async (value: string) => {
    pendingSinceRef.current = null;
    setPendingText(value);
    setText('');
    setStatus('sending');

    const history = turns.flatMap(t => [
      { role: 'user' as const, content: t.userText },
      { role: 'assistant' as const, content: t.aiReply },
    ]);

    try {
      const res = await fetch('/api/contact-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, history }),
      });

      if (!res.ok) {
        setText(value);
        setPendingText(null);
        setStatus('error');
        return;
      }

      const result: ContactIntentResult = await res.json();
      setPendingText(null);

      if (!result.message) {
        setStatus('idle');
        return;
      }

      setTurns(prev => [...prev, { userText: value, aiReply: result.message }]);
      setStatus('idle');
    } catch {
      setText(value);
      setPendingText(null);
      setStatus('error');
    }
  }, [turns]);

  const scheduleSend = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
    const elapsed = Date.now() - pendingSinceRef.current;
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, MAX_PENDING_MS - elapsed));
    timerRef.current = setTimeout(() => send(value), wait);
  }, [send]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (isComposingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim()) {
      scheduleSend(value);
    } else {
      pendingSinceRef.current = null;
    }
  }, [scheduleSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    const value = text.trim();
    if (value) send(value);
  }, [text, send]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    const value = e.currentTarget.value;
    setText(value);
    if (value.trim()) {
      scheduleSend(value);
    } else {
      pendingSinceRef.current = null;
    }
  }, [scheduleSend]);

  const showHistory = turns.length > 0 || pendingText !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          background: 'rgba(0,0,0,0.3)',
          padding: '10px 12px',
          boxSizing: 'border-box',
          fontFamily: MONO_FONT,
        }}
      >
        {showHistory && (
          <div
            ref={historyRef}
            data-testid="contact-intent-history"
            aria-live="polite"
            style={{ maxHeight: HISTORY_MAX_HEIGHT, overflowY: 'auto', marginBottom: '8px' }}
          >
            {turns.map((turn, i) => (
              <div key={i} data-testid="contact-intent-turn">
                <p
                  data-testid="contact-intent-turn-user"
                  style={{
                    margin: '0 0 4px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.82)',
                    paddingLeft: '1.3em',
                    textIndent: '-1.3em',
                    wordBreak: 'break-word',
                  }}
                >
                  <span aria-hidden="true" style={{ color: PROMPT_COLOR, fontWeight: 600 }}>{'>'}</span> {turn.userText}
                </p>
                <p
                  data-testid="contact-intent-turn-ai"
                  style={{
                    margin: '0 0 12px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'rgba(74,222,128,0.8)',
                    wordBreak: 'break-word',
                  }}
                >
                  {turn.aiReply}
                </p>
              </div>
            ))}
            {pendingText !== null && (
              <p
                data-testid="contact-intent-turn-pending"
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.82)',
                  paddingLeft: '1.3em',
                  textIndent: '-1.3em',
                  wordBreak: 'break-word',
                }}
              >
                <span aria-hidden="true" style={{ color: PROMPT_COLOR, fontWeight: 600 }}>{'>'}</span> {pendingText}
              </p>
            )}
          </div>
        )}

        {!capped && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span
              aria-hidden="true"
              style={{ flexShrink: 0, lineHeight: 1.6, fontSize: '13px', paddingTop: '1px', color: PROMPT_COLOR, fontWeight: 600 }}
            >
              {'>'}
            </span>
            <textarea
              ref={textareaRef}
              data-testid="contact-intent-textarea"
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              disabled={status === 'sending'}
              maxLength={MAX_INPUT_LENGTH}
              rows={3}
              placeholder={turns.length === 0 && pendingText === null ? PLACEHOLDER : ''}
              style={{
                flex: 1,
                minWidth: 0,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'white',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                padding: 0,
                display: 'block',
                overflow: 'hidden',
              }}
            />
          </div>
        )}

        {status === 'sending' && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '10px',
              color: PROMPT_COLOR,
              fontSize: '13px',
              fontFamily: MONO_FONT,
            }}
          >
            {spinnerFrame}
          </span>
        )}
      </div>
      <span data-testid="contact-intent-status" data-status={status} style={{ display: 'none' }} />
      {status === 'error' && (
        <p data-testid="contact-intent-error" style={{ margin: 0, fontSize: '11px', color: 'rgba(239,68,68,0.6)' }}>
          {ERROR_TEXT}
        </p>
      )}
    </div>
  );
}
