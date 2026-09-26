'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export const MONO_FONT = 'ui-monospace, "SF Mono", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';
export const PROMPT_COLOR = 'rgba(76, 194, 241, 0.9)';

const INACTIVITY_DELAY_MS = 2000;
const MAX_INPUT_LENGTH = 1000;
const HISTORY_MAX_HEIGHT = 168;
const SPINNER_INTERVAL_MS = 80;
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export type TerminalChatStatus = 'idle' | 'sending' | 'error';

export interface TerminalChatTurn {
  userText: string;
  aiReply: string;
}

export interface TerminalChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface TerminalChatProps {
  placeholder: string;
  turnCap: number;
  errorText: string;
  send: (value: string, history: TerminalChatHistoryEntry[]) => Promise<{ message: string }>;
  testIdPrefix: string;
  footer?: ReactNode;
  inactivityDelayMs?: number;
}

export function TerminalChat({
  placeholder,
  turnCap,
  errorText,
  send,
  testIdPrefix,
  footer,
  inactivityDelayMs = INACTIVITY_DELAY_MS,
}: TerminalChatProps) {
  const [turns, setTurns] = useState<TerminalChatTurn[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<TerminalChatStatus>('idle');
  const [spinnerFrame, setSpinnerFrame] = useState(SPINNER_FRAMES[0]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);

  const capped = turns.length >= turnCap;

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

  const doSend = useCallback(async (value: string) => {
    setPendingText(value);
    setText('');
    setStatus('sending');

    const history = turns.flatMap((t) => [
      { role: 'user' as const, content: t.userText },
      { role: 'assistant' as const, content: t.aiReply },
    ]);

    try {
      const result = await send(value, history);
      setPendingText(null);

      if (!result.message) {
        setStatus('idle');
        return;
      }

      setTurns((prev) => [...prev, { userText: value, aiReply: result.message }]);
      setStatus('idle');
    } catch {
      setText(value);
      setPendingText(null);
      setStatus('error');
    }
  }, [turns, send]);

  const scheduleSend = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSend(value), inactivityDelayMs);
  }, [doSend, inactivityDelayMs]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (isComposingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim()) {
      scheduleSend(value);
    }
  }, [scheduleSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    const value = text.trim();
    if (value) doSend(value);
  }, [text, doSend]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    const value = e.currentTarget.value;
    setText(value);
    if (value.trim()) {
      scheduleSend(value);
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
            data-testid={`${testIdPrefix}-history`}
            aria-live="polite"
            style={{ maxHeight: HISTORY_MAX_HEIGHT, overflowY: 'auto', marginBottom: '8px' }}
          >
            {turns.map((turn, i) => (
              <div key={i} data-testid={`${testIdPrefix}-turn`}>
                <p
                  data-testid={`${testIdPrefix}-turn-user`}
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
                  data-testid={`${testIdPrefix}-turn-ai`}
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
                data-testid={`${testIdPrefix}-turn-pending`}
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
              data-testid={`${testIdPrefix}-textarea`}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              disabled={status === 'sending'}
              maxLength={MAX_INPUT_LENGTH}
              rows={3}
              placeholder={turns.length === 0 && pendingText === null ? placeholder : ''}
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

        {footer && (
          <div
            data-testid={`${testIdPrefix}-footer`}
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              fontSize: '11px',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {footer}
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
      <span data-testid={`${testIdPrefix}-status`} data-status={status} style={{ display: 'none' }} />
      {status === 'error' && (
        <p data-testid={`${testIdPrefix}-error`} style={{ margin: 0, fontSize: '11px', color: 'rgba(239,68,68,0.6)' }}>
          {errorText}
        </p>
      )}
    </div>
  );
}
