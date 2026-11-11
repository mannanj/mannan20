import { test, expect, type Page } from '@playwright/test';
import { V3_TUNING, scaledClicks } from '../src/components/game/game-tuning';
import { SAVED_SCORE_KEY } from '../src/components/game/use-saved-score';
import { DUEL_TOTAL_MS } from '../src/components/game/creature-duel';
import { CREATURE_SPECS } from '../src/components/game/creature-event';
import { ENDLESS_ERAS, ERA_MAX_MS } from '../src/components/game/endless-eras';

interface V3Bridge {
  state: () => { score: number; bird: { kind: string | null; phase: string; rightNeed: number; leftNeed: number } };
  setScore: (n: number) => void;
  forceBird: (kind: string) => void;
  placeChicken: (x: number, y: number) => void;
  forceEra: (id: string) => void;
  forceCreature: (kind: string) => boolean;
  fastForward: (ms: number) => void;
  era: () => { id: string | null; lap: number; enteredAtMs: number };
}

const ALL_SCENES_SCORE = (ENDLESS_ERAS.at(-1)?.from ?? 0) + 500;
const DUEL_WAIT_MS = 40_000;
const fastForward = (page: Page, ms: number) => page.evaluate((n) => (window as unknown as { __chicken: V3Bridge }).__chicken.fastForward(n), ms);
const forceEra = (page: Page, id: string) => page.evaluate((e) => (window as unknown as { __chicken: V3Bridge }).__chicken.forceEra(e), id);
const forceCreature = (page: Page, kind: string) => page.evaluate((k) => (window as unknown as { __chicken: V3Bridge }).__chicken.forceCreature(k), kind);
const eraOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: V3Bridge }).__chicken.era());

const LEADERBOARD_GUARD_WAIT_MS = 1500;

const bridge = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state());

async function gotoV3(page: Page, saved?: number, path = '/game?variant=3') {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  if (saved !== undefined) {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVED_SCORE_KEY, String(saved)]);
  }
  await page.goto(path);
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
}

async function squeeze(page: Page) {
  await page.evaluate(() => (window as unknown as { __chicken: V3Bridge }).__chicken.placeChicken(400, 260));
  const box = await page.getByTestId('chicken').first().boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

test.describe('Chicken v3', () => {
  test('v3 opens on the original loader and starts straight at the chicken, with no space opening or flock', async ({ page }) => {
    await gotoV3(page);
    await expect(page.getByTestId('chicken')).toBeVisible();
    await expect(page.getByTestId('cosmic-opening')).toHaveCount(0);
    await expect(page.getByTestId('backyard-flock')).toHaveCount(0);
    await expect(page.getByTestId('opening-cover')).toHaveCount(0);
  });

  test('a returning player resumes their saved score and can still switch versions until they squeeze', async ({ page }) => {
    await gotoV3(page, 57);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 57, null, { timeout: 30_000 });
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVED_SCORE_KEY)).toBe('57');
    await expect(page.getByTestId('version-picker')).toBeVisible();
    await squeeze(page);
    await expect(page.getByTestId('version-picker')).toHaveCount(0);
  });

  test('plain /game opens v3; the version picker switches versions until the first squeeze, then goes away', async ({ page }) => {
    await gotoV3(page, undefined, '/game');
    const picker = page.getByTestId('version-picker');
    await expect(picker).toHaveAttribute('data-version', '3');
    await page.getByTestId('version-picker-toggle').click();
    await expect(page.getByTestId('version-picker-list').getByRole('link')).toHaveText([/v3\s*most recent/, 'v2', 'Legacy']);
    await page.getByTestId('version-option-2').click();
    await expect(page).toHaveURL(/variant=2/);
    await expect(page.getByTestId('chicken-stage')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('version-picker')).toHaveAttribute('data-version', '2');
    await page.getByTestId('version-picker-toggle').click();
    await page.getByTestId('version-option-legacy').click();
    await expect(page).toHaveURL(/variant=legacy/);
    await expect(page.getByTestId('version-picker')).toHaveAttribute('data-version', 'legacy', { timeout: 30_000 });
    await gotoV3(page);
    await expect(page.getByTestId('version-picker')).toBeVisible();
    await squeeze(page);
    await expect.poll(async () => (await bridge(page)).score).toBeGreaterThan(0);
    await expect(page.getByTestId('version-picker')).toHaveCount(0);
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

  test('after the last scene of the first lap the chicken talks, then play carries on into the repeat', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoV3(page, ALL_SCENES_SCORE);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 30_000 }).toBe('forest');
    expect((await eraOf(page)).lap).toBe(1);
    await fastForward(page, ERA_MAX_MS + 1000);
    const mono = page.getByTestId('chicken-monologue');
    await expect(mono).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Translated')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('monologue-english')).toHaveText("My ancestors didn't bring me here for this.", { timeout: 15_000 });
    await expect(page.getByTestId('monologue-imagination')).toHaveClass(/opacity-100/, { timeout: 15_000 });
    await expect(page.getByTestId('monologue-trex')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('monologue-choice')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('choice-continue')).toHaveText('Continue squeezing the chicken');
    await expect(page.getByTestId('choice-mystery')).toHaveText('???');
    await page.getByTestId('choice-continue').click();
    await expect(mono).toHaveCount(0, { timeout: 5000 });
    const era = await eraOf(page);
    expect(era.lap).toBe(2);
    expect(era.id).toBe('big-cats');
    expect(await page.evaluate(() => localStorage.getItem('chicken-v3-monologue-seen'))).toBe('1');
  });

  test('??? shows Not yet implemented with an updates sign-up, then returns to the forest instead of restarting', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/game/updates', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { email: null, subscribed: false } })
        : route.fulfill({ json: { subscribed: true, email: 'p***@example.com', pending: true } })
    );
    await gotoV3(page, ALL_SCENES_SCORE);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 30_000 }).toBe('forest');
    await fastForward(page, ERA_MAX_MS + 1000);
    await page.getByTestId('choice-mystery').click({ timeout: 90_000 });
    const panel = page.getByTestId('mystery-panel');
    await expect(panel).toBeVisible({ timeout: 5000 });
    await expect(panel).toContainText('Not yet implemented');
    const before = (await bridge(page)).score;
    await page.waitForTimeout(1500);
    expect((await bridge(page)).score).toBe(before);
    await page.getByTestId('mystery-email').fill('player@example.com');
    await page.getByTestId('mystery-subscribe-submit').click();
    await expect(page.getByTestId('mystery-subscribe')).toHaveAttribute('data-state', 'pending');
    await page.getByTestId('mystery-panel').screenshot({ path: 'test-results/mystery-panel.png' });
    await page.getByTestId('mystery-continue').click();
    await expect(panel).toHaveCount(0);
    const era = await eraOf(page);
    expect(era.id).toBe('forest');
    expect(era.lap).toBe(1);
    expect((await bridge(page)).score).toBeGreaterThanOrEqual(before);
  });

  for (const [eraId, rival, winner] of [
    ['myth-1', 'cyclops', 'hydra'],
    ['myth-2', 'hydra', 'cerberus'],
    ['big-cats', 'tiger', 'lion'],
  ] as const) {
    test(`in ${eraId} the ${rival} fights the ${winner}, loses, and the ${winner} goes for the chicken`, async ({ page }) => {
      test.setTimeout(120_000);
      await gotoV3(page, 2100);
      await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 2100, null, { timeout: 30_000 });
      await forceEra(page, eraId);
      const at = Math.max(...(V3_TUNING.eraCreatures[eraId] ?? []).map((c) => c.atMs));
      await fastForward(page, at + 100);
      const duel = page.getByTestId('creature-duel');
      await expect(duel).toHaveAttribute('data-rival', rival, { timeout: DUEL_WAIT_MS });
      await expect(duel).toHaveAttribute('data-winner', winner);
      await expect(page.getByTestId('duel-left')).toHaveAttribute('data-kind', rival);
      await expect(page.getByTestId('duel-right')).toHaveAttribute('data-kind', winner);
      await expect(page.getByTestId('duel-banner')).toHaveCount(0);
      await expect(page.getByTestId('era-label')).toHaveCount(0);
      await expect(duel).toHaveCount(0, { timeout: DUEL_TOTAL_MS * 2 });
      await expect(page.getByTestId('creature-root')).toHaveAttribute('data-kind', winner, { timeout: 15_000 });
    });
  }

  test('the kitty is smaller in v3', async ({ page }) => {
    await gotoV3(page, 2100);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 2100, null, { timeout: 30_000 });
    await forceCreature(page, 'kitty');
    const img = page.getByTestId('creature-img');
    await expect(img).toBeVisible({ timeout: 15_000 });
    const box = await img.boundingBox();
    const view = page.viewportSize();
    if (!box || !view) throw new Error('no kitty box');
    const basis = Math.min(view.height, view.width * 1.3);
    expect(box.height).toBeLessThan(CREATURE_SPECS.kitty.heightFrac * basis * 1.3 * ((V3_TUNING.creatureSize.kitty ?? 1) + 0.1));
  });

  test('the scene picker shows the current scene, expands in order, and replays any played scene', async ({ page }) => {
    await gotoV3(page, ALL_SCENES_SCORE);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 30_000 }).toBe('forest');
    const picker = page.getByTestId('scene-picker');
    await expect(page.getByTestId('scene-picker-current')).toHaveText('Enchanted forest');
    await expect(page.getByTestId('scene-picker-list')).toHaveCount(0);
    await page.getByTestId('scene-picker-toggle').click();
    const options = page.getByTestId('scene-picker-list').getByRole('button');
    await expect(options).toHaveText([/Backyard/, /Fire form/, /Big cats/, /Jungle/, /Myth/, /The gate/, /Enchanted forest/]);
    await page.getByTestId('scene-option-jungle').click();
    await expect.poll(async () => (await eraOf(page)).id).toBe('jungle');
    await expect(picker).toHaveAttribute('data-scene', 'jungle');
    const first = (await eraOf(page)).enteredAtMs;
    await fastForward(page, 5000);
    await page.getByTestId('scene-picker-toggle').click();
    await page.getByTestId('scene-option-jungle').click();
    await expect.poll(async () => (await eraOf(page)).enteredAtMs).toBeGreaterThan(first);
    await page.getByTestId('scene-picker-toggle').click();
    await expect(page.getByTestId('scene-option-backyard')).toBeDisabled();
    await expect(page.getByTestId('scene-option-backyard')).toContainText('Backyard');
    const skins = await page.getByTestId('chicken-skins-toggle').boundingBox();
    const scenes = await page.getByTestId('scene-picker').boundingBox();
    expect(scenes!.y).toBeGreaterThan(skins!.y + skins!.height - 1);
  });

  test('a new player only sees scenes they have reached', async ({ page }) => {
    await gotoV3(page, 2100);
    await page.waitForFunction(() => (window as unknown as { __chicken: V3Bridge }).__chicken.state().score >= 2100, null, { timeout: 30_000 });
    await page.getByTestId('scene-picker-toggle').click();
    await expect(page.getByTestId('scene-option-fire')).toBeEnabled();
    await expect(page.getByTestId('scene-option-forest')).toBeDisabled();
    await expect(page.getByTestId('scene-option-forest')).toContainText('???');
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
