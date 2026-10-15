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

test('the check-your-email screen offers a code sign-in that finishes the MCP connect', async ({ page }) => {
  const requests: Array<{ email?: string }> = [];
  await page.route('**/api/auth/request', (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  const attempts: Array<{ email?: string; code?: string }> = [];
  await page.route('**/api/auth/verify-code', (route) => {
    const body = route.request().postDataJSON();
    attempts.push(body);
    if (body.code !== '21-123-123') {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: "That code didn't work. Check it or send a new one." }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, redirectTo: '/mcp?connected=1' }),
    });
  });

  await page.goto('/mcp/sign-in');
  await page.getByLabel('Email').fill('hello@mannan.is');
  await page.getByRole('button', { name: 'Continue with email' }).click();

  await expect(page.getByText('Check your email')).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Enter code' }).click();

  const code = page.getByLabel('Code');
  await code.pressSequentially('99999999');
  await expect(code).toHaveValue('99-999-999');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText("That code didn't work. Check it or send a new one.")).toBeVisible();

  await code.fill('21123123');
  await expect(code).toHaveValue('21-123-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/mcp?connected=1');

  expect(requests).toHaveLength(1);
  expect(attempts.map((a) => a.email)).toEqual(['hello@mannan.is', 'hello@mannan.is']);
});

test('Back returns to the email form from the code screen', async ({ page }) => {
  await page.route('**/api/auth/request', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
  );
  await page.goto('/mcp/sign-in');
  await page.getByLabel('Email').fill('person@example.com');
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByRole('button', { name: 'Enter code' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('Email')).toHaveValue('person@example.com');
});
