import { test, expect, type Page } from '@playwright/test';

const HEALTH = '/garden/article/health-longevity';
const COMMUNITY = '/garden/article/seeking-community';

const stubViews = async (page: Page, value: number) => {
  const posts: { url: string; method: string }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/garden/views/')) {
      posts.push({ url: req.url(), method: req.method() });
    }
  });
  await page.route('**/api/garden/views/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ views: value }),
    });
  });
  return posts;
};

const gotoCounter = async (page: Page, path: string) => {
  await page.goto(path);
  const counter = page.getByTestId('article-views');
  await counter.scrollIntoViewIfNeeded();
  await expect(counter).toBeVisible();
  return counter;
};

test.describe('garden article view counter', () => {
  test('records a visit by POSTing to the article slug endpoint on load', async ({ page }) => {
    const posts = await stubViews(page, 4096);
    await gotoCounter(page, HEALTH);

    const writes = posts.filter((p) => p.method === 'POST');
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toContain('/api/garden/views/health-longevity');
  });

  test('displays the server count, comma-formatted, after the count-up settles', async ({ page }) => {
    await stubViews(page, 12345);
    await gotoCounter(page, HEALTH);

    await expect(page.getByTestId('article-views-count')).toHaveText('12,345');
    await expect(page.getByTestId('article-views')).toContainText('12,345 views');
  });

  test('uses the singular noun when exactly one view', async ({ page }) => {
    await stubViews(page, 1);
    const counter = await gotoCounter(page, HEALTH);

    await expect(page.getByTestId('article-views-count')).toHaveText('1');
    await expect(counter).toContainText('1 view');
    await expect(counter).not.toContainText('1 views');
  });

  test('counter is uniquely tailored per article via its accent color', async ({ page }) => {
    await stubViews(page, 100);
    await gotoCounter(page, HEALTH);
    const healthDot = await page
      .getByTestId('article-views-dot')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(healthDot).toBe('rgb(123, 184, 106)');

    await stubViews(page, 100);
    await gotoCounter(page, COMMUNITY);
    const communityDot = await page
      .getByTestId('article-views-dot')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(communityDot).toBe('rgb(79, 195, 247)');

    expect(healthDot).not.toBe(communityDot);
  });

  test('renders the counter at the foot of every public article', async ({ page }) => {
    for (const path of [
      HEALTH,
      COMMUNITY,
      '/garden/article/self-parenting',
      '/garden/article/ai-false-positives',
    ]) {
      await stubViews(page, 7);
      const counter = await gotoCounter(page, path);
      await expect(counter).toContainText('7 views');
    }
  });

  test('degrades silently — no counter rendered when the API fails', async ({ page }) => {
    await page.route('**/api/garden/views/**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });
    await page.goto(HEALTH);
    await page.getByRole('heading', { name: 'Health is an Artform' }).waitFor();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('article-views')).toHaveCount(0);
  });
});
