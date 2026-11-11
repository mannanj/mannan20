'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface MysteryPanelProps {
  onContinue: () => void;
}

type SubscribeState = 'idle' | 'sending' | 'done' | 'pending' | 'error';

interface UpdatesInfo {
  email: string | null;
  subscribed: boolean;
}

export function MysteryPanel({ onContinue }: MysteryPanelProps) {
  const [info, setInfo] = useState<UpdatesInfo | null>(null);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');

  useEffect(() => {
    void fetch('/api/game/updates')
      .then((r) => (r.ok ? (r.json() as Promise<UpdatesInfo>) : { email: null, subscribed: false }))
      .then((data) => {
        setInfo(data);
        if (data.subscribed) setState('done');
      })
      .catch(() => setInfo({ email: null, subscribed: false }));
  }, []);

  const subscribe = async (e?: FormEvent) => {
    e?.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/game/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info?.email ? {} : { email }),
      });
      if (!res.ok) return setState('error');
      const data = (await res.json()) as { pending: boolean };
      setState(data.pending ? 'pending' : 'done');
    } catch {
      setState('error');
    }
  };

  return (
    <div data-testid="mystery-panel" className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 px-4 animate-[fadeIn_600ms_ease-out]">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/15 bg-neutral-900/85 p-6 text-center text-white shadow-2xl backdrop-blur-xl">
        <h2 className="text-lg font-semibold">Not yet implemented</h2>
        <p className="text-sm text-white/65">The chicken&apos;s next chapter isn&apos;t built yet.</p>
        <div data-testid="mystery-subscribe" data-state={state} className="flex flex-col gap-2 rounded-xl bg-white/5 p-3 text-sm">
          {state === 'done' && <p className="text-[#9fe39a]">You&apos;ll get an email when new levels land{info?.email ? ` (${info.email})` : ''}.</p>}
          {state === 'pending' && <p className="text-[#9fe39a]">Check your email to confirm. The link also saves your leaderboard name.</p>}
          {(state === 'idle' || state === 'sending' || state === 'error') && info && (
            info.email ? (
              <button type="button" data-testid="mystery-subscribe-known" disabled={state === 'sending'} onClick={() => void subscribe()} className="cursor-pointer rounded-lg bg-white/15 px-3 py-2 font-medium transition-colors hover:bg-white/25 disabled:opacity-60">
                Email me at {info.email} when new levels land
              </button>
            ) : (
              <form onSubmit={(e) => void subscribe(e)} className="flex flex-col gap-2">
                <label htmlFor="mystery-email" className="text-white/75">Get an email when new levels land</label>
                <div className="flex gap-2">
                  <input
                    id="mystery-email"
                    data-testid="mystery-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
                  />
                  <button type="submit" data-testid="mystery-subscribe-submit" disabled={state === 'sending'} className="cursor-pointer rounded-lg bg-white/15 px-3 py-2 font-medium transition-colors hover:bg-white/25 disabled:opacity-60">
                    Notify me
                  </button>
                </div>
                <p className="text-xs text-white/45">This email also saves your leaderboard name.</p>
              </form>
            )
          )}
          {state === 'error' && <p className="text-xs text-[#ff9a9a]">That didn&apos;t go through. Try again.</p>}
        </div>
        <button type="button" data-testid="mystery-continue" onClick={onContinue} className="cursor-pointer rounded-xl bg-[#ffd84d] px-4 py-2.5 font-semibold text-black transition-colors hover:bg-[#ffe27a]">
          Continue squeezing the chicken
        </button>
      </div>
    </div>
  );
}
