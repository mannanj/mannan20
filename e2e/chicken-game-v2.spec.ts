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
      await expect(page.locator(`[data-testid="chicken-orb"][data-kind="${kind}"]`)).toHaveAttribute('aria-label', label);
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
    const all3 = await offsets();
    expect(all3).toHaveLength(4);
    expect(all3.filter((o) => (o as { hidden?: boolean }).hidden)).toEqual([{ dx: 0, dy: 0, hidden: true }]);
    const tri = all3.filter((o) => !(o as { hidden?: boolean }).hidden);
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
    expect((await snap(page)).cursors).toBe(4);
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

interface BirdView {
  kind: string | null;
  phase: string;
  scale: number;
  anchor: { x: number; y: number };
  settled: { x: number; y: number };
  intercept: { x: number; y: number };
  nudge: { x: number; y: number };
  rightClicks: number;
  leftClicks: number;
  hint: boolean;
  looks: number;
  calm: boolean;
  calmClicks: number;
  recoveryClicks: number;
  feathered: boolean;
  feather: { x: number; y: number } | null;
  snapshot: { speed: number; mode: string } | null;
}

interface BirdBridge {
  state: () => { score: number; scoreExact: number; speed: number; mode: string; mult: number; skin: string; bird: BirdView };
  setScore: (n: number) => void;
  boost: (n: number) => void;
  placeChicken: (x: number, y: number) => void;
  fastForward: (ms: number) => void;
  forceBird: (kind: string) => void;
  useItem: (id: string) => void;
  inventory: () => { id: string; count: number }[];
}

const birdState = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state());
const birdFf = (page: Page, ms: number) => page.evaluate((m) => (window as unknown as { __chicken: BirdBridge }).__chicken.fastForward(m), ms);
const rootData = (page: Page) => page.evaluate(() => ({ ...document.querySelector<HTMLElement>('[data-testid="bird-root"]')?.dataset }));
const rectOf = (page: Page, testId: string) => page.getByTestId(testId).evaluate((el) => el.getBoundingClientRect().toJSON() as { left: number; top: number; right: number; bottom: number; width: number; height: number });

async function summonHawk(page: Page) {
  await gotoGame(page, '?variant=2');
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(1999));
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.placeChicken(820, 420));
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
  await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
  await page.waitForTimeout(150);
}

async function tapTalon(page: Page, side: 'right' | 'left', n: number) {
  for (let i = 0; i < n; i++) await page.getByTestId(`bird-talon-${side}`).click({ force: true });
}

test.describe('chicken game v2 hawk event', () => {
  test('no hawk below 2000; the hawk flies in when 2000 is reached', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(1999));
    await page.waitForTimeout(300);
    expect((await birdState(page)).bird.phase).toBe('idle');
    await expect(page.getByTestId('bird-root')).toHaveCount(0);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
    await expect.poll(async () => (await birdState(page)).bird.phase, { timeout: 5000 }).toBe('approach');
    const s = await birdState(page);
    expect(s.score).toBe(2000);
    expect(s.bird.snapshot).not.toBeNull();
    await expect(page.getByTestId('bird-flight')).toBeVisible();
  });

  test('forceBird triggers the event once per run', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.forceBird('hawk'));
    await page.waitForTimeout(300);
    expect((await birdState(page)).bird.phase).toBe('approach');
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.forceBird('hawk'));
    expect((await birdState(page)).bird.phase).toBe('approach');
  });

  test('grab composition: intercept point, nudge, everything on screen, X on the front talon', async ({ page }) => {
    await summonHawk(page);
    const s = await birdState(page);
    expect(s.bird.settled.x - s.bird.intercept.x).toBeCloseTo(s.bird.nudge.x, 3);
    expect(s.bird.settled.y - s.bird.intercept.y).toBeCloseTo(s.bird.nudge.y, 3);
    expect(Math.hypot(s.bird.nudge.x, s.bird.nudge.y)).toBeLessThan(200);
    const held = await rectOf(page, 'chicken');
    const live = (await birdState(page)).bird.anchor;
    expect(Math.abs(held.left + held.width / 2 - live.x)).toBeLessThan(6);
    expect(Math.abs(held.top + held.height / 2 - live.y)).toBeLessThan(6);
    await expect(page.getByTestId('bird-banner')).toHaveText('help the chicken escape!');
    const vw = 1280;
    const vh = 720;
    for (const id of ['chicken', 'bird-body', 'bird-talon-right', 'bird-talon-left']) {
      const r = await rectOf(page, id);
      expect(r.left, id).toBeGreaterThanOrEqual(0);
      expect(r.top, id).toBeGreaterThanOrEqual(0);
      expect(r.right, id).toBeLessThanOrEqual(vw);
      expect(r.bottom, id).toBeLessThanOrEqual(vh);
    }
    const chicken = await rectOf(page, 'chicken');
    const right = await rectOf(page, 'bird-talon-right');
    const left = await rectOf(page, 'bird-talon-left');
    expect(right.left).toBeLessThan(chicken.left + chicken.width / 2);
    expect(left.top).toBeLessThan(right.top);
    const hud = await rectOf(page, 'chicken-stage');
    expect(hud.width).toBe(vw);
    expect((await rootData(page)).hint).toBe('0');
    await birdFf(page, 10_100);
    await page.waitForTimeout(200);
    const data = await rootData(page);
    expect(data.hint).toBe('1');
    expect(data.talon).toBe('right');
    const hintX = await page.getByTestId('bird-hint').getAttribute('data-x');
    const [xc, yc] = (hintX ?? '').split(',').map(Number);
    const talon = await rectOf(page, 'bird-talon-right');
    expect(xc).toBeGreaterThan(talon.left);
    expect(xc).toBeLessThan(talon.right);
    expect(yc).toBeGreaterThan(talon.top);
    expect(yc).toBeLessThan(talon.bottom);
    await expect(page.getByTestId('bird-tap-cursor')).toBeVisible();
    expect(data.label).toBe('0');
  });

  test('25 front-talon clicks score 25 and free the right claw; then the left claw with hint, label and look-at-you', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    const before = (await birdState(page)).score;
    await tapTalon(page, 'right', 24);
    let s = await birdState(page);
    expect(s.bird.phase).toBe('right');
    expect(s.bird.rightClicks).toBe(24);
    await tapTalon(page, 'right', 1);
    s = await birdState(page);
    expect(s.score).toBe(before + 25);
    expect(s.bird.phase).toBe('recoil');
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await page.waitForTimeout(100);
    let data = await rootData(page);
    expect(data.talon).toBe('left');
    expect(data.hint).toBe('0');
    await birdFf(page, 10_100);
    await page.waitForTimeout(200);
    data = await rootData(page);
    expect(data.hint).toBe('1');
    expect(data.label).toBe('0');
    await birdFf(page, 30_100);
    await page.waitForTimeout(200);
    data = await rootData(page);
    expect(data.label).toBe('1');
    await expect(page.getByTestId('bird-hint-label')).toHaveText('click the claw');
    await tapTalon(page, 'left', 4);
    expect((await rootData(page)).look).toBe('0');
    await tapTalon(page, 'left', 1);
    expect((await birdState(page)).bird.looks).toBe(1);
    await expect.poll(async () => (await rootData(page)).look).toBe('1');
    await tapTalon(page, 'left', 5);
    expect((await birdState(page)).bird.looks).toBe(2);
    await tapTalon(page, 'left', 15);
    s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    expect(s.bird.calm).toBe(true);
    expect(s.score).toBe(before + 50);
  });

  test('freed: hawk hovers, chicken stands still for 25 free clicks, then resumes its pre-hawk speed; fly-off shrinks', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    await tapTalon(page, 'right', 25);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await tapTalon(page, 'left', 25);
    let s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    const snapshot = s.bird.snapshot;
    expect(snapshot).not.toBeNull();
    const c1 = await rectOf(page, 'chicken');
    const h1 = await rectOf(page, 'bird-body');
    await page.waitForTimeout(600);
    const c2 = await rectOf(page, 'chicken');
    const h2 = await rectOf(page, 'bird-body');
    expect(Math.abs(c2.left - c1.left)).toBeLessThan(4);
    expect(Math.abs(c2.top - c1.top)).toBeLessThan(4);
    expect(Math.abs(h2.left - h1.left)).toBeLessThan(4);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(24));
    s = await birdState(page);
    expect(s.bird.calm).toBe(true);
    expect(s.bird.calmClicks).toBe(24);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
    s = await birdState(page);
    expect(s.bird.calm).toBe(false);
    expect(s.speed).toBe(snapshot?.speed);
    expect(s.mode).toBe(snapshot?.mode);
    await birdFf(page, 6300);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'recede', null, { timeout: 3000 });
    await page.waitForTimeout(400);
    const a = await birdState(page);
    await page.waitForTimeout(1200);
    const b = await birdState(page);
    expect(a.bird.scale).toBeLessThan(1);
    expect(b.bird.scale).toBeLessThan(a.bird.scale);
    expect(['bank', 'away-3q', 'away-far']).toContain(await page.getByTestId('bird-flight').getAttribute('data-frame'));
  });

  test('25 clicks on the receding hawk drop a feather; it flies into the bag; using it applies the hawk skin and x1.25', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    await tapTalon(page, 'right', 25);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await tapTalon(page, 'left', 25);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(25));
    await birdFf(page, 6300);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'recede', null, { timeout: 3000 });
    const before = (await birdState(page)).score;
    for (let i = 0; i < 24; i++) await page.getByTestId('bird-hit').click({ force: true });
    let s = await birdState(page);
    expect(s.bird.feathered).toBe(false);
    expect(s.score).toBe(before + 24);
    await page.getByTestId('bird-hit').click({ force: true });
    s = await birdState(page);
    expect(s.bird.feathered).toBe(true);
    expect(s.bird.feather).not.toBeNull();
    await expect(page.getByTestId('bird-feather')).toBeVisible();
    await expect(page.getByTestId('bird-feather')).toHaveAttribute('data-landed', '1', { timeout: 5000 });
    await page.getByTestId('bird-feather').click({ force: true });
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.inventory())).find((i) => i.id === 'hawk-feather')?.count ?? 0, { timeout: 5000 }).toBe(1);
    expect((await birdState(page)).bird.feather).toBeNull();
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.useItem('hawk-feather'));
    await expect.poll(async () => (await birdState(page)).skin).toBe('hawk');
    s = await birdState(page);
    expect(s.mult).toBe(1.25);
    await expect(page.getByTestId('chicken-hawk-pattern')).toBeAttached();
    const start = s.scoreExact;
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(4));
    s = await birdState(page);
    expect(s.scoreExact).toBeCloseTo(start + 5, 6);
    expect(s.score).toBe(Math.floor(start + 5));
    await page.getByTestId('chicken-skins-toggle').click();
    await expect(page.getByTestId('chicken-skin-hawk')).toBeVisible();
  });
});
