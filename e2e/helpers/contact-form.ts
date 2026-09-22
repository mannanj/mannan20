import { expect, type Page } from '@playwright/test';

export const STUB_TURNSTILE_TOKEN = 'e2e-fake-token';

const STUB_SITEKEY = '1x00000000000000000000AA';

declare global {
  interface Window {
    __solveTurnstile?: () => void;
  }
}

export async function openModal(page: Page) {
  await page.goto('/');
  const masked = page.getByTestId('contact-email-masked');
  await masked.scrollIntoViewIfNeeded();
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
}

export function stubTurnstileConfig(page: Page) {
  return page.route('**/api/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ turnstile: { enabled: true, sitekey: STUB_SITEKEY } }),
    })
  );
}

export function installTurnstileStub(page: Page, { autoSolve }: { autoSolve: boolean }) {
  return page.addInitScript(
    ([token, solveImmediately]) => {
      let widgetSeq = 0;
      let solve: (() => void) | null = null;
      window.__solveTurnstile = () => solve?.();
      window.turnstile = {
        render: (_container: HTMLElement, options: Record<string, unknown>) => {
          const callback = options.callback as ((t: string) => void) | undefined;
          solve = () => callback?.(token as string);
          if (solveImmediately) setTimeout(() => solve?.(), 10);
          return `stub-widget-${++widgetSeq}`;
        },
        reset: () => {},
        remove: () => {},
      };
    },
    [STUB_TURNSTILE_TOKEN, autoSolve] as const
  );
}

export function solveTurnstile(page: Page) {
  return page.evaluate(() => window.__solveTurnstile?.());
}

export async function stubTurnstile(
  page: Page,
  verifyResult: { success: boolean; 'error-codes'?: string[] } = { success: true },
  verifyStatus = 200,
  { autoSolve = true }: { autoSolve?: boolean } = {}
) {
  await stubTurnstileConfig(page);
  await installTurnstileStub(page, { autoSolve });
  await page.route('**/api/turnstile/verify', (route) =>
    route.fulfill({
      status: verifyStatus,
      contentType: 'application/json',
      body: JSON.stringify(verifyResult),
    })
  );
}

export async function openRevealedModal(page: Page) {
  await stubTurnstile(page);
  await openModal(page);
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
}

export function mockIntentApi(page: Page, body: string, status = 200) {
  return page.route('**/api/contact-intent', (route) =>
    route.fulfill({ status, contentType: 'application/json', body })
  );
}
