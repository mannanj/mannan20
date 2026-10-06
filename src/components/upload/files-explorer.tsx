'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatBytes, uploaderFirstName, type UploadFileEntry } from '@/lib/uploads-shared';
import { ActionMenu, ConfirmDialog, DATE_FORMAT, META, SECTION_TITLE } from './ui';
import { ShareDialog, type ShareTarget } from './share-dialog';
import { FileBrowser } from './file-browser';

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

export function FilesExplorer({ files }: { files: UploadFileEntry[] }) {
  const router = useRouter();
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [deleting, setDeleting] = useState<UploadFileEntry | null>(null);
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
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[0.9375rem] font-medium" title={file.title}>
                {file.title}
              </span>
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
