import { expect, type Page, type Route } from '@playwright/test';

export type IntentFrame =
  | { type: 'meta'; version: 1 }
  | { type: 'text'; value: string }
  | { type: 'done' }
  | { type: 'error'; code: 'upstream' };

export interface TurnstileStubOptions {
  verifyResult?: { success: boolean };
  /** One token per widget render. Omit an entry to leave that widget unverified. */
  tokens?: Array<string | null>;
}

const explicitlyStubbedTurnstilePages = new WeakSet<Page>();

export function frames(...framesToEncode: IntentFrame[]): string {
  return framesToEncode.map((frame) => `${JSON.stringify(frame)}\n`).join('');
}

export const successfulReflection = (text: string) => frames(
  { type: 'meta', version: 1 },
  { type: 'text', value: text },
  { type: 'done' },
);

export function splitUtf8Chunks(payload: string, byteOffsets: number[]): number[][] {
  const bytes = new TextEncoder().encode(payload);
  const offsets = [...new Set([0, ...byteOffsets, bytes.length])]
    .filter((offset) => offset >= 0 && offset <= bytes.length)
    .sort((a, b) => a - b);
  return offsets.slice(1).map((end, index) => Array.from(bytes.slice(offsets[index], end)));
}

/** Installs a browser-native streaming response so TextDecoder sees real chunk boundaries. */
export async function mockIntentByteStream(page: Page, chunks: number[][], delayMs = 150) {
  await page.evaluate(({ byteChunks, delay }) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      if (!url.endsWith('/api/contact-intent')) return originalFetch(input, init);

      let index = 0;
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (index >= byteChunks.length) {
            controller.close();
            return;
          }
          if (index > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
          controller.enqueue(new Uint8Array(byteChunks[index]));
          index += 1;
        },
      });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
      });
    }) as typeof window.fetch;
  }, { byteChunks: chunks, delay: delayMs });
}

async function stubNonresolvingTurnstile(page: Page) {
  await Promise.all([
    page.route('**/turnstile/v0/api.js', (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.turnstile = {
  render: () => 'e2e-nonresolving-widget',
  reset: () => {},
  remove: () => {},
};`,
    })),
    page.route('**/turnstile-siteverify-mannan20**', (route) => route.abort('blockedbyclient')),
  ]);
}

export async function openModal(page: Page) {
  if (!explicitlyStubbedTurnstilePages.has(page)) await stubNonresolvingTurnstile(page);
  await page.goto('/');
  const masked = page.getByTestId('contact-email-masked');
  await masked.scrollIntoViewIfNeeded();
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
}

export function stubTurnstile(page: Page, options: TurnstileStubOptions | { success: boolean } = {}) {
  explicitlyStubbedTurnstilePages.add(page);
  const normalized = 'success' in options ? { verifyResult: options } : options;
  const verifyResult = normalized.verifyResult ?? { success: true };
  const tokens = normalized.tokens ?? ['e2e-reveal-token', 'e2e-callback-token'];
  return Promise.all([
    page.route('**/turnstile/v0/api.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `(() => {
  const tokens = ${JSON.stringify(tokens)};
  let renderCount = 0;
  window.turnstile = {
    render: (container, options) => {
      const token = tokens[renderCount++];
      if (token) setTimeout(() => options.callback(token), 10);
      return 'e2e-fake-widget-' + renderCount;
    },
    reset: () => {},
    remove: () => {},
  };
})();`,
      })
    ),
    page.route('**/turnstile-siteverify-mannan20**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifyResult) })
    ),
  ]);
}

export async function openRevealedModal(page: Page, turnstileOptions?: TurnstileStubOptions) {
  await stubTurnstile(page, turnstileOptions);
  await openModal(page);
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10_000 });
}

export function mockIntentApi(page: Page, response: string | ((route: Route) => Promise<void> | void), requests: unknown[] = []) {
  return page.route('**/api/contact-intent', async (route) => {
    requests.push(route.request().postDataJSON());
    if (typeof response === 'function') return response(route);
    await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: response });
  });
}

export function mockCallbackApi(page: Page, status = 200, response: unknown = { submitted: true }, requests: unknown[] = []) {
  return page.route('**/api/contact-request', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
}
