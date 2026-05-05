'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SCHEDULE_TYPES, getTypeBySlug, type ScheduleType } from './types';

const MOCK_TIMES = ['09:00', '10:30', '13:00', '15:00', '16:30'];

function buildMockDates(count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (out.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(cursor));
  }
  return out;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface ScheduleFlowProps {
  initialTypeSlug?: string;
}

export function ScheduleFlow({ initialTypeSlug }: ScheduleFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialType = getTypeBySlug(initialTypeSlug);
  const defaultType = SCHEDULE_TYPES.find((t) => t.enabled) ?? null;
  const [selectedType, setSelectedType] = useState<ScheduleType | null>(
    initialType?.enabled ? initialType : defaultType
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const mockDates = useMemo(() => buildMockDates(10), []);

  function pickType(t: ScheduleType) {
    if (!t.enabled) return;
    setSelectedType(t);
    setSelectedDate(null);
    setSelectedTime(null);
    setConfirmed(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', t.slug);
    router.replace(`/schedule?${params.toString()}`, { scroll: false });
  }

  function reset() {
    setSelectedType(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setName('');
    setEmail('');
    setConfirmed(false);
    router.replace('/schedule', { scroll: false });
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-bold text-white mb-4">Schedule</h1>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-white/40 mb-2">
            Type
          </span>
          <div className="relative inline-block">
            <select
              value={selectedType?.slug ?? ''}
              onChange={(e) => {
                const t = SCHEDULE_TYPES.find((x) => x.slug === e.target.value);
                if (t) pickType(t);
                else reset();
              }}
              className="appearance-none bg-[#141414] border border-white/10 rounded-md pl-3 pr-9 py-2 text-sm text-white/90 focus:outline-none focus:border-white/30 hover:border-white/25 transition-colors min-w-[220px]"
            >
              {SCHEDULE_TYPES.map((t) => (
                <option key={t.slug} value={t.slug} disabled={!t.enabled}>
                  {t.label}
                  {!t.enabled ? ' — soon' : ''}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 12 8"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-2 text-white/40"
            >
              <path
                d="M1 1l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </label>
      </section>

      {selectedType && selectedType.enabled && !confirmed && (
        <section className="border-t border-white/5 pt-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Pick a date</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {mockDates.map((d) => {
                const isSelected = selectedDate?.toDateString() === d.toDateString();
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    className={[
                      'rounded-md border px-3 py-2 text-xs transition-colors',
                      isSelected
                        ? 'border-white/40 bg-white/[0.06] text-white'
                        : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white/90',
                    ].join(' ')}
                  >
                    {formatDate(d)}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Pick a time</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_TIMES.map((t) => {
                  const isSelected = selectedTime === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={[
                        'rounded-md border px-3 py-1.5 text-xs transition-colors',
                        isSelected
                          ? 'border-white/40 bg-white/[0.06] text-white'
                          : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white/90',
                      ].join(' ')}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDate && selectedTime && (
            <div className="rounded-md border border-white/10 p-4">
              <p className="text-sm text-white/80 mb-3">
                {formatDate(selectedDate)} · {selectedTime}
              </p>
              <div className="flex flex-col gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-white/30"
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                type="button"
                disabled={!name || !email}
                onClick={() => setConfirmed(true)}
                className="rounded-md bg-white text-black text-sm font-medium px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
              >
                Confirm (mock)
              </button>
              <p className="text-[11px] text-white/30 mt-3">
                Mock flow — nothing is sent or saved.
              </p>
            </div>
          )}
        </section>
      )}

      {selectedType && !selectedType.enabled && (
        <section className="border-t border-white/5 pt-8">
          <div className="rounded-md border border-white/10 p-6 text-center">
            <p className="text-sm text-white/70 mb-1">{selectedType.label}</p>
            <p className="text-xs text-white/40">Coming soon.</p>
          </div>
        </section>
      )}

      {confirmed && selectedType && selectedDate && selectedTime && (
        <section className="border-t border-white/5 pt-8">
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
            <p className="text-sm text-emerald-300/90 mb-1">Booked (mock)</p>
            <p className="text-sm text-white/80">
              {selectedType.label} — {formatDate(selectedDate)} at {selectedTime}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {name} · {email}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
            >
              Start over
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
