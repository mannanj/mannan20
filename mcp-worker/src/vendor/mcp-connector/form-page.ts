// GENERATED FROM @mannan/mcp-connector/form-page.ts - DO NOT EDIT HERE.
// Edit ~/Documents/mcp-connector and re-run: node bin/sync.mjs <this dir>
/**
 * The standard for a server-rendered page whose own <form method="post"> is
 * checked for origin. Use these two together; see ~/Documents/mcp/README.md §2.8.
 *
 * Why it exists: under `Referrer-Policy: no-referrer` a browser sends
 * `Origin: null` on the page's own POST, so a strict origin check refuses the
 * real user. curl, scripts and unit tests that set Origin by hand never see it.
 *
 * Web APIs only, no imports: runs in a Worker, a Next route handler and Node.
 */

/** Never `no-referrer` here. `same-origin` still tells other sites nothing. */
export const FORM_REFERRER_POLICY = 'same-origin';

/**
 * Headers for the page that holds the form. No form-action in the CSP: browsers
 * check the POST's redirect against it too, and these forms redirect off-origin.
 */
export const FORM_PAGE_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, private',
  'referrer-policy': FORM_REFERRER_POLICY,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
};

export function formPage(html: string, status = 200): Response {
  return new Response(html, { status, headers: FORM_PAGE_HEADERS });
}

/**
 * True only for a POST from a page on `origin`. `Origin: null` is refused, which
 * is why the page must be served with FORM_PAGE_HEADERS. Not a replacement for a
 * CSRF token: use it beside one. `origin` is the app's configured public origin.
 */
export function sameOriginPost(request: Request, origin: string): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const sent = request.headers.get('origin');
  if (sent) return sent === new URL(origin).origin;
  return site === 'same-origin';
}
