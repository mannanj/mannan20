/**
 * Where to land after signing in.
 *
 * Signing in is a round trip through an email: the page asks for a link, the
 * link goes to the cloud worker, the worker bounces to our callback. Nothing
 * in that chain remembers the page you started on, so the callback used to
 * send everyone to `/` — including someone who signed in from
 * `/calendar/signup`, or from an MCP client's connect flow.
 *
 * The page you started on is kept in a short-lived cookie, set when the link
 * is requested and consumed by the callback. A cookie rather than a parameter
 * threaded through the email: the link stays opaque, and nothing a stranger
 * can put in a URL decides where a fresh session lands.
 *
 * SAME-ORIGIN PATHS ONLY. Every value is re-validated where it is read, not
 * only where it is written: a return path is an open redirect the moment it
 * can name another host.
 */

const COOKIE_NAME = '__Host-mannan-return';

/** The magic link lives 15 minutes; a return path outliving it means nothing. */
const TTL_SEC = 15 * 60;

const MAX_LENGTH = 1024;

/** A placeholder origin to resolve against. Only the comparison matters. */
const ORIGIN = 'https://return.invalid';

/**
 * A same-origin path, or null.
 *
 * Rejects `//host` and `/\host` (both resolve off-origin in browsers), any
 * backslash or control character, and the sign-in routes themselves so a
 * return can never loop back into the flow it is returning from.
 */
export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length === 0 || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  if (url.pathname.startsWith('/api/auth/')) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The path a sign-in request should return to: what the page said, else the
 * page it was sent from — but only when that page is on this same origin.
 */
export function returnPathFromRequest(
  bodyValue: unknown,
  referer: string | null,
  origin: string,
): string | null {
  const stated = safeReturnPath(bodyValue);
  if (stated) return stated;
  if (!referer) return null;
  try {
    const from = new URL(referer);
    if (from.origin !== origin) return null;
    return safeReturnPath(`${from.pathname}${from.search}${from.hash}`);
  } catch {
    return null;
  }
}

export function returnToCookie(path: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(path)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_SEC}`;
}

export function clearReturnToCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Read and re-validate. A tampered or stale value reads as "nowhere". */
export function readReturnTo(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== COOKIE_NAME) continue;
    try {
      return safeReturnPath(decodeURIComponent(part.slice(eq + 1).trim()));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * CLIENT SIDE: the return path a sign-in form should send. `next` wins when a
 * flow put one in the URL (the MCP bridge does); otherwise the page itself.
 * Unvalidated here on purpose — the server is the one that decides.
 */
export function currentReturnPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const next = new URLSearchParams(location.search).get('next');
  return next ?? `${location.pathname}${location.search}${location.hash}`;
}
