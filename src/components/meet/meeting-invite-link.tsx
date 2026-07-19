'use client';

import { useRef, useState } from 'react';
import {
  createMeetingInvite,
  type MeetingInviteResult,
} from '@/lib/meeting-invite';

async function copyText(value: string, input: HTMLInputElement | null): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (!input) throw new Error('Clipboard unavailable');
  input.focus();
  input.select();
  if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
}

export function MeetingInviteLink({
  meetingId,
  version,
  expiresAt,
  onVersionChange,
}: {
  meetingId: string;
  version: number;
  expiresAt: string;
  onVersionChange(version: number): void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invite, setInvite] = useState<MeetingInviteResult | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'creating' | 'ready' | 'copied' | 'error'
  >('idle');

  const create = async () => {
    setStatus('creating');
    try {
      const result = await createMeetingInvite({
        meetingId,
        version,
        expiresAt,
        origin: window.location.origin,
      });
      setInvite(result);
      onVersionChange(result.version);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const copy = async () => {
    if (!invite) return;
    try {
      await copyText(invite.shareUrl, inputRef.current);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="w-full sm:w-auto">
      {invite ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
          <input
            ref={inputRef}
            readOnly
            aria-label="Private meeting link"
            value={invite.shareUrl}
            className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white/45 outline-none sm:w-52"
          />
          <button
            type="button"
            onClick={copy}
            className="min-h-9 shrink-0 rounded-md bg-[#f1efe8] px-3 text-xs font-medium text-[#11110f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
          >
            {status === 'copied' ? 'Copied' : 'Copy private link'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={status === 'creating'}
          onClick={create}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-4 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-50 sm:w-auto"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.15 1.15" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.15-1.15" />
          </svg>
          {status === 'creating' ? 'Creating link…' : 'Invite people'}
        </button>
      )}
      <p className="mt-2 text-[10px] leading-4 text-white/30">
        Private link expires when this meeting ends.
      </p>
      <p aria-live="polite" className="sr-only">
        {status === 'copied'
          ? 'Private meeting link copied.'
          : status === 'error'
            ? 'The private link could not be created or copied. Try again.'
            : ''}
      </p>
      {status === 'error' && (
        <button
          type="button"
          onClick={invite ? copy : create}
          className="mt-2 rounded-sm text-[11px] text-red-100/70 underline decoration-red-100/20 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

