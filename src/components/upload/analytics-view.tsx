'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatBytes } from '@/lib/uploads-shared';
import type { UploadAnalytics } from '@/lib/upload-events';
import {
  DATE_TIME_FORMAT,
  LINK_BUTTON,
  META,
  PRIMARY_BUTTON,
  SECTION_TITLE,
  plural,
} from '@/components/upload/ui';

const RANGES = [7, 30, 90, 365] as const;
const DEFAULT_RANGE = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 120;
const MAX_LABELS = 6;

const PANEL = 'rounded-[9px] border border-[#ddd] bg-white p-4';
const SUBTITLE = 'm-0 text-[1rem] font-bold text-[#0b0b0b]';
const EMPTY = 'm-0 text-[0.9375rem] text-[#6f6f6f]';
const TH = 'px-2 py-1.5 text-left font-mono text-[0.6875rem] font-normal text-[#6f6f6f]';
const TD = 'px-2 py-1.5 align-top text-[0.875rem] text-[#0b0b0b]';

const STATS = [
  { type: 'upload', label: 'Uploads', bytes: true },
  { type: 'download', label: 'Downloads', bytes: true },
  { type: 'share_created', label: 'Share links created', bytes: false },
  { type: 'share_visit', label: 'Share visits', bytes: false },
  { type: 'access_request', label: 'Access requests', bytes: false },
  { type: 'mcp_call', label: 'MCP calls', bytes: false },
] as const;

const BUCKET_LABELS: Record<string, string> = {
  owner: 'Your uploads',
  shared: 'From share links',
};

const ACTOR_LABELS: Record<string, string> = {
  owner: 'You',
  mcp: 'MCP',
  share: 'Share link',
  visitor: 'Visitor',
};

function humanize(type: string): string {
  const text = type.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, DATE_TIME_FORMAT);
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

interface DayPoint {
  day: string;
  uploads: number;
  downloads: number;
}

function buildSeries(data: UploadAnalytics, days: number): DayPoint[] {
  const points = new Map<string, DayPoint>();
  const today = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(today - i * DAY_MS);
    points.set(day, { day, uploads: 0, downloads: 0 });
  }
  for (const row of data.daily) {
    const point = points.get(row.day);
    if (!point) continue;
    if (row.type === 'upload') point.uploads += row.count;
    if (row.type === 'download') point.downloads += row.count;
  }
  return [...points.values()];
}

function ActivityChart({ series }: { series: DayPoint[] }) {
  const max = Math.max(1, ...series.map((p) => Math.max(p.uploads, p.downloads)));
  const step = Math.max(1, Math.ceil(series.length / MAX_LABELS));
  const total = series.reduce((sum, p) => sum + p.uploads + p.downloads, 0);

  return (
    <div
      data-testid="analytics-chart"
      role="img"
      aria-label={`Daily uploads and downloads over the last ${series.length} days`}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-3 text-[0.8125rem] text-[#6f6f6f]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-[#1a56db]" />
          Uploads
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-[#0b0b0b]/35" />
          Downloads
        </span>
      </div>
      {total === 0 ? (
        <p className={EMPTY}>No uploads or downloads in this range.</p>
      ) : (
        <div className="flex items-end gap-px" style={{ height: CHART_HEIGHT }}>
          {series.map((p) => (
            <div
              key={p.day}
              title={`${p.day}: ${plural(p.uploads, 'upload')}, ${plural(p.downloads, 'download')}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
            >
              <div
                className="w-full max-w-[10px] flex-1 bg-[#1a56db]"
                style={{ height: `${(p.uploads / max) * 100}%` }}
              />
              <div
                className="w-full max-w-[10px] flex-1 bg-[#0b0b0b]/35"
                style={{ height: `${(p.downloads / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-px" aria-hidden="true">
        {series.map((p, i) => (
          <span key={p.day} className={`${META} min-w-0 flex-1 overflow-visible whitespace-nowrap`}>
            {i % step === 0 ? p.day.slice(5) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function AnalyticsView({ initial }: { initial: UploadAnalytics }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState<number>(DEFAULT_RANGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (next: number) => {
    setDays(next);
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/uploads/analytics?days=${next}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      setData((await res.json()) as UploadAnalytics);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const totals = useMemo(() => new Map(data.totals.map((t) => [t.type, t])), [data.totals]);
  const series = useMemo(() => buildSeries(data, days), [data, days]);

  return (
    <section data-testid="analytics-view" className="flex min-w-0 flex-col gap-[21px]">
      <div className="flex flex-col gap-2">
        <Link href="/upload" className={`${LINK_BUTTON} self-start no-underline`}>
          ← Upload
        </Link>
        <h2 className={SECTION_TITLE}>Analytics</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            disabled={loading}
            aria-pressed={days === range}
            onClick={() => load(range)}
            className={`${PRIMARY_BUTTON} ${days === range ? '!bg-[#0b0b0b] !text-white' : ''}`}
          >
            {range} days
          </button>
        ))}
        {error && <span className="text-[0.875rem] text-[#6f6f6f]">Could not load. Try again.</span>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-[13px]">
        {STATS.map((stat) => {
          const entry = totals.get(stat.type);
          return (
            <div key={stat.type} data-testid={`analytics-stat-${stat.type}`} className={PANEL}>
              <div className={META}>{stat.label}</div>
              <div className="text-[1.5rem] font-bold text-[#0b0b0b]">{entry?.count ?? 0}</div>
              {stat.bytes && <div className={META}>{formatBytes(entry?.bytes ?? 0)}</div>}
            </div>
          );
        })}
      </div>

      <div className={`${PANEL} flex flex-col gap-2`}>
        <h3 className={SUBTITLE}>Storage</h3>
        {data.storage.length === 0 ? (
          <p className={EMPTY}>No stored files.</p>
        ) : (
          data.storage.map((row) => (
            <div key={row.bucket} className="flex flex-wrap justify-between gap-2 text-[0.9375rem]">
              <span>{BUCKET_LABELS[row.bucket] ?? humanize(row.bucket)}</span>
              <span className={META}>
                {plural(row.files, 'file')} · {formatBytes(row.bytes)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className={`${PANEL} flex flex-col gap-3`}>
        <h3 className={SUBTITLE}>Activity</h3>
        <ActivityChart series={series} />
      </div>

      <div className={`${PANEL} flex flex-col gap-2`}>
        <h3 className={SUBTITLE}>Top share links</h3>
        {data.topShares.length === 0 ? (
          <p className={EMPTY}>No share activity in this range.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={TH}>Link</th>
                <th className={TH}>Events</th>
                <th className={TH}>Bytes</th>
              </tr>
            </thead>
            <tbody>
              {data.topShares.map((share) => (
                <tr key={share.shareId} className="border-t border-[#ddd]">
                  <td className={TD}>{share.label || share.batchTitle || 'Untitled'}</td>
                  <td className={TD}>{share.count}</td>
                  <td className={TD}>{formatBytes(share.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className={`${PANEL} flex flex-col gap-2`}>
        <h3 className={SUBTITLE}>Access requests</h3>
        {data.requests.length === 0 ? (
          <p className={EMPTY}>No access requests.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {[...data.requests]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((request) => (
                <li key={request.id} className="flex min-w-0 flex-col gap-0.5">
                  <span className="break-words text-[0.9375rem] font-medium">{request.email}</span>
                  {request.message && (
                    <span className="break-words text-[0.875rem]">{request.message}</span>
                  )}
                  <span className={META}>{formatTime(request.createdAt)}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div data-testid="analytics-recent" className={`${PANEL} flex flex-col gap-2`}>
        <h3 className={SUBTITLE}>Recent activity</h3>
        {data.recent.length === 0 ? (
          <p className={EMPTY}>No activity yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={TH}>Time</th>
                <th className={TH}>Type</th>
                <th className={TH}>Actor</th>
                <th className={TH}>Item</th>
                <th className={TH}>Size</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((event) => (
                <tr key={event.id} className="border-t border-[#ddd]">
                  <td className={`${TD} whitespace-nowrap`}>{formatTime(event.createdAt)}</td>
                  <td className={`${TD} whitespace-nowrap`}>{humanize(event.type)}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {ACTOR_LABELS[event.actor] ?? humanize(event.actor)}
                  </td>
                  <td className={TD}>{event.fileTitle || event.batchTitle || ''}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {event.bytes > 0 ? formatBytes(event.bytes) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </section>
  );
}
