'use client';

import { useCallback, useRef, useState } from 'react';
import type { ContactIntentResult } from '@/lib/types';

const PLACEHOLDER = "Why are you here? Your name? (optional)";
const DEBOUNCE_MS = 1200;
const MAX_PENDING_MS = 3000;
const MAX_INPUT_LENGTH = 1000;
const ERROR_TEXT = "Couldn't send that — no worries, I still have your info above.";

type Status = 'idle' | 'sending' | 'done' | 'error';

export function ContactIntentForm() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightTextRef = useRef<string | null>(null);
  const latestTextRef = useRef('');
  const isComposingRef = useRef(false);
  const pendingSinceRef = useRef<number | null>(null);

  const submit = useCallback(async (value: string) => {
    if (inFlightTextRef.current === value) return;
    inFlightTextRef.current = value;
    pendingSinceRef.current = null;
    setStatus('sending');

    try {
      const res = await fetch('/api/contact-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value }),
      });

      if (value !== latestTextRef.current) return;

      if (!res.ok) {
        setStatus('error');
        return;
      }

      const result: ContactIntentResult = await res.json();
      if (value !== latestTextRef.current) return;

      if (result.message) {
        setMessage(result.message);
        setStatus('done');
      } else {
        setStatus('idle');
      }
    } catch {
      if (value === latestTextRef.current) setStatus('error');
    } finally {
      if (inFlightTextRef.current === value) inFlightTextRef.current = null;
    }
  }, []);

  const scheduleSubmit = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
    const elapsed = Date.now() - pendingSinceRef.current;
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, MAX_PENDING_MS - elapsed));
    debounceRef.current = setTimeout(() => submit(value), wait);
  }, [submit]);

  const processValue = useCallback((value: string) => {
    latestTextRef.current = value;
    setText(value);
    setMessage('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      pendingSinceRef.current = null;
      setStatus('idle');
      return;
    }

    setStatus('idle');
    scheduleSubmit(value);
  }, [scheduleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) {
      setText(e.target.value);
      return;
    }
    processValue(e.target.value);
  }, [processValue]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    processValue(e.currentTarget.value);
  }, [processValue]);

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <textarea
        data-testid="contact-intent-textarea"
        value={text}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        maxLength={MAX_INPUT_LENGTH}
        rows={3}
        placeholder={PLACEHOLDER}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          fontSize: '13px',
          color: 'white',
          background: 'rgba(0,0,0,0.3)',
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      <span data-testid="contact-intent-status" data-status={status} style={{ display: 'none' }} />
      {status === 'done' && message && (
        <p data-testid="contact-intent-message" style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'rgba(74,222,128,0.8)' }}>
          {message}
        </p>
      )}
      {status === 'error' && (
        <p data-testid="contact-intent-message" style={{ margin: 0, fontSize: '11px', color: 'rgba(239,68,68,0.6)' }}>
          {ERROR_TEXT}
        </p>
      )}
      <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>
        Optional — I will never send you unsolicited communication.
      </p>
    </div>
  );
}
