import { NextResponse } from 'next/server';
import { isGardenViewSlug } from '@/lib/garden-views';
import { getViews, recordView } from '@/lib/garden-views-store';
import { limitGardenView } from '@/lib/rate-limit';

const NO_STORE = { 'cache-control': 'no-store' } as const;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  return (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isGardenViewSlug(slug)) {
    return NextResponse.json({ error: 'Unknown article' }, { status: 404 });
  }
  const views = await getViews(slug);
  return NextResponse.json({ views }, { headers: NO_STORE });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isGardenViewSlug(slug)) {
    return NextResponse.json({ error: 'Unknown article' }, { status: 404 });
  }

  const result = await limitGardenView(clientIp(request));
  if (!result.success) {
    const views = await getViews(slug);
    return NextResponse.json({ views, throttled: true }, { headers: NO_STORE });
  }

  const views = await recordView(slug);
  return NextResponse.json({ views }, { headers: NO_STORE });
}
