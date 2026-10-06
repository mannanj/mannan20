'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatBytes } from '@/lib/uploads-shared';
import type { PendingUpload } from '@/hooks/use-uploader';

export const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

export const PRIMARY_BUTTON =
  'cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3] disabled:cursor-wait disabled:opacity-60';

export const DARK_BUTTON =
  'cursor-pointer rounded-[9px] border-2 border-[#1f2937] bg-[#1f2937] px-4 py-2 text-[0.9375rem] font-medium text-white hover:bg-[#111827] disabled:cursor-wait disabled:opacity-70';

export const LINK_BUTTON =
  'cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] text-[#1a56db] hover:text-[#143fa8]';

export const INPUT =
  'rounded-[9px] border border-[#a8a8a8] bg-white px-3 py-[9px] text-[0.9375rem] text-[#0b0b0b] outline-none placeholder:text-[#a8a8a8] hover:border-[#0b0b0b] focus:border-[#0b0b0b]';

export const CARD =
  'relative flex h-full min-h-[9.5rem] flex-col rounded-[9px] border border-[#ddd] bg-white p-4 transition-colors hover:border-[#0b0b0b]';

export const META = 'font-mono text-[0.6875rem] text-[#6f6f6f]';

export const SECTION_TITLE = 'm-0 text-[1.25rem] font-bold tracking-[-0.01em]';

export const CARD_GRID =
  'm-0 grid list-none grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-[13px] p-0';

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function useDismiss(open: boolean, close: () => void) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, close]);
  return wrapper;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
}

export function ActionMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useDismiss(open, () => setOpen(false));

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        aria-label={label}
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
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-left text-[0.9375rem] text-[#0b0b0b] hover:bg-[#f3f3f3]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dialog({
  label,
  onClose,
  children,
  wide = false,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-5 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={`max-h-full w-full overflow-y-auto rounded-[9px] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${
          wide ? 'max-w-[32rem]' : 'max-w-[23rem]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirm,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: ReactNode;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog label={title} onClose={onCancel}>
      <h3 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 mb-0 text-[0.9375rem] leading-6 text-[#0b0b0b]">{body}</p>
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={onCancel} className={PRIMARY_BUTTON}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
          }}
          className={DARK_BUTTON}
        >
          {busy ? 'Working…' : confirm}
        </button>
      </div>
    </Dialog>
  );
}

export function PendingList({
  pending,
  onDismiss,
}: {
  pending: PendingUpload[];
  onDismiss?: () => void;
}) {
  if (!pending.length) return null;
  const failed = pending.some((item) => item.error);
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid="upload-pending">
        {pending.map((item) => (
          <li key={item.key} className="flex items-baseline gap-[13px] text-[0.9375rem]">
            <span className="min-w-0 truncate text-[#0b0b0b]">{item.name}</span>
            <span className={META}>{formatBytes(item.size)}</span>
            <span className={item.error ? 'text-[#c1121f]' : 'text-[#6f6f6f]'}>
              {item.error ?? (item.progress ? `${item.progress}%` : 'Uploading…')}
            </span>
          </li>
        ))}
      </ul>
      {failed && onDismiss && (
        <button type="button" onClick={onDismiss} className={`${LINK_BUTTON} self-start`}>
          Clear errors
        </button>
      )}
    </div>
  );
}

export function DropZone({
  onFiles,
  hint,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  hint: string;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onFiles([...event.dataTransfer.files]);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed bg-white p-8 text-center transition-colors ${
        dragging ? 'border-[#0b0b0b]' : 'border-[#ddd]'
      }`}
    >
      <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">{hint}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => picker.current?.click()}
        className={PRIMARY_BUTTON}
      >
        Choose files
      </button>
      <input
        ref={picker}
        type="file"
        multiple
        className="hidden"
        data-testid="upload-input"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
