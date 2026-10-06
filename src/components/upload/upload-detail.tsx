'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUploader } from '@/hooks/use-uploader';
import { ActionMenu, ConfirmDialog, DropZone, PendingList, PRIMARY_BUTTON } from './ui';
import { ShareDialog, type ShareTarget } from './share-dialog';
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  previewableImageType,
  uploaderFirstName,
  type UploadBatch,
  type UploadFile,
} from '@/lib/uploads-shared';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const TITLE_SAVE_DELAY_MS = 600;

interface PlanPart {
  index: number;
  kind: 'file' | 'zip';
  bytes: number;
  count: number;
  fileId: string | null;
}

interface Plan {
  total: number;
  parts: PlanPart[];
}

function triggerDownload(href: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function UploadDetail({ batch, files }: { batch: UploadBatch; files: UploadFile[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(batch.title);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [deleting, setDeleting] = useState<UploadFile | null>(null);
  const [preview, setPreview] = useState<UploadFile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [started, setStarted] = useState<Set<number>>(new Set());
  const [planning, setPlanning] = useState(false);

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

  const refresh = useCallback(() => router.refresh(), [router]);
  const { pending, upload, dismiss } = useUploader(refresh);

  const duplicate = async (file: UploadFile) => {
    await fetch(`/api/uploads/${batch.id}/files/${file.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate' }),
    }).catch(() => null);
    router.refresh();
  };

  const remove = async (file: UploadFile) => {
    await fetch(`/api/uploads/${batch.id}/files/${file.id}`, { method: 'DELETE' }).catch(
      () => null,
    );
    setDeleting(null);
    setSelected((was) => {
      const next = new Set(was);
      next.delete(file.id);
      return next;
    });
    router.refresh();
  };

  const selection = useMemo(
    () => (selected.size ? `ids=${[...selected].join(',')}` : ''),
    [selected],
  );

  const downloadBase = `/api/uploads/${batch.id}/download`;

  const partHref = useCallback(
    (part: PlanPart) =>
      part.kind === 'file'
        ? `${downloadBase}?file=${part.fileId}`
        : `${downloadBase}?part=${part.index}${selection ? `&${selection}` : ''}`,
    [downloadBase, selection],
  );

  const beginDownload = useCallback(async () => {
    if (planning) return;
    setPlanning(true);
    const res = await fetch(
      `${downloadBase}?plan=1${selection ? `&${selection}` : ''}`,
    ).catch(() => null);
    setPlanning(false);
    if (!res?.ok) return;

    const next = (await res.json()) as Plan;
    if (next.parts.length < 2) {
      triggerDownload(selection ? `${downloadBase}?${selection}` : downloadBase);
      return;
    }
    setPlan(next);
    setStarted(new Set([0]));
    triggerDownload(partHref(next.parts[0]));
  }, [downloadBase, partHref, planning, selection]);

  return (
    <section className="flex flex-col gap-[38px]">
      <div className="flex flex-col gap-[13px]">
        <Link href="/upload" className="text-[0.9375rem] text-[#1a56db] no-underline hover:text-[#143fa8]">
          &larr; Upload
        </Link>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Upload title"
        className="-ml-3 w-[calc(100%+0.75rem)] rounded-[9px] border border-transparent bg-transparent px-3 py-2 text-[1.5rem] font-bold tracking-[-0.02em] text-[#0b0b0b] outline-none hover:border-[#ddd] focus:border-[#a8a8a8] focus:bg-white"
      />
        <div className="flex flex-wrap items-center gap-[13px]">
          <button
            type="button"
            onClick={() => setSharing({ batchId: batch.id, fileId: null, title: title || batch.title })}
            className={PRIMARY_BUTTON}
            data-testid="share-page"
          >
            Share page
          </button>
        </div>
      </div>

      <DropZone
        onFiles={(chosen) => void upload(`/api/uploads/${batch.id}`, chosen)}
        hint={`Drop files here — up to ${formatBytes(MAX_UPLOAD_BYTES)} each`}
      />

      <PendingList pending={pending} onDismiss={dismiss} />

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
            <button
              type="button"
              onClick={beginDownload}
              disabled={planning}
              className="cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3] disabled:cursor-wait disabled:opacity-60"
            >
              {planning
                ? 'Preparing…'
                : selected.size
                  ? `Download selected (${selected.size})`
                  : 'Download all'}
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No files here yet.</p>
        ) : (
          <div className="rounded-[9px] border border-[#ddd] bg-white">
            <div className="flex items-center gap-[13px] rounded-t-[9px] border-b border-[#ddd] bg-[#fafafa] px-4 py-2 font-mono text-[0.6875rem] text-[#6f6f6f]">
              <span className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Name</span>
              <span className="w-[68px] shrink-0 text-right">Size</span>
              <span className="hidden w-[96px] shrink-0 text-right sm:inline">Modified</span>
              <span className="hidden w-[96px] shrink-0 text-right sm:inline">Uploaded</span>
              <span className="w-[17px] shrink-0" />
              <span className="w-4 shrink-0" />
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
                onShare={() => setSharing({ batchId: batch.id, fileId: file.id, title: file.title })}
                onDuplicate={() => duplicate(file)}
                onDelete={() => setDeleting(file)}
              />
              ))}
            </ul>
          </div>
        )}
      </div>

      {plan && (
        <div className="rounded-[9px] border border-[#ddd] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-[13px] border-b border-[#ddd] px-4 py-3">
            <p className="m-0 text-[0.9375rem] text-[#0b0b0b]">
              {formatBytes(plan.total)} in {plan.parts.length} parts &mdash; download them one at a
              time.
            </p>
            <button
              type="button"
              onClick={() => setPlan(null)}
              className="cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] text-[#1a56db] hover:text-[#143fa8]"
            >
              Done
            </button>
          </div>
          <ul className="m-0 flex list-none flex-col divide-y divide-[#ddd] p-0">
            {plan.parts.map((part) => (
              <li key={part.index} className="flex items-center gap-[13px] px-4 py-3">
                <span className="min-w-0 flex-1 text-[0.9375rem] text-[#0b0b0b]">
                  Part {part.index + 1} of {plan.parts.length}
                  {part.kind === 'file' && ' — on its own, too big to pack'}
                </span>
                <span className="shrink-0 font-mono text-[0.6875rem] text-[#6f6f6f]">
                  {part.count} file{part.count === 1 ? '' : 's'}
                </span>
                <span className="w-[68px] shrink-0 text-right font-mono text-[0.6875rem] text-[#6f6f6f]">
                  {formatBytes(part.bytes)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStarted((was) => new Set(was).add(part.index));
                    triggerDownload(partHref(part));
                  }}
                  className="w-[104px] shrink-0 cursor-pointer rounded-[9px] border border-[#0b0b0b] bg-white px-3 py-1.5 text-[0.875rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3]"
                >
                  {started.has(part.index) ? 'Again' : 'Download'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sharing && <ShareDialog target={sharing} onClose={() => setSharing(null)} onChanged={refresh} />}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          body="This can’t be undone, and any link to this file stops working."
          confirm="Delete file"
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}

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
  onShare,
  onDuplicate,
  onDelete,
}: {
  batchId: string;
  file: UploadFile;
  checked: boolean;
  onToggle: () => void;
  onPreview: (() => void) | null;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-[13px] px-4 py-3" data-testid="file-row">
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
      {file.uploadedBy ? (
        <span
          className="max-w-[8rem] shrink-0 truncate text-[0.8125rem] text-[#6f6f6f]"
          title={`Uploaded by ${file.uploadedBy}`}
          data-testid="uploader-name"
        >
          {uploaderFirstName(file.uploadedBy)}
        </span>
      ) : null}
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
      <span className="w-4 shrink-0">
        <ActionMenu
          label={`Manage ${file.title}`}
          items={[
            { label: 'Share', onSelect: onShare },
            { label: 'Duplicate', onSelect: onDuplicate },
            { label: 'Delete', onSelect: onDelete },
          ]}
        />
      </span>
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
