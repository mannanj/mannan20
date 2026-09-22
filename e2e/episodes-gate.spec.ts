import { test, expect } from '@playwright/test';
import { signInAsReader } from './reader-session';

const EPISODES = [
  '/episodes/be-courageously-you',
  '/episodes/immortalism-manifesto',
  '/episodes/mcp-intent-spike',
  '/episodes/affiliate-leads-redesign',
];

const SIGN_IN_HEADING = 'This reading is for signed-in readers';

test.describe('Episodes are gated', () => {
  for (const url of EPISODES) {
    test(`${url} shows the sign-in form to a signed-out visitor`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByText(SIGN_IN_HEADING)).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test(`${url} does not ship the article body to a signed-out visitor`, async ({ page }) => {
      const response = await page.goto(url);
      const html = (await response?.text()) ?? '';
      expect(html).toContain(SIGN_IN_HEADING);
      const paragraphs = await page.locator('article p').count();
      expect(paragraphs).toBeLessThan(6);
    });
  }

  test('a signed-in reader gets the article body', async ({ page, context }) => {
    await signInAsReader(context);
    await page.goto('/episodes/mcp-intent-spike');
    await expect(page.getByText(SIGN_IN_HEADING)).toHaveCount(0);
    await expect(page.locator('article p').first()).toBeVisible();
  });
});
