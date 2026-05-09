import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|.*\\..*).*)',
  ],
}

const WORKER_URL = process.env.VISITS_WORKER_URL
const WORKER_SECRET = process.env.VISIT_SECRET

export function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!WORKER_URL || !WORKER_SECRET) return NextResponse.next()

  if (req.headers.get('next-router-prefetch')) return NextResponse.next()
  if (req.headers.get('purpose') === 'prefetch') return NextResponse.next()
  if (req.headers.get('sec-purpose')?.includes('prefetch')) return NextResponse.next()

  const url = req.nextUrl
  const isRsc =
    req.headers.get('rsc') === '1' ||
    req.headers.get('next-router-state-tree') !== null ||
    url.searchParams.has('_rsc')

  const realIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    ''

  const ping = fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${WORKER_SECRET}`,
      'user-agent': req.headers.get('user-agent') ?? '',
      'x-real-ip': realIp,
    },
    body: JSON.stringify({
      route: url.pathname,
      referrer: req.headers.get('referer'),
      isRsc,
    }),
  }).catch(() => undefined)

  event.waitUntil(ping)
  return NextResponse.next()
}
