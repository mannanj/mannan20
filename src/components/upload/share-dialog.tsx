'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DURATION_UNITS,
  formatBytes,
  shareStatus,
  shareUrl,
  type DurationUnit,
  type ShareSettings,
  type ShareStatus,
  type UploadShare,
} from '@/lib/uploads-shared';
import { copyToClipboard } from '@/lib/utils';
import { DATE_TIME_FORMAT, Dialog, INPUT, LINK_BUTTON, META, PRIMARY_BUTTON, DARK_BUTTON } from './ui';

const COPIED_MS = 1600;
const BYTE_UNITS = { MB: 1024 * 1024, GB: 1024 * 1024 * 1024 } as const;
type ByteUnit = keyof typeof BYTE_UNITS;

export const STATUS_LABEL: Record<ShareStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Turned off',
  'used-up': 'Used up',
};

export interface ShareTarget {
  batchId: string;
  fileId: string | null;
  title: string;
}

type Lasting = 'keep' | 'forever' | DurationUnit;

interface FormState {
  label: string;
  canRead: boolean;
  canWrite: boolean;
  lasting: Lasting;
  amount: string;
  maxUploads: string;
  maxDownloads: string;
  capacity: string;
  capacityUnit: ByteUnit;
}

function blankForm(isFile: boolean): FormState {
  return {
    label: '',
    canRead: isFile,
    canWrite: !isFile,
    lasting: 'days',
    amount: '7',
    maxUploads: '',
    maxDownloads: isFile ? '' : '',
    capacity: '',
    capacityUnit: 'GB',
  };
}

function formFor(share: UploadShare): FormState {
  const gb = share.maxBytes !== null && share.maxBytes % BYTE_UNITS.GB === 0;
  return {
    label: share.label,
    canRead: share.canRead,
    canWrite: share.canWrite,
    lasting: share.expiresAt === null ? 'forever' : 'keep',
    amount: '1',
    maxUploads: share.maxUploads === null ? '' : String(share.maxUploads),
    maxDownloads: share.maxDownloads === null ? '' : String(share.maxDownloads),
    capacity:
      share.maxBytes === null
        ? ''
        : String(share.maxBytes / BYTE_UNITS[gb ? 'GB' : 'MB']),
    capacityUnit: gb || share.maxBytes === null ? 'GB' : 'MB',
  };
}

function count(raw: string): number | null {
  const value = Number(raw);
  return raw.trim() && Number.isInteger(value) && value > 0 ? value : null;
}

function toSettings(form: FormState, editing: boolean): ShareSettings {
  const settings: ShareSettings = {
    label: form.label.trim(),
    canRead: form.canRead,
    canWrite: form.canWrite,
    maxUploads: form.canWrite ? count(form.maxUploads) : null,
    maxDownloads: form.canRead ? count(form.maxDownloads) : null,
    maxBytes:
      form.canWrite && Number(form.capacity) > 0
        ? Math.round(Number(form.capacity) * BYTE_UNITS[form.capacityUnit])
        : null,
  };
  if (form.lasting === 'forever') settings.expiresInMs = null;
  else if (form.lasting !== 'keep') {
    const amount = Math.max(1, Math.round(Number(form.amount) || 1));
    settings.expiresInMs = amount * DURATION_UNITS[form.lasting];
  } else if (!editing) settings.expiresInMs = null;
  return settings;
}

export function describeShare(share: UploadShare): string[] {
  const parts: string[] = [];
  if (share.canWrite) {
    parts.push(
      share.maxUploads === null
        ? `${share.uploadCount} uploaded`
        : `${share.uploadCount}/${share.maxUploads} uploads`,
    );
    if (share.maxBytes !== null) {
      parts.push(`${formatBytes(share.usedBytes)} of ${formatBytes(share.maxBytes)}`);
    }
  }
  if (share.canRead) {
    parts.push(
      share.maxDownloads === null
        ? `${share.downloadCount} downloads`
        : `${share.downloadCount}/${share.maxDownloads} downloads`,
    );
  }
  parts.push(
    share.expiresAt === null
      ? 'No time limit'
      : `${share.expiresAt > Date.now() ? 'Until' : 'Ended'} ${new Date(share.expiresAt).toLocaleString('en-US', DATE_TIME_FORMAT)}`,
  );
  return parts;
}

export function accessLabel(share: Pick<UploadShare, 'canRead' | 'canWrite' | 'fileId'>): string {
  if (share.fileId) return 'File download';
  if (share.canRead && share.canWrite) return 'Upload + view';
  return share.canWrite ? 'Upload only' : 'View only';
}

export function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        copyToClipboard(shareUrl(window.location.origin, token));
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_MS);
      }}
      className={LINK_BUTTON}
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

export function ShareDialog({
  target,
  initialEdit = null,
  onClose,
  onChanged,
}: {
  target: ShareTarget;
  initialEdit?: UploadShare | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const isFile = target.fileId !== null;
  const [shares, setShares] = useState<UploadShare[] | null>(null);
  const [editing, setEditing] = useState<UploadShare | 'new' | null>(initialEdit);

  const load = useCallback(async () => {
    const res = await fetch('/api/uploads/shares').catch(() => null);
    if (!res?.ok) return setShares([]);
    const { shares: all } = (await res.json()) as { shares: UploadShare[] };
    setShares(
      all.filter((share) =>
        isFile ? share.fileId === target.fileId : share.batchId === target.batchId && !share.fileId,
      ),
    );
  }, [isFile, target.batchId, target.fileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || shares === null) return;
    opened.current = true;
    if (shares.length === 0 && !initialEdit) setEditing('new');
  }, [shares, initialEdit]);

  const changed = async () => {
    setEditing(null);
    await load();
    onChanged?.();
  };

  const setRevoked = async (share: UploadShare, revoked: boolean) => {
    await fetch(`/api/uploads/shares/${share.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revoked }),
    }).catch(() => null);
    await changed();
  };

  return (
    <Dialog label={`Share ${target.title}`} onClose={onClose} wide>
      <div className="flex flex-col gap-[22px]" data-testid="share-dialog">
        <div className="flex items-start justify-between gap-[13px]">
          <h3 className="m-0 min-w-0 text-[1.25rem] font-bold tracking-[-0.01em] break-words">
            Share {target.title}
          </h3>
          <button type="button" onClick={onClose} className={LINK_BUTTON}>
            Done
          </button>
        </div>

        {editing ? (
          <ShareForm
            target={target}
            share={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={changed}
            canCancel={Boolean(shares?.length) || editing !== 'new'}
          />
        ) : (
          <>
            {shares === null ? (
              <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">Loading…</p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[#ddd] rounded-[9px] border border-[#ddd] p-0">
                {shares.map((share) => {
                  const status = shareStatus(share);
                  return (
                    <li key={share.id} className="flex flex-col gap-1.5 px-4 py-3" data-testid="share-row">
                      <div className="flex flex-wrap items-baseline justify-between gap-[13px]">
                        <span className="text-[0.9375rem] font-medium">
                          {share.label || accessLabel(share)}
                        </span>
                        <span
                          className={`text-[0.8125rem] ${status === 'active' ? 'text-[#0b0b0b]' : 'text-[#6f6f6f]'}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <span className={META}>{describeShare(share).join(' · ')}</span>
                      <div className="flex flex-wrap gap-[13px] pt-1">
                        <CopyLink token={share.token} />
                        <button type="button" onClick={() => setEditing(share)} className={LINK_BUTTON}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevoked(share, share.revokedAt === null)}
                          className={LINK_BUTTON}
                        >
                          {share.revokedAt === null ? 'Turn off' : 'Turn on'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={() => setEditing('new')} className={`${PRIMARY_BUTTON} self-start`}>
              New link
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.875rem] text-[#6f6f6f]">
      {label}
      {children}
    </label>
  );
}

function ShareForm({
  target,
  share,
  onCancel,
  onSaved,
  canCancel,
}: {
  target: ShareTarget;
  share: UploadShare | null;
  onCancel: () => void;
  onSaved: () => void;
  canCancel: boolean;
}) {
  const isFile = target.fileId !== null;
  const [form, setForm] = useState<FormState>(() => (share ? formFor(share) : blankForm(isFile)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((was) => ({ ...was, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.canRead && !form.canWrite) {
      setError('Pick at least one: upload or view.');
      return;
    }
    setBusy(true);
    setError(null);
    const body = toSettings(form, share !== null);
    const res = await fetch(share ? `/api/uploads/shares/${share.id}` : '/api/uploads/shares', {
      method: share ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(share ? body : { ...body, batchId: target.batchId, fileId: target.fileId }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const detail = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(detail?.error ?? 'Could not save.');
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-[22px]" data-testid="share-form">
      {!isFile && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[0.875rem] text-[#6f6f6f]">People with the link can</legend>
          <label className="flex items-center gap-2 text-[0.9375rem]">
            <input
              type="checkbox"
              checked={form.canWrite}
              onChange={(event) => set('canWrite', event.target.checked)}
              className="h-4 w-4 accent-[#1a56db]"
            />
            Upload files
          </label>
          <label className="flex items-center gap-2 text-[0.9375rem]">
            <input
              type="checkbox"
              checked={form.canRead}
              onChange={(event) => set('canRead', event.target.checked)}
              className="h-4 w-4 accent-[#1a56db]"
            />
            View and download files
          </label>
          <p className="m-0 text-[0.8125rem] text-[#6f6f6f]">Nobody but you can delete anything.</p>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.875rem] text-[#6f6f6f]">Lasts</span>
        <div className="flex gap-2">
          {form.lasting !== 'keep' && form.lasting !== 'forever' && (
            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) => set('amount', event.target.value)}
              aria-label="Duration amount"
              className={`${INPUT} w-24`}
            />
          )}
          <select
            value={form.lasting}
            onChange={(event) => set('lasting', event.target.value as Lasting)}
            aria-label="Duration unit"
            className={`${INPUT} min-w-0 flex-1`}
          >
            {share?.expiresAt !== null && share && (
              <option value="keep">
                Keep current ({new Date(share.expiresAt!).toLocaleString('en-US', DATE_TIME_FORMAT)})
              </option>
            )}
            <option value="minutes">Minutes from now</option>
            <option value="hours">Hours from now</option>
            <option value="days">Days from now</option>
            <option value="forever">No time limit</option>
          </select>
        </div>
      </div>

      {form.canWrite && (
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2">
          <Field label="Uploads allowed">
            <input
              type="number"
              min={1}
              value={form.maxUploads}
              placeholder="Unlimited"
              onChange={(event) => set('maxUploads', event.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Total size allowed">
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={form.capacity}
                placeholder="Unlimited"
                onChange={(event) => set('capacity', event.target.value)}
                aria-label="Total size allowed"
                className={`${INPUT} min-w-0 flex-1`}
              />
              <select
                value={form.capacityUnit}
                onChange={(event) => set('capacityUnit', event.target.value as ByteUnit)}
                aria-label="Size unit"
                className={INPUT}
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </Field>
        </div>
      )}

      {form.canRead && (
        <Field label="Downloads allowed">
          <input
            type="number"
            min={1}
            value={form.maxDownloads}
            placeholder="Unlimited"
            onChange={(event) => set('maxDownloads', event.target.value)}
            className={INPUT}
          />
        </Field>
      )}

      <Field label="Name (only you see this)">
        <input
          value={form.label}
          maxLength={120}
          placeholder={isFile ? 'File download' : 'e.g. Photos from Sam'}
          onChange={(event) => set('label', event.target.value)}
          className={INPUT}
        />
      </Field>

      {error && <p className="m-0 text-[0.875rem] text-[#c1121f]">{error}</p>}

      <div className="flex items-center gap-3">
        {canCancel && (
          <button type="button" onClick={onCancel} className={PRIMARY_BUTTON}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy} className={DARK_BUTTON}>
          {busy ? 'Saving…' : share ? 'Save' : 'Create link'}
        </button>
      </div>
    </form>
  );
}
