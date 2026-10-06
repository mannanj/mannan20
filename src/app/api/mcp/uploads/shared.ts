import { NextResponse } from 'next/server';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

export const CONSENT_APP_NAME = 'Upload';
export const CONSENT_SITE_URL = 'https://mannan.is/upload';
export const CONSENT_CAPABILITIES_PATH = '/mcp';
export const CONSENT_ABILITIES = [
  'It will be able to upload files to your Upload pages.',
  'It will be able to create share links and download links.',
  'It will be able to duplicate and delete your files.',
];

export function uploadsMcpEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.UPLOADS_MCP_GRANT_SECRET,
    callback: process.env.UPLOADS_MCP_CALLBACK_URL,
  };
}

export const OWNER_EMAIL = 'hello@mannan.is';
export const NOT_OWNER_MESSAGE = 'Only Mannan can connect Upload.';

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
