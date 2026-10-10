import { test, expect } from '@playwright/test';

test('the MCP sign-in page sends the bridge path as the return path', async ({ page }) => {
  let sent: { email?: string; returnTo?: string } | null = null;
  await page.route('**/api/auth/request', (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const next = '/api/mcp/uploads/authorize?state=st_abcdefgh';
  await page.goto(`/mcp/sign-in?next=${encodeURIComponent(next)}`);

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email').fill('hello@mannan.is');
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  expect(sent!.email).toBe('hello@mannan.is');
  expect(sent!.returnTo).toBe(next);
});
