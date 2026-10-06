'use client';

import { useCallback, useState } from 'react';
import { TerminalChat, type TerminalChatHistoryEntry } from './terminal-chat';
import { TurnstileCheck } from '../turnstile-check';
import type { AccessResource } from '@/lib/access-requests';

const TURN_CAP = 3;
const PANEL_WIDTH = 266;
const ERROR_TEXT = "Couldn't send that — try again in a moment.";

interface AccessReply {
  message?: unknown;
  error?: unknown;
}

export function RequestAccessChat({
  resource,
  placeholder = 'Who you are and why you’d like access',
}: {
  resource: AccessResource;
  placeholder?: string;
}) {
  const [verified, setVerified] = useState(false);
  const pass = useCallback(() => setVerified(true), []);

  const send = useCallback(
    async (value: string, _history: TerminalChatHistoryEntry[]) => {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resource, message: value }),
      });
      const data = (await res.json().catch(() => null)) as AccessReply | null;
      if (!res.ok || typeof data?.message !== 'string') {
        throw new Error(typeof data?.error === 'string' ? data.error : 'request failed');
      }
      return { message: data.message };
    },
    [resource],
  );

  return (
    <div
      data-testid="request-access-chat"
      style={{ width: PANEL_WIDTH, maxWidth: '100%' }}
      className="rounded-[20px] border border-white/[0.12] bg-[#141414] p-[10px] font-[family-name:var(--font-geist-sans)]"
    >
      {verified ? (
        <TerminalChat
          placeholder={placeholder}
          turnCap={TURN_CAP}
          errorText={ERROR_TEXT}
          send={send}
          testIdPrefix="request-access"
        />
      ) : (
        <TurnstileCheck onPass={pass} testIdPrefix="request-access-turnstile" />
      )}
    </div>
  );
}
