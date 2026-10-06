import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { uploadsEnv } from '@/lib/uploads';
import {
  MAX_REQUESTS_PER_DAY,
  MAX_REQUEST_LENGTH,
  isAccessResource,
  requestsToday,
  saveAccessRequest,
} from '@/lib/access-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await readSiteSession(request.headers.get('cookie')).catch(() => null);
  if (!session) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (!isAccessResource(body.resource)) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Write a message' }, { status: 400 });
  if (message.length > MAX_REQUEST_LENGTH) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  if ((await requestsToday(env, session.email)) >= MAX_REQUESTS_PER_DAY) {
    return NextResponse.json({ error: 'Too many messages today' }, { status: 429 });
  }

  await saveAccessRequest(env, {
    email: session.email,
    resource: body.resource,
    message,
    origin: new URL(request.url).origin,
  });

  return NextResponse.json({
    message: `Sent. Mannan will reply to ${session.email}.`,
  });
}
