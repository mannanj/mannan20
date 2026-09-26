'use client';

import { useState } from 'react';
import { useTurnstile } from '@/hooks/use-turnstile';
import { currentReturnPath } from '@/lib/return-to';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function UploadLocked({ email }: { email: string | null }) {
  return (
    <section className="flex flex-col gap-[13px]">
      <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">
        Nice, you found this page.
      </h2>
      {!email && <SignInForm />}
    </section>
  );
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const {
    token: turnstileToken,
    availability,
    reset: resetTurnstile,
    containerRef,
  } = useTurnstile();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        turnstileToken,
        returnTo: currentReturnPath(window.location),
      }),
    }).catch(() => null);
    if (res?.ok) {
      setStatus('sent');
      return;
    }
    resetTurnstile();
    setStatus('error');
  };

  if (status === 'sent') {
    return (
      <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">
        Check your email. The link expires in 15 minutes.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-[22rem] flex-col gap-[13px]">
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        aria-label="Email"
        className="w-full rounded-[9px] border border-[#a8a8a8] bg-white px-3 py-[9px] text-[0.9375rem] text-[#0b0b0b] outline-none placeholder:text-[#a8a8a8] hover:border-[#0b0b0b] focus:border-[#0b0b0b]"
      />
      <div ref={containerRef} />
      <button
        type="submit"
        disabled={status === 'sending' || (availability !== 'unavailable' && !turnstileToken)}
        className="cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3] disabled:cursor-wait disabled:opacity-60"
      >
        {status === 'sending'
          ? 'Sending…'
          : availability !== 'unavailable' && !turnstileToken
            ? 'Checking…'
            : 'Continue with email'}
      </button>
      {status === 'error' && (
        <p className="m-0 text-[0.875rem] text-[#c1121f]">
          Could not send the link. Try again in a minute.
        </p>
      )}
    </form>
  );
}
