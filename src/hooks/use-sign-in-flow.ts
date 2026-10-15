'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTurnstile } from '@/hooks/use-turnstile';
import { currentReturnPath } from '@/lib/return-to';
import {
  formatSignInCodeInput,
  normalizeSignInCode,
  RESEND_COOLDOWN_SECONDS,
  SIGN_IN_CODE_REJECTED,
} from '@/lib/sign-in-code';

export type SignInStep = 'email' | 'sent' | 'code';
type Status = 'idle' | 'sending' | 'verifying' | 'error';

const RESEND_FAILED = 'Could not resend. Try again in a minute.';
const TICK_MS = 1000;

export function useSignInFlow() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<SignInStep>('email');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCodeValue] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { token, availability, reset, containerRef } = useTurnstile();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), TICK_MS);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const turnstileWaiting = availability !== 'unavailable' && !token;

  const send = useCallback(async () => {
    setStatus('sending');
    setError(null);
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        turnstileToken: token,
        returnTo: currentReturnPath(window.location),
      }),
    }).catch(() => null);
    reset();
    if (res?.ok) {
      setStep((current) => (current === 'email' ? 'sent' : current));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatus('idle');
      return;
    }
    setStatus('error');
    setError(step === 'email' ? null : RESEND_FAILED);
  }, [email, token, reset, step]);

  const submitEmail = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === 'sending' || !email.trim()) return;
      void send();
    },
    [status, email, send],
  );

  const canResend = cooldown === 0 && status !== 'sending' && !turnstileWaiting;

  const resend = useCallback(() => {
    if (canResend) void send();
  }, [canResend, send]);

  const setCode = useCallback((raw: string) => setCodeValue(formatSignInCodeInput(raw)), []);

  const verify = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === 'verifying') return;
      if (!normalizeSignInCode(code)) {
        setStatus('error');
        setError(SIGN_IN_CODE_REJECTED);
        return;
      }
      setStatus('verifying');
      setError(null);
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      }).catch(() => null);
      const body: unknown = await res?.json().catch(() => null);
      const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      if (res?.ok && typeof record.redirectTo === 'string') {
        window.location.assign(record.redirectTo);
        return;
      }
      setStatus('error');
      setError(typeof record.error === 'string' ? record.error : SIGN_IN_CODE_REJECTED);
    },
    [status, code, email],
  );

  const enterCode = useCallback(() => {
    setStep('code');
    setStatus('idle');
    setError(null);
  }, []);

  const back = useCallback(() => {
    setStep('email');
    setStatus('idle');
    setError(null);
    setCodeValue('');
  }, []);

  return {
    email,
    setEmail,
    step,
    status,
    error,
    code,
    setCode,
    cooldown,
    canResend,
    turnstileWaiting,
    turnstileContainerRef: containerRef,
    submitEmail,
    resend,
    verify,
    enterCode,
    back,
  };
}

export type SignInFlow = ReturnType<typeof useSignInFlow>;
