'use client';

import { useEffect, useState } from 'react';
import { SignInForm } from '@/components/auth/sign-in-form';

type Session = { email: string } | null | 'loading';

async function fetchSession(): Promise<{ email: string } | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: { email?: unknown } | null };
    return typeof body.user?.email === 'string' ? { email: body.user.email } : null;
  } catch {
    return null;
  }
}

export function AccountSave() {
  const [session, setSession] = useState<Session>('loading');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void fetchSession().then(setSession);
  }, []);

  if (session === 'loading') return null;

  if (session) {
    return (
      <p data-testid="account-save-signed-in" className="mt-3 text-xs text-white/40">
        ✓ Signed in as {session.email} · your score and bag save to your account
      </p>
    );
  }

  return (
    <div className="mt-3 text-xs text-white/40">
      {!formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          data-testid="account-save-toggle"
          className="cursor-pointer text-[#4FC3F7] underline-offset-2 hover:underline"
        >
          Sign in to save your score and bag
        </button>
      )}
      {formOpen && (
        <div data-testid="account-save-form" className="mt-2 w-fit rounded-xl bg-white p-4 text-[#0b0b0b]">
          <p className="mb-3 text-sm">Sign in with your mannan.is account. Your score and bag follow you to any device.</p>
          <SignInForm />
        </div>
      )}
    </div>
  );
}
