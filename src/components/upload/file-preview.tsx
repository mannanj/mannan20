'use client';

import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/uploads-shared';
import { ActionMenu, DATE_TIME_FORMAT, LINK_BUTTON, PRIMARY_BUTTON, type MenuItem } from './ui';

export interface PreviewItem {
  id: string;
  title: string;
  size: number;
  contentType: string;
  createdAt: number;
  modifiedAt?: number | null;
  pageTitle?: string;
  uploadedBy?: string | null;
  previewUrl: string | null;
  downloadUrl: string;
}

const ICON_BUTTON =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[#6f6f6f] hover:bg-[#f3f3f3] hover:text-[#0b0b0b]';

export function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="3.5" r="1.8" />
      <circle cx="4" cy="8" r="1.8" />
      <circle cx="12" cy="12.5" r="1.8" />
      <path d="M5.6 7.1l4.8-2.7M5.6 8.9l4.8 2.7" />
    </svg>
  );
}

export function ShareIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title="Share" onClick={onClick} className="flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#6f6f6f] hover:text-[#0b0b0b]">
      <ShareIcon />
    </button>
  );
}

function extension(title: string): string {
  const dot = title.lastIndexOf('.');
  return dot > 0 && title.length - dot <= 5 ? title.slice(dot + 1).toUpperCase() : '';
}

export function FileThumb({ title, previewUrl }: { title: string; previewUrl: string | null }) {
  const [broken, setBroken] = useState(false);
  if (previewUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-8 w-8 shrink-0 rounded-md border border-[#ddd] bg-[#f3f3f3] object-cover"
        data-testid="file-thumb"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#ddd] bg-[#fafafa] font-mono text-[0.5rem] font-semibold text-[#6f6f6f]"
      data-testid="file-icon"
    >
      {extension(title) || 'FILE'}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.75rem] text-[#6f6f6f]">{label}</dt>
      <dd className="m-0 text-[0.9375rem] break-words">{value}</dd>
    </div>
  );
}

export function FilePreview({
  items,
  index,
  onIndex,
  onClose,
  onShare,
  menu,
}: {
  items: PreviewItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  onShare?: (item: PreviewItem) => void;
  menu?: (item: PreviewItem) => MenuItem[];
}) {
  const item = items[index];

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  const when = (value: number) => new Date(value).toLocaleString('en-US', { ...DATE_TIME_FORMAT, year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 sm:items-center sm:px-5 sm:py-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${item.title}`}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[48rem] flex-col overflow-y-auto bg-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:max-h-full sm:rounded-[9px]"
        data-testid="file-preview"
      >
        <div className="flex items-center gap-2 border-b border-[#ddd] px-4 py-3">
          <h3 className="m-0 min-w-0 flex-1 truncate text-base font-bold tracking-[-0.01em]" title={item.title}>
            {item.title}
          </h3>
          {onShare && (
            <button type="button" aria-label={`Share ${item.title}`} title="Share" onClick={() => onShare(item)} className={ICON_BUTTON} data-testid="preview-share">
              <ShareIcon />
            </button>
          )}
          {menu && (
            <span className="flex h-8 w-8 items-center justify-center">
              <ActionMenu label={`Manage ${item.title}`} items={menu(item)} />
            </span>
          )}
          <button type="button" aria-label="Close preview" onClick={onClose} className={ICON_BUTTON}>
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-[14rem] items-center justify-center bg-[#f3f3f3] p-4">
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt={item.title} className="max-h-[60vh] max-w-full rounded-md object-contain" data-testid="preview-image" />
          ) : (
            <p className="m-0 text-[0.9375rem] text-[#6f6f6f]" data-testid="preview-unavailable">
              Preview not available for this file type.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-[22px] p-4">
          <dl className="m-0 grid grid-cols-2 gap-x-[22px] gap-y-[13px] sm:grid-cols-3" data-testid="preview-details">
            <Detail label="Size" value={formatBytes(item.size)} />
            <Detail label="Type" value={item.contentType.split(';')[0] || 'Unknown'} />
            <Detail label="Uploaded" value={when(item.createdAt)} />
            <Detail label="Modified" value={item.modifiedAt ? when(item.modifiedAt) : '—'} />
            {item.pageTitle && <Detail label="Page" value={item.pageTitle} />}
            {item.uploadedBy && <Detail label="Uploaded by" value={item.uploadedBy} />}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-[13px]">
            <a href={item.downloadUrl} className={`${PRIMARY_BUTTON} no-underline`} data-testid="preview-download">
              Download
            </a>
            {items.length > 1 && (
              <div className="flex items-center gap-[13px] text-[0.875rem] text-[#6f6f6f]">
                <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)} className={`${LINK_BUTTON} disabled:cursor-default disabled:text-[#a8a8a8]`}>
                  ‹ Previous
                </button>
                <span>
                  {index + 1} of {items.length}
                </span>
                <button type="button" disabled={index === items.length - 1} onClick={() => onIndex(index + 1)} className={`${LINK_BUTTON} disabled:cursor-default disabled:text-[#a8a8a8]`}>
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
