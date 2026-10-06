'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  searchTerms,
  shareStatus,
  type UploadBatch,
  type UploadShare,
} from '@/lib/uploads-shared';
import { useUploader } from '@/hooks/use-uploader';
import {
  ActionMenu,
  CARD,
  CARD_GRID,
  ConfirmDialog,
  DATE_FORMAT,
  INPUT,
  META,
  PendingList,
  SECTION_TITLE,
  plural,
} from './ui';
import {
  CopyLink,
  STATUS_LABEL,
  ShareDialog,
  accessLabel,
  describeShare,
  type ShareTarget,
} from './share-dialog';

const ACTION_CARD =
  'flex h-full min-h-[7.5rem] w-full cursor-pointer flex-col items-start justify-between gap-2 rounded-[9px] border border-[#ddd] bg-white p-4 text-left text-[#0b0b0b] no-underline transition-colors hover:border-[#0b0b0b] disabled:cursor-wait';

export function UploadsView({
  batches,
  shares,
  fileCount,
}: {
  batches: UploadBatch[];
  shares: UploadShare[];
  fileCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UploadBatch | null>(null);
  const [sharing, setSharing] = useState<{ target: ShareTarget; edit: UploadShare | null } | null>(
    null,
  );
  const refresh = useCallback(() => router.refresh(), [router]);
  const { pending, upload, dismiss } = useUploader(refresh);

  const matching = useMemo(() => {
    const terms = searchTerms(query);
    if (!terms.length) return batches;
    return batches.filter((batch) => terms.every((term) => batch.title.toLowerCase().includes(term)));
  }, [batches, query]);

  const createPage = async (): Promise<string | null> => {
    const res = await fetch('/api/uploads', { method: 'POST' }).catch(() => null);
    if (!res?.ok) return null;
    return ((await res.json()) as { id: string }).id;
  };

  const newPage = async () => {
    if (creating) return;
    setCreating(true);
    const id = await createPage();
    if (id) router.push(`/upload/${id}`);
    else setCreating(false);
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const id = await createPage();
    if (id) await upload(`/api/uploads/${id}`, files);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await fetch(`/api/uploads/${pendingDelete.id}`, { method: 'DELETE' }).catch(() => null);
    setPendingDelete(null);
    router.refresh();
  };

  const setRevoked = async (share: UploadShare, revoked: boolean) => {
    await fetch(`/api/uploads/shares/${share.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revoked }),
    }).catch(() => null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-[38px]">
      <section className="flex flex-col gap-[13px]">
        <ul className={CARD_GRID} data-testid="upload-actions">
          <li>
            <UploadCard onFiles={uploadFiles} />
          </li>
          <li>
            <button type="button" onClick={newPage} disabled={creating} className={ACTION_CARD}>
              <span className="text-2xl leading-none">+</span>
              <span>
                <span className="block text-base font-bold tracking-[-0.01em]">
                  {creating ? 'Creating…' : 'New page'}
                </span>
                <span className="text-[0.875rem] text-[#6f6f6f]">A place to collect files</span>
              </span>
            </button>
          </li>
          <li>
            <Link href="/upload/files" className={ACTION_CARD}>
              <span className="text-xl leading-none">≡</span>
              <span>
                <span className="block text-base font-bold tracking-[-0.01em]">All files</span>
                <span className="text-[0.875rem] text-[#6f6f6f]">
                  {plural(fileCount, 'file')} — search and filter
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/upload/analytics" className={ACTION_CARD}>
              <span className="text-xl leading-none">↗</span>
              <span>
                <span className="block text-base font-bold tracking-[-0.01em]">Analytics</span>
                <span className="text-[0.875rem] text-[#6f6f6f]">Uploads, downloads, links</span>
              </span>
            </Link>
          </li>
        </ul>
        <PendingList pending={pending} onDismiss={dismiss} />
      </section>

      <section className="flex flex-col gap-[13px]" data-testid="shared-section">
        <h2 className={SECTION_TITLE}>Shared</h2>
        {shares.length === 0 ? (
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">
            No share links yet. Open a page or a file&rsquo;s menu and pick Share.
          </p>
        ) : (
          <ul className={CARD_GRID}>
            {shares.map((share) => (
              <li key={share.id}>
                <ShareCard
                  share={share}
                  onEdit={() =>
                    setSharing({
                      target: {
                        batchId: share.batchId,
                        fileId: share.fileId,
                        title: share.fileTitle ?? share.batchTitle,
                      },
                      edit: share,
                    })
                  }
                  onToggle={() => setRevoked(share, share.revokedAt === null)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[13px]" data-testid="pages-section">
        <div className="flex flex-wrap items-center justify-between gap-[13px]">
          <h2 className={SECTION_TITLE}>All pages</h2>
          {batches.length > 0 && (
            <label>
              <span className="sr-only">Search pages</span>
              <input
                type="search"
                value={query}
                placeholder="Search pages"
                onChange={(event) => setQuery(event.target.value)}
                className={`${INPUT} w-60 max-w-full`}
              />
            </label>
          )}
        </div>

        {batches.length === 0 ? (
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No pages yet.</p>
        ) : (
          <ul className={CARD_GRID}>
            {matching.map((batch) => (
              <li key={batch.id}>
                <PageCard
                  batch={batch}
                  shared={shares.some(
                    (share) =>
                      share.batchId === batch.id && !share.fileId && shareStatus(share) === 'active',
                  )}
                  onShare={() =>
                    setSharing({
                      target: { batchId: batch.id, fileId: null, title: batch.title },
                      edit: null,
                    })
                  }
                  onDelete={() => setPendingDelete(batch)}
                />
              </li>
            ))}
          </ul>
        )}
        {matching.length === 0 && batches.length > 0 && (
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">No pages match that.</p>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.title}”?`}
          body={`This contains ${plural(pendingDelete.fileCount, 'uploaded file')}, ${formatBytes(pendingDelete.totalSize)}, and its share links stop working.`}
          confirm="Delete page"
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {sharing && (
        <ShareDialog
          target={sharing.target}
          initialEdit={sharing.edit}
          onClose={() => setSharing(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function UploadCard({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`${ACTION_CARD} border-dashed ${dragging ? 'border-[#0b0b0b]' : ''}`}
    >
      <span className="text-2xl leading-none">↑</span>
      <span>
        <span className="block text-base font-bold tracking-[-0.01em]">Upload files</span>
        <span className="text-[0.875rem] text-[#6f6f6f]">
          Drop or choose, up to {formatBytes(MAX_UPLOAD_BYTES)} each
        </span>
      </span>
      <input
        type="file"
        multiple
        className="hidden"
        data-testid="home-upload-input"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </label>
  );
}

function PageCard({
  batch,
  shared,
  onShare,
  onDelete,
}: {
  batch: UploadBatch;
  shared: boolean;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={CARD} data-testid="page-card">
      <Link href={`/upload/${batch.id}`} className="flex h-full flex-col gap-[13px] text-inherit no-underline">
        <span className="pr-[26px] text-base font-bold tracking-[-0.01em] break-words">{batch.title}</span>
        <span className={`mt-auto flex flex-wrap items-baseline gap-[13px] pt-[13px] ${META}`}>
          <span>{new Date(batch.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}</span>
          <span>{plural(batch.fileCount, 'file')}</span>
          <span>{formatBytes(batch.totalSize)}</span>
          {shared && <span className="text-[#1a56db]">Shared</span>}
        </span>
      </Link>
      <div className="absolute top-3.5 right-3.5">
        <ActionMenu
          label={`Actions for ${batch.title}`}
          items={[
            { label: 'Share', onSelect: onShare },
            { label: 'Delete page', onSelect: onDelete },
          ]}
        />
      </div>
    </div>
  );
}

function ShareCard({
  share,
  onEdit,
  onToggle,
}: {
  share: UploadShare;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const status = shareStatus(share);
  return (
    <div className={CARD} data-testid="share-card">
      <Link href={`/upload/${share.batchId}`} className="flex flex-col gap-1 text-inherit no-underline">
        <span className="pr-[26px] text-base font-bold tracking-[-0.01em] break-words">
          {share.label || share.fileTitle || share.batchTitle}
        </span>
        <span className="text-[0.875rem] text-[#6f6f6f]">
          {accessLabel(share)}
          {share.label ? ` · ${share.fileTitle ?? share.batchTitle}` : ''}
        </span>
      </Link>
      <span className={`mt-auto pt-[13px] ${META}`}>{describeShare(share).join(' · ')}</span>
      <div className="flex items-center justify-between gap-[13px] pt-[13px]">
        <span
          className={`text-[0.8125rem] font-medium ${status === 'active' ? 'text-[#0b0b0b]' : 'text-[#a8a8a8]'}`}
        >
          {STATUS_LABEL[status]}
        </span>
        <CopyLink token={share.token} />
      </div>
      <div className="absolute top-3.5 right-3.5">
        <ActionMenu
          label={`Actions for share ${share.label || share.batchTitle}`}
          items={[
            { label: 'Edit link', onSelect: onEdit },
            { label: share.revokedAt === null ? 'Turn off' : 'Turn on', onSelect: onToggle },
          ]}
        />
      </div>
    </div>
  );
}
