'use client';

import { useCallback } from 'react';
import { TerminalChat, type TerminalChatHistoryEntry } from './chat/terminal-chat';
import type { ContactIntentResult } from '@/lib/types';

const PLACEHOLDER = "Your name, and/or why you're here";
const TURN_CAP = 3;
const ERROR_TEXT = "Couldn't send that — no worries, I still have your info above.";

export function ContactIntentForm() {
  const send = useCallback(async (value: string, history: TerminalChatHistoryEntry[]) => {
    const res = await fetch('/api/contact-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: value, history }),
    });

    if (!res.ok) throw new Error('contact-intent request failed');

    const result: ContactIntentResult = await res.json();
    return { message: result.message ?? '' };
  }, []);

  return (
    <TerminalChat
      placeholder={PLACEHOLDER}
      turnCap={TURN_CAP}
      errorText={ERROR_TEXT}
      send={send}
      testIdPrefix="contact-intent"
    />
  );
}
