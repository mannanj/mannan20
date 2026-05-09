interface Env {
  DB: D1Database
  VISIT_LIMITER: RateLimit
  VISIT_SECRET: string
  IP_SALT: string
}

interface VisitPayload {
  route?: unknown
  referrer?: unknown
  isRsc?: unknown
}

const MAX_TEXT = 512
const MAX_UA = 1024

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function classifyDevice(ua: string | null): string {
  if (!ua) return 'unknown'
  const u = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(u)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|phone/.test(u)) return 'mobile'
  if (/bot|crawler|spider|crawling/.test(u)) return 'bot'
  return 'desktop'
}

async function hashIp(ip: string, salt: string): Promise<string | null> {
  if (!ip) return null
  const data = new TextEncoder().encode(`${ip}|${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin')

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (req.method !== 'POST') {
      return new Response('method not allowed', { status: 405 })
    }

    const url = new URL(req.url)
    if (url.pathname !== '/v') {
      return new Response('not found', { status: 404 })
    }

    if (req.headers.get('authorization') !== `Bearer ${env.VISIT_SECRET}`) {
      return new Response('unauthorized', { status: 401 })
    }

    const ip =
      req.headers.get('x-real-ip')?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      ''
    const limiterKey = ip || req.headers.get('x-forwarded-for') || 'anon'
    const { success } = await env.VISIT_LIMITER.limit({ key: limiterKey })
    if (!success) {
      return new Response('rate limited', { status: 429, headers: corsHeaders(origin) })
    }

    let body: VisitPayload
    try {
      body = (await req.json()) as VisitPayload
    } catch {
      return new Response('bad json', { status: 400, headers: corsHeaders(origin) })
    }

    const route = clamp(body.route, MAX_TEXT)
    if (!route) {
      return new Response('missing route', { status: 400, headers: corsHeaders(origin) })
    }

    const referrer = clamp(body.referrer, MAX_TEXT)
    const isRsc = body.isRsc === true || body.isRsc === 1 ? 1 : 0
    const ua = clamp(req.headers.get('user-agent'), MAX_UA)
    const device = classifyDevice(ua)
    const ipHash = await hashIp(ip, env.IP_SALT)
    const country =
      (req as unknown as { cf?: { country?: string } }).cf?.country ?? null

    const now = Date.now()
    const DEDUPE_WINDOW_MS = 2000

    const result = await env.DB.prepare(
      `INSERT INTO visits (ts, route, ip_hash, country, device, ua, referrer, is_rsc)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
       WHERE NOT EXISTS (
         SELECT 1 FROM visits
         WHERE ip_hash = ?3 AND route = ?2 AND ts > ?1 - ?9
         LIMIT 1
       )`,
    )
      .bind(now, route, ipHash, country, device, ua, referrer, isRsc, DEDUPE_WINDOW_MS)
      .run()

    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(origin), 'x-inserted': String(result.meta.changes ?? 0) },
    })
  },
}
