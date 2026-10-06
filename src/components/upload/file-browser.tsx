'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  formatBytes,
  groupFiles,
  matchesFilter,
  searchTerms,
  type BrowsableFile,
  type GroupBy,
} from '@/lib/uploads-shared';
import { INPUT, LINK_BUTTON, META, plural } from './ui';

const GROUPINGS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

function dayStart(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function segmentClass(active: boolean): string {
  return `cursor-pointer border-0 px-3 py-[7px] text-[0.875rem] ${
    active ? 'bg-[#0b0b0b] text-white' : 'bg-white text-[#0b0b0b] hover:bg-[#f3f3f3]'
  }`;
}

export function FileBrowser<T extends BrowsableFile>({
  files,
  renderRow,
  emptyText = 'No files yet.',
}: {
  files: T[];
  renderRow: (file: T, groupBy: GroupBy) => ReactNode;
  emptyText?: string;
}) {
  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const terms = useMemo(() => [...chips, ...searchTerms(draft)], [chips, draft]);

  const filtered = useMemo(
    () => files.filter((file) => matchesFilter(file, { terms, from: dayStart(from), to: dayStart(to) })),
    [files, terms, from, to],
  );

  const groups = useMemo(() => groupFiles(filtered, groupBy, order), [filtered, groupBy, order]);
  const totalBytes = filtered.reduce((sum, file) => sum + file.size, 0);
  const filtering = terms.length > 0 || from !== '' || to !== '';

  const addChips = () => {
    const next = searchTerms(draft).filter((term) => !chips.includes(term));
    if (next.length) setChips((was) => [...was, ...next]);
    setDraft('');
  };

  const clear = () => {
    setChips([]);
    setDraft('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-[13px] rounded-[9px] border border-[#ddd] bg-white p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            addChips();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search files</span>
            <input
              type="search"
              value={draft}
              placeholder="Search names, pages, people, types — Enter to add"
              onChange={(event) => setDraft(event.target.value)}
              className={`${INPUT} w-full`}
              data-testid="files-search"
            />
          </label>
        </form>

        {chips.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" data-testid="files-chips">
            {chips.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  onClick={() => setChips((was) => was.filter((item) => item !== chip))}
                  aria-label={`Remove ${chip}`}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#ddd] bg-[#f3f3f3] px-3 py-1 text-[0.8125rem] text-[#0b0b0b] hover:border-[#0b0b0b]"
                >
                  {chip}
                  <span aria-hidden="true">&times;</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-[13px]">
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] text-[#6f6f6f]">Group by</span>
            <div className="flex overflow-hidden rounded-[9px] border border-[#a8a8a8]" role="group">
              {GROUPINGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={groupBy === option.value}
                  onClick={() => setGroupBy(option.value)}
                  className={segmentClass(groupBy === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-[0.8125rem] text-[#6f6f6f]">
            From
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className={`${INPUT} py-[6px]`}
              data-testid="files-from"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.8125rem] text-[#6f6f6f]">
            To
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className={`${INPUT} py-[6px]`}
              data-testid="files-to"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[0.8125rem] text-[#6f6f6f]">
            Order
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as 'newest' | 'oldest')}
              className={`${INPUT} py-[7px]`}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>

          {filtering && (
            <button type="button" onClick={clear} className={`${LINK_BUTTON} pb-2`}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className={`m-0 ${META}`} data-testid="files-summary">
        {plural(filtered.length, 'file')} · {formatBytes(totalBytes)}
        {filtering ? ` · filtered from ${files.length}` : ''}
      </p>

      {files.length === 0 ? (
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">{emptyText}</p>
      ) : groups.length === 0 ? (
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No files match that.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2" data-testid="files-group">
            <div className="flex items-baseline justify-between gap-[13px]">
              <h3 className="m-0 text-base font-bold tracking-[-0.01em]">{group.label}</h3>
              <span className={META}>
                {plural(group.files.length, 'file')} ·{' '}
                {formatBytes(group.files.reduce((sum, file) => sum + file.size, 0))}
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col divide-y divide-[#ddd] rounded-[9px] border border-[#ddd] bg-white p-0">
              {group.files.map((file) => renderRow(file, groupBy))}
            </ul>
          </div>
        ))
      )}

    </div>
  );
}
