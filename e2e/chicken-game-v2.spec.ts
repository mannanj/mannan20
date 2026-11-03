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
const X5_ARM = 30;
const X3_SPREAD = 22;
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
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(5);
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
    const expected = ['0,0', `-${X5_ARM},-${X5_ARM}`, `${X5_ARM},-${X5_ARM}`, `-${X5_ARM},${X5_ARM}`, `${X5_ARM},${X5_ARM}`].sort();
    expect(found).toEqual(expected);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x5.png` });
  });

  test('cursor layouts: triangle of 3, X of 5 around the anchor, 15 as anchor + rings of 6 and 8', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.mouse.move(640, 330);
    const offsets = () =>
      page.evaluate(() => (window as unknown as { __chicken: { state: () => { cursorOffsets: { dx: number; dy: number }[] } } }).__chicken.state().cursorOffsets);
    const radii = (os: { dx: number; dy: number }[]) => os.map((o) => Math.round(Math.hypot(o.dx, o.dy))).sort((a, b) => a - b);
    await collect(page, 'cursor3');
    const tri = await offsets();
    expect(tri).toHaveLength(3);
    const sides = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => Math.hypot(tri[i].dx - tri[j].dx, tri[i].dy - tri[j].dy));
    for (const side of sides) {
      expect(side).toBeGreaterThan(30);
      expect(side).toBeLessThan(42);
    }
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x3-triangle.png` });
    await page.evaluate(() => (window as unknown as { __chicken: { fastForward: (ms: number) => void } }).__chicken.fastForward(31_000));
    await page.waitForTimeout(100);
    await collect(page, 'cursor5');
    const x = await offsets();
    expect(x).toContainEqual({ dx: 0, dy: 0 });
    expect(x.filter((o) => o.dx !== 0 && Math.abs(o.dx) === Math.abs(o.dy))).toHaveLength(4);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x5-cross.png` });
    await collect(page, 'cursor3');
    const rings = await offsets();
    expect(rings).toHaveLength(15);
    const r = radii(rings);
    expect(r[0]).toBe(0);
    expect(r.filter((v) => v > 30 && v < 50)).toHaveLength(6);
    expect(r.filter((v) => v > 65 && v < 90)).toHaveLength(8);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/cursor-x15-rings.png` });
  });

  test('cursor x3 multiplies the set: 15 with x5, 3 alone', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.mouse.move(640, 330);
    await collect(page, 'cursor3');
    expect((await snap(page)).cursors).toBe(3);
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(3);
    await collect(page, 'cursor5');
    await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(15);
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
    const clickX = cx - X5_ARM;
    const clickY = cy - X5_ARM;
    const offsets = [[0, 0], [-X5_ARM, -X5_ARM], [X5_ARM, -X5_ARM], [-X5_ARM, X5_ARM], [X5_ARM, X5_ARM]];
    const landing = offsets.filter(([dx, dy]) => {
      const x = clickX + dx;
      const y = clickY + dy;
      return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
    }).length;
    await page.mouse.click(clickX, clickY);
    expect((await snap(page)).score).toBe(before + landing);
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

interface TossState {
  score: number;
  tier: number;
  pieces: number;
  splitLevels: number[];
  held: boolean;
  holdProgress: number;
  holdDrift: number;
  bandaid: number | null;
  woundOpen: boolean;
  drops: number;
  pools: number;
  rootSplit: boolean;
}

interface TossBridge {
  state: () => TossState;
  boost: (n: number) => void;
  forceToss: (level?: number) => void;
  forceReform: () => void;
  forceBandaid: () => void;
  holdMsOverride: (ms: number) => void;
  fastForward: (ms: number) => void;
}

const TOSS_SHOT_DIR = process.env.TOSS_SHOT_DIR;
const SETTLE_MS = 1300;
const PERF_P95_MAX_MS = 25;

const tossState = (page: Page) =>
  page.evaluate(() => (window as unknown as { __chicken: TossBridge }).__chicken.state());

const tossCall = (page: Page, fn: 'forceReform' | 'forceBandaid') =>
  page.evaluate((name) => (window as unknown as { __chicken: TossBridge }).__chicken[name](), fn);

const forceToss = (page: Page, level?: number) =>
  page.evaluate((l) => (window as unknown as { __chicken: TossBridge }).__chicken.forceToss(l), level);

async function chickenCenter(page: Page) {
  const box = await page.getByTestId('chicken').boundingBox();
  if (!box) throw new Error('no chicken');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function waitPieces(page: Page, count: number) {
  await page.waitForFunction(
    (n) => (window as unknown as { __chicken: TossBridge }).__chicken.state().pieces === n,
    count,
    { timeout: 10_000 }
  );
}

async function splitTo(page: Page, levels: number, from = 0) {
  for (let level = from; level < levels; level++) {
    const count = 3 ** level;
    for (let i = 0; i < count; i++) await forceToss(page, level);
    await waitPieces(page, 3 ** (level + 1));
    await page.waitForTimeout(SETTLE_MS);
  }
}

async function reformFully(page: Page) {
  await tossCall(page, 'forceReform');
  await page.waitForFunction(
    () => {
      const s = (window as unknown as { __chicken: TossBridge }).__chicken.state();
      return !s.rootSplit && s.pieces === 0;
    },
    undefined,
    { timeout: 25_000 }
  );
}

test.describe('chicken game v2 toss and split', () => {
  test.setTimeout(60_000);

  test('hold shows the hold-to-toss bar and counts up', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(600);
    const s = await tossState(page);
    expect(s.holdProgress).toBeGreaterThan(0.2);
    expect(s.holdProgress).toBeLessThan(0.6);
    await expect(page.getByTestId('hold-toss-hud')).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('hold-toss-label')).toHaveText('hold to toss');
    await expect(page.getByTestId('hold-toss-readout')).toContainText('/ 1.5s');
    if (TOSS_SHOT_DIR) await page.screenshot({ path: `${TOSS_SHOT_DIR}/hold-hud.png` });
    await page.mouse.up();
  });

  test('a quick click still squeezes for 1 point', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const c = await chickenCenter(page);
    await page.mouse.click(c.x, c.y);
    const s = await tossState(page);
    expect(s.score).toBe(1);
    expect(s.held).toBe(false);
    await expect(page.getByTestId('hold-toss-hud')).toHaveCSS('opacity', '0');
  });

  test('holding 1.5s grabs the chicken', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(1700);
    expect((await tossState(page)).held).toBe(true);
    await page.mouse.move(c.x + 120, c.y - 120, { steps: 8 });
    await page.waitForTimeout(500);
    const piece = await page.getByTestId('chicken-piece').boundingBox();
    if (!piece) throw new Error('no held piece');
    expect(Math.abs(piece.x + piece.width / 2 - (c.x + 120))).toBeLessThan(110);
    await page.mouse.up();
  });

  test('leaving the chicken resets the hold', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.move(c.x + 400, c.y - 200);
    await page.waitForTimeout(400);
    const s = await tossState(page);
    expect(s.holdProgress).toBe(0);
    expect(s.held).toBe(false);
    await page.mouse.up();
  });

  test('releasing a toss splits the chicken into 3 and scores nothing', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: TossBridge }).__chicken.holdMsOverride(300));
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(500);
    expect((await tossState(page)).held).toBe(true);
    await page.mouse.move(c.x + 80, c.y - 150, { steps: 6 });
    await page.mouse.up();
    await waitPieces(page, 3);
    const s = await tossState(page);
    expect(s.splitLevels).toEqual([1, 1, 1]);
    expect(s.score).toBe(0);
    expect(s.rootSplit).toBe(true);
    await expect(page.getByTestId('chicken')).toHaveCSS('visibility', 'hidden');
  });

  test('pieces split again, three levels at most, and a level-3 toss only ragdolls', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await splitTo(page, 2);
    expect((await tossState(page)).splitLevels).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2]);
    if (TOSS_SHOT_DIR) await page.screenshot({ path: `${TOSS_SHOT_DIR}/split-9.png` });
    await splitTo(page, 3, 2);
    const s = await tossState(page);
    expect(s.pieces).toBe(27);
    expect(new Set(s.splitLevels)).toEqual(new Set([3]));
    await forceToss(page, 3);
    await page.waitForTimeout(1200);
    expect((await tossState(page)).pieces).toBe(27);
  });

  test('smaller chickens slip away faster while held', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const big = (await tossState(page)).holdDrift;
    await page.mouse.up();
    await splitTo(page, 3);
    const box = await page.locator('[data-testid="chicken-piece"][data-level="3"]').first().boundingBox();
    if (!box) throw new Error('no small piece');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const small = (await tossState(page)).holdDrift;
    await page.mouse.up();
    expect(small).toBeGreaterThan(big);
  });

  test('pieces share the root stage and a piece click scores exactly 1', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: TossBridge }).__chicken.boost(30));
    await forceToss(page);
    await waitPieces(page, 3);
    await page.waitForTimeout(SETTLE_MS);
    const s = await tossState(page);
    const tiers = await page.getByTestId('chicken-piece').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-tier'))
    );
    expect(new Set(tiers)).toEqual(new Set([String(s.tier)]));
    await forceToss(page, 1);
    await waitPieces(page, 5);
    await page.waitForTimeout(SETTLE_MS);
    const before = (await tossState(page)).score;
    await page
      .locator('[data-testid="chicken-piece"][data-level="2"]')
      .first()
      .evaluate((el) => (el as HTMLElement).click());
    expect((await tossState(page)).score).toBe(before + 1);
  });

  test('pieces wander then merge back into one', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await forceToss(page);
    await waitPieces(page, 3);
    await page.waitForTimeout(SETTLE_MS);
    await reformFully(page);
    const s = await tossState(page);
    expect(s.splitLevels).toEqual([]);
    expect(s.bandaid).toBeNull();
    await expect(page.getByTestId('chicken')).toHaveCSS('visibility', 'visible');
  });

  test('a bandaid appears only after a full 3-level split and reform', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await splitTo(page, 3);
    await reformFully(page);
    const s = await tossState(page);
    expect(s.bandaid).toBe(3);
    await expect(page.getByTestId('wound-line')).toBeVisible();
    await expect(page.getByTestId('bandaid')).toHaveAttribute('data-hp', '3');
  });

  test('a bandaided chicken takes 3 tosses; the third splits it and leaks rainbow', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await tossCall(page, 'forceBandaid');
    await expect(page.getByTestId('bandaid')).toBeVisible();
    if (TOSS_SHOT_DIR) await page.screenshot({ path: `${TOSS_SHOT_DIR}/bandaid.png` });
    for (const expected of [2, 1]) {
      await forceToss(page);
      await page.waitForFunction(
        () => !(window as unknown as { __chicken: TossBridge }).__chicken.state().rootSplit,
        undefined,
        { timeout: 5000 }
      );
      const s = await tossState(page);
      expect(s.bandaid).toBe(expected);
      expect(s.pieces).toBe(0);
    }
    await forceToss(page);
    await waitPieces(page, 3);
    const s = await tossState(page);
    expect(s.bandaid).toBe(0);
    expect(s.woundOpen).toBe(true);
    expect(s.drops).toBeGreaterThan(0);
    await page.waitForFunction(
      () => (window as unknown as { __chicken: TossBridge }).__chicken.state().pools > 0,
      undefined,
      { timeout: 5000 }
    );
    const pools = (await tossState(page)).pools;
    expect(pools).toBeLessThanOrEqual(24);
    if (TOSS_SHOT_DIR) {
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `${TOSS_SHOT_DIR}/pools.png` });
    }
    await page.waitForTimeout(3000);
    await page.evaluate(() => (window as unknown as { __chicken: TossBridge }).__chicken.fastForward(10_000));
    await page.waitForFunction(
      () => (window as unknown as { __chicken: TossBridge }).__chicken.state().pools === 0,
      undefined,
      { timeout: 3000 }
    );
  });

  test('27 chickens keep the frame time healthy', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await splitTo(page, 3);
    const p95 = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const deltas: number[] = [];
          let last = performance.now();
          const end = last + 2000;
          const step = (t: number) => {
            deltas.push(t - last);
            last = t;
            if (t < end) requestAnimationFrame(step);
            else {
              deltas.sort((a, b) => a - b);
              resolve(deltas[Math.floor(deltas.length * 0.95)]);
            }
          };
          requestAnimationFrame(step);
        })
    );
    expect(p95).toBeLessThan(PERF_P95_MAX_MS);
  });

  test('screenshot: mid-air ragdoll', async ({ page }) => {
    test.skip(!TOSS_SHOT_DIR, 'TOSS_SHOT_DIR not set');
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: TossBridge }).__chicken.holdMsOverride(300));
    const c = await chickenCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.move(c.x + 250, c.y - 250, { steps: 10 });
    await page.mouse.move(c.x + 330, c.y - 260, { steps: 3 });
    await page.screenshot({ path: `${TOSS_SHOT_DIR}/ragdoll-held.png` });
    await page.mouse.up();
    await page.waitForTimeout(140);
    await page.screenshot({ path: `${TOSS_SHOT_DIR}/ragdoll-flight.png` });
  });
});

const INVENTORY_KEY = 'article-inventory-v1';
const FLIGHT_MS = 700;
const INVENTORY_SHOT_DIR = process.env.INVENTORY_SHOT_DIR;

interface InventoryBridge {
  inventory: () => { id: string; label: string; count: number }[];
  grantItem: (id: string, fromX?: number, fromY?: number) => void;
}

const grant = (page: Page, id: string, x?: number, y?: number) =>
  page.evaluate(
    ([i, px, py]) => (window as unknown as { __chicken: InventoryBridge }).__chicken.grantItem(i as string, px as number | undefined, py as number | undefined),
    [id, x, y]
  );

const storedItems = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]') as { id: string; count: number }[], INVENTORY_KEY);

test.describe('chicken game v2 inventory bag', () => {
  test('the bag renders only in variant 2', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await expect(page.getByTestId('inventory-bag')).toBeVisible();
    await gotoGame(page, '');
    await expect(page.getByTestId('inventory-bag')).toHaveCount(0);
  });

  test('grantItem flies into the bag and the count increments', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await grant(page, 'hawk-feather', 200, 200);
    await expect(page.getByTestId('fly-to-bag')).toHaveCount(1);
    await expect(page.getByTestId('fly-to-bag')).toHaveCount(0, { timeout: FLIGHT_MS * 3 });
    await expect(page.getByTestId('inventory-total')).toHaveText('1');
    await page.getByTestId('inventory-bag').click();
    await expect(page.getByTestId('inventory-count-hawk-feather')).toHaveText('x1');
    await expect(page.getByTestId('inventory-use-hawk-feather')).toBeVisible();
    const items = await page.evaluate(() => (window as unknown as { __chicken: InventoryBridge }).__chicken.inventory());
    expect(items).toEqual([{ id: 'hawk-feather', label: 'Hawk feather', count: 1 }]);
  });

  test('items persist across reload', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await grant(page, 'toasted-feather');
    await grant(page, 'toasted-feather');
    await expect(page.getByTestId('inventory-total')).toHaveText('2', { timeout: FLIGHT_MS * 3 });
    await gotoGame(page, '?variant=2');
    await expect(page.getByTestId('inventory-total')).toHaveText('2');
    expect(await storedItems(page)).toEqual([expect.objectContaining({ id: 'toasted-feather', count: 2 })]);
  });

  test('garden-shaped items are kept', async ({ page }) => {
    await page.addInitScript(
      ([key]) => {
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, JSON.stringify([{ id: 'easter-egg', label: 'Easter egg', count: 3 }, { id: 'ruby-gem', label: 'Ruby gem', count: 1 }]));
        }
      },
      [INVENTORY_KEY]
    );
    await gotoGame(page, '?variant=2');
    await expect(page.getByTestId('inventory-total')).toHaveText('4');
    await grant(page, 'hawk-feather');
    await expect(page.getByTestId('inventory-total')).toHaveText('5', { timeout: FLIGHT_MS * 3 });
    const stored = await storedItems(page);
    expect(stored.map((i) => i.id)).toEqual(['easter-egg', 'ruby-gem', 'hawk-feather']);
    expect(stored[0].count).toBe(3);
  });

  test('the bag does not block the leaderboard toggle', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 100);
    const bag = await page.getByTestId('inventory-bag').boundingBox();
    const toggle = await page.getByTestId('chicken-leaderboard-link').boundingBox();
    expect(bag && toggle).toBeTruthy();
    expect(bag!.x).toBeGreaterThan(toggle!.x + toggle!.width);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
  });

  test('clicking the bag does not close an open leaderboard', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 100);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
    await page.getByTestId('inventory-bag').click();
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    expect(await sheetOpen(page)).toBe(true);
  });

  test('screenshots: bag closed, open, mid-flight', async ({ page }) => {
    test.skip(!INVENTORY_SHOT_DIR, 'INVENTORY_SHOT_DIR not set');
    await gotoGame(page, '?variant=2');
    await page.screenshot({ path: `${INVENTORY_SHOT_DIR}/bag-closed.png` });
    await grant(page, 'hawk-feather', 300, 300);
    await page.waitForTimeout(FLIGHT_MS / 2);
    await page.screenshot({ path: `${INVENTORY_SHOT_DIR}/fly-mid.png` });
    await expect(page.getByTestId('inventory-total')).toHaveText('1');
    await page.getByTestId('inventory-bag').click();
    await page.screenshot({ path: `${INVENTORY_SHOT_DIR}/bag-open.png` });
  });
});

type SeqBridge = {
  state: () => {
    score: number;
    stage: string;
    seq: string;
    portal: string;
    hyper: string;
    scramble: string;
    pos: { x: number; y: number };
    scene3dReady: boolean;
    scene3dProgress: number;
    scene3dGate: string;
  };
  boost: (n: number) => void;
  setSeqTimeScale: (n: number) => void;
};

const SEQ_SPEEDUP = 12;
const START_SCORE_QUERY = '?variant=2&start=345';
const PLANE_VIEW = { width: 1280, height: 720 };

async function enterPilot(page: Page) {
  await gotoGame(page, START_SCORE_QUERY);
  await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().score >= 345);
  await page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(10));
  await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().stage === 'pilot');
}

async function toRocket(page: Page) {
  await page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(100));
  await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().stage === 'rocket');
}

const seqState = (page: Page) =>
  page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state());

test.describe('chicken game v2 plane, rocket and 3D flight', () => {
  test.setTimeout(150_000);

  test('the plane flies without portals or set-pieces and never leaves the screen', async ({ page }) => {
    await page.setViewportSize(PLANE_VIEW);
    await enterPilot(page);
    await page.waitForTimeout(4200);
    let setPieces = 0;
    let minEdge = Infinity;
    for (let i = 0; i < 50; i++) {
      const s = await seqState(page);
      if (s.portal !== 'idle' || s.hyper !== 'idle' || s.scramble !== 'idle') setPieces += 1;
      minEdge = Math.min(minEdge, s.pos.x + 35, PLANE_VIEW.width - s.pos.x - 35, s.pos.y + 70, PLANE_VIEW.height - s.pos.y - 70);
      await page.waitForTimeout(250);
    }
    expect(setPieces).toBe(0);
    expect(minEdge).toBeGreaterThan(0);
  });

  test('stages follow pilot, planeExit, explode, drift, rocketApproach, boarding, gate, flight3d, moon', async ({ page }) => {
    await enterPilot(page);
    await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.setSeqTimeScale(n), SEQ_SPEEDUP);
    await toRocket(page);
    const seen: string[] = [];
    const deadline = Date.now() + 100_000;
    let reachedGate = false;
    while (Date.now() < deadline) {
      const s = await seqState(page);
      const label = s.stage === 'moon' ? 'moon' : s.scene3dGate !== 'none' ? 'gate' : s.seq;
      if (seen[seen.length - 1] !== label) seen.push(label);
      if (s.stage === 'rocket' && s.seq === 'planeExit') {
        await page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(1));
      }
      if (s.scene3dGate === 'ready' && !reachedGate) {
        reachedGate = true;
        await page.getByTestId('gate-start').click();
      }
      if (s.stage === 'moon') break;
      await page.waitForTimeout(150);
    }
    const order = ['planeExit', 'explode', 'drift', 'rocketApproach', 'boarding', 'gate', 'flight3d', 'moon'];
    expect(seen.filter((l) => order.includes(l))).toEqual(order);
  });

  test('the 3D scene is preloaded long before the rocket stage', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForFunction(
      () => (window as unknown as { __chicken: SeqBridge }).__chicken.state().scene3dReady,
      undefined,
      { timeout: 30_000 }
    );
    const s = await seqState(page);
    expect(s.stage).toBe('none');
    expect(s.scene3dProgress).toBe(100);
  });

  test('a slow download pauses the game behind a progress gate and skip continues to the moon', async ({ page }) => {
    const delays: Record<string, number> = { 'earth-day-2k': 2500, 'earth-night-2k': 5000, 'moon-lroc-1k': 7500 };
    await page.route('**/game/space/*.jpg', async (route) => {
      const name = Object.keys(delays).find((k) => route.request().url().includes(k)) ?? '';
      const response = await route.fetch();
      await new Promise((r) => setTimeout(r, delays[name] ?? 0));
      await route.fulfill({ response });
    });
    await enterPilot(page);
    await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.setSeqTimeScale(n), 40);
    await toRocket(page);
    await page.getByTestId('space-gate').waitFor({ timeout: 60_000 });
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'downloading');
    await expect(page.getByTestId('gate-skip')).toHaveText('skip instead?');
    const first = (await seqState(page)).scene3dProgress;
    const before = (await seqState(page)).score;
    await page.mouse.click(640, 360);
    expect((await seqState(page)).score).toBe(before);
    await expect.poll(async () => (await seqState(page)).scene3dProgress, { timeout: 15_000 }).toBeGreaterThan(first);
    await page.getByTestId('gate-skip').click();
    await expect(page.getByTestId('space-gate')).toHaveCount(0);
    await page.waitForFunction(
      () => (window as unknown as { __chicken: SeqBridge }).__chicken.state().stage === 'moon',
      undefined,
      { timeout: 40_000 }
    );
  });

  test('ready, start, countdown, then the 3D flight', async ({ page }) => {
    await enterPilot(page);
    await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().scene3dReady);
    await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.setSeqTimeScale(n), 40);
    await toRocket(page);
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'ready', { timeout: 60_000 });
    await page.getByTestId('gate-arrow').click();
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'countdown');
    await expect(page.getByTestId('gate-count')).toBeVisible();
    await expect(page.getByTestId('space-flight-3d')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('sunsignal-credit')).toHaveAttribute('href', 'https://sunsignal.app');
  });
});
