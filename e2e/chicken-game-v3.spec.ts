import { test, expect, type Page } from '@playwright/test';
import { V3_TUNING, scaledClicks } from '../src/components/game/game-tuning';
import { SAVED_SCORE_KEY } from '../src/components/game/use-saved-score';

interface V3Bridge {
  state: () => { score: number; bird: { kind: string | null; phase: string; rightNeed: number; leftNeed: number } };
  setScore: (n: number) => void;
  forceBird: (kind: string) => void;
  placeChicken: (x: number, y: number) => void;
}

const LEADERBOARD_GUARD_WAIT_MS = 1500;

const bridge = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state());

async function gotoV3(page: Page, saved?: number) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  if (saved !== undefined) {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVED_SCORE_KEY, String(saved)]);
  }
  await page.goto('/game?variant=3');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
}

test.describe('Chicken v3', () => {
  test('a new player gets the cosmic opening, then the backyard flock with no count yet', async ({ page }) => {
    await gotoV3(page);
    await expect(page.getByTestId('cosmic-opening')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('13.8 billion years ago')).toBeVisible();
    await page.getByTestId('cosmic-skip').click();
    await expect(page.getByTestId('cosmic-opening')).toHaveCount(0);
    await expect(page.getByTestId('backyard-flock')).toHaveAttribute('data-phase', 'meander');
    await expect(page.getByTestId('backyard-label')).toHaveText('Squeeze the chicken');
    await expect(page.getByTestId('backyard-count')).toHaveCount(0);
    await expect(page.getByTestId('backyard-chicken')).toHaveCount(7);
  });

  test('first squeeze freezes the flock and hides the cursor, the rest flee, the second squeeze hands off at 2', async ({ page }) => {
    await gotoV3(page);
    await page.getByTestId('cosmic-skip').click({ timeout: 30_000 });
    const flock = page.getByTestId('backyard-flock');
    await page.getByTestId('backyard-chicken').first().click({ force: true });
    await expect(flock).toHaveAttribute('data-phase', 'frozen');
    await expect(flock).toHaveClass(/cursor-none/);
    await expect(flock).toHaveAttribute('data-phase', 'scatter', { timeout: 3000 });
    await expect(flock).toHaveAttribute('data-phase', 'alone', { timeout: 5000 });
    await expect(page.getByTestId('backyard-chicken')).toHaveCount(0);
    await expect(page.getByTestId('backyard-count')).toHaveText('1');
    await expect(flock).not.toHaveClass(/cursor-none/);
    await page.getByTestId('backyard-chosen').click({ force: true });
    await expect(page.getByTestId('backyard-count')).toHaveText('2');
    await expect(flock).toHaveCount(0, { timeout: 4000 });
    expect((await bridge(page)).score).toBe(2);
    await expect(page.getByTestId('backyard-scene')).toBeVisible();
  });

  test('the score is saved and resumes after a reload, skipping the opening', async ({ page }) => {
    await gotoV3(page, 57);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 57, null, { timeout: 30_000 });
    await expect(page.getByTestId('cosmic-opening')).toHaveCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVED_SCORE_KEY)).toBe('57');
  });

  test('no eagle in v3, and the phoenix needs 80% fewer talon clicks', async ({ page }) => {
    await gotoV3(page, 2000);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 2000, null, { timeout: 30_000 });
    await page.evaluate(() => (window as unknown as { __chicken: V3Bridge }).__chicken.forceBird('eagle'));
    await page.waitForTimeout(1500);
    expect((await bridge(page)).bird.kind).not.toBe('eagle');
    await page.evaluate(() => {
      const c = (window as unknown as { __chicken: V3Bridge }).__chicken;
      c.placeChicken(820, 420);
      c.forceBird('phoenix');
    });
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().bird.phase === 'right', null, { timeout: 15_000 });
    expect((await bridge(page)).bird.rightNeed).toBe(scaledClicks(100, V3_TUNING.clickScale));
  });

  test('at the monologue score the game stops, the chicken talks with subtitles, imagines dinosaurs, then offers the choice', async ({ page }) => {
    test.setTimeout(120_000);
    const talkAt = V3_TUNING.monologueAt ?? 0;
    await gotoV3(page, talkAt - 10);
    await page.waitForFunction((n) => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= n, talkAt - 10, { timeout: 30_000 });
    await page.evaluate((n) => (window as unknown as { __chicken: V3Bridge }).__chicken.setScore(n), talkAt);
    const mono = page.getByTestId('chicken-monologue');
    await expect(mono).toBeVisible();
    await expect(page.getByText('Translated')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('monologue-english')).toHaveText('You know…');
    await expect(page.getByTestId('monologue-english')).toHaveText("My ancestors didn't bring me here for this.", { timeout: 10_000 });
    await expect(page.getByTestId('monologue-english')).toHaveText('They once roamed the earth as kings.', { timeout: 15_000 });
    await expect(page.getByTestId('monologue-imagination')).toHaveClass(/opacity-100/);
    await expect(page.getByTestId('monologue-trex')).toBeVisible({ timeout: 15_000 });
    const scoreBefore = (await bridge(page)).score;
    await expect(page.getByTestId('monologue-choice')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('choice-continue')).toHaveText('Continue squeezing the chicken');
    await expect(page.getByTestId('choice-mystery')).toHaveText('???');
    expect((await bridge(page)).score).toBe(scoreBefore);
    await page.getByTestId('choice-mystery').click();
    await expect(page.getByTestId('monologue-end')).toHaveText('To be continued…');
  });

  test('the leaderboard offers mannan.is sign-in to save the score and bag', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: null } }));
    await gotoV3(page, 5);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 5, null, { timeout: 30_000 });
    await page.waitForTimeout(LEADERBOARD_GUARD_WAIT_MS);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('account-save-toggle').click();
    await expect(page.getByTestId('account-save-form')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  });
});
