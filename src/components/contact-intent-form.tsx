'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTurnstile } from '@/hooks/use-turnstile';
import {
  MAX_MODEL_TEXT_LENGTH,
  MAX_STREAM_BUFFER_BYTES,
  parseFrame,
} from '@/lib/contact-intent-logic';
import type { ContactIntentTurn, ContactStreamFrame } from '@/lib/types';

const PLACEHOLDER = 'What could we explore together?\nA project, role, collaboration, idea, invitation, introduction, reconnection, or something else.';
const AI_DISCLOSURE = "AI interpretation: your text is sent to DeepSeek through OpenRouter. Don't include confidential information.";
const CALLBACK_DISCLOSURE = 'This sends your contact details, reason, and this short conversation to Mannan.';
const DEBOUNCE_MS = 900;
const MAX_PENDING_MS = 3000;
const MAX_INPUT_LENGTH = 1000;
const TURN_CAP = 3;
const HISTORY_MAX_HEIGHT = 168;
const SPINNER_INTERVAL_MS = 80;
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const MONO_FONT = 'ui-monospace, "SF Mono", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';
const PROMPT_COLOR = 'rgba(76, 194, 241, 0.9)';
const ERROR_TEXT = "Couldn't interpret that just now.";

type IntentStatus =
  | 'editing'
  | 'interpreting'
  | 'reflecting'
  | 'ready'
  | 'interpretation_error'
  | 'callback_editing'
  | 'callback_sending'
  | 'callback_sent'
  | 'callback_error';

function characterLength(value: string): number {
  return [...value].length;
}

function countQuestions(value: string): number {
  return [...value].filter((character) => character === '?').length;
}

function modelThankYou(value: string): boolean {
  return /^\s*(?:thanks|thank you)\b/i.test(value);
}

interface CallbackRequestFormProps {
  status: IntentStatus;
  transcript: ContactIntentTurn[];
  initialReason: string;
  onStatusChange: (status: IntentStatus) => void;
  announce: (message: string) => void;
}

function CallbackRequestForm({
  status,
  transcript,
  initialReason,
  onStatusChange,
  announce,
}: CallbackRequestFormProps) {
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState(initialReason);
  const [contactError, setContactError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const { token, reset, containerRef } = useTurnstile('contact-request');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const validate = useCallback(() => {
    const normalizedContact = contact.trim();
    const normalizedReason = reason.trim();
    const nextContactError = characterLength(normalizedContact) < 3 || characterLength(normalizedContact) > 254
      ? 'Enter a contact method between 3 and 254 characters.'
      : null;
    const nextReasonError = characterLength(normalizedReason) < 10 || characterLength(normalizedReason) > 1000
      ? 'Enter a reason between 10 and 1000 characters.'
      : null;
    setContactError(nextContactError);
    setReasonError(nextReasonError);
    if (nextContactError || nextReasonError) {
      window.requestAnimationFrame(() => {
        if (nextContactError) contactRef.current?.focus();
        else reasonRef.current?.focus();
      });
      return null;
    }
    return { contact: normalizedContact, reason: normalizedReason };
  }, [contact, reason]);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'callback_sending' || status === 'callback_sent') return;
    const fields = validate();
    if (!fields || !token) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setSubmissionError(null);
    onStatusChange('callback_sending');
    announce('Submitting callback request.');

    try {
      const response = await fetch('/api/contact-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, transcript, turnstileToken: token }),
        signal: controller.signal,
      });
      if (!mountedRef.current || controllerRef.current !== controller) return;

      if (response.status === 403) {
        reset();
        setSubmissionError('Human verification expired. Please verify again.');
        onStatusChange('callback_editing');
        announce('Human verification expired. Please verify again.');
        return;
      }
      if (!response.ok) throw new Error('callback request failed');

      onStatusChange('callback_sent');
      announce('Submitted for delivery to Mannan.');
    } catch (error) {
      if (!mountedRef.current || controllerRef.current !== controller || (error instanceof DOMException && error.name === 'AbortError')) return;
      setSubmissionError("Couldn't submit this. You can retry or contact Mannan directly above.");
      onStatusChange('callback_error');
      announce("Couldn't submit this. You can retry or contact Mannan directly above.");
    }
  }, [announce, onStatusChange, reset, status, token, transcript, validate]);

  if (status === 'callback_sent') {
    return <p data-testid="contact-callback-success" style={{ margin: '2px 0 0', color: 'rgba(74,222,128,0.85)', fontSize: '12px' }}>Submitted for delivery to Mannan.</p>;
  }

  const sending = status === 'callback_sending';
  const contactDescription = contactError ? 'callback-contact-error' : undefined;
  const reasonDescription = reasonError ? 'callback-reason-error' : undefined;

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
      <label htmlFor="callback-contact" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>Contact</label>
      <input
        id="callback-contact"
        ref={contactRef}
        value={contact}
        onChange={(event) => { setContact(event.target.value); setContactError(null); setSubmissionError(null); }}
        aria-describedby={contactDescription}
        aria-invalid={Boolean(contactError)}
        maxLength={254}
        disabled={sending}
        style={fieldStyle}
      />
      {contactError && <p id="callback-contact-error" role="alert" style={errorStyle}>{contactError}</p>}

      <label htmlFor="callback-reason" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>Reason</label>
      <textarea
        id="callback-reason"
        ref={reasonRef}
        value={reason}
        onChange={(event) => { setReason(event.target.value); setReasonError(null); setSubmissionError(null); }}
        aria-describedby={reasonDescription}
        aria-invalid={Boolean(reasonError)}
        maxLength={1000}
        rows={3}
        disabled={sending}
        style={{ ...fieldStyle, resize: 'vertical', minHeight: '58px' }}
      />
      {reasonError && <p id="callback-reason-error" role="alert" style={errorStyle}>{reasonError}</p>}

      <p style={{ margin: '2px 0', fontSize: '11px', lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>{CALLBACK_DISCLOSURE}</p>
      <div ref={containerRef} data-testid="contact-callback-turnstile" style={{ minHeight: '1px' }} />
      {submissionError && <p data-testid="contact-callback-error" style={errorStyle}>{submissionError}</p>}
      <button type="submit" disabled={sending || !token} style={buttonStyle(sending || !token)}>
        {sending ? 'Sending…' : 'Send to Mannan'}
      </button>
    </form>
  );
}

const fieldStyle: React.CSSProperties = {
  boxSizing: 'border-box', width: '100%', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px',
  background: 'rgba(0,0,0,0.25)', color: 'white', fontFamily: MONO_FONT, fontSize: '12px', padding: '7px 8px',
};
const errorStyle: React.CSSProperties = { margin: 0, color: 'rgba(248,113,113,0.9)', fontSize: '11px', lineHeight: 1.4 };
const buttonStyle = (disabled = false): React.CSSProperties => ({
  alignSelf: 'flex-start', border: '1px solid rgba(76,194,241,0.55)', borderRadius: '6px', background: 'rgba(76,194,241,0.12)',
  color: disabled ? 'rgba(255,255,255,0.35)' : 'rgba(206,240,255,0.96)', cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: MONO_FONT, fontSize: '12px', padding: '6px 9px',
});

interface ContactIntentFormProps {
  onContactDirectly?: () => void;
}

export function ContactIntentForm({ onContactDirectly }: ContactIntentFormProps) {
  const [turns, setTurns] = useState<ContactIntentTurn[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [streamText, setStreamText] = useState('');
  const [incompleteReflection, setIncompleteReflection] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<IntentStatus>('editing');
  const [spinnerFrame, setSpinnerFrame] = useState(SPINNER_FRAMES[0]);
  const [liveMessage, setLiveMessage] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSinceRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const turnsRef = useRef<ContactIntentTurn[]>([]);
  const interpretationControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const capped = turns.length >= TURN_CAP;
  const interactionLocked = status === 'interpreting' || status === 'reflecting' || status.startsWith('callback_');
  const hasVisibleQuestion = turns.some((turn) => turn.aiReply.includes('?'));
  const showChoices = turns.length > 0 || pendingText !== null;

  useEffect(() => { turnsRef.current = turns; }, [turns]);

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => { resize(); }, [text, resize]);
  useEffect(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight; }, [turns, pendingText, streamText, incompleteReflection]);

  useEffect(() => {
    if (status !== 'interpreting') return;
    let frame = 0;
    setSpinnerFrame(SPINNER_FRAMES[0]);
    const id = setInterval(() => { frame = (frame + 1) % SPINNER_FRAMES.length; setSpinnerFrame(SPINNER_FRAMES[frame]); }, SPINNER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if ((status === 'editing' || status === 'ready') && !capped && !pendingText) textareaRef.current?.focus();
  }, [capped, pendingText, status, turns.length]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      interpretationControllerRef.current?.abort();
    };
  }, []);

  const announce = useCallback((message: string) => setLiveMessage(message), []);

  const interpret = useCallback(async (value: string) => {
    if (!value.trim() || !mountedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingSinceRef.current = null;
    interpretationControllerRef.current?.abort();
    const controller = new AbortController();
    interpretationControllerRef.current = controller;
    const history = turnsRef.current.flatMap((turn) => [
      { role: 'user' as const, content: turn.userText },
      { role: 'assistant' as const, content: turn.aiReply },
    ]);

    setPendingText(value);
    setText('');
    setStreamText('');
    setIncompleteReflection(false);
    setStatus('interpreting');
    announce('Looking for possible overlap.');

    let displayed = '';
    const fail = () => {
      if (!mountedRef.current || interpretationControllerRef.current !== controller) return;
      setIncompleteReflection(Boolean(displayed));
      setStatus('interpretation_error');
      announce(ERROR_TEXT);
    };

    try {
      const response = await fetch('/api/contact-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value.trim(), history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('interpretation unavailable');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      let metaSeen = false;
      let terminal = false;
      let completed = false;
      let responseQuestions = 0;

      const accept = (frame: ContactStreamFrame) => {
        if (terminal) throw new Error('trailing stream frame');
        if (frame.type === 'meta') {
          if (metaSeen) throw new Error('duplicate metadata');
          metaSeen = true;
          return;
        }
        if (!metaSeen) throw new Error('metadata must be first');
        if (frame.type === 'text') {
          if (characterLength(displayed) + characterLength(frame.value) > MAX_MODEL_TEXT_LENGTH) throw new Error('response too long');
          responseQuestions += countQuestions(frame.value);
          if ((hasVisibleQuestion && frame.value.includes('?')) || responseQuestions > 1) throw new Error('question rule');
          displayed += frame.value;
          if (modelThankYou(displayed)) throw new Error('model thank you');
          if (mountedRef.current && interpretationControllerRef.current === controller) {
            setStreamText(displayed);
            setStatus('reflecting');
          }
          return;
        }
        terminal = true;
        if (frame.type === 'error') throw new Error('upstream error');
        completed = true;
      };

      const consumeLines = () => {
        let newline = buffer.indexOf('\n');
        while (newline !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          const parsed = parseFrame(`${line}\n`);
          if (!parsed) throw new Error('invalid stream frame');
          accept(parsed);
          newline = buffer.indexOf('\n');
        }
        if (encoder.encode(buffer).byteLength > MAX_STREAM_BUFFER_BYTES) throw new Error('stream buffer too large');
      };

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        consumeLines();
      }
      buffer += decoder.decode();
      consumeLines();
      if (buffer || !metaSeen || !completed || !terminal) throw new Error('incomplete stream');
      if (!mountedRef.current || interpretationControllerRef.current !== controller) return;

      if (displayed) {
        setTurns((previous) => [...previous, { userText: value, aiReply: displayed }].slice(0, TURN_CAP));
        setPendingText(null);
      } else {
        // A valid but empty completion is not a completed assistant turn, but
        // the visitor's locked input remains visible for the explicit choices.
        setPendingText(value);
      }
      setStreamText('');
      setIncompleteReflection(false);
      setStatus('ready');
      announce(displayed ? 'Interpretation complete.' : 'No interpretation returned.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      fail();
    }
  }, [announce, hasVisibleQuestion]);

  const scheduleInterpret = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
    const elapsed = Date.now() - pendingSinceRef.current;
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, MAX_PENDING_MS - elapsed));
    timerRef.current = setTimeout(() => { void interpret(value); }, wait);
  }, [interpret]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setText(value);
    setStatus('editing');
    if (isComposingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim()) scheduleInterpret(value);
    else pendingSinceRef.current = null;
  }, [scheduleInterpret]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || isComposingRef.current) return;
    event.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    const value = text.trim();
    if (value) void interpret(value);
  }, [interpret, text]);

  const retry = useCallback(() => {
    if (!pendingText) return;
    setStreamText('');
    setIncompleteReflection(false);
    void interpret(pendingText);
  }, [interpret, pendingText]);

  const openCallback = useCallback(() => {
    if (status === 'interpreting' || status === 'reflecting') interpretationControllerRef.current?.abort();
    setStatus('callback_editing');
    announce('Callback form opened. Human verification is required before submission.');
  }, [announce, status]);

  const showHistory = turns.length > 0 || pendingText !== null;
  const showInput = !capped && !interactionLocked && status !== 'interpretation_error';
  const callbackReason = pendingText ?? turns[turns.length - 1]?.userText ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', boxSizing: 'border-box', fontFamily: MONO_FONT }}
      >
        {showHistory && (
          <div ref={historyRef} data-testid="contact-intent-history" style={{ maxHeight: HISTORY_MAX_HEIGHT, overflowY: 'auto', marginBottom: showInput ? '8px' : 0 }}>
            {turns.map((turn, index) => (
              <div key={`${turn.userText}-${index}`} data-testid="contact-intent-turn">
                <p data-testid="contact-intent-turn-user" style={userStyle}><span aria-hidden="true" style={promptStyle}>{'>'}</span> {turn.userText}</p>
                <p data-testid="contact-intent-turn-ai" style={aiStyle}>{turn.aiReply}</p>
              </div>
            ))}
            {pendingText !== null && (
              <div data-testid="contact-intent-turn-pending">
                <p style={userStyle}><span aria-hidden="true" style={promptStyle}>{'>'}</span> {pendingText}</p>
                <p data-testid="contact-intent-local-thanks" style={{ ...aiStyle, color: 'rgba(255,255,255,0.57)', marginBottom: '4px' }}>Thanks.</p>
                {status === 'interpreting' && <p data-testid="contact-intent-loading" style={{ ...aiStyle, color: 'rgba(255,255,255,0.58)' }}>{spinnerFrame} Looking for possible overlap…</p>}
                {streamText && <p data-testid="contact-intent-stream" style={aiStyle}>{streamText}</p>}
                {incompleteReflection && <p data-testid="contact-intent-incomplete" style={{ ...aiStyle, color: 'rgba(255,255,255,0.5)' }}>Incomplete reflection</p>}
              </div>
            )}
          </div>
        )}

        {showInput && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span aria-hidden="true" style={{ ...promptStyle, flexShrink: 0, paddingTop: '1px' }}>{'>'}</span>
            <textarea
              ref={textareaRef}
              data-testid="contact-intent-textarea"
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => { isComposingRef.current = true; }}
              onCompositionEnd={(event) => { isComposingRef.current = false; const value = event.currentTarget.value; setText(value); if (value.trim()) scheduleInterpret(value); else pendingSinceRef.current = null; }}
              maxLength={MAX_INPUT_LENGTH}
              rows={3}
              placeholder={turns.length === 0 && pendingText === null ? PLACEHOLDER : ''}
              style={{ flex: 1, minWidth: 0, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'white', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.6, padding: 0, display: 'block', overflow: 'hidden' }}
            />
          </div>
        )}
      </div>

      {turns.length === 0 && pendingText === null && <p data-testid="contact-intent-disclosure" style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '11px', lineHeight: 1.45 }}>{AI_DISCLOSURE}</p>}
      <span data-testid="contact-intent-status" data-status={status} style={{ display: 'none' }} />
      <span aria-live="polite" data-testid="contact-intent-live" style={visuallyHidden}>{liveMessage}</span>

      {status === 'interpretation_error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p data-testid="contact-intent-error" style={errorStyle}>{ERROR_TEXT}</p>
          <button type="button" onClick={retry} style={buttonStyle(false)}>Retry interpretation</button>
        </div>
      )}

      {showChoices && status !== 'callback_sent' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          <button type="button" onClick={() => { onContactDirectly?.(); announce('Email and phone are available above.'); }} style={buttonStyle(false)}>Contact Mannan directly</button>
          {status !== 'callback_editing' && status !== 'callback_sending' && status !== 'callback_error' && (
            <button type="button" onClick={openCallback} style={buttonStyle(false)}>Ask Mannan to contact me</button>
          )}
        </div>
      )}

      {(status === 'callback_editing' || status === 'callback_sending' || status === 'callback_sent' || status === 'callback_error') && (
        <CallbackRequestForm
          status={status}
          transcript={turns}
          initialReason={callbackReason}
          onStatusChange={setStatus}
          announce={announce}
        />
      )}
    </div>
  );
}

const promptStyle: React.CSSProperties = { color: PROMPT_COLOR, fontWeight: 600, lineHeight: 1.6, fontSize: '13px' };
const userStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.82)', paddingLeft: '1.3em', textIndent: '-1.3em', wordBreak: 'break-word' };
const aiStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(74,222,128,0.8)', wordBreak: 'break-word' };
const visuallyHidden: React.CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 };
