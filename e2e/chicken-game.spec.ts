import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

interface SoundEvent {
  type: 'scream' | 'powerup' | 'crackle';
  key?: string;
  rate?: number;
  synth?: boolean;
  at: number;
}

interface ChickenState {
  score: number;
  tier: number;
  mercy: number;
  morph: number;
  auraLevel: number;
  rotation: number;
  vx: number;
  vy: number;
}

interface ChickenBridge {
  plays: SoundEvent[];
  state: () => ChickenState;
  boost: (n: number) => void;
  spin: (v: number) => void;
}

const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds', 'chicken');
const R2_GLOB = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/sounds/chicken/*';

function bridge(page: Page) {
  return {
    state: () =>
      page.evaluate(() =>
        (window as unknown as { __chicken: ChickenBridge }).__chicken.state()
      ),
    plays: () =>
      page.evaluate(() =>
        (window as unknown as { __chicken: ChickenBridge }).__chicken.plays
      ),
    boost: (n: number) =>
      page.evaluate(
        (count) =>
          (window as unknown as { __chicken: ChickenBridge }).__chicken.boost(count),
        n
      ),
    spin: (v: number) =>
      page.evaluate(
        (amount) =>
          (window as unknown as { __chicken: ChickenBridge }).__chicken.spin(amount),
        v
      ),
    ready: () =>
      page.waitForFunction(
        () => (window as unknown as { __chicken?: ChickenBridge }).__chicken !== undefined
      ),
  };
}

async function serveSoundsLocally(page: Page) {
  await page.route(R2_GLOB, (route) => {
    const name = route.request().url().split('/').pop() ?? '';
    return route.fulfill({
      path: path.join(SOUNDS_DIR, path.basename(name)),
      contentType: 'audio/mpeg',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
}

async function gotoGame(page: Page) {
  await serveSoundsLocally(page);
  await page.goto('/game');
  const loader = page.getByTestId('chicken-loader');
  await expect(loader).toBeVisible();
  await loader.waitFor({ state: 'detached', timeout: 15_000 });
  await bridge(page).ready();
}

test.describe('chicken game', () => {
  test('preloads sounds behind the chicken loading bar', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await serveSoundsLocally(page);
    await page.goto('/game');
    const loader = page.getByTestId('chicken-loader');
    await expect(loader).toBeVisible();
    await expect(page.getByTestId('chicken-loader-fill')).toBeVisible();
    await loader.waitFor({ state: 'detached', timeout: 15_000 });
    await bridge(page).ready();
    const state = await bridge(page).state();
    expect(state.score).toBe(0);
    expect(state.tier).toBe(0);
    expect(errors).toEqual([]);
  });

  test('clicking the chicken plays a scream at base pitch', async ({ page }) => {
    await gotoGame(page);
    await page.getByTestId('chicken').click({ force: true });
    await expect
      .poll(async () => (await bridge(page).plays()).filter((p) => p.type === 'scream').length)
      .toBeGreaterThan(0);
    const screams = (await bridge(page).plays()).filter((p) => p.type === 'scream');
    expect(screams[0].rate).toBeGreaterThanOrEqual(0.93);
    expect(screams[0].rate).toBeLessThanOrEqual(1.07);
    expect((await bridge(page).state()).score).toBe(1);
  });

  test('one scream sticks per window, then rotates after many clicks', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);
    await b.boost(12);
    const early = (await b.plays()).filter((p) => p.type === 'scream');
    expect(early.length).toBe(12);
    expect(new Set(early.map((s) => s.key)).size).toBe(1);
    await b.boost(7);
    await b.boost(30);
    const all = (await b.plays()).filter((p) => p.type === 'scream');
    expect(new Set(all.map((s) => s.key)).size).toBeGreaterThanOrEqual(2);
  });

  test('evolves through tiers with power-ups, saiyan hair, and deeper screams', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);

    await b.boost(20);
    const chicken = page.getByTestId('chicken');
    await expect(chicken).toHaveAttribute('data-tier', '1');
    await expect(page.getByTestId('chicken-hair')).toBeVisible();
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-hair', 'dark');
    let powerups = (await b.plays()).filter((p) => p.type === 'powerup');
    expect(powerups.length).toBe(1);
    expect((await b.state()).auraLevel).toBeGreaterThan(0);

    await b.boost(90);
    await expect(chicken).toHaveAttribute('data-tier', '4');
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-hair', 'gold');
    powerups = (await b.plays()).filter((p) => p.type === 'powerup');
    expect(powerups.length).toBe(4);

    await chicken.click({ force: true });
    await expect
      .poll(async () => (await b.plays()).filter((p) => p.type === 'scream').length)
      .toBeGreaterThan(0);
    const screams = (await b.plays()).filter((p) => p.type === 'scream');
    const last = screams[screams.length - 1];
    expect(last.rate).toBeLessThanOrEqual(0.75);
  });

  test('skin morphs gradually toward the next tier color', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);
    const baseFill = await page
      .locator('[data-testid="chicken-svg"] ellipse')
      .first()
      .getAttribute('fill');
    await b.boost(10);
    expect((await b.state()).morph).toBeCloseTo(0.5, 5);
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-morph', '0.50');
    const morphedFill = await page
      .locator('[data-testid="chicken-svg"] ellipse')
      .first()
      .getAttribute('fill');
    expect(morphedFill).not.toBe(baseFill);
    expect(page.getByTestId('chicken-form-label')).toHaveCount(0);
  });

  test('mercy slows an ignored chicken and recovers gently after a hit', async ({ page }) => {
    test.slow();
    await gotoGame(page);
    const b = bridge(page);
    await b.boost(3);
    expect((await b.state()).mercy).toBe(1);
    await page.waitForTimeout(13_500);
    const slowed = (await b.state()).mercy;
    expect(slowed).toBeLessThan(0.6);
    expect(slowed).toBeGreaterThan(0.3);
    await b.boost(1);
    await page.waitForTimeout(400);
    const justAfter = (await b.state()).mercy;
    expect(justAfter).toBeLessThan(0.8);
    expect(justAfter).toBeGreaterThan(slowed - 0.05);
    for (let i = 0; i < 16; i++) {
      await b.boost(1);
      await page.waitForTimeout(500);
    }
    expect((await b.state()).mercy).toBeGreaterThan(0.99);
  });

  test('info sheet reveals the game intent and collapses again', async ({ page }) => {
    await gotoGame(page);
    const button = page.getByTestId('chicken-info-button');
    const panel = page.getByTestId('chicken-info-panel');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(panel).toContainText('About this chicken');
    await expect(panel).toContainText('rubber screaming-chicken homage');
    await expect(panel).toContainText('gold at 110');
    await expect(panel).not.toContainText('Cloudflare');
    await expect(page.getByTestId('chicken-info-caret')).toHaveClass(/rotate-180/);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('leaderboard tabs, submission, and cookie-remembered identity', async ({ page }) => {
    const posted: Array<Record<string, unknown>> = [];
    await page.route('**/api/game/leaderboard', (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        posted.push(body);
        return route.fulfill({
          json: {
            human: [{ name: 'Maximus', score: 412 }],
            agent: [
              { name: String(body.name), score: Number(body.score) },
              { name: 'Clawde', score: 333 },
            ],
          },
        });
      }
      return route.fulfill({
        json: {
          human: [{ name: 'Maximus', score: 412 }],
          agent: [{ name: 'Clawde', score: 333 }],
        },
      });
    });
    await gotoGame(page);
    const link = page.getByTestId('chicken-leaderboard-link');
    const panel = page.getByTestId('chicken-leaderboard-panel');
    await expect(link).toBeVisible();
    await link.click();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(panel).toContainText('Maximus');
    await page.getByTestId('leaderboard-tab-agent').click();
    await expect(panel).toContainText('Clawde');

    await bridge(page).boost(5);
    await page.getByTestId('leaderboard-name-input').fill('Testy');
    await page.getByTestId('leaderboard-agent-checkbox').check();
    await page.getByTestId('leaderboard-submit').click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toEqual({ name: 'Testy', score: 5, kind: 'agent' });
    await expect(panel).toContainText('Testy');

    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).toContain('chicken-name=Testy');
    expect(cookies).toContain('chicken-kind=agent');

    await page.goto('/game');
    await page.getByTestId('chicken-loader').waitFor({ state: 'detached', timeout: 15_000 });
    await page.getByTestId('chicken-leaderboard-link').click();
    await expect(page.getByTestId('leaderboard-name-input')).toHaveValue('Testy');
    await expect(page.getByTestId('leaderboard-agent-checkbox')).toBeChecked();
  });

  test('feedback gate reuses the contact validation before revealing email', async ({ page }) => {
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [], agent: [] } })
    );
    await page.route('**/api/validate-contact', (route) =>
      route.fulfill({
        json: { name: { found: true, value: 'Testy' } },
      })
    );
    await gotoGame(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-feedback-toggle').click();
    const textarea = page.getByTestId('contact-textarea');
    await expect(textarea).toBeVisible();
    await expect(page.getByTestId('contact-result')).toHaveCount(0);
    await textarea.pressSequentially('Hello, I love the chicken game on your portfolio site', {
      delay: 60,
    });
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('chicken-leaderboard-panel')).toContainText('hello@mannan.is');
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).toContain('contact_revealed=1');
  });

  test('feedback gate honors a prior main-site validation pass', async ({ page, context }) => {
    await context.addCookies([
      { name: 'contact_revealed', value: '1', url: 'http://localhost:3847' },
    ]);
    await page.route('**/api/game/leaderboard', (route) =>
      route.fulfill({ json: { human: [], agent: [] } })
    );
    await gotoGame(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-feedback-toggle').click();
    await expect(page.getByTestId('contact-result')).toBeVisible();
    await expect(page.getByTestId('chicken-leaderboard-panel')).toContainText('hello@mannan.is');
    await expect(page.getByTestId('contact-textarea')).toHaveCount(0);
  });

  test('game survives total sound failure', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/sounds/chicken/**', (route) => route.fulfill({ status: 404 }));
    await page.route(R2_GLOB, (route) => route.fulfill({ status: 404 }));
    await page.goto('/game');
    const loader = page.getByTestId('chicken-loader');
    await loader.waitFor({ state: 'detached', timeout: 20_000 });
    await bridge(page).ready();
    await page.getByTestId('chicken').click({ force: true });
    await expect.poll(async () => (await bridge(page).state()).score).toBe(1);
    const screams = (await bridge(page).plays()).filter((p) => p.type === 'scream');
    expect(screams).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('flies upright and rights itself after a spin', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);
    expect(Math.abs((await b.state()).rotation)).toBeLessThan(2);

    const peak = await page.evaluate(async () => {
      const w = window as unknown as {
        __chicken: { spin: (v: number) => void; state: () => { rotation: number } };
      };
      w.__chicken.spin(20);
      let max = 0;
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        max = Math.max(max, Math.abs(w.__chicken.state().rotation));
      }
      return max;
    });
    expect(peak).toBeGreaterThan(10);

    await expect
      .poll(async () => Math.abs((await b.state()).rotation), { timeout: 4000 })
      .toBeLessThan(5);
  });

  test('wings flap with speed and the sprite faces its travel direction', async ({ page }) => {
    await gotoGame(page);
    const wings = page.getByTestId('chicken-wing');
    await expect(wings).toHaveCount(2);
    await expect(wings.first()).toHaveClass(/chicken-wing-/);

    const facing = page.getByTestId('chicken-facing');
    await expect(facing).toHaveAttribute('data-facing', /^(1|-1)$/);

    const consistent = await page.evaluate(async () => {
      const w = window as unknown as { __chicken: { state: () => { vx: number } } };
      const el = document.querySelector('[data-testid="chicken-facing"]');
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const vx = w.__chicken.state().vx;
        const f = el?.getAttribute('data-facing');
        if (Math.abs(vx) > 0.6 && (vx < 0) !== (f === '-1')) return false;
      }
      return true;
    });
    expect(consistent).toBe(true);

    const flap = await page.evaluate(async () => {
      const w = window as unknown as { __chicken: { boost: (n: number) => void } };
      const el = document.querySelector('[data-testid="chicken"]') as HTMLElement;
      const read = () => getComputedStyle(el).getPropertyValue('--flap-ms').trim();
      const before = read();
      w.__chicken.boost(90);
      for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));
      return { before, after: read() };
    });
    expect(flap.before).toMatch(/^\d+ms$/);
    expect(flap.after).toMatch(/^\d+ms$/);
    expect(parseInt(flap.after, 10)).toBeLessThan(parseInt(flap.before, 10));
  });

  test('hand-drawn scenery crossfades between landscapes', async ({ page }) => {
    await gotoGame(page);
    await page.waitForFunction(
      () => (window as unknown as { __scenery?: unknown }).__scenery !== undefined
    );
    const layer = page.getByTestId('game-scenery');
    await expect(layer).toBeVisible();
    await expect(page.getByTestId('scenery-slot')).toHaveCount(2);
    expect(await layer.getAttribute('data-scene')).toBe('0');

    await page.evaluate(() =>
      (window as unknown as { __scenery: { advance: () => void } }).__scenery.advance()
    );
    await expect.poll(async () => layer.getAttribute('data-scene')).toBe('1');

    await page.evaluate(() =>
      (window as unknown as { __scenery: { advance: () => void } }).__scenery.advance()
    );
    await expect.poll(async () => layer.getAttribute('data-scene')).toBe('2');
  });
});
