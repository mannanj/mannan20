import { NextResponse } from 'next/server';
import { canOpen } from '@/lib/app-access';
import { uploadsEnv } from '@/lib/uploads';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

/** Fresh Start (the Safari price extension) signs people in here. Its code and data live in its
 *  own repo; this bridge is the only part on mannan.is (~/Documents/mcp README §9). */
export const CONSENT_APP_NAME = 'Fresh Start';
export const CONSENT_SITE_URL = 'https://mannan.is/fresh';
export const CONSENT_CAPABILITIES_PATH = '/';
export const CONSENT_ABILITIES = [
  'Fresh Start will know your email, so your username stays yours across installs.',
];

/**
 * Who may sign in to Fresh Start: whoever the shared app access table lets open 'fresh-start'
 * (src/lib/app-access.ts). It is listed `public`, so any mannan.is account. Any failure reading
 * the table counts as not allowed.
 */
export async function isFreshStartAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const db = uploadsEnv()?.UPLOADS_DB;
  if (!db) return false;
  return canOpen(db, email, 'fresh-start').catch(() => false);
}

export function freshStartEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.FRESH_START_GRANT_SECRET,
    callback: process.env.FRESH_START_CALLBACK_URL,
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
  home.searchParams.set('mcp', 'fresh-start');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
