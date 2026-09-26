'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_PART_SIZE,
  formatBytes,
  previewableImageType,
  type UploadBatch,
  type UploadFile,
} from '@/lib/uploads-shared';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const TITLE_SAVE_DELAY_MS = 600;

interface Pending {
  name: string;
  size: number;
  progress: number;
  error: string | null;
}

async function uploadWhole(batchId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('lastModified', String(file.lastModified));
  const res = await fetch(`/api/uploads/${batchId}/files`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(res.status === 413 ? 'Too large' : 'Upload failed');
}

async function uploadInParts(
  batchId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  const started = await fetch(`/api/uploads/${batchId}/multipart`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type,
      lastModified: file.lastModified,
    }),
  });
  if (!started.ok) throw new Error(started.status === 413 ? 'Too large' : 'Upload failed');

  const { fileId, partSize, parts } = (await started.json()) as {
    fileId: string;
    partSize: number;
    parts: number;
  };

  const uploaded: { partNumber: number; etag: string }[] = [];
  try {
    for (let part = 1; part <= parts; part += 1) {
      const chunk = file.slice((part - 1) * partSize, part * partSize);
      const res = await fetch(`/api/uploads/${batchId}/multipart/${fileId}?part=${part}`, {
        method: 'PUT',
        body: chunk,
      });
      if (!res.ok) throw new Error('Upload failed');
      uploaded.push((await res.json()) as { partNumber: number; etag: string });
      onProgress(Math.round((part / parts) * 100));
    }

    const finished = await fetch(`/api/uploads/${batchId}/multipart/${fileId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parts: uploaded }),
    });
    if (!finished.ok) throw new Error('Upload failed');
  } catch (error) {
    await fetch(`/api/uploads/${batchId}/multipart/${fileId}`, { method: 'DELETE' }).catch(
      () => null,
    );
    throw error;
  }
}

export function UploadDetail({ batch, files }: { batch: UploadBatch; files: UploadFile[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(batch.title);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<UploadFile | null>(null);
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
      setPending(
        chosen.map((file) => ({ name: file.name, size: file.size, progress: 0, error: null })),
      );

      for (const file of chosen) {
        const patch = (change: Partial<Pending>) =>
          setPending((was) =>
            was.map((item) => (item.name === file.name ? { ...item, ...change } : item)),
          );

        try {
          if (file.size > MAX_UPLOAD_BYTES) throw new Error('Too large');
          if (file.size > UPLOAD_PART_SIZE) {
            await uploadInParts(batch.id, file, (percent) => patch({ progress: percent }));
          } else {
            await uploadWhole(batch.id, file);
          }
          setPending((was) => was.filter((item) => item.name !== file.name));
        } catch (error) {
          patch({ error: error instanceof Error ? error.message : 'Upload failed' });
        }
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
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">
          Drop files here &mdash; up to {formatBytes(MAX_UPLOAD_BYTES)} each
        </p>
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
                {item.error ?? (item.progress ? `${item.progress}%` : 'Uploading…')}
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
          <div className="overflow-hidden rounded-[9px] border border-[#ddd] bg-white">
            <div className="flex items-center gap-[13px] border-b border-[#ddd] bg-[#fafafa] px-4 py-2 font-mono text-[0.6875rem] text-[#6f6f6f]">
              <span className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Name</span>
              <span className="w-[68px] shrink-0 text-right">Size</span>
              <span className="hidden w-[96px] shrink-0 text-right sm:inline">Modified</span>
              <span className="hidden w-[96px] shrink-0 text-right sm:inline">Uploaded</span>
              <span className="w-[17px] shrink-0" />
            </div>
            <ul className="m-0 flex list-none flex-col divide-y divide-[#ddd] p-0">
            {files.map((file) => (
              <FileRow
                key={file.id}
                batchId={batch.id}
                file={file}
                checked={selected.has(file.id)}
                onToggle={() => toggle(file.id)}
                onPreview={
                  previewableImageType(file.contentType) ? () => setPreview(file) : null
                }
              />
              ))}
            </ul>
          </div>
        )}
      </div>

      {preview && (
        <ImagePreview batchId={batch.id} file={preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}

function FileRow({
  batchId,
  file,
  checked,
  onToggle,
  onPreview,
}: {
  batchId: string;
  file: UploadFile;
  checked: boolean;
  onToggle: () => void;
  onPreview: (() => void) | null;
}) {
  return (
    <li className="flex items-center gap-[13px] px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${file.title}`}
        className="h-4 w-4 shrink-0 accent-[#1a56db]"
      />
      {onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          title={`Preview ${file.title}`}
          className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[0.9375rem] font-medium text-[#1a56db] hover:text-[#143fa8] hover:underline hover:underline-offset-[3px]"
        >
          {file.title}
        </button>
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-[#0b0b0b]"
          title={file.title}
        >
          {file.title}
        </span>
      )}
      <span className="w-[68px] shrink-0 text-right font-mono text-[0.6875rem] text-[#6f6f6f]">
        {formatBytes(file.size)}
      </span>
      <span className="hidden w-[96px] shrink-0 text-right font-mono text-[0.6875rem] text-[#6f6f6f] sm:inline">
        {file.modifiedAt
          ? new Date(file.modifiedAt).toLocaleDateString('en-US', DATE_FORMAT)
          : '\u2014'}
      </span>
      <span className="hidden w-[96px] shrink-0 text-right font-mono text-[0.6875rem] text-[#6f6f6f] sm:inline">
        {new Date(file.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}
      </span>
      <a
        href={`/api/uploads/${batchId}/download?file=${file.id}`}
        aria-label={`Download ${file.title}`}
        className="w-[17px] shrink-0 text-[#6f6f6f] hover:text-[#0b0b0b]"
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

function ImagePreview({
  batchId,
  file,
  onClose,
}: {
  batchId: string;
  file: UploadFile;
  onClose: () => void;
}) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[13px] bg-black/80 p-6"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/uploads/${batchId}/download?file=${file.id}&inline=1`}
        alt={file.title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[80vh] max-w-full rounded-[9px] bg-white object-contain"
      />
      <p className="m-0 text-[0.9375rem] text-white">{file.title}</p>
    </div>
  );
}
