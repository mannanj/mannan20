import { NextResponse } from 'next/server';
import { canOpen } from '@/lib/app-access';
import { uploadsEnv } from '@/lib/uploads';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

/** Qi, Mannan's private notification inbox across his apps, signs people in here. The Qi Worker lives in
 *  its own private repo; this bridge is the only part on mannan.is (~/Documents/mcp README §9). */
export const CONSENT_APP_NAME = 'Qi';
export const CONSENT_SITE_URL = 'https://qi.mannan.is';
export const CONSENT_CAPABILITIES_PATH = '/';
export const CONSENT_ABILITIES = [
  'It will be able to read and mark your Qi notifications.',
  'It will be able to change the rules that decide how urgent each notification is.',
];

/**
 * Who may sign in to Qi: whoever the shared app access table lets open 'qi' (src/lib/app-access.ts).
 * The row is `owner` for now (Mannan only), widened later with the grant tools. Any failure reading the
 * table counts as not allowed.
 */
export async function isQiAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const db = uploadsEnv()?.UPLOADS_DB;
  if (!db) return false;
  return canOpen(db, email, 'qi').catch(() => false);
}

export function qiEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.QI_GRANT_SECRET,
    callback: process.env.QI_CALLBACK_URL,
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
  home.searchParams.set('mcp', 'qi');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
