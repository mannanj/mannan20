import type { ContactIntentTurn, ContactRequestPayload } from './types';

export const MIN_CONTACT_LENGTH = 3;
export const MAX_CONTACT_LENGTH = 254;
export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 1000;
export const MAX_TRANSCRIPT_TURNS = 3;
export const MAX_TRANSCRIPT_USER_LENGTH = 1000;
export const MAX_TRANSCRIPT_AI_LENGTH = 480;
export const MAX_SERIALIZED_TRANSCRIPT_LENGTH = 4000;
export const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

const REQUEST_KEYS = ['contact', 'reason', 'transcript', 'turnstileToken'];
const TURN_KEYS = ['userText', 'aiReply'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.replace(/\r\n?/g, '\n').trim();
}

function codePointLength(value: string): number {
  return [...value].length;
}

function hasLengthBetween(value: string, min: number, max: number): boolean {
  const length = codePointLength(value);
  return length >= min && length <= max;
}

function normalizeTranscript(raw: unknown): ContactIntentTurn[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_TRANSCRIPT_TURNS) return null;

  const transcript: ContactIntentTurn[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || !hasExactKeys(entry, TURN_KEYS)) return null;

    const userText = normalizeText(entry.userText);
    const aiReply = normalizeText(entry.aiReply);
    if (
      userText === null
      || aiReply === null
      || !hasLengthBetween(userText, 1, MAX_TRANSCRIPT_USER_LENGTH)
      || !hasLengthBetween(aiReply, 1, MAX_TRANSCRIPT_AI_LENGTH)
    ) {
      return null;
    }
    transcript.push({ userText, aiReply });
  }

  return codePointLength(JSON.stringify(transcript)) <= MAX_SERIALIZED_TRANSCRIPT_LENGTH ? transcript : null;
}

/** Safely normalizes the exact public callback request shape. */
export function normalizeContactRequest(raw: unknown): ContactRequestPayload | null {
  if (!isRecord(raw) || !hasExactKeys(raw, REQUEST_KEYS)) return null;

  const contact = normalizeText(raw.contact);
  const reason = normalizeText(raw.reason);
  const turnstileToken = normalizeText(raw.turnstileToken);
  const transcript = normalizeTranscript(raw.transcript);

  if (
    contact === null
    || reason === null
    || turnstileToken === null
    || transcript === null
    || !hasLengthBetween(contact, MIN_CONTACT_LENGTH, MAX_CONTACT_LENGTH)
    || !hasLengthBetween(reason, MIN_REASON_LENGTH, MAX_REASON_LENGTH)
    || !hasLengthBetween(turnstileToken, 1, MAX_TURNSTILE_TOKEN_LENGTH)
  ) {
    return null;
  }

  return { contact, reason, transcript, turnstileToken };
}

/**
 * Produces a plain-text body with fixed labels. Recipients and all mail headers
 * are deliberately server-owned by the route that sends this message.
 */
export function buildContactRequestEmail(payload: ContactRequestPayload): string {
  const conversation = payload.transcript
    .map((turn) => `Visitor: ${turn.userText}\nAI reflection: ${turn.aiReply}`)
    .join('\n\n');

  return [
    'Portfolio callback request',
    '',
    `Contact: ${payload.contact}`,
    '',
    'Reason:',
    payload.reason,
    '',
    'Conversation:',
    conversation,
    '',
  ].join('\n');
}
