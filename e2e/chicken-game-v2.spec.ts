import { test, expect, type Page } from '@playwright/test';
import { APPROACH_MS, BOARDING_MS, DRIFT_MS, EXPLODE_MS, LIFTOFF_HOLD_MS, LIFTOFF_RISE_MS } from '../src/components/game/escape-sequence';
import { ESCAPE_STAGES } from '../src/components/game/escape-stages';
import { ERA_REGISTRY, ORB_GAP_MIN_MS, ORB_REGISTRY, PACE_CURVE, SCHEDULE_TICK_MS, paceTarget, pickOrbKind, unlockedKinds, type SchedulerContext } from '../src/components/game/chicken-pacing';
import { chickenOutline, insideChicken, OUTLINE_SAMPLES, type OutlinePattern } from '../src/components/game/chicken-outline';
import { FIRE_FLAMING_SCORE, FIRE_FULL_SCORE, LIGHTNING_BLACK_SCORE, LIGHTNING_RED_SCORE } from '../src/components/game/chicken-fire';
import { CLONE_DOM_LIMIT, GOLDEN_LIFE_MS, MAX_CHICKENS_ON_SCREEN, MAX_GOLDEN_CHICKENS, ORB_THRESHOLDS, type OrbKind } from '../src/components/game/chicken-orbs';

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

type OrbKindName = OrbKind;

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
const EXTEND_PER_CLICK_MS = 50;
const EXTEND_CLICKS = 10;
const MULTIPLY_CAP = MAX_CHICKENS_ON_SCREEN;


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
    test.setTimeout(90_000);
    const cases: [number, OrbKindName, string][] = [
      [ORB_THRESHOLDS.multiply, 'multiply', 'Multiply x3'],
      [ORB_THRESHOLDS.cursor5, 'cursor5', 'Cursor x5'],
      [ORB_THRESHOLDS.cursor3, 'cursor3', 'Cursor x3'],
      [ORB_THRESHOLDS.frenzy, 'frenzy', 'Frenzy x2'],
      [ORB_THRESHOLDS.eggs, 'eggs', 'Golden Eggs'],
    ];
    for (const [threshold, kind, label] of cases) {
      await gotoGame(page, `?variant=2&start=${threshold - 1}`);
      await page.waitForTimeout(400);
      expect((await snap(page)).orbs.filter((o) => o.kind === kind)).toHaveLength(0);
      await squeeze(page);
      const orbs = (await snap(page)).orbs.filter((o) => o.kind === kind);
      expect(orbs).toHaveLength(1);
      expect(orbs[0].label).toBe(label);
      await expect(page.locator(`[data-testid="chicken-orb"][data-kind="${kind}"]`)).toHaveAttribute('aria-label', label);
      await page.evaluate((k) => (window as unknown as { __chicken: OrbBridge }).__chicken.collectOrb(k), kind);
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
    await expect(page.getByTestId('chicken-clone')).toHaveCount(CLONE_DOM_LIMIT);
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

  test('buffs last 30s and every chicken click extends them by 0.05s', async ({ page }) => {
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
  x: number;
  y: number;
  queue: string[];
  finished: string[];
  heat: number;
  pulses: number;
  burn: number;
  toastedAlive: number;
  toastedSpawned: number;
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
  selectSkin: (id: string) => void;
  plays: { type: string }[];
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

const CHAR_KEY = 'chicken-skin-char-v1';
const EAGLE_FOCAL = { x: 0.62, y: 0.4 };
const PHOENIX_FOCAL = { x: 0.4, y: 0.38 };
const VIEW = { w: 1280, h: 720 };

async function summonBird(page: Page, kind: 'eagle' | 'phoenix') {
  await gotoGame(page, '?variant=2');
  const at = kind === 'eagle' ? 9999 : 24999;
  await page.evaluate((n) => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(n), at);
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.placeChicken(820, 420));
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
  await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
  await page.waitForTimeout(150);
}

async function freeBird(page: Page, perTalon: number) {
  await tapTalon(page, 'right', perTalon);
  await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
  await tapTalon(page, 'left', perTalon);
}

async function toRecede(page: Page) {
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(25));
  await birdFf(page, 6300);
  await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'recede', null, { timeout: 3000 });
}

async function dropFeatherAndMeasureFocal(page: Page) {
  for (let i = 0; i < 25; i++) await page.getByTestId('bird-hit').click({ force: true });
  expect((await birdState(page)).bird.feathered).toBe(true);
  await birdFf(page, 9000);
  await page.waitForTimeout(150);
  const s = await birdState(page);
  return { x: s.bird.x / VIEW.w, y: s.bird.y / VIEW.h };
}

async function useFeatherForSkin(page: Page, item: string, skin: string) {
  await expect(page.getByTestId('bird-feather')).toHaveAttribute('data-landed', '1', { timeout: 6000 });
  await page.getByTestId('bird-feather').click({ force: true });
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.inventory())).find((i) => i.id === item)?.count ?? 0, { timeout: 6000 }).toBe(1);
  await page.evaluate((id) => (window as unknown as { __chicken: BirdBridge }).__chicken.useItem(id), item);
  await expect.poll(async () => (await birdState(page)).skin).toBe(skin);
}

const distressOf = (page: Page) => page.getByTestId('chicken-svg').getAttribute('data-distress');
const aliveToasted = (page: Page) => page.locator('[data-testid="toasted-feather"][data-alive="1"]');
const toastedInBag = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.inventory()).then((items) => items.find((i) => i.id === 'toasted-feather')?.count ?? 0);

test.describe('chicken game v2 eagle and phoenix events', () => {
  test('the bald eagle flies in at 10,000 and each talon needs 50 clicks', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(9999));
    await page.waitForTimeout(300);
    expect((await birdState(page)).bird.phase).toBe('idle');
    await summonBird(page, 'eagle');
    let s = await birdState(page);
    expect(s.bird.kind).toBe('eagle');
    expect(s.bird.queue).toEqual([]);
    await expect(page.getByTestId('bird-root')).toHaveAttribute('data-kind', 'eagle');
    await expect(page.getByTestId('bird-banner')).toHaveText('help the chicken escape!');
    await expect(page.getByTestId('bird-counter')).toHaveText('front claw 0 / 50');
    const before = s.score;
    await tapTalon(page, 'right', 49);
    s = await birdState(page);
    expect(s.bird.phase).toBe('right');
    expect(s.bird.rightClicks).toBe(49);
    await tapTalon(page, 'right', 1);
    expect((await birdState(page)).bird.phase).toBe('recoil');
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await birdFf(page, 10_100);
    await page.waitForTimeout(200);
    expect((await rootData(page)).hint).toBe('1');
    await tapTalon(page, 'left', 49);
    s = await birdState(page);
    expect(s.bird.phase).toBe('left');
    expect(s.bird.looks).toBe(9);
    await tapTalon(page, 'left', 1);
    s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    expect(s.bird.calm).toBe(true);
    expect(s.score).toBe(before + 100);
  });

  test('the eagle recedes up-right of the hawk focal point; its feather applies the x2 eagle skin', async ({ page }) => {
    test.setTimeout(120_000);
    await summonBird(page, 'eagle');
    await freeBird(page, 50);
    await toRecede(page);
    const focal = await dropFeatherAndMeasureFocal(page);
    expect(focal.x).toBeGreaterThan(0.5 + 0.06);
    expect(focal.y).toBeLessThan(0.5 - 0.05);
    expect(Math.abs(focal.x - EAGLE_FOCAL.x)).toBeLessThan(0.03);
    expect(Math.abs(focal.y - EAGLE_FOCAL.y)).toBeLessThan(0.03);
    await useFeatherForSkin(page, 'eagle-feather', 'eagle');
    let s = await birdState(page);
    expect(s.mult).toBe(2);
    await expect(page.getByTestId('chicken-eagle-pattern')).toBeAttached();
    const start = s.scoreExact;
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(4));
    s = await birdState(page);
    expect(s.scoreExact).toBeCloseTo(start + 8, 6);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.selectSkin('hawk'));
    await expect.poll(async () => (await birdState(page)).mult).toBe(1.25);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.selectSkin('classic'));
    await expect.poll(async () => (await birdState(page)).mult).toBe(1);
  });

  test('the phoenix at 25,000: talon 1 sizzles and sweats, talon 2 pulses fire every 5 taps, bares skin and sheds toasted feathers; 100 per talon', async ({ page }) => {
    test.setTimeout(150_000);
    await summonBird(page, 'phoenix');
    let s = await birdState(page);
    expect(s.bird.kind).toBe('phoenix');
    expect(s.bird.heat).toBe(1);
    expect(await distressOf(page)).toBe('1');
    await expect(page.getByTestId('chicken-sweat')).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.plays.some((p) => p.type === 'sizzle'))).toBe(true);
    await expect(page.getByTestId('bird-counter')).toHaveText('front claw 0 / 100');
    await expect(page.getByTestId('burn-spot')).toHaveCount(0);
    const before = s.score;
    await tapTalon(page, 'right', 99);
    expect((await birdState(page)).bird.phase).toBe('right');
    await tapTalon(page, 'right', 1);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await expect.poll(() => distressOf(page)).toBe('2');
    expect((await rootData(page)).heat).toBe('2');
    await expect(page.getByTestId('chicken-sweat')).toHaveCount(6);
    await expect(page.getByTestId('burn-spot')).toBeAttached();
    await expect(page.getByTestId('bird-shimmer')).toBeVisible();
    await tapTalon(page, 'left', 4);
    s = await birdState(page);
    expect(s.bird.pulses).toBe(0);
    expect(s.bird.toastedAlive).toBeGreaterThan(0);
    await tapTalon(page, 'left', 1);
    s = await birdState(page);
    expect(s.bird.pulses).toBe(1);
    expect((await rootData(page)).pulse).toBe('1');
    await expect(page.getByTestId('bird-fire')).toBeVisible();
    const b1 = s.bird.burn;
    expect(b1).toBeCloseTo(0.05, 6);
    await tapTalon(page, 'left', 45);
    s = await birdState(page);
    expect(s.bird.pulses).toBe(10);
    expect(s.bird.burn).toBeGreaterThan(b1);
    const b2 = s.bird.burn;
    await tapTalon(page, 'left', 49);
    s = await birdState(page);
    expect(s.bird.phase).toBe('left');
    expect(s.bird.burn).toBeGreaterThan(b2);
    await tapTalon(page, 'left', 1);
    s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    expect(s.bird.burn).toBe(1);
    expect(s.score).toBe(before + 200);
    await expect.poll(() => distressOf(page)).toBe('0');
    await expect(page.getByTestId('burn-spot')).toHaveCount(0);
    await expect(page.getByTestId('char-spot')).toBeAttached();
  });

  test('toasted feathers can be collected into the bag, capped at 10', async ({ page }) => {
    test.setTimeout(150_000);
    await summonBird(page, 'phoenix');
    await tapTalon(page, 'right', 100);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    for (let i = 0; i < 14; i++) {
      await tapTalon(page, 'left', 1);
      await aliveToasted(page).first().click({ force: true });
    }
    await expect.poll(() => toastedInBag(page), { timeout: 10_000 }).toBe(10);
    await page.waitForTimeout(800);
    expect(await toastedInBag(page)).toBe(10);
    expect((await birdState(page)).bird.toastedSpawned).toBeGreaterThanOrEqual(14);
  });

  test('the phoenix recedes top-left, drops the x3 phoenix feather, and the char stays on that skin across reload under translucent regrown feathers', async ({ page }) => {
    test.setTimeout(150_000);
    await summonBird(page, 'phoenix');
    await freeBird(page, 100);
    const feathers = page.getByTestId('char-feathers');
    await expect(feathers).toBeAttached();
    const early = Number(await feathers.evaluate((el) => getComputedStyle(el).opacity));
    expect(early).toBeLessThan(0.55);
    await page.waitForTimeout(3800);
    const late = Number(await feathers.evaluate((el) => getComputedStyle(el).opacity));
    expect(late).toBeCloseTo(0.55, 1);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, { x: number; y: number; r: number }[]>, CHAR_KEY);
    expect(stored.classic).toHaveLength(1);
    expect(stored.classic[0]).toEqual({ x: 27, y: 100, r: 11 });
    await toRecede(page);
    const focal = await dropFeatherAndMeasureFocal(page);
    expect(focal.x).toBeLessThan(0.5 - 0.05);
    expect(focal.y).toBeLessThan(0.5 - 0.05);
    expect(Math.abs(focal.x - PHOENIX_FOCAL.x)).toBeLessThan(0.03);
    expect(Math.abs(focal.y - PHOENIX_FOCAL.y)).toBeLessThan(0.03);
    await useFeatherForSkin(page, 'phoenix-feather', 'phoenix');
    expect((await birdState(page)).mult).toBe(3);
    await expect(page.getByTestId('chicken-phoenix-pattern')).toBeAttached();
    await expect(page.getByTestId('char-spot')).toHaveCount(0);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.selectSkin('classic'));
    await expect(page.getByTestId('char-spot')).toHaveCount(1);
    expect(Number(await page.getByTestId('char-feathers').evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(0.55, 1);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.selectSkin('void'));
    await expect(page.getByTestId('char-spot')).toHaveCount(0);
  });
});

const GRAB_WIDTH: Record<'hawk' | 'eagle' | 'phoenix', number> = { hawk: 110, eagle: 120, phoenix: 150 };
const MIN_TALON_HIT = 56;

async function summonAny(page: Page, kind: 'hawk' | 'eagle' | 'phoenix') {
  if (kind === 'hawk') await summonHawk(page);
  else await summonBird(page, kind);
}

interface SpanSample {
  span: number;
  at: number;
}

const CONTINUITY_STEP = 0.1;
const CONTINUITY_WINDOW_MS = 100;

async function spanSamples(page: Page, count: number, everyMs: number): Promise<SpanSample[]> {
  const out: SpanSample[] = [];
  for (let i = 0; i < count; i++) {
    const sample = await page.getByTestId('bird-flight').evaluate((el) => {
      const img = el as HTMLImageElement;
      return { span: Math.max(img.offsetWidth, img.offsetHeight), at: performance.now() };
    });
    out.push(sample);
    await page.waitForTimeout(everyMs);
  }
  return out;
}

function expectContinuous(samples: SpanSample[]) {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.span < 8 || b.span < 8) continue;
    const allowed = CONTINUITY_STEP * Math.max(1, (b.at - a.at) / CONTINUITY_WINDOW_MS);
    expect(Math.abs(b.span / a.span - 1), `step ${i}: ${a.span.toFixed(1)} -> ${b.span.toFixed(1)} over ${(b.at - a.at).toFixed(0)}ms`).toBeLessThanOrEqual(allowed);
  }
}

test.describe('chicken game v2 bird sizes, talon hit areas and frame continuity', () => {
  for (const kind of ['hawk', 'eagle', 'phoenix'] as const) {
    test(`${kind}: grab is about ${GRAB_WIDTH[kind]}px wide, talon hit areas are at least 56px, separate and clickable`, async ({ page }) => {
      test.setTimeout(120_000);
      await summonAny(page, kind);
      const body = await rectOf(page, 'bird-body');
      expect(body.width).toBeGreaterThan(GRAB_WIDTH[kind] * 0.85);
      expect(body.width).toBeLessThan(GRAB_WIDTH[kind] * 1.15);
      const chicken = await rectOf(page, 'chicken');
      expect(chicken.width).toBeGreaterThan(60);
      const hr = await rectOf(page, 'bird-talon-hit-right');
      const hl = await rectOf(page, 'bird-talon-hit-left');
      for (const r of [hr, hl]) {
        expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(MIN_TALON_HIT);
      }
      const overlap = hr.left < hl.right && hl.left < hr.right && hr.top < hl.bottom && hl.top < hr.bottom;
      expect(overlap).toBe(false);
      const talonR = await rectOf(page, 'bird-talon-right');
      expect(hr.left).toBeLessThan(talonR.right);
      expect(hr.right).toBeGreaterThan(talonR.left);
      await page.getByTestId('bird-talon-hit-right').click({ force: true });
      expect((await birdState(page)).bird.rightClicks).toBe(1);
      await page.getByTestId('bird-talon-hit-left').click({ force: true });
      expect((await birdState(page)).bird.leftClicks).toBe(0);
    });
  }

  test('the eagle keeps a continuous rendered size across flight-frame swaps on the way in and out', async ({ page }) => {
    test.setTimeout(150_000);
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(9999));
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.placeChicken(820, 420));
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
    await expect.poll(async () => (await birdState(page)).bird.phase).toBe('approach');
    expectContinuous(await spanSamples(page, 14, 80));
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
    await freeBird(page, 50);
    await toRecede(page);
    const samples = await spanSamples(page, 58, 100);
    expectContinuous(samples);
    expect(samples[samples.length - 1].span).toBeLessThan(samples[0].span);
    await expect(page.getByTestId('bird-flight-prev')).toBeHidden();
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
  await page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(400));
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
    const order = ['planeExit', 'explode', 'drift', 'rocketApproach', 'boarding', 'flight3d', 'moon'];
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
    const delays: Record<string, number> = { 'earth-day-4k': 2500, 'earth-night-2k': 5000, 'moon-lroc-1k': 7500 };
    await page.route('**/game/space/*.webp', async (route) => {
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

  test('a fully preloaded scene starts directly with no gate', async ({ page }) => {
    await enterPilot(page);
    await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().scene3dReady);
    await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.setSeqTimeScale(n), 40);
    await toRocket(page);
    await expect(page.getByTestId('space-flight-3d')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('space-gate')).toHaveCount(0);
    expect((await seqState(page)).scene3dGate).toBe('none');
  });

  test('downloading gate, then ready, start, countdown, then the 3D flight', async ({ page }) => {
    const delays: Record<string, number> = { 'earth-day-4k': 2500, 'earth-night-2k': 5000, 'moon-lroc-1k': 7500 };
    await page.route('**/game/space/*.webp', async (route) => {
      const name = Object.keys(delays).find((k) => route.request().url().includes(k)) ?? '';
      const response = await route.fetch();
      await new Promise((r) => setTimeout(r, delays[name] ?? 0));
      await route.fulfill({ response });
    });
    await enterPilot(page);
    await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.setSeqTimeScale(n), 40);
    await toRocket(page);
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'downloading', { timeout: 60_000 });
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'ready', { timeout: 60_000 });
    await page.getByTestId('gate-arrow').click();
    await expect(page.getByTestId('space-gate')).toHaveAttribute('data-gate', 'countdown');
    await expect(page.getByTestId('gate-count')).toBeVisible();
    await expect(page.getByTestId('space-flight-3d')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('sunsignal-credit')).toHaveAttribute('href', 'https://sunsignal.app');
  });
});

interface CosmosBridge {
  setScore: (n: number) => void;
  boost: (n: number) => void;
  spawnMartian: (kind?: string) => void;
  martianClicks: () => number;
  useItem: (id: string) => void;
  inventory: () => { id: string; count: number }[];
  state: () => { stage: string; score: number; skin: string };
}

const cosmosBridge = (page: Page) => ({
  setScore: (n: number) => page.evaluate((v) => (window as unknown as { __chicken: CosmosBridge }).__chicken.setScore(v), n),
  boost: (n: number) => page.evaluate((v) => (window as unknown as { __chicken: CosmosBridge }).__chicken.boost(v), n),
  spawn: (kind?: string) => page.evaluate((k) => (window as unknown as { __chicken: CosmosBridge }).__chicken.spawnMartian(k), kind),
  state: () => page.evaluate(() => (window as unknown as { __chicken: CosmosBridge }).__chicken.state()),
  inventory: () => page.evaluate(() => (window as unknown as { __chicken: CosmosBridge }).__chicken.inventory()),
  useItem: (id: string) => page.evaluate((v) => (window as unknown as { __chicken: CosmosBridge }).__chicken.useItem(v), id),
  clicks: () => page.evaluate(() => (window as unknown as { __chicken: CosmosBridge }).__chicken.martianClicks()),
});

async function pokeMartian(page: Page, times: number) {
  await page.evaluate((n) => {
    const el = document.querySelector('[data-testid="martian"]');
    for (let i = 0; i < n; i++) el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  }, times);
}

test.describe('chicken game v2 cosmos, Jupiter and Martians', () => {
  test('stages run moon, cosmos, then Jupiter, with the credit and the 3D sky mounted', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=900');
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('moon');
    await game.setScore(9999);
    await expect.poll(async () => (await game.state()).stage).toBe('moon');
    await game.setScore(10050);
    await expect.poll(async () => (await game.state()).stage).toBe('cosmos');
    await expect(page.getByTestId('cosmos-3d')).toBeAttached();
    await expect(page.getByTestId('sunsignal-credit-cosmos')).toContainText('provided by sunsignal.app');
    await game.setScore(17000);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
  });

  test('the start marker lands in the cosmos and the band follows the score', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=10400');
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('cosmos');
    await expect(page.getByTestId('cosmos-3d')).toHaveAttribute('data-band', 'earth', { timeout: 20_000 });
    await game.setScore(14000);
    await expect(page.getByTestId('cosmos-3d')).toHaveAttribute('data-band', 'belt', { timeout: 20_000 });
  });

  test('Jupiter arrival shows the ground and background Martians', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=17000');
    await expect(page.getByTestId('jupiter-ground')).toBeVisible();
    expect(await page.getByTestId('martian-bg').count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('martian')).toHaveCount(0);
  });

  test('friends walk in, never more than two at once', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=17000');
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
    await game.spawn('moss');
    await game.spawn('zap');
    await game.spawn('pip');
    await expect(page.getByTestId('martian')).toHaveCount(2);
    await expect(page.getByTestId('martian').first()).toHaveAttribute('data-kind', 'moss');
  });

  test('100 clicks earn the item and the x3 skin; Martian clicks do not score', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=17000');
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
    const before = (await game.state()).score;
    await game.spawn('pip');
    await expect(page.getByTestId('martian')).toHaveCount(1);
    await pokeMartian(page, 99);
    await expect(page.getByTestId('martian-progress')).toHaveText('99/100');
    expect((await game.inventory()).some((i) => i.id === 'martian-friend')).toBe(false);
    await pokeMartian(page, 1);
    await expect.poll(async () => (await game.inventory()).some((i) => i.id === 'martian-friend')).toBe(true);
    expect((await game.state()).score).toBe(before);
    expect(await game.clicks()).toBe(100);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
    expect(await game.clicks()).toBe(100);
    await game.useItem('martian-friend');
    await expect.poll(async () => (await game.state()).skin).toBe('martian');
    const worn = (await game.state()).score;
    await game.boost(1);
    expect((await game.state()).score - worn).toBe(3);
  });
});

interface PaceBridge {
  state: () => {
    score: number;
    mult: number;
    frenzyMs: number;
    pilotTeleports: number;
    orbs: { id: number; kind: string }[];
    pace: { target: number; actual: number; behindPct: number; nextCheckIn: number; nextSpawnIn: number; playMs: number };
    bird: { rightClicks: number; rightNeed: number; leftNeed: number; phase: string };
    lastKinds: string[];
    orbsBlocked: boolean;
  };
  setScore: (n: number) => void;
  fastForward: (ms: number) => void;
  forcePaceCheck: () => void;
  forceOrb: (kind: string) => void;
  collectOrb: (kind: string) => void;
  selectSkin: (id: string) => void;
  placeChicken: (x: number, y: number) => void;
  boost: (n: number) => void;
}

const paceBridge = <T>(page: Page, fn: (b: PaceBridge) => T) =>
  page.evaluate(`(${fn.toString()})(window.__chicken)`) as Promise<T>;
const paceState = (page: Page) => paceBridge(page, (b) => b.state());

test.describe('chicken game v2 pacing and catch-up', () => {
  test('a player behind pace gets a catch-up orb after a check, chosen by how far behind', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(330));
    await paceBridge(page, (b) => b.fastForward(50_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBe(1);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBeGreaterThan(10);
    expect(s.orbs[0].kind).toBe('multiply');
  });

  test('far behind pace forces the strongest unlocked orb; locked kinds never appear', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(1300));
    await paceBridge(page, (b) => b.fastForward(240_000));
    await expect.poll(async () => (await paceState(page)).orbs.map((o) => o.kind), { timeout: 4000 }).toEqual(['frenzy']);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBeGreaterThan(40);
    expect(unlockedKinds(1300, s.pace.behindPct / 100)).not.toContain('eggs');
  });

  test('a player on pace still gets variety orbs, at the full gap and never two at once', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(700));
    await paceBridge(page, (b) => b.fastForward(20_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBe(1);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBe(0);
    expect(unlockedKinds(700, 0)).toContain(s.orbs[0].kind);
    await paceBridge(page, (b) => b.forcePaceCheck());
    expect((await paceState(page)).orbs).toHaveLength(1);
  });

  test('pace readout exposes target, actual, behind, next check and next spawn', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(10));
    const s = await paceState(page);
    expect(s.pace.actual).toBe(10);
    expect(s.pace.nextCheckIn).toBeGreaterThan(0);
    expect(s.pace.nextCheckIn).toBeLessThanOrEqual(SCHEDULE_TICK_MS);
    expect(s.pace.nextSpawnIn).toBeGreaterThan(0);
  });

  test('gap after an orb, one-on-screen and recency rules hold', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(1300));
    await paceBridge(page, (b) => b.fastForward(240_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBe(1);
    await paceBridge(page, (b) => b.forcePaceCheck());
    expect((await paceState(page)).orbs).toHaveLength(1);
    await paceBridge(page, (b) => b.collectOrb('frenzy'));
    const s = await paceState(page);
    expect(s.orbs).toHaveLength(0);
    expect(s.lastKinds[0]).toBe('frenzy');
    expect(s.pace.nextSpawnIn).toBeGreaterThanOrEqual(ORB_GAP_MIN_MS - SCHEDULE_TICK_MS);
    await paceBridge(page, (b) => b.fastForward(3000));
    await page.waitForTimeout(1200);
    expect((await paceState(page)).orbs).toHaveLength(0);
    await page.evaluate((ms) => (window as unknown as { __chicken: PaceBridge }).__chicken.fastForward(ms), ORB_GAP_MIN_MS);
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBe(1);
    expect((await paceState(page)).orbs[0].kind).not.toBe('frenzy');
  });

  test('orbs are blocked while a bird is pending or gripping', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(1999));
    await paceBridge(page, (b) => b.placeChicken(820, 420));
    await paceBridge(page, (b) => b.boost(1));
    await page.waitForFunction(() => (window as unknown as { __chicken: PaceBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
    await paceBridge(page, (b) => b.fastForward(240_000));
    await paceBridge(page, (b) => b.forcePaceCheck());
    const s = await paceState(page);
    expect(s.orbs).toHaveLength(0);
    expect(s.orbsBlocked).toBe(true);
  });

  test('Frenzy doubles points, stacks with a skin, extends per click up to the cap', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.forceOrb('frenzy'));
    await paceBridge(page, (b) => b.collectOrb('frenzy'));
    let s = await paceState(page);
    expect(s.frenzyMs).toBeGreaterThan(19_000);
    expect(s.frenzyMs).toBeLessThanOrEqual(20_000);
    const before = s.score;
    await paceBridge(page, (b) => b.boost(1));
    s = await paceState(page);
    expect(s.score - before).toBe(2);
    expect(s.frenzyMs).toBeGreaterThan(19_050);
    await paceBridge(page, (b) => b.selectSkin('hawk'));
    const mid = (await paceState(page)).score;
    await paceBridge(page, (b) => b.boost(4));
    s = await paceState(page);
    expect(s.score - mid).toBe(4 * 2.5);
    for (let i = 0; i < 3; i++) {
      await paceBridge(page, (b) => b.forceOrb('frenzy'));
      await paceBridge(page, (b) => b.collectOrb('frenzy'));
    }
    await paceBridge(page, (b) => b.boost(300));
    expect((await paceState(page)).frenzyMs).toBeLessThanOrEqual(40_000);
  });

  test('Frenzy ends after its duration', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.forceOrb('frenzy'));
    await paceBridge(page, (b) => b.collectOrb('frenzy'));
    await paceBridge(page, (b) => b.fastForward(21_000));
    const s0 = (await paceState(page)).score;
    await paceBridge(page, (b) => b.boost(1));
    expect((await paceState(page)).score - s0).toBe(1);
  });

  test('talon clicks scale with the skin multiplier for the eagle but not the hawk', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.selectSkin('eagle'));
    await paceBridge(page, (b) => b.setScore(1999));
    await paceBridge(page, (b) => b.placeChicken(820, 420));
    await paceBridge(page, (b) => b.boost(1));
    await page.waitForFunction(() => (window as unknown as { __chicken: PaceBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
    const hawk = (await paceState(page)).bird;
    expect(hawk.rightNeed).toBe(25);
    await expect(page.getByTestId('bird-counter')).toHaveText('front claw 0 / 25');
  });

  test('eagle and phoenix talon counts halve with a x2 skin', async ({ page }) => {
    test.setTimeout(60_000);
    for (const [at, need] of [[9999, 25], [24999, 50]] as const) {
      await gotoGame(page, '?variant=2');
      await paceBridge(page, (b) => b.selectSkin('eagle'));
      await page.evaluate((n) => (window as unknown as { __chicken: PaceBridge }).__chicken.setScore(n), at);
      await paceBridge(page, (b) => b.placeChicken(820, 420));
      await paceBridge(page, (b) => b.boost(1));
      await page.waitForFunction(() => (window as unknown as { __chicken: PaceBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
      const bird = (await paceState(page)).bird;
      expect(bird.rightNeed).toBe(need);
      expect(bird.leftNeed).toBe(need);
      await expect(page.getByTestId('bird-counter')).toHaveText(`front claw 0 / ${need}`);
      await page.getByTestId('bird-talon-right').click({ force: true, clickCount: 1 });
      for (let i = 1; i < need; i++) await page.getByTestId('bird-talon-right').click({ force: true });
      await page.waitForFunction(() => (window as unknown as { __chicken: PaceBridge }).__chicken.state().bird.phase !== 'right', null, { timeout: 3000 });
    }
  });
});

const MAX_ROCKET_SEQUENCE_MS = 14_000;
const MIN_PILOT_SCORE_SPAN = 300;
const PILOT_TELEPORT_WAIT_MS = 12_000;
const MIN_PILOT_TRAVEL_PX = 120;

test.describe('chicken game v2 pacing constants and plane', () => {
  test('pace curve hits the 12 minute target and rocket phases are halved', () => {
    expect(paceTarget(12 * 60_000)).toBe(25_000);
    expect(paceTarget(30_000)).toBe(250);
    expect(PACE_CURVE.map((p) => p.score)).toEqual([0, 250, 2000, 10_000, 17_000, 25_000]);
    expect(DRIFT_MS + APPROACH_MS + BOARDING_MS + LIFTOFF_HOLD_MS + LIFTOFF_RISE_MS).toBeLessThanOrEqual(MAX_ROCKET_SEQUENCE_MS);
    expect(EXPLODE_MS).toBeGreaterThanOrEqual(4000);
    const at = (name: string) => ESCAPE_STAGES.find((s) => s.stage === name)?.threshold ?? 0;
    expect(at('rocket') - at('pilot')).toBeGreaterThanOrEqual(MIN_PILOT_SCORE_SPAN);
  });

  test('the plane never pauses in the pilot stage and teleports exactly once', async ({ page }) => {
    test.setTimeout(60_000);
    await enterPilot(page);
    const start = await seqState(page);
    let travel = 0;
    let last = start.pos;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(350);
      const s = await seqState(page);
      expect(Math.hypot(s.pos.x - last.x, s.pos.y - last.y)).toBeGreaterThan(2);
      travel += Math.hypot(s.pos.x - last.x, s.pos.y - last.y);
      last = s.pos;
    }
    expect(travel).toBeGreaterThan(MIN_PILOT_TRAVEL_PX);
    await expect
      .poll(async () => (await paceState(page)).pilotTeleports, { timeout: PILOT_TELEPORT_WAIT_MS })
      .toBe(1);
    await page.waitForTimeout(3000);
    expect((await paceState(page)).pilotTeleports).toBe(1);
  });

  test('the explosion has a shockwave, secondary blasts and a shaking stage', async ({ page }) => {
    test.setTimeout(100_000);
    await enterPilot(page);
    await toRocket(page);
    await expect.poll(async () => (await seqState(page)).seq, { timeout: 20_000 }).toBe('planeExit');
    await page.evaluate(() => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(3));
    await expect(page.getByTestId('plane-explosion')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('.escape-shock')).toHaveCount(2);
    await expect(page.locator('.escape-fireball')).toHaveCount(5);
    await expect(page.getByTestId('chicken-stage')).toHaveClass(/escape-shake/);
  });
});

interface OrbsV2Bridge extends PaceBridge {
  state: PaceBridge['state'] extends () => infer S
    ? () => S & {
        chickens: number;
        clones: number;
        spriteClones: number;
        chainMs: number;
        chainArcs: number;
        multiplyMs: number;
        eggs: { id: number; x: number; y: number; big: boolean; hatching: boolean; ageMs: number }[];
        goldens: { id: number; x: number; msLeft: number }[];
        pos: { x: number; y: number };
        lastKinds: string[];
      }
    : never;
}

const v2 = <T>(page: Page, fn: (b: OrbsV2Bridge) => T) => page.evaluate(`(${fn.toString()})(window.__chicken)`) as Promise<T>;
const v2State = (page: Page) => v2(page, (b) => b.state());
const grab = async (page: Page, kind: OrbKind) => {
  await page.evaluate((k) => {
    const b = (window as unknown as { __chicken: OrbBridge }).__chicken;
    b.forceOrb(k);
    b.collectOrb(k);
  }, kind);
  await page.waitForTimeout(80);
};
const GROUND_FRAC = 0.76;
const GOLDEN_H = 140;
const PERF_P95_MS = 34;

test.describe('chicken game v2 orbs: multiply tiers, chain lightning, golden eggs', () => {
  test('unlock order follows the story eras and the scheduler never offers a locked kind', async () => {
    let last = -1;
    for (const era of ERA_REGISTRY) {
      expect(era.from).toBeGreaterThan(last);
      last = era.from;
      for (const kind of era.introduces) expect(ORB_REGISTRY[kind].unlock).toBeGreaterThanOrEqual(era.from);
    }
    const unlocks = ['multiply', 'cursor5', 'cursor3', 'frenzy', 'eggs', 'multiply5', 'chain', 'multiply10', 'multiply25', 'multiply100'].map((k) => ORB_REGISTRY[k as OrbKind].unlock);
    expect([...unlocks].sort((a, b) => a - b)).toEqual(unlocks);
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let score = 0; score <= 25_000; score += 250) {
      for (const behind of [0, 0.2, 0.35, 0.6]) {
        const ctx: SchedulerContext = { score, behind, ahead: false, lastKinds: [], activeKinds: [], clones: 0, goldens: 0, sinceBigMs: 1e9, sinceMultiplyEndMs: 1e9, rng };
        const kind = pickOrbKind(ctx);
        if (kind) expect(unlockedKinds(score, behind)).toContain(kind);
        if (kind && ORB_REGISTRY[kind].big) expect(score).toBeGreaterThanOrEqual(ORB_REGISTRY[kind].unlock);
      }
    }
    expect(unlockedKinds(0, 0.6)).toEqual([]);
    expect(unlockedKinds(1750, 0.35)).toContain('multiply5');
    expect(unlockedKinds(1750, 0.1)).not.toContain('multiply5');
  });

  test('multiply x5, x10, x25 and x100 spawn N-1 clones, capped at 150 with a cheap render path above 60', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=3000');
    for (const [kind, total] of [['multiply5', 5], ['multiply10', 10], ['multiply25', 25]] as const) {
      await grab(page, kind);
      const s = await v2State(page);
      expect(s.chickens).toBe(total);
      expect(s.spriteClones).toBe(0);
      await v2(page, (b) => b.fastForward(16_000));
      await expect.poll(async () => (await v2State(page)).clones, { timeout: 3000 }).toBe(0);
    }
    await grab(page, 'multiply100');
    let s = await v2State(page);
    expect(s.chickens).toBe(100);
    expect(s.spriteClones).toBe(99 - CLONE_DOM_LIMIT);
    await expect(page.getByTestId('chicken-clone')).toHaveCount(CLONE_DOM_LIMIT);
    expect(s.multiplyMs).toBeLessThanOrEqual(10_000);
    await grab(page, 'multiply');
    s = await v2State(page);
    expect(s.chickens).toBe(MAX_CHICKENS_ON_SCREEN);
    await expect(page.getByTestId('chicken-clone')).toHaveCount(CLONE_DOM_LIMIT);
    const frame = await page.evaluate(
      () =>
        new Promise<{ p95: number }>((res) => {
          const t: number[] = [];
          let last = performance.now();
          let n = 0;
          const step = (ts: number) => {
            t.push(ts - last);
            last = ts;
            if (++n < 90) requestAnimationFrame(step);
            else {
              t.sort((a, b) => a - b);
              res({ p95: t[85] });
            }
          };
          requestAnimationFrame(step);
        })
    );
    expect(frame.p95).toBeLessThan(PERF_P95_MS);
    const before = (await v2State(page)).score;
    await page.mouse.click(s.pos.x + 35, s.pos.y + 70);
    expect((await v2State(page)).score).toBeGreaterThan(before);
  });

  test('chain lightning arcs a primary click to nearby chickens, one hit each, for 15 s', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=3000');
    await v2(page, (b) => b.placeChicken(640, 300));
    await grab(page, 'chain');
    let s = await v2State(page);
    expect(s.chainMs).toBeGreaterThan(14_000);
    expect(s.chainMs).toBeLessThanOrEqual(15_000);
    await expect(page.getByTestId('chicken-chain')).toContainText('Chain Lightning');
    await grab(page, 'multiply5');
    await page.waitForTimeout(1500);
    s = await v2State(page);
    const before = s.score;
    await page.mouse.click(s.pos.x + 35, s.pos.y + 70);
    const after = await v2State(page);
    expect(after.chainArcs).toBeGreaterThan(0);
    expect(after.chainArcs).toBeLessThanOrEqual(6);
    expect(after.score - before).toBeGreaterThanOrEqual(1 + after.chainArcs);
    await v2(page, (b) => b.fastForward(16_000));
    await page.waitForTimeout(400);
    expect((await v2State(page)).chainMs).toBe(0);
    await page.mouse.click(s.pos.x + 35, s.pos.y + 70);
    expect((await v2State(page)).chainArcs).toBe(0);
  });

  test('golden eggs: eggs pay 100 (big 500), an egg left 10 s hatches a golden chicken worth 5x that leaves after 33 s', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoGame(page, '?variant=2&start=3000');
    await v2(page, (b) => b.placeChicken(640, 300));
    await grab(page, 'eggs');
    await expect.poll(async () => (await v2State(page)).eggs.length, { timeout: 3000 }).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(900);
    let s = await v2State(page);
    const egg = s.eggs[0];
    const before = s.score;
    await page.getByTestId('chicken-egg').first().click({ force: true });
    s = await v2State(page);
    expect(s.score - before).toBe(egg.big ? 500 : 100);
    expect(s.eggs.find((e) => e.id === egg.id)).toBeUndefined();
    await grab(page, 'eggs');
    await v2(page, (b) => b.fastForward(10_200));
    await page.waitForTimeout(300);
    s = await v2State(page);
    expect(s.eggs.some((e) => e.hatching)).toBe(true);
    await expect.poll(async () => (await v2State(page)).goldens.length, { timeout: 3000 }).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('chicken-golden').first()).toBeVisible();
    s = await v2State(page);
    const g = s.goldens[0];
    expect(g.msLeft).toBeGreaterThan(GOLDEN_LIFE_MS - 2000);
    expect(g.msLeft).toBeLessThanOrEqual(GOLDEN_LIFE_MS);
    const mid = s.score;
    const gy = (await page.evaluate(() => window.innerHeight)) * GROUND_FRAC - GOLDEN_H / 2;
    await page.mouse.click(g.x + 35, gy);
    expect((await v2State(page)).score - mid).toBe(5);
    await v2(page, (b) => b.fastForward(20_000));
    await page.waitForTimeout(300);
    await expect.poll(async () => (await v2State(page)).goldens.length, { timeout: 4000 }).toBeLessThanOrEqual(MAX_GOLDEN_CHICKENS);
    expect((await v2State(page)).goldens.length).toBeGreaterThan(0);
    await page.evaluate((ms) => (window as unknown as { __chicken: PaceBridge }).__chicken.fastForward(ms), GOLDEN_LIFE_MS);
    await expect.poll(async () => (await v2State(page)).goldens.filter((x) => x.id === g.id).length, { timeout: 4000 }).toBe(0);
    await expect.poll(async () => (await v2State(page)).goldens.length, { timeout: 4000 }).toBeLessThanOrEqual(MAX_GOLDEN_CHICKENS);
  });
});

interface AuraBridge {
  state: () => {
    score: number;
    stage: string;
    auraDrawn: boolean;
    fire: number;
    ignition: boolean;
    ignitionBursts: number;
    lightning: { style: string } | null;
    bird: { phase: string } | null;
    pos: { x: number; y: number };
  };
  boost: (n: number) => void;
  forceBird: (kind: string) => void;
  forceIgnition: () => void;
  auraEmitters: () => { svg: { x: number; y: number }[]; canvas: { x: number; y: number }[]; frame: { cx: number; cy: number; facing: number } };
}

const auraState = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: AuraBridge }).__chicken.state());
const RAY_ORIGIN = { x: 40, y: 86 };
const GRIP_PHASES = ['grab', 'right', 'recoil', 'left', 'hover'];

test.describe('chicken game v2 silhouette aura, late lightning and fire form', () => {
  test('the outline hugs the chicken silhouette for every skin pattern and is not an ellipse', () => {
    for (const pattern of ['classic', 'hawk', 'eagle', 'phoenix'] as OutlinePattern[]) {
      const pts = chickenOutline(pattern);
      expect(pts).toHaveLength(OUTLINE_SAMPLES);
      const radii: number[] = [];
      for (const p of pts) {
        const dx = p.x - RAY_ORIGIN.x;
        const dy = p.y - RAY_ORIGIN.y;
        const r = Math.hypot(dx, dy);
        radii.push(r);
        expect(r).toBeGreaterThan(10);
        expect(insideChicken(pattern, p.x, p.y)).toBe(true);
        expect(insideChicken(pattern, RAY_ORIGIN.x + (dx * (r + 1.2)) / r, RAY_ORIGIN.y + (dy * (r + 1.2)) / r)).toBe(false);
      }
      const half = OUTLINE_SAMPLES / 2;
      const asymmetry = Math.max(...radii.slice(0, half).map((r, i) => Math.abs(r - radii[i + half])));
      expect(asymmetry).toBeGreaterThan(8);
    }
  });

  test('emitted aura points follow the live chicken frame and keep the head narrower than the body', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=17500');
    await page.waitForFunction(() => (window as unknown as { __chicken: AuraBridge }).__chicken.state().auraDrawn, null, { timeout: 20_000 });
    const sample = await page.evaluate(() => (window as unknown as { __chicken: AuraBridge }).__chicken.auraEmitters());
    const expected = chickenOutline('classic');
    expect(sample.svg).toHaveLength(expected.length);
    expect(sample.canvas).toHaveLength(expected.length);
    sample.svg.forEach((p, i) => {
      expect(Math.abs(p.x - expected[i].x)).toBeLessThan(0.01);
      expect(Math.abs(p.y - expected[i].y)).toBeLessThan(0.01);
    });
    const box = await page.getByTestId('chicken-svg').boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const margin = 14;
    for (const p of sample.canvas) {
      expect(p.x).toBeGreaterThan(box.x - margin);
      expect(p.x).toBeLessThan(box.x + box.width + margin);
      expect(p.y).toBeGreaterThan(box.y - margin);
      expect(p.y).toBeLessThan(box.y + box.height + margin);
    }
    const width = (rows: { x: number }[]) => Math.max(...rows.map((p) => p.x)) - Math.min(...rows.map((p) => p.x));
    const head = sample.canvas.filter((_, i) => expected[i].y < 40 && expected[i].x < 56);
    const body = sample.canvas.filter((_, i) => expected[i].y > 95 && expected[i].y < 125);
    expect(width(head)).toBeLessThan(width(body) * 0.75);
  });

  test('lightning turns red in the eagle era and black with a red core in the phoenix era', async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${LIGHTNING_RED_SCORE - 1}`);
    expect((await auraState(page)).lightning?.style).toBe('ramp');
    await squeeze(page);
    await expect.poll(async () => (await auraState(page)).lightning?.style).toBe('red');
    await gotoGame(page, `?variant=2&start=${LIGHTNING_BLACK_SCORE - 1}`);
    expect((await auraState(page)).lightning?.style).toBe('red');
    await squeeze(page);
    await expect.poll(async () => (await auraState(page)).lightning?.style).toBe('black-red');
  });

  test('the fire form ramps from the phoenix era and is full at the fire threshold', async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${FIRE_FLAMING_SCORE - 1}`);
    expect((await auraState(page)).fire).toBe(0);
    await gotoGame(page, `?variant=2&start=${FIRE_FLAMING_SCORE + 100}`);
    expect((await auraState(page)).fire).toBeGreaterThan(0);
    expect((await auraState(page)).fire).toBeLessThan(1);
    await gotoGame(page, `?variant=2&start=${FIRE_FULL_SCORE}`);
    const st = await auraState(page);
    expect(st.fire).toBe(1);
    await expect.poll(async () => (await auraState(page)).auraDrawn, { timeout: 20_000 }).toBe(true);
    const filter = await page.getByTestId('chicken-svg').evaluate((el) => getComputedStyle(el).filter);
    expect(filter).toContain('sepia');
  });

  test('the phoenix heat phase ignites the chicken in short bursts', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=24000');
    await page.evaluate(() => (window as unknown as { __chicken: AuraBridge }).__chicken.forceIgnition());
    await expect.poll(async () => (await auraState(page)).ignition).toBe(true);
    expect((await auraState(page)).ignitionBursts).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => (await auraState(page)).ignition, { timeout: 5_000 }).toBe(false);
  });

  test('aura and fire stay suppressed in vehicles and bird grabs', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=surf');
    await page.waitForTimeout(600);
    const surf = await auraState(page);
    expect(surf.stage).toBe('surf');
    expect(surf.auraDrawn).toBe(false);
    await gotoGame(page, '?variant=2&start=17500');
    await expect.poll(async () => (await auraState(page)).auraDrawn, { timeout: 20_000 }).toBe(true);
    await page.evaluate(() => (window as unknown as { __chicken: AuraBridge }).__chicken.forceBird('hawk'));
    await page.waitForFunction((phases) => phases.includes((window as unknown as { __chicken: AuraBridge }).__chicken.state().bird?.phase ?? ''), GRIP_PHASES, { timeout: 25_000 });
    await page.waitForTimeout(200);
    expect((await auraState(page)).auraDrawn).toBe(false);
  });
});

import { BIG_CAT_STAY_MS, CREATURE_ORDER, CREATURE_SPECS, KITTY_HOLD_MS, LION_MANE_CLICKS } from '../src/components/game/creature-event';
import { ENDLESS_ERAS, ENDLESS_FROM, ERA_MAX_MS, ERA_SCORE_STEP } from '../src/components/game/endless-eras';

interface CreatureView {
  kind: string | null;
  phase: string;
  holdMs: number;
  stayMs: number;
  misses: number;
  minClearance: number | null;
  tamed: boolean;
  dropped: boolean;
  enteredAt: number;
  leftAt: number;
}

interface CreatureBridge {
  setScore: (n: number) => void;
  boost: (n: number) => void;
  fastForward: (ms: number) => void;
  forceCreature: (kind: string) => boolean;
  creature: () => CreatureView;
  setDropRoll: (roll: number | null) => void;
  era: () => { id: string | null; index: number; byTime: boolean; queued: string[] };
  forceEra: (id: string) => void;
  inventory: () => { id: string; count: number }[];
  state: () => { score: number; auraDrawn: boolean; era: string | null };
}

const creatureOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.creature());
const eraOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.era());
const forceCreature = (page: Page, kind: string) => page.evaluate((k) => (window as unknown as { __chicken: CreatureBridge }).__chicken.forceCreature(k), kind);
const waitCreaturePhase = (page: Page, phases: string[], timeout = 20_000) =>
  page.waitForFunction((ps) => ps.includes((window as unknown as { __chicken: CreatureBridge }).__chicken.creature().phase), phases, { timeout });

async function enterBigCats(page: Page) {
  await gotoGame(page, '?variant=2');
  await page.evaluate((target) => {
    const b = (window as unknown as { __chicken: CreatureBridge }).__chicken;
    b.setScore(target - 1);
    b.boost(1);
  }, ENDLESS_FROM + ERA_SCORE_STEP);
  await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe('big-cats');
}

test.describe('chicken game v2 endless eras', () => {
  test('the endless registry steps by 8,000 and orders the cats kitty, tiger, lion', () => {
    expect(ENDLESS_ERAS[0].from).toBe(ENDLESS_FROM);
    for (let i = 1; i < ENDLESS_ERAS.length; i++) expect(ENDLESS_ERAS[i].from - ENDLESS_ERAS[i - 1].from).toBe(ERA_SCORE_STEP);
    const cats = ENDLESS_ERAS.find((e) => e.id === 'big-cats');
    expect(cats?.creatures.map((c) => c.kind)).toEqual(CREATURE_ORDER);
    for (let i = 1; i < (cats?.creatures.length ?? 0); i++) expect(cats!.creatures[i].atMs).toBeGreaterThan(cats!.creatures[i - 1].atMs);
    expect(ENDLESS_ERAS[0].pool).toEqual(expect.arrayContaining(['giant', 'magnet']));
    expect(ERA_REGISTRY.find((e) => e.id === 'big-cats')?.from).toBe(ENDLESS_FROM + ERA_SCORE_STEP);
    expect(ERA_REGISTRY.find((e) => e.from === ENDLESS_FROM)?.introduces).toEqual(['giant', 'magnet']);
  });

  test('pickOrbKind respects an era pool', () => {
    const ctx: SchedulerContext = {
      score: 30_000,
      behind: 0,
      ahead: false,
      lastKinds: [],
      activeKinds: [],
      clones: 0,
      goldens: 0,
      sinceBigMs: 0,
      sinceMultiplyEndMs: 0,
      rng: Math.random,
      pool: ENDLESS_ERAS[0].pool,
    };
    for (let i = 0; i < 200; i++) {
      const kind = pickOrbKind(ctx);
      expect(kind).not.toBeNull();
      expect(ENDLESS_ERAS[0].pool).toContain(kind);
    }
  });

  test('eras switch by score and by the 3 minute clock', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => {
      const b = (window as unknown as { __chicken: CreatureBridge }).__chicken;
      b.setScore(24_999);
      b.boost(1);
    });
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe('fire');
    expect((await eraOf(page)).byTime).toBe(false);
    await expect(page.getByTestId('era-label')).toHaveAttribute('data-era', 'fire');
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'fire-sky');
    await page.evaluate((ms) => (window as unknown as { __chicken: CreatureBridge }).__chicken.fastForward(ms), ERA_MAX_MS + 100);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe('big-cats');
    expect((await eraOf(page)).byTime).toBe(true);
    expect((await eraOf(page)).queued).toEqual(CREATURE_ORDER);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'night-yard');
    await expect(page.getByTestId('creature-root')).toHaveCount(0);
  });
});

test.describe('chicken game v2 kitty', () => {
  test('the kitty stalks, pounces, holds 4-6 s with the aura off and clicks scoring, then runs off', async ({ page }) => {
    await enterBigCats(page);
    await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.setDropRoll(0.99));
    expect(await forceCreature(page, 'kitty')).toBe(true);
    await waitCreaturePhase(page, ['enter'], 8000);
    await expect(page.getByTestId('creature-root')).toHaveAttribute('data-kind', 'kitty');
    await waitCreaturePhase(page, ['hold']);
    const held = await creatureOf(page);
    expect(held.holdMs).toBeGreaterThanOrEqual(KITTY_HOLD_MS[0]);
    expect(held.holdMs).toBeLessThanOrEqual(KITTY_HOLD_MS[1]);
    await expect(page.getByTestId('creature-banner')).toHaveCSS('opacity', '1');
    const holdStart = Date.now();
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.state());
    expect(before.auraDrawn).toBe(false);
    await expect
      .poll(
        async () => {
          await page.getByTestId('chicken').click({ force: true });
          await page.waitForTimeout(250);
          return page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.state().score);
        },
        { timeout: 3000 }
      )
      .toBeGreaterThan(before.score);
    await waitCreaturePhase(page, ['leave', 'done']);
    const heldFor = Date.now() - holdStart;
    expect(heldFor).toBeGreaterThanOrEqual(KITTY_HOLD_MS[0] - 400);
    expect(heldFor).toBeLessThanOrEqual(KITTY_HOLD_MS[1] + 800);
    await waitCreaturePhase(page, ['done'], 6000);
    await expect(page.getByTestId('creature-root')).toHaveCount(0);
    expect((await creatureOf(page)).dropped).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.inventory())).not.toContainEqual(expect.objectContaining({ id: 'yarn-ball' }));
  });

  test('clicking the kitty shortens the hold; a forced roll drops the yarn ball into the bag', async ({ page }) => {
    await enterBigCats(page);
    await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.setDropRoll(0));
    await forceCreature(page, 'kitty');
    await waitCreaturePhase(page, ['hold']);
    const t0 = Date.now();
    for (let i = 0; i < 9; i++) await page.getByTestId('creature-body').click({ force: true });
    await waitCreaturePhase(page, ['leave', 'done']);
    expect(Date.now() - t0).toBeLessThan(KITTY_HOLD_MS[0]);
    await expect.poll(
      async () => (await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.inventory())).find((i) => i.id === 'yarn-ball')?.count ?? 0,
      { timeout: 5000 }
    ).toBe(1);
  });
});

test.describe('chicken game v2 tiger and lion', () => {
  test('the tiger chases, always misses, and leaves within 5-10 s; nothing else can join it', async ({ page }) => {
    await enterBigCats(page);
    expect(await forceCreature(page, 'tiger')).toBe(true);
    await waitCreaturePhase(page, ['enter'], 8000);
    expect(await forceCreature(page, 'lion')).toBe(false);
    await expect(page.getByTestId('creature-root')).toHaveCount(1);
    await expect(page.getByTestId('creature-body')).toHaveCount(0);
    await waitCreaturePhase(page, ['done'], BIG_CAT_STAY_MS[1] + 6000);
    const v = await creatureOf(page);
    expect(v.misses).toBeGreaterThanOrEqual(1);
    expect(v.minClearance).not.toBeNull();
    expect(v.minClearance ?? -1).toBeGreaterThan(0);
    expect(v.stayMs).toBeGreaterThanOrEqual(BIG_CAT_STAY_MS[0]);
    expect(v.stayMs).toBeLessThanOrEqual(BIG_CAT_STAY_MS[1]);
    const onScreen = v.leftAt - v.enteredAt;
    expect(onScreen).toBeGreaterThanOrEqual(BIG_CAT_STAY_MS[0] - 1000);
    expect(onScreen).toBeLessThanOrEqual(BIG_CAT_STAY_MS[1] + 1000);
    expect(await forceCreature(page, 'lion')).toBe(true);
    await waitCreaturePhase(page, ['enter', 'act'], 8000);
    await expect(page.getByTestId('creature-root')).toHaveAttribute('data-kind', 'lion');
  });

  test('the lion misses too; 15 mane clicks tame it and a forced roll drops the golden mane', async ({ page }) => {
    await enterBigCats(page);
    await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.setDropRoll(0));
    await forceCreature(page, 'lion');
    await waitCreaturePhase(page, ['act']);
    const mane = page.getByTestId('creature-target-mane');
    await expect(mane).toBeVisible();
    const box = await mane.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(56);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    const before = await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.state().score);
    for (let i = 0; i < LION_MANE_CLICKS; i++) await mane.click({ force: true });
    const v = await creatureOf(page);
    expect(v.tamed).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.state().score)).toBeGreaterThanOrEqual(before + LION_MANE_CLICKS * CREATURE_SPECS.lion.targets[0].raw);
    await expect(page.getByTestId('fly-to-bag')).toBeVisible();
    await expect.poll(
      async () => (await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.inventory())).find((i) => i.id === 'golden-mane')?.count ?? 0,
      { timeout: 5000 }
    ).toBe(1);
    await waitCreaturePhase(page, ['done'], BIG_CAT_STAY_MS[1] + 6000);
    const done = await creatureOf(page);
    if (done.minClearance !== null) expect(done.minClearance).toBeGreaterThan(0);
    await page.evaluate(() => (window as unknown as { __chicken: { useItem: (id: string) => void } }).__chicken.useItem('golden-mane'));
    await expect(page.getByTestId('golden-mane')).toBeVisible();
  });
});

test.describe('chicken game v2 big-cats HUD', () => {
  const BOX_SLACK_PX = 1;
  const SAMPLES = 4;
  const SAMPLE_GAP_MS = 250;
  const translateX = (transform: string) => Number(/translate\((-?[\d.]+)px/.exec(transform)?.[1] ?? Number.NaN);
  for (const vp of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`the score stays readable and creature counters avoid it at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await enterBigCats(page);
      await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'night-yard');
      await expect(page.getByTestId('stage-layers')).toHaveAttribute('data-covered', '1');
      await expect(page.getByTestId('hud-scrim')).toHaveCount(1);
      const hud = await page.evaluate(() => {
        const score = document.querySelector<HTMLElement>('[data-testid=chicken-score]');
        const scene = document.querySelector<HTMLElement>('[data-testid=endless-scene]');
        if (!score || !scene) return null;
        let opacity = 1;
        for (let el: HTMLElement | null = score; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity);
        return { opacity, color: getComputedStyle(score).color, scoreZ: Number(getComputedStyle(score).zIndex), sceneZ: Number(getComputedStyle(scene).zIndex) };
      });
      expect(hud).not.toBeNull();
      expect(hud!.opacity).toBeGreaterThan(0.95);
      expect(hud!.color).toBe('rgb(255, 255, 255)');
      expect(hud!.scoreZ).toBeGreaterThan(hud!.sceneZ);
      expect(await forceCreature(page, 'lion')).toBe(true);
      const hint = page.getByTestId('creature-hint');
      await expect(hint).toBeVisible({ timeout: 15_000 });
      const score = page.getByTestId('chicken-score');
      for (let i = 0; i < SAMPLES; i++) {
        const [h, s] = await Promise.all([hint.boundingBox(), score.boundingBox()]);
        if (h && s) {
          const apart = h.x + h.width <= s.x || s.x + s.width <= h.x || h.y + h.height <= s.y || s.y + s.height <= h.y;
          expect(apart).toBe(true);
        }
        const x = translateX(await page.getByTestId('chicken').evaluate((el) => (el as HTMLElement).style.transform));
        expect(x).toBeGreaterThanOrEqual(-BOX_SLACK_PX);
        expect(x).toBeLessThanOrEqual(vp.width - 70 + BOX_SLACK_PX);
        await page.waitForTimeout(SAMPLE_GAP_MS);
      }
    });
  }
});
