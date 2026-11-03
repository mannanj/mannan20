import { test, expect, type Page } from '@playwright/test';

const GUARD_MS = 900;

async function gotoGame(page: Page, query: string) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) =>
    route.fulfill({ json: { human: [], agent: [] } })
  );
  await page.goto(`/game${query}`);
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.getByTestId('chicken-loader').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
}

const sheet = (page: Page) => page.getByTestId('chicken-leaderboard-panel').or(page.locator('#chicken-leaderboard-panel'));

async function sheetOpen(page: Page) {
  return (await page.locator('#chicken-leaderboard-panel').getAttribute('aria-hidden')) === 'false';
}

async function squeeze(page: Page) {
  await page.evaluate(() => (window as unknown as { __chicken: { boost: (n: number) => void } }).__chicken.boost(1));
}

test.describe('chicken game v2 leaderboard hardening', () => {
  test('variant 2 is served only for ?variant=2', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await expect(page.getByTestId('chicken-stage')).toHaveAttribute('data-variant', '2');
    await gotoGame(page, '');
    await expect(page.getByTestId('chicken-stage')).not.toHaveAttribute('data-variant', '2');
  });

  test('a toggle click right after a squeeze is ignored as accidental', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 100);
    await squeeze(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(false);
  });

  test('a deliberate toggle opens it once play has paused', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await squeeze(page);
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
    await expect(sheet(page).first()).toBeVisible();
  });

  test('clicking the play area closes an open leaderboard', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
    await page.mouse.click(200, 150);
    expect(await sheetOpen(page)).toBe(false);
  });

  test('clicks inside the open leaderboard keep it open', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-tab-agent').click();
    expect(await sheetOpen(page)).toBe(true);
  });

  test('repeated toggles never stack views: one panel, last state wins', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    for (let i = 0; i < 5; i++) await page.getByTestId('chicken-leaderboard-link').click();
    await expect(page.locator('#chicken-leaderboard-panel')).toHaveCount(1);
    expect(await sheetOpen(page)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await sheetOpen(page)).toBe(false);
  });

  test('the default game keeps the original toggle behavior', async ({ page }) => {
    await gotoGame(page, '');
    await squeeze(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
  });
});

type OrbKindName = 'multiply' | 'cursor5' | 'cursor3';

interface OrbBridge {
  state: () => {
    score: number;
    orbs: { kind: string; label: string }[];
    clones: number;
    clonesBlinking: number;
    vanished: number;
    chickens: number;
    cursors: number;
    feathers: number;
    cursorBuffMs: { x5: number; x3: number };
  };
  boost: (n: number) => void;
  setScore: (n: number) => void;
  forceOrb: (kind: string) => void;
  collectOrb: (kind: string) => void;
  forceKid: () => void;
  fastForward: (ms: number) => void;
}

const SHOT_DIR = process.env.ORB_SHOT_DIR;
const X5_ARM = 48;
const X3_SPREAD = 30;
const HAND_HOT = { x: 20, y: 19 };
const BUFF_MS = 30_000;
const EXTEND_PER_CLICK_MS = 100;
const EXTEND_CLICKS = 10;
const MULTIPLY_CAP = 60;


async function collect(page: Page, kind: OrbKindName) {
  await page.evaluate(
    (k) => {
      const b = (window as unknown as { __chicken: OrbBridge }).__chicken;
      b.forceOrb(k);
      b.collectOrb(k);
    },
    kind
  );
  await page.waitForTimeout(60);
}

const snap = (page: Page) =>
  page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.state());

test.describe('chicken game v2 ability orbs', () => {
  test('orbs spawn exactly when their thresholds are reached', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const cases: [number, OrbKindName, string][] = [
      [500, 'multiply', 'Multiply x3'],
      [750, 'cursor5', 'Cursor x5'],
      [1250, 'cursor3', 'Cursor x3'],
    ];
    for (const [threshold, kind, label] of cases) {
      await page.evaluate((n) => (window as unknown as { __chicken: OrbBridge }).__chicken.setScore(n), threshold - 1);
      expect((await snap(page)).orbs.filter((o) => o.kind === kind)).toHaveLength(0);
      await squeeze(page);
      const orbs = (await snap(page)).orbs.filter((o) => o.kind === kind);
      expect(orbs).toHaveLength(1);
      expect(orbs[0].label).toBe(label);
      await expect(page.locator(`[data-testid="chicken-orb"][data-kind="${kind}"]`)).toContainText(label);
    }
  });

  test('an uncollected orb disappears after 30 seconds', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceOrb('cursor5'));
    expect((await snap(page)).orbs).toHaveLength(1);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(29_000));
    await page.waitForTimeout(80);
    expect((await snap(page)).orbs).toHaveLength(1);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(2000));
    await page.waitForTimeout(120);
    expect((await snap(page)).orbs).toHaveLength(0);
    await expect(page.getByTestId('chicken-orb')).toHaveCount(0);
  });

  test('clicking an orb collects it', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceOrb('multiply'));
    await page.waitForTimeout(200);
    await page.getByTestId('chicken-orb').click({ force: true });
    await page.waitForTimeout(80);
    const s = await snap(page);
    expect(s.orbs).toHaveLength(0);
    expect(s.clones).toBe(2);
  });

  test('multiply triples everything on screen, clones included, up to the cap', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceKid());
    await page.waitForTimeout(60);
    expect((await snap(page)).chickens).toBe(2);
    await collect(page, 'multiply');
    expect((await snap(page)).chickens).toBe(6);
    await collect(page, 'multiply');
    expect((await snap(page)).chickens).toBe(18);
    await collect(page, 'multiply');
    expect((await snap(page)).chickens).toBe(54);
    await collect(page, 'multiply');
    expect((await snap(page)).chickens).toBe(MULTIPLY_CAP);
    await expect(page.getByTestId('chicken-clone')).toHaveCount(MULTIPLY_CAP - 2);
  });

  test('clones blink near 10s then vanish into black holes leaving feathers', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await collect(page, 'multiply');
    expect((await snap(page)).clonesBlinking).toBe(0);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(10_200));
    await page.waitForTimeout(120);
    const mid = await snap(page);
    expect(mid.clones).toBe(2);
    expect(mid.clonesBlinking).toBe(2);
    await expect(page.locator('[data-testid="chicken-clone"].chicken-clone-blink')).toHaveCount(2);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(5000));
    await page.waitForTimeout(120);
    const end = await snap(page);
    expect(end.clones).toBe(0);
    expect(end.vanished).toBe(2);
    expect(end.feathers).toBeGreaterThan(0);
    expect(end.chickens).toBe(1);
    await expect(page.getByTestId('chicken')).toBeVisible();
  });

  test('clicking a clone scores one point', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await collect(page, 'multiply');
    const before = (await snap(page)).score;
    const box = await page.getByTestId('chicken-clone').first().boundingBox();
    if (!box) throw new Error('no clone');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect((await snap(page)).score).toBe(before + 1);
  });

  test('cursor x5 adds four diagonal cursors in an X', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const mx = 640;
    const my = 330;
    await page.mouse.move(mx, my);
    await collect(page, 'cursor5');
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(4);
    await page.waitForTimeout(80);
    const boxes = await page.getByTestId('chicken-extra-cursor').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y };
      })
    );
    const found = boxes
      .map((b) => `${Math.round(b.x + HAND_HOT.x - mx)},${Math.round(b.y + HAND_HOT.y - my)}`)
      .sort();
    const expected = [`-${X5_ARM},-${X5_ARM}`, `${X5_ARM},-${X5_ARM}`, `-${X5_ARM},${X5_ARM}`, `${X5_ARM},${X5_ARM}`].sort();
    expect(found).toEqual(expected);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x5.png` });
  });

  test('cursor x3 multiplies the set: 15 with x5, 3 alone', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.mouse.move(640, 330);
    await collect(page, 'cursor3');
    expect((await snap(page)).cursors).toBe(3);
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(2);
    await collect(page, 'cursor5');
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(14);
    expect((await snap(page)).cursors).toBe(15);
    await page.mouse.move(641, 331);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x15.png` });
    expect(X3_SPREAD).toBeGreaterThan(0);
  });

  test('buffs last 30s and every chicken click extends them by 0.1s', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await collect(page, 'cursor5');
    const first = (await snap(page)).cursorBuffMs.x5;
    expect(first).toBeGreaterThan(BUFF_MS - 1000);
    await page.evaluate((n) => (window as unknown as { __chicken: OrbBridge }).__chicken.boost(n), EXTEND_CLICKS);
    const extended = (await snap(page)).cursorBuffMs.x5;
    expect(extended - first).toBeGreaterThan(EXTEND_CLICKS * EXTEND_PER_CLICK_MS - 300);
    expect(extended - first).toBeLessThan(EXTEND_CLICKS * EXTEND_PER_CLICK_MS + 100);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(29_000));
    expect((await snap(page)).cursorBuffMs.x5).toBeGreaterThan(0);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(3000));
    await page.waitForTimeout(120);
    expect((await snap(page)).cursorBuffMs.x5).toBe(0);
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(0);
    expect((await snap(page)).cursors).toBe(1);
  });

  test('a click fires at every cursor and each one that lands scores a point', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await collect(page, 'cursor5');
    const box = await page.getByTestId('chicken').boundingBox();
    if (!box) throw new Error('no chicken');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const before = (await snap(page)).score;
    await page.mouse.click(cx - X5_ARM, cy - X5_ARM);
    expect((await snap(page)).score).toBe(before + 1);
    await collect(page, 'cursor3');
    const box2 = await page.getByTestId('chicken').boundingBox();
    if (!box2) throw new Error('no chicken');
    const mid = (await snap(page)).score;
    await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
    const gained = (await snap(page)).score - mid;
    expect(gained).toBeGreaterThanOrEqual(3);
  });

  test('screenshots: orb and multiply clones', async ({ page }) => {
    test.skip(!SHOT_DIR, 'ORB_SHOT_DIR not set');
    await gotoGame(page, '?variant=2');
    await page.mouse.move(300, 300);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceOrb('multiply'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOT_DIR}/orb.png` });
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceKid());
    await collect(page, 'multiply');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOT_DIR}/clones.png` });
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(12_200));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOT_DIR}/vanish.png` });
  });
});
