import { NextResponse } from 'next/server';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

export const CONSENT_APP_NAME = 'Upload';
export const CONSENT_SITE_URL = 'https://mannan.is/upload';
export const CONSENT_CAPABILITIES_PATH = '/mcp';
export const CONSENT_ABILITIES = [
  'It will be able to upload files to your Upload pages.',
  'It will be able to create share links and download links.',
  'It will be able to duplicate and delete your files.',
  'It will be able to use the apps you authorize at mcp.mannanteam.workers.dev/apps.',
];

export function uploadsMcpEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.UPLOADS_MCP_GRANT_SECRET,
    callback: process.env.UPLOADS_MCP_CALLBACK_URL,
  };
}

export const OWNER_EMAIL = 'hello@mannan.is';

/**
 * Anyone else with a mannan.is account can connect too, but gets no Upload
 * tools: only the public data and the apps Mannan has given them (list_apps).
 * Signing in confers nothing by itself; each app is still checked per person.
 */
export const MEMBER_APP_NAME = 'Mannan';
export const MEMBER_SITE_URL = 'https://mannan.is';
export const MEMBER_ABILITIES = [
  "It will see Mannan's public profile, writing and projects.",
  'It will see which of Mannan\'s apps you have been given access to.',
];

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
  home.searchParams.set('mcp', 'uploads');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
