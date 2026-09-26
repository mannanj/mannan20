'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatBytes, type UploadBatch } from '@/lib/uploads-shared';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function UploadsView({ batches }: { batches: UploadBatch[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UploadBatch | null>(null);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return batches;
    return batches.filter((batch) => batch.title.toLowerCase().includes(needle));
  }, [batches, query]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    const res = await fetch('/api/uploads', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      setCreating(false);
      return;
    }
    const { id } = (await res.json()) as { id: string };
    router.push(`/upload/${id}`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await fetch(`/api/uploads/${pendingDelete.id}`, { method: 'DELETE' }).catch(() => null);
    setPendingDelete(null);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-[13px]">
        <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">All Uploads</h2>
        {batches.length > 0 && (
          <label>
            <span className="sr-only">Search your uploads</span>
            <input
              type="search"
              value={query}
              placeholder="Search"
              onChange={(event) => setQuery(event.target.value)}
              className="w-60 max-w-full rounded-[9px] border border-[#a8a8a8] bg-white px-3 py-[9px] text-[0.9375rem] text-[#0b0b0b] outline-none hover:border-[#0b0b0b] focus:border-[#0b0b0b]"
            />
          </label>
        )}
      </div>

      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-[13px] p-0">
        <li>
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="flex h-full min-h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[9px] border border-dashed border-[#ddd] bg-white p-4 text-[#6f6f6f] transition-colors hover:border-[#0b0b0b] hover:text-[#0b0b0b] disabled:cursor-wait"
          >
            <span className="text-2xl leading-none font-normal">+</span>
            <span className="text-base font-bold tracking-[-0.01em]">
              {creating ? 'Creating…' : 'New upload'}
            </span>
          </button>
        </li>

        {matching.map((batch) => (
          <li key={batch.id}>
            <BatchCard batch={batch} onDelete={() => setPendingDelete(batch)} />
          </li>
        ))}
      </ul>

      {matching.length === 0 && batches.length > 0 && (
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No uploads match that.</p>
      )}

      {pendingDelete && (
        <DeleteDialog
          batch={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

function BatchCard({ batch, onDelete }: { batch: UploadBatch; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className="relative flex h-full min-h-[9.5rem] flex-col rounded-[9px] border border-[#ddd] bg-white p-4 transition-colors hover:border-[#0b0b0b]">
      <Link href={`/upload/${batch.id}`} className="flex h-full flex-col gap-[13px] text-inherit no-underline">
        <span className="pr-[26px] text-base font-bold tracking-[-0.01em]">{batch.title}</span>
        <span className="mt-auto flex flex-wrap items-baseline gap-[13px] pt-[13px] font-mono text-[0.6875rem] text-[#6f6f6f]">
          <span>{new Date(batch.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}</span>
          <span>{plural(batch.fileCount, 'file')}</span>
          <span>{formatBytes(batch.totalSize)}</span>
        </span>
      </Link>

      <div className="absolute top-3.5 right-3.5" ref={wrapper}>
        <button
          type="button"
          aria-label={`Actions for ${batch.title}`}
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
          className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#6f6f6f] hover:text-[#0b0b0b]"
        >
          <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3" r="1.4" />
            <circle cx="8" cy="8" r="1.4" />
            <circle cx="8" cy="13" r="1.4" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute top-[calc(100%+6px)] right-0 z-20 flex min-w-[12rem] flex-col rounded-[9px] border border-[#ddd] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-left text-[0.9375rem] text-[#0b0b0b] hover:bg-[#f3f3f3]"
            >
              Delete upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteDialog({
  batch,
  onCancel,
  onConfirm,
}: {
  batch: UploadBatch;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Delete ${batch.title}`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[23rem] rounded-[9px] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
      >
        <h3 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">
          Delete &ldquo;{batch.title}&rdquo;?
        </h3>
        <p className="mt-2 mb-0 text-[0.9375rem] leading-6 text-[#0b0b0b]">
          This contains {plural(batch.fileCount, 'uploaded file')}, {formatBytes(batch.totalSize)},
          and can&rsquo;t be undone.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onConfirm();
            }}
            className="cursor-pointer rounded-[9px] border-2 border-[#1f2937] bg-[#1f2937] px-4 py-2 text-[0.9375rem] font-medium text-white hover:bg-[#111827] disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? 'Deleting…' : 'Delete upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
