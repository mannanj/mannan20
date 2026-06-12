import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds', 'chicken');
const R2_GLOB = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/sounds/chicken/*';

async function gotoGame(page: Page, query = '') {
  await page.route(R2_GLOB, (route) => {
    const name = route.request().url().split('/').pop() ?? '';
    return route.fulfill({
      path: path.join(SOUNDS_DIR, path.basename(name)),
      contentType: 'audio/mpeg',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto(`/game${query}`);
  await page.getByTestId('chicken-loader').waitFor({ state: 'detached', timeout: 15_000 });
}

function boost(page: Page, n: number) {
  return page.evaluate(
    (count) =>
      (window as unknown as { __chicken: { boost: (n: number) => void } }).__chicken.boost(count),
    n
  );
}

test.describe('chicken leaderboard identity', () => {
  test('a taken name is rejected and offers a magic-link claim', async ({ page }) => {
    await page.route('**/api/game/leaderboard/me', (route) =>
      route.fulfill({ json: { names: [], email: null, verified: false } })
    );
    await page.route('**/api/game/leaderboard/email', (route) =>
      route.fulfill({
        json: {
          sent: false,
          devLink: 'http://localhost:3847/game?claim=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      })
    );
    await page.route('**/api/game/leaderboard', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 409,
          json: { error: 'name-taken', emailBound: true },
        });
      }
      return route.fulfill({ json: { human: [{ name: 'Maximus', score: 412 }], agent: [] } });
    });
    await gotoGame(page);
    await boost(page, 3);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-name-input').fill('Maximus');
    await page.getByTestId('leaderboard-submit').click();

    const taken = page.getByTestId('leaderboard-name-taken');
    await expect(taken).toBeVisible();
    await expect(taken).toContainText('protected by email');

    await page.getByTestId('leaderboard-claim-email').fill('me@example.com');
    await page.getByTestId('leaderboard-claim-send').click();
    await expect(page.getByTestId('leaderboard-claim-message')).toBeVisible();
    await expect(page.getByTestId('leaderboard-claim-devlink')).toHaveAttribute(
      'href',
      /\/game\?claim=/
    );
  });

  test('a claim token in the URL signs the device in and strips the param', async ({ page }) => {
    let claimBody: Record<string, unknown> | null = null;
    await page.route('**/api/game/leaderboard/claim', (route) => {
      claimBody = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        json: { ok: true, names: ['Testy'], email: 't***@e***.com', verified: true },
      });
    });
    await page.route('**/api/game/leaderboard/me', (route) =>
      route.fulfill({ json: { names: ['Testy'], email: 't***@e***.com', verified: true } })
    );
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [], agent: [] } })
    );
    await gotoGame(page, '?claim=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    await expect(page.getByTestId('leaderboard-claim-success')).toBeVisible();
    await expect(page.getByTestId('leaderboard-claim-success')).toContainText(
      'Signed in as t***@e***.com'
    );
    expect(claimBody).toEqual({ token: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
    expect(new URL(page.url()).searchParams.get('claim')).toBeNull();

    await page.getByTestId('chicken-leaderboard-link').click();
    await expect(page.getByTestId('leaderboard-identity')).toContainText('t***@e***.com');
  });

  test('a verified identity can rename all of its past names', async ({ page }) => {
    let renameBody: Record<string, unknown> | null = null;
    await page.route('**/api/game/leaderboard/me', (route) =>
      route.fulfill({
        json: { names: ['Old One', 'Old Two'], email: 'm***@p***.com', verified: true },
      })
    );
    await page.route('**/api/game/leaderboard/rename', (route) => {
      renameBody = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        json: { ok: true, human: [{ name: 'Fresh Name', score: 99 }], agent: [] },
      });
    });
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [{ name: 'Old One', score: 99 }], agent: [] } })
    );
    await gotoGame(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    await expect(page.getByTestId('leaderboard-identity')).toContainText('Old One, Old Two');

    await page.getByTestId('leaderboard-rename-toggle').click();
    await page.getByTestId('leaderboard-rename-input').fill('Fresh Name');
    await page.getByTestId('leaderboard-rename-save').click();

    await expect.poll(() => renameBody).toEqual({ to: 'Fresh Name' });
    await expect(page.getByTestId('chicken-leaderboard-panel')).toContainText('Fresh Name');
  });

  test('feedback popup slides into validation, auto-sends, never shows an email', async ({ page }) => {
    const feedbackPosts: Array<Record<string, unknown>> = [];
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [], agent: [] } })
    );
    await page.route('**/api/validate-contact', (route) =>
      route.fulfill({ json: { name: { found: true, value: 'Testy' } } })
    );
    await page.route('**/api/game/feedback', (route) => {
      feedbackPosts.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({ json: { ok: true, emailed: false } });
    });
    await gotoGame(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-feedback-toggle').click();
    const popup = page.getByTestId('feedback-popup');
    await expect(popup).toBeVisible();
    await expect(page.getByTestId('feedback-validation-input')).toHaveCount(0);

    await page.getByTestId('feedback-input').fill('Merge the boards, humans and agents together');
    await page.getByTestId('feedback-send').click();

    await expect(page.getByTestId('feedback-slider')).toHaveAttribute('data-stage', 'validate');
    const validation = page.getByTestId('feedback-validation-input');
    await expect(validation).toBeVisible();
    await expect(validation).toHaveAttribute('placeholder', /Validation: please enter/);
    await expect(page.getByTestId('feedback-arrow-left')).toBeVisible();

    await page.getByTestId('feedback-arrow-left').click();
    await expect(page.getByTestId('feedback-slider')).toHaveAttribute('data-stage', 'compose');
    await expect(page.getByTestId('feedback-arrow-right')).toBeVisible();
    await page.getByTestId('feedback-arrow-right').click();
    await expect(page.getByTestId('feedback-slider')).toHaveAttribute('data-stage', 'validate');

    await validation.fill('I am Testy, here about the chicken game');
    await validation.press('Enter');

    await expect.poll(() => feedbackPosts.length, { timeout: 10_000 }).toBe(1);
    expect(feedbackPosts[0]).toEqual({ message: 'Merge the boards, humans and agents together' });
    await expect(page.getByTestId('feedback-received')).toBeVisible();
    await expect(popup).not.toContainText('hello@mannan.is');
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).toContain('contact_revealed=1');
  });

  test('feedback popup skips validation after a prior main-site pass', async ({ page, context }) => {
    await context.addCookies([
      { name: 'contact_revealed', value: '1', url: 'http://localhost:3847' },
    ]);
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [], agent: [] } })
    );
    await page.route('**/api/game/feedback', (route) =>
      route.fulfill({ json: { ok: true, emailed: true } })
    );
    await gotoGame(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-feedback-toggle').click();
    await page.getByTestId('feedback-input').fill('Loving the rubber chicken');
    await page.getByTestId('feedback-send').click();
    await expect(page.getByTestId('feedback-received')).toBeVisible();
    await expect(page.getByTestId('feedback-validation-input')).toHaveCount(0);
    await expect(page.getByTestId('feedback-popup')).not.toContainText('hello@mannan.is');
  });

  test('a successful submission records the owner cookie name', async ({ page }) => {
    await page.route('**/api/game/leaderboard/me', (route) =>
      route.fulfill({ json: { names: [], email: null, verified: false } })
    );
    await page.route('**/api/game/leaderboard', (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name: string; score: number };
        return route.fulfill({
          json: {
            human: [{ name: body.name, score: body.score }],
            agent: [],
            you: { name: body.name },
          },
        });
      }
      return route.fulfill({ json: { human: [], agent: [] } });
    });
    await gotoGame(page);
    await boost(page, 4);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-name-input').fill('CookieKeeper');
    await page.getByTestId('leaderboard-submit').click();
    await expect(page.getByTestId('chicken-leaderboard-panel')).toContainText('CookieKeeper');
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).toContain('chicken-name=CookieKeeper');
  });
});
