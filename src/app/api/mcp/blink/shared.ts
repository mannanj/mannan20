import { NextResponse } from 'next/server';
import { canOpen } from '@/lib/app-access';
import { uploadsEnv } from '@/lib/uploads';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

export const CONSENT_APP_NAME = 'Blink';
export const CONSENT_SITE_URL = 'https://blink.mannan.is';

/** The Blink site people are sent to: the origin of BLINK_CALLBACK_URL, so the front door follows
 *  whichever Blink deployment the sign-in currently returns to. */
export function blinkSiteUrl(): string {
  try {
    return new URL('/', process.env.BLINK_CALLBACK_URL ?? '').toString();
  } catch {
    return CONSENT_SITE_URL + '/';
  }
}
export const CONSENT_CAPABILITIES_PATH = '/';
export const CONSENT_ABILITIES = [
  'You will be able to view the Blink camera clips and people.',
  'You will be able to name people and correct what was detected.',
];

/**
 * Who may open Blink. The addresses are private, so they live only in the Worker secret
 * BLINK_ALLOWED_EMAILS (comma-separated; keychain: blink-allowed-emails), never in this repo.
 * Unset or empty means nobody is allowed (fail closed).
 */
export function blinkAllowedEmails(): string[] {
  return (process.env.BLINK_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Listed in BLINK_ALLOWED_EMAILS (as before), or granted 'blink' in the shared
 * app access table (src/lib/app-access.ts), which is where new grants go. Any
 * failure reading the table counts as not granted.
 */
export async function isBlinkAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (blinkAllowedEmails().includes(email.trim().toLowerCase())) return true;
  const db = uploadsEnv()?.UPLOADS_DB;
  if (!db) return false;
  return canOpen(db, email, 'blink').catch(() => false);
}

export function blinkEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.BLINK_GRANT_SECRET,
    callback: process.env.BLINK_CALLBACK_URL,
  };
}

export function problem(status: number, message: string): NextResponse {
  return new NextResponse(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}

export function signedOutRedirect(origin: string): NextResponse {
  const home = new URL('/', origin);
  home.searchParams.set('mcp', 'blink');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
