'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatBytes, type UploadBatch, type UploadFile } from '@/lib/uploads-shared';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const TITLE_SAVE_DELAY_MS = 600;

interface Pending {
  name: string;
  size: number;
  error: string | null;
}

export function UploadDetail({ batch, files }: { batch: UploadBatch; files: UploadFile[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(batch.title);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === batch.title) return;
    const timer = setTimeout(() => {
      fetch(`/api/uploads/${batch.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      }).catch(() => null);
    }, TITLE_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, batch.id, batch.title]);

  const allSelected = files.length > 0 && selected.size === files.length;

  const toggle = (id: string) => {
    setSelected((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const upload = useCallback(
    async (chosen: File[]) => {
      if (!chosen.length) return;
      setPending(chosen.map((file) => ({ name: file.name, size: file.size, error: null })));

      for (const file of chosen) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`/api/uploads/${batch.id}/files`, {
          method: 'POST',
          body: form,
        }).catch(() => null);

        if (!res?.ok) {
          const message =
            res?.status === 413 ? 'Too large' : 'Upload failed';
          setPending((was) =>
            was.map((item) => (item.name === file.name ? { ...item, error: message } : item)),
          );
          continue;
        }
        setPending((was) => was.filter((item) => item.name !== file.name));
      }

      router.refresh();
    },
    [batch.id, router],
  );

  const downloadHref = useMemo(() => {
    const base = `/api/uploads/${batch.id}/download`;
    if (!selected.size) return base;
    return `${base}?ids=${[...selected].join(',')}`;
  }, [batch.id, selected]);

  return (
    <section className="flex flex-col gap-[38px]">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Upload title"
        className="-ml-3 w-[calc(100%+0.75rem)] rounded-[9px] border border-transparent bg-transparent px-3 py-2 text-[1.5rem] font-bold tracking-[-0.02em] text-[#0b0b0b] outline-none hover:border-[#ddd] focus:border-[#a8a8a8] focus:bg-white"
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload([...event.dataTransfer.files]);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-[#0b0b0b] bg-white' : 'border-[#ddd] bg-white'
        }`}
      >
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">Drop files here</p>
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className="cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3]"
        >
          Choose files
        </button>
        <input
          ref={picker}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void upload([...(event.target.files ?? [])]);
            event.target.value = '';
          }}
        />
      </div>

      {pending.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {pending.map((item) => (
            <li key={item.name} className="flex items-baseline gap-[13px] text-[0.9375rem]">
              <span className="text-[#0b0b0b]">{item.name}</span>
              <span className="font-mono text-[0.6875rem] text-[#6f6f6f]">
                {formatBytes(item.size)}
              </span>
              <span className={item.error ? 'text-[#c1121f]' : 'text-[#6f6f6f]'}>
                {item.error ?? 'Uploading…'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-[13px]">
        <div className="flex flex-wrap items-center justify-between gap-[13px]">
          {files.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(files.map((file) => file.id)))
              }
              className="cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] text-[#1a56db] hover:text-[#143fa8]"
            >
              {allSelected ? 'Unselect all' : 'Select all'}
            </button>
          ) : (
            <span />
          )}

          {files.length > 0 && (
            <a
              href={downloadHref}
              className="cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] no-underline hover:bg-[#f3f3f3]"
            >
              {selected.size ? `Download selected (${selected.size})` : 'Download all'}
            </a>
          )}
        </div>

        {files.length === 0 ? (
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No files here yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-[#ddd] overflow-hidden rounded-[9px] border border-[#ddd] bg-white p-0">
            {files.map((file) => (
              <FileRow
                key={file.id}
                batchId={batch.id}
                file={file}
                checked={selected.has(file.id)}
                onToggle={() => toggle(file.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FileRow({
  batchId,
  file,
  checked,
  onToggle,
}: {
  batchId: string;
  file: UploadFile;
  checked: boolean;
  onToggle: () => void;
}) {
  const [description, setDescription] = useState(file.description);

  const save = () => {
    if (description === file.description) return;
    fetch(`/api/uploads/${batchId}/files/${file.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description }),
    }).catch(() => null);
  };

  return (
    <li className="flex items-center gap-[13px] px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${file.title}`}
        className="h-4 w-4 shrink-0 accent-[#1a56db]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[0.9375rem] font-medium text-[#0b0b0b]" title={file.title}>
          {file.title}
        </span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={save}
          placeholder="Add a description"
          aria-label={`Description for ${file.title}`}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[0.875rem] text-[#6f6f6f] outline-none placeholder:text-[#a8a8a8] hover:border-[#ddd] focus:border-[#a8a8a8] focus:bg-white"
        />
      </div>
      <span className="shrink-0 font-mono text-[0.6875rem] text-[#6f6f6f]">
        {formatBytes(file.size)}
      </span>
      <span className="hidden shrink-0 font-mono text-[0.6875rem] text-[#6f6f6f] sm:inline">
        {new Date(file.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}
      </span>
      <a
        href={`/api/uploads/${batchId}/download?file=${file.id}`}
        aria-label={`Download ${file.title}`}
        className="shrink-0 text-[#6f6f6f] hover:text-[#0b0b0b]"
      >
        <svg
          viewBox="0 0 16 16"
          width={17}
          height={17}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 2v8" />
          <path d="M4.5 7L8 10.5 11.5 7" />
          <path d="M2.5 13h11" />
        </svg>
      </a>
    </li>
  );
}
