import { NextResponse } from 'next/server';

export const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

export const CONSENT_APP_NAME = 'Calendar';
export const CONSENT_SITE_URL = 'https://mannan.is/calendar';
export const CONSENT_CAPABILITIES_PATH = '/mcp';
export const CONSENT_ABILITIES = [
  'It will be able to read and search every event on your calendar.',
  'It will be able to add new events, including in bulk.',
  'It will be able to edit or remove events.',
];

export function calendarMcpEnv(): { secret: string | undefined; callback: string | undefined } {
  return {
    secret: process.env.CALENDAR_MCP_GRANT_SECRET,
    callback: process.env.CALENDAR_MCP_CALLBACK_URL,
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
  home.searchParams.set('mcp', 'calendar');
  return NextResponse.redirect(home, {
    headers: {
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
