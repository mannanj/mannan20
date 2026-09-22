import { test, expect } from '@playwright/test';
import { signInAsReader } from './reader-session';

const EPISODES = [
  '/episodes/be-courageously-you',
  '/episodes/immortalism-manifesto',
  '/episodes/mcp-intent-spike',
  '/episodes/affiliate-leads-redesign',
];

const SIGN_IN_HEADING = 'Sign in required';

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

  test('the sign-in group is equidistant', async ({ page }) => {
    await page.goto('/episodes/mcp-intent-spike');
    await expect(page.getByText(SIGN_IN_HEADING)).toBeVisible();

    const gaps = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const kids = Array.from(form.children).filter(
        (el) => getComputedStyle(el).display !== 'none',
      );
      return kids
        .slice(1)
        .map((el, i) =>
          Math.round(el.getBoundingClientRect().top - kids[i].getBoundingClientRect().bottom),
        );
    });

    expect(gaps).not.toBeNull();
    expect(gaps!.length).toBeGreaterThan(1);
    expect(new Set(gaps!).size, `gaps were ${JSON.stringify(gaps)}`).toBe(1);
  });

  test('a signed-in reader gets the article body', async ({ page, context }) => {
    await signInAsReader(context);
    await page.goto('/episodes/mcp-intent-spike');
    await expect(page.getByText(SIGN_IN_HEADING)).toHaveCount(0);
    await expect(page.locator('article p').first()).toBeVisible();
  });
});
