'use client';

import { useState } from 'react';
import { MeetingShell } from './meeting-shell';
import { MeetingUpcomingList } from './meeting-upcoming-list';

function defaultStart(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function MeetingHome({
  signedInEmail,
  joinUnavailable,
}: {
  signedInEmail: string | null;
  joinUnavailable: boolean;
}) {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<'idle' | 'working' | 'sent' | 'error'>('idle');

  const continueWithEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('working');
    const response = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, returnTo: '/meet' }),
    }).catch(() => null);
    setStatus(response?.ok ? 'sent' : 'error');
  };

  const createMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('working');
    const durationSeconds = duration * 60;
    const response = await fetch('/api/meetings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': `browser_create_${crypto.randomUUID().replaceAll('-', '')}`,
      },
      body: JSON.stringify({
        ...(title.trim() ? { title: title.trim() } : {}),
        schedule: { startsAt: new Date(startsAt).toISOString(), durationSeconds },
        policy: {
          defaultDurationSeconds: durationSeconds,
          maxDurationSeconds: 4 * 60 * 60,
          systemMaxDurationSeconds: 24 * 60 * 60,
          maxParticipants: 50,
        },
      }),
    }).catch(() => null);
    if (response?.ok) {
      const location = response.headers.get('location');
      if (location?.startsWith('/meet/')) {
        window.location.assign(location);
        return;
      }
    }
    setStatus('error');
  };

  return (
    <MeetingShell>
      {signedInEmail ? (
        <section className="py-12 lg:py-20">
          {joinUnavailable && (
            <p className="mb-8 rounded-md border border-amber-200/20 bg-amber-100/5 px-4 py-3 text-sm text-amber-100/80">
              That meeting link is unavailable or has expired.
            </p>
          )}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.75fr)] lg:items-start">
            <MeetingUpcomingList />
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <form onSubmit={createMeeting} className="space-y-5">
              <div>
                <p className="text-sm font-medium">Create a meeting</p>
                <p className="mt-1 text-xs text-white/40">Signed in as {signedInEmail}</p>
              </div>
              <label className="block text-xs text-white/55">
                Title <span className="text-white/30">(optional)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/35" />
              </label>
              <label className="block text-xs text-white/55">
                Starts
                <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/35" />
              </label>
              <label className="block text-xs text-white/55">
                Duration
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white/35">
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </label>
              <button disabled={status === 'working'} className="w-full rounded-md bg-[#f1efe8] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50">
                Create meeting
              </button>
            </form>
              {status === 'error' && <p className="mt-4 text-xs text-red-200/80">Something went wrong. Try again.</p>}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-xl">
            <p className="mb-5 text-xs uppercase tracking-[0.18em] text-white/40">Private workspace</p>
            <h1 className="font-[family-name:var(--font-caption)] text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
              Meet without the account ceremony.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-white/55">
              Continue with email to create a meeting, or open a private link and enter as a guest.
            </p>
            {joinUnavailable && (
              <p className="mt-6 rounded-md border border-amber-200/20 bg-amber-100/5 px-4 py-3 text-sm text-amber-100/80">
                That meeting link is unavailable or has expired.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            {status === 'sent' ? (
            <div className="py-8">
              <p className="text-lg font-medium">Check your email</p>
              <p className="mt-2 text-sm leading-6 text-white/50">The link expires in 15 minutes and brings you back here.</p>
            </div>
          ) : (
            <form onSubmit={continueWithEmail} className="space-y-5">
              <div>
                <p className="text-sm font-medium">Create a meeting</p>
                <p className="mt-1 text-xs text-white/40">No password or separate sign-up.</p>
              </div>
              <label className="block text-xs text-white/55">
                Email
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/35" />
              </label>
              <button disabled={status === 'working'} className="w-full rounded-md bg-[#f1efe8] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50">
                Continue with email
              </button>
            </form>
            )}
            {status === 'error' && <p className="mt-4 text-xs text-red-200/80">Something went wrong. Try again.</p>}
          </div>
        </section>
      )}
    </MeetingShell>
  );
}
