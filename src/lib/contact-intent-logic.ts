import type { ContactIntentResult } from './types';

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_RESPONSE_MESSAGE_LENGTH = 120;
export const MAX_HISTORY_ENTRIES = 8;

export interface ContactIntentHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export function sanitizeHistory(raw: unknown): ContactIntentHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is ContactIntentHistoryEntry =>
      typeof entry === 'object' && entry !== null &&
      (entry as { role?: unknown }).role !== undefined &&
      ((entry as { role: unknown }).role === 'user' || (entry as { role: unknown }).role === 'assistant') &&
      typeof (entry as { content?: unknown }).content === 'string'
    )
    .slice(-MAX_HISTORY_ENTRIES)
    .map(entry => ({ role: entry.role, content: entry.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

export function alreadyAskedQuestion(history: ContactIntentHistoryEntry[]): boolean {
  return history.some(entry => entry.role === 'assistant' && entry.content.trim().endsWith('?'));
}

export function normalizeResult(parsed: Record<string, unknown>, askedAlready: boolean): ContactIntentResult | null {
  if (typeof parsed.message !== 'string') return null;
  let message = parsed.message.slice(0, MAX_RESPONSE_MESSAGE_LENGTH).trim();
  if (askedAlready && message.endsWith('?')) {
    message = message.replace(/\?+$/, '.');
  }
  return { message };
}

export function parseContentFallback(content: string | null | undefined, askedAlready: boolean): ContactIntentResult | null {
  if (!content) return null;
  try {
    const stripped = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(stripped);
    return normalizeResult(parsed, askedAlready);
  } catch {
    return null;
  }
}
