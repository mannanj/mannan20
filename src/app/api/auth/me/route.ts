import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await readSiteSession(request.headers.get('cookie'));
  return NextResponse.json({
    user: session
      ? {
          email: session.email,
          role: session.role,
          admin: session.admin,
        }
      : null,
  });
}
