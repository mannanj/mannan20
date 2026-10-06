'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOADER_NAME,
  canPreviewImage,
  formatBytes,
  uploaderFirstName,
  type BrowsableFile,
} from '@/lib/uploads-shared';
import { useUploader } from '@/hooks/use-uploader';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  DropZone,
  INPUT,
  META,
  PRIMARY_BUTTON,
  PendingList,
  SECTION_TITLE,
  plural,
} from './ui';
import { FileBrowser } from './file-browser';
import { FilePreview, FileThumb, type PreviewItem } from './file-preview';
import { SignInForm } from './upload-locked';

const NAME_KEY = 'upload-share-name';

function readSavedName(): { first: string; last: string } {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NAME_KEY) ?? 'null') as {
      first?: unknown;
      last?: unknown;
    } | null;
    return {
      first: typeof parsed?.first === 'string' ? parsed.first : '',
      last: typeof parsed?.last === 'string' ? parsed.last : '',
    };
  } catch {
    return { first: '', last: '' };
  }
}

function saveName(first: string, last: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, JSON.stringify({ first, last }));
  } catch {}
}

export function ShareRecipient({
  token,
  title,
  isFile,
  active,
  readable,
  writable,
  needsSignIn,
  files,
  signedInAs,
  expiresAt,
  uploadsLeft,
  bytesLeft,
  downloadsLeft,
}: {
  token: string;
  title: string;
  isFile: boolean;
  active: boolean;
  readable: boolean;
  writable: boolean;
  needsSignIn: boolean;
  files: BrowsableFile[];
  signedInAs: string | null;
  expiresAt: number | null;
  uploadsLeft: number | null;
  bytesLeft: number | null;
  downloadsLeft: number | null;
}) {
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = readSavedName();
    setFirstName(saved.first);
    setLastName(saved.last);
  }, []);

  const refresh = useCallback(
    (uploaded: number) => {
      setDone((was) => was + uploaded);
      router.refresh();
    },
    [router],
  );
  const { pending, upload, dismiss } = useUploader(refresh);
  const base = `/api/uploads/s/${token}`;
  const items: PreviewItem[] = files.map((file) => ({
    id: file.id,
    title: file.title,
    size: file.size,
    contentType: file.contentType,
    createdAt: file.createdAt,
    modifiedAt: file.modifiedAt,
    uploadedBy: file.uploadedBy,
    previewUrl: canPreviewImage(file.contentType, file.size) ? `${base}/preview?file=${file.id}` : null,
    downloadUrl: `${base}/download?file=${file.id}`,
  }));
  const named = Boolean(firstName.trim() && lastName.trim());
  const canUpload = named || signedInAs !== null;

  const send = (chosen: File[]) => {
    if (!canUpload || !chosen.length) return;
    if (named) saveName(firstName.trim(), lastName.trim());
    void upload(base, chosen, named ? { firstName: firstName.trim(), lastName: lastName.trim() } : {});
  };

  const limits: string[] = [];
  if (writable && uploadsLeft !== null) limits.push(`${plural(uploadsLeft, 'upload')} left`);
  if (writable && bytesLeft !== null) limits.push(`${formatBytes(bytesLeft)} left`);
  if (readable && downloadsLeft !== null) limits.push(`${plural(downloadsLeft, 'download')} left`);
  if (expiresAt !== null) {
    limits.push(`Open until ${new Date(expiresAt).toLocaleString('en-US', DATE_TIME_FORMAT)}`);
  }

  const thanks =
    done > 0 ? (
      <p className="m-0 text-[0.9375rem]" data-testid="share-uploaded">
        Uploaded {plural(done, 'file')}. Thank you.
      </p>
    ) : null;

  const heading = (
    <div className="flex flex-col gap-1.5">
      <h2 className="m-0 text-[1.5rem] font-bold tracking-[-0.02em] break-words">{title}</h2>
      {limits.length > 0 && <p className={`m-0 ${META}`}>{limits.join(' · ')}</p>}
    </div>
  );

  if (!active || (!readable && !writable && !needsSignIn)) {
    if (thanks) {
      return (
        <section className="flex flex-col gap-[13px]" data-testid="share-done">
          {heading}
          {thanks}
          <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">This link is now closed.</p>
        </section>
      );
    }
    return (
      <section className="flex flex-col gap-[13px]" data-testid="share-unavailable">
        <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">This link is no longer available.</h2>
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">Ask the person who sent it for a new one.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-[38px]" data-testid="share-recipient">
      {heading}

      {needsSignIn && (
        <div className="flex flex-col gap-[13px]">
          <p className="m-0 text-[0.9375rem]">Sign in to use this link.</p>
          <SignInForm />
        </div>
      )}

      {writable && (
        <div className="flex flex-col gap-[13px]">
          <div className="flex flex-col gap-1.5">
            <div className="grid max-w-[30rem] grid-cols-2 gap-2" data-testid="uploader-name-fields">
              <label className="flex min-w-0 flex-col gap-1.5 text-[0.875rem] text-[#6f6f6f]">
                First name
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  maxLength={MAX_UPLOADER_NAME / 2}
                  className={`${INPUT} min-w-0`}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-[0.875rem] text-[#6f6f6f]">
                Last name
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  maxLength={MAX_UPLOADER_NAME / 2}
                  className={`${INPUT} min-w-0`}
                />
              </label>
            </div>
            <p className="m-0 text-[0.8125rem] text-[#6f6f6f]">
              {signedInAs
                ? `Optional — your uploads show as ${signedInAs} otherwise.`
                : 'So Mannan knows who sent these.'}
            </p>
          </div>
          <DropZone
            onFiles={send}
            disabled={!canUpload}
            hint={
              canUpload
                ? `Drop files here — up to ${formatBytes(Math.min(MAX_UPLOAD_BYTES, bytesLeft ?? MAX_UPLOAD_BYTES))} each`
                : 'Add your first and last name to upload'
            }
          />
          <PendingList pending={pending} onDismiss={dismiss} />
          {thanks}
        </div>
      )}

      {readable && (
        <div className="flex flex-col gap-[13px]" data-testid="share-uploaded-section">
          <div className="flex flex-wrap items-center justify-between gap-[13px]">
            <h2 className={SECTION_TITLE}>Uploaded</h2>
            {!isFile && files.length > 1 && (
              <a href={`${base}/download`} className={`${PRIMARY_BUTTON} no-underline`}>
                Download all
              </a>
            )}
          </div>
          <FileBrowser
            files={files}
            emptyText="No files here yet."
            renderRow={(file) => (
              <li key={file.id} className="flex items-center gap-[13px] px-4 py-3" data-testid="shared-file">
                <FileThumb title={file.title} previewUrl={items[files.indexOf(file)]?.previewUrl ?? null} />
                <button
                  type="button"
                  onClick={() => setPreviewIndex(files.indexOf(file))}
                  title={`Open ${file.title}`}
                  className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[0.9375rem] font-medium text-[#0b0b0b] hover:text-[#1a56db] hover:underline hover:underline-offset-[3px]"
                >
                  {file.title}
                </button>
                {file.uploadedBy ? (
                  <span
                    className="max-w-[8rem] shrink-0 truncate text-[0.8125rem] text-[#6f6f6f]"
                    title={`Uploaded by ${file.uploadedBy}`}
                    data-testid="uploader-name"
                  >
                    {uploaderFirstName(file.uploadedBy)}
                  </span>
                ) : null}
                <span className={`w-[68px] shrink-0 text-right ${META}`}>{formatBytes(file.size)}</span>
                <span className={`hidden w-[96px] shrink-0 text-right sm:inline ${META}`}>
                  {new Date(file.createdAt).toLocaleDateString('en-US', DATE_FORMAT)}
                </span>
                <a
                  href={`${base}/download?file=${file.id}`}
                  className="shrink-0 text-[0.9375rem] text-[#1a56db] no-underline hover:text-[#143fa8]"
                >
                  Download
                </a>
              </li>
            )}
          />
        </div>
      )}

      {previewIndex !== null && (
        <FilePreview
          items={items}
          index={previewIndex}
          onIndex={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </section>
  );
}
