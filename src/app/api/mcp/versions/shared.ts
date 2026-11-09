import { NextResponse } from 'next/server';
import { canOpen } from '@/lib/app-access';
import { uploadsEnv } from '@/lib/uploads';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

/** Versions, Mannan's deploy history and restore service, signs people in here. The Versions Worker lives in
 *  its own private repo; this bridge is the only part on mannan.is (~/Documents/mcp README §9). */
export const CONSENT_APP_NAME = 'Versions';
export const CONSENT_SITE_URL = 'https://versions.mannan.is';
export const CONSENT_CAPABILITIES_PATH = '/';
export const CONSENT_ABILITIES = [
  'It will be able to list your app versions.',
  'It will be able to restore an app to an earlier version.',
];

/**
 * Who may sign in to Versions: whoever the shared app access table lets open 'versions' (src/lib/app-access.ts).
 * The row is `owner` for now (Mannan only), widened later with the grant tools. Any failure reading the
 * table counts as not allowed.
 */
export async function isVersionsAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const db = uploadsEnv()?.UPLOADS_DB;
  if (!db) return false;
  return canOpen(db, email, 'versions').catch(() => false);
}

export function versionsEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.VERSIONS_GRANT_SECRET,
    callback: process.env.VERSIONS_CALLBACK_URL,
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
  home.searchParams.set('mcp', 'versions');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
