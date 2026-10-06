'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { canPreviewImage, formatBytes, uploaderFirstName, type UploadFileEntry } from '@/lib/uploads-shared';
import { FilePreview, FileThumb, ShareIconButton, type PreviewItem } from './file-preview';
import { ActionMenu, ConfirmDialog, DATE_FORMAT, META, SECTION_TITLE } from './ui';
import { ShareDialog, type ShareTarget } from './share-dialog';
import { FileBrowser } from './file-browser';

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function previewItem(file: UploadFileEntry): PreviewItem {
  const download = `/api/uploads/${file.batchId}/download?file=${file.id}`;
  return {
    id: file.id,
    title: file.title,
    size: file.size,
    contentType: file.contentType,
    createdAt: file.createdAt,
    modifiedAt: file.modifiedAt,
    pageTitle: file.batchTitle,
    uploadedBy: file.uploadedBy,
    previewUrl: canPreviewImage(file.contentType, file.size) ? `${download}&inline=1` : null,
    downloadUrl: download,
  };
}

export function FilesExplorer({ files }: { files: UploadFileEntry[] }) {
  const router = useRouter();
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [deleting, setDeleting] = useState<UploadFileEntry | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const items = useMemo(() => files.map(previewItem), [files]);
  const shareFile = (file: { id: string; title: string }, batchId: string) =>
    setSharing({ batchId, fileId: file.id, title: file.title });
  const refresh = useCallback(() => router.refresh(), [router]);

  const duplicate = async (file: UploadFileEntry) => {
    await fetch(`/api/uploads/${file.batchId}/files/${file.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate' }),
    }).catch(() => null);
    refresh();
  };

  const remove = async (file: UploadFileEntry) => {
    await fetch(`/api/uploads/${file.batchId}/files/${file.id}`, { method: 'DELETE' }).catch(
      () => null,
    );
    setDeleting(null);
    refresh();
  };

  return (
    <section className="flex flex-col gap-[22px]" data-testid="files-explorer">
      <div className="flex flex-col gap-[13px]">
        <Link href="/upload" className="text-[0.9375rem] text-[#1a56db] no-underline hover:text-[#143fa8]">
          &larr; Upload
        </Link>
        <h2 className={SECTION_TITLE}>All files</h2>
      </div>

      <FileBrowser
        files={files}
        renderRow={(file, groupBy) => (
          <li key={file.id} className="flex items-center gap-[13px] px-4 py-3" data-testid="explorer-row">
            <FileThumb title={file.title} previewUrl={items[files.indexOf(file)]?.previewUrl ?? null} />
            <div className="flex min-w-0 flex-1 flex-col">
              <button
                type="button"
                onClick={() => setPreviewIndex(files.indexOf(file))}
                title={`Open ${file.title}`}
                className="cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[0.9375rem] font-medium text-[#0b0b0b] hover:text-[#1a56db] hover:underline hover:underline-offset-[3px]"
              >
                {file.title}
              </button>
              <span className={`truncate ${META}`}>
                <Link href={`/upload/${file.batchId}`} className="text-[#6f6f6f] hover:text-[#0b0b0b]">
                  {file.batchTitle}
                </Link>
                {file.viaShare ? ' · via link' : ''}
                {file.uploadedBy ? (
                  <span title={file.uploadedBy} data-testid="uploader-name">
                    {' · '}
                    {uploaderFirstName(file.uploadedBy)}
                  </span>
                ) : null}
              </span>
            </div>
            <span className={`w-[68px] shrink-0 text-right ${META}`}>{formatBytes(file.size)}</span>
            <span className={`hidden w-[120px] shrink-0 text-right sm:inline ${META}`}>
              {new Date(file.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}{' '}
              {groupBy === 'day' ? new Date(file.createdAt).toLocaleTimeString('en-US', TIME_FORMAT) : ''}
            </span>
            <a
              href={`/api/uploads/${file.batchId}/download?file=${file.id}`}
              aria-label={`Download ${file.title}`}
              className="w-[17px] shrink-0 text-[#6f6f6f] hover:text-[#0b0b0b]"
            >
              <svg viewBox="0 0 16 16" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2v8" />
                <path d="M4.5 7L8 10.5 11.5 7" />
                <path d="M2.5 13h11" />
              </svg>
            </a>
            <ShareIconButton label={`Share ${file.title}`} onClick={() => shareFile(file, file.batchId)} />
            <span className="w-4 shrink-0">
              <ActionMenu
                label={`Manage ${file.title}`}
                items={[
                  {
                    label: 'Share',
                    onSelect: () => setSharing({ batchId: file.batchId, fileId: file.id, title: file.title }),
                  },
                  { label: 'Duplicate', onSelect: () => duplicate(file) },
                  { label: 'Delete', onSelect: () => setDeleting(file) },
                ]}
              />
            </span>
          </li>
        )}
      />

      {previewIndex !== null && (
        <FilePreview
          items={items}
          index={previewIndex}
          onIndex={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
          onShare={(item) => shareFile(item, files[items.indexOf(item)].batchId)}
          menu={(item) => {
            const file = files[items.indexOf(item)];
            return [
              { label: 'Share', onSelect: () => shareFile(file, file.batchId) },
              { label: 'Duplicate', onSelect: () => duplicate(file) },
              {
                label: 'Delete',
                onSelect: () => {
                  setPreviewIndex(null);
                  setDeleting(file);
                },
              },
            ];
          }}
        />
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
    </section>
  );
}
