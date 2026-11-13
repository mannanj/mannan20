import { test, expect, type Locator, type Page } from '@playwright/test';
import { APPROACH_MS, BOARDING_MS, DRIFT_MS, EXPLODE_MS, LIFTOFF_HOLD_MS, LIFTOFF_RISE_MS } from '../src/components/game/escape-sequence';
import { COSMOS_FORCE_SCORE, COSMOS_START_SCORE, ESCAPE_STAGES, JUPITER_SCORE } from '../src/components/game/escape-stages';
import { ERA_REGISTRY, ORB_GAP_MIN_MS, ORB_REGISTRY, PACE_CURVE, SCHEDULE_TICK_MS, paceTarget, pickOrbKind, unlockedKinds, type SchedulerContext } from '../src/components/game/chicken-pacing';
import { chickenOutline, insideChicken, OUTLINE_SAMPLES, type OutlinePattern } from '../src/components/game/chicken-outline';
import { FIRE_FLAMING_SCORE, FIRE_FULL_SCORE, LIGHTNING_BLACK_SCORE, LIGHTNING_RED_SCORE } from '../src/components/game/chicken-fire';
import { CLONE_DOM_LIMIT, CURSOR_HAND_HOT_X, CURSOR_HAND_HOT_Y, CURSOR_HIT_PAD, CURSOR_RING_INNER_RADIUS, CURSOR_RING_OUTER_RADIUS, CURSOR_X3_OFFSET, CURSOR_X5_OFFSET, GOLDEN_LIFE_MS, MAX_CHICKENS_ON_SCREEN, MAX_GOLDEN_CHICKENS, ORB_LABELS, ORB_THRESHOLDS, type OrbKind } from '../src/components/game/chicken-orbs';
import { GAME_TUNING, scaledClicks } from '../src/components/game/game-tuning';
import { MARTIAN_CLICKS_GOAL } from '../src/components/game/martians';

const MAX_ORBS_ON_SCREEN = 3;

const GUARD_MS = 900;

async function gotoGame(page: Page, query: string) {
  await page.addInitScript(() => {
    localStorage.setItem('chicken-monologue-off', '1');
    localStorage.removeItem('chicken-v3-score');
  });
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
    await gotoGame(page, '?variant=legacy');
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

  test('the legacy game keeps the original toggle behavior', async ({ page }) => {
    await gotoGame(page, '?variant=legacy');
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
const X5_ARM = CURSOR_X5_OFFSET;
const X3_SPREAD = CURSOR_X3_OFFSET;
const HAND_HOT = { x: CURSOR_HAND_HOT_X, y: CURSOR_HAND_HOT_Y };
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
      [ORB_THRESHOLDS.frenzy, 'frenzy', ORB_LABELS.frenzy],
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

  test('an uncollected orb stays on the map', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.forceOrb('cursor5'));
    expect((await snap(page)).orbs).toHaveLength(1);
    await page.evaluate(() => (window as unknown as { __chicken: OrbBridge }).__chicken.fastForward(120_000));
    await page.waitForTimeout(200);
    expect((await snap(page)).orbs.some((o) => o.kind === 'cursor5')).toBe(true);
    await expect(page.getByTestId('chicken-orb').first()).toBeVisible();
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

  test('clicking a clone scores one point per chicken under it', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await collect(page, 'multiply');
    const before = (await snap(page)).score;
    const box = await page.getByTestId('chicken-clone').first().boundingBox();
    if (!box) throw new Error('no clone');
    const px = box.x + box.width / 2;
    const py = box.y + box.height / 2;
    const under = await page.evaluate(
      ([x, y, pad]) =>
        Array.from(document.querySelectorAll('[data-testid="chicken"], [data-testid="chicken-clone"]')).filter((el) => {
          const r = el.getBoundingClientRect();
          return x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad;
        }).length,
      [px, py, CURSOR_HIT_PAD]
    );
    await page.mouse.click(px, py);
    const gained = (await snap(page)).score - before;
    expect(gained).toBeGreaterThanOrEqual(1);
    expect(gained).toBeLessThanOrEqual(under);
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
      expect(side).toBeGreaterThan(X3_SPREAD * Math.sqrt(3) - 4);
      expect(side).toBeLessThan(X3_SPREAD * Math.sqrt(3) + 4);
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
    expect(r.filter((v) => Math.abs(v - CURSOR_RING_INNER_RADIUS) < 8)).toHaveLength(6);
    expect(r.filter((v) => Math.abs(v - CURSOR_RING_OUTER_RADIUS) < 8)).toHaveLength(8);
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
      return x >= box.x - CURSOR_HIT_PAD && x <= box.x + box.width + CURSOR_HIT_PAD && y >= box.y - CURSOR_HIT_PAD && y <= box.y + box.height + CURSOR_HIT_PAD;
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
    await gotoGame(page, '?variant=legacy');
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

const BIRD_FOLLOW_GAP_WAIT_MS = 4200;
const HAWK_TALON = scaledClicks(25, GAME_TUNING.clickScale);
const HAWK_FEATHER = scaledClicks(25, GAME_TUNING.clickScale);
const PHOENIX_TALON = scaledClicks(100, GAME_TUNING.clickScale);

async function forceBirdNow(page: Page, kind: 'hawk' | 'eagle' | 'phoenix') {
  await page.waitForFunction((ms) => performance.now() > ms, BIRD_FOLLOW_GAP_WAIT_MS);
  await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.placeChicken(820, 420));
  await page.evaluate((k) => (window as unknown as { __chicken: BirdBridge }).__chicken.forceBird(k), kind);
}

async function summonHawk(page: Page) {
  await gotoGame(page, '?variant=2');
  await forceBirdNow(page, 'hawk');
  await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
  await page.waitForTimeout(150);
}

async function tapTalon(page: Page, side: 'right' | 'left', n: number) {
  for (let i = 0; i < n; i++) await page.getByTestId(`bird-talon-${side}`).click({ force: true });
}

test.describe('chicken game v2 hawk event', () => {
  test('no hawk below its trigger score; the hawk flies in when it is reached', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForFunction((ms) => performance.now() > ms, BIRD_FOLLOW_GAP_WAIT_MS);
    await page.evaluate((n) => (window as unknown as { __chicken: BirdBridge }).__chicken.setScore(n), BIRD_TRIGGER_SCORE.hawk - 1);
    await page.waitForTimeout(300);
    expect((await birdState(page)).bird.phase).toBe('idle');
    await expect(page.getByTestId('bird-root')).toHaveCount(0);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(1));
    await expect.poll(async () => (await birdState(page)).bird.phase, { timeout: 5000 }).toBe('approach');
    const s = await birdState(page);
    expect(s.score).toBe(BIRD_TRIGGER_SCORE.hawk);
    expect(s.bird.snapshot).not.toBeNull();
    await expect(page.getByTestId('bird-flight')).toBeVisible();
  });

  test('forceBird triggers the event once per run', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await forceBirdNow(page, 'hawk');
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
    await expect(page.getByTestId('bird-banner')).toHaveCount(0);
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

  test('front-talon clicks score and and free the right claw; then the left claw with hint, label and look-at-you', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    const before = (await birdState(page)).score;
    await tapTalon(page, 'right', HAWK_TALON - 1);
    let s = await birdState(page);
    expect(s.bird.phase).toBe('right');
    expect(s.bird.rightClicks).toBe(HAWK_TALON - 1);
    await tapTalon(page, 'right', 1);
    s = await birdState(page);
    expect(s.score).toBe(before + HAWK_TALON);
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
    await tapTalon(page, 'left', HAWK_TALON - 1);
    expect((await rootData(page)).look).toBe('0');
    await tapTalon(page, 'left', 1);
    expect((await birdState(page)).bird.looks).toBe(1);
    s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    expect(s.bird.calm).toBe(true);
    expect(s.score).toBe(before + HAWK_TALON * 2);
  });

  test('freed: hawk hovers, chicken stands still for 25 free clicks, then resumes its pre-hawk speed; fly-off shrinks', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    await tapTalon(page, 'right', HAWK_TALON);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await tapTalon(page, 'left', HAWK_TALON);
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
    expect(s.speed).toBeGreaterThanOrEqual(snapshot?.speed ?? 0);
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

  test('feather clicks on the receding hawk drop a feather; it flies into the bag; using it applies the hawk skin and its multiplier', async ({ page }) => {
    test.setTimeout(120_000);
    await summonHawk(page);
    await tapTalon(page, 'right', HAWK_TALON);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'left', null, { timeout: 3000 });
    await tapTalon(page, 'left', HAWK_TALON);
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(25));
    await birdFf(page, 6300);
    await page.waitForFunction(() => (window as unknown as { __chicken: BirdBridge }).__chicken.state().bird.phase === 'recede', null, { timeout: 3000 });
    const before = (await birdState(page)).score;
    for (let i = 0; i < HAWK_FEATHER - 1; i++) await page.getByTestId('bird-hit').click({ force: true });
    let s = await birdState(page);
    expect(s.bird.feathered).toBe(false);
    expect(s.score).toBe(before + HAWK_FEATHER - 1);
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
    expect(s.mult).toBe(skinMultiplier('hawk'));
    await expect(page.getByTestId('chicken-hawk-pattern')).toBeAttached();
    const start = s.scoreExact;
    await page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.boost(4));
    s = await birdState(page);
    expect(s.scoreExact).toBeCloseTo(start + 4 * skinMultiplier('hawk'), 6);
    expect(s.score).toBe(Math.floor(start + 4 * skinMultiplier('hawk')));
    await page.getByTestId('chicken-skins-toggle').click();
    await expect(page.getByTestId('chicken-skin-hawk')).toBeVisible();
  });
});

const CHAR_KEY = 'chicken-skin-char-v1';
const EAGLE_FOCAL = { x: 0.62, y: 0.4 };
const PHOENIX_FOCAL = { x: 0.4, y: 0.38 };
const VIEW = { w: 1280, h: 720 };

async function summonBird(page: Page, kind: 'phoenix') {
  await gotoGame(page, '?variant=2&start=moon');
  await forceBirdNow(page, kind);
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

const distressOf = (page: Page) => page.getByTestId('chicken').getByTestId('chicken-svg').getAttribute('data-distress');
const aliveToasted = (page: Page) => page.locator('[data-testid="toasted-feather"][data-alive="1"]');
const toastedInBag = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.inventory()).then((items) => items.find((i) => i.id === 'toasted-feather')?.count ?? 0);

test.describe('chicken game v2 eagle and phoenix events', () => {
  test('the phoenix: talon 1 sizzles and sweats, talon 2 pulses fire every 5 taps, bares skin and sheds toasted feathers; scaled clicks per talon', async ({ page }) => {
    test.setTimeout(150_000);
    await summonBird(page, 'phoenix');
    let s = await birdState(page);
    expect(s.bird.kind).toBe('phoenix');
    expect(s.bird.heat).toBe(1);
    expect(await distressOf(page)).toBe('1');
    await expect(page.getByTestId('chicken-sweat')).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __chicken: BirdBridge }).__chicken.plays.some((p) => p.type === 'sizzle'))).toBe(true);
    await expect(page.getByTestId('bird-counter')).toHaveText(`front claw 0 / ${PHOENIX_TALON}`);
    await expect(page.getByTestId('burn-spot')).toHaveCount(0);
    const before = s.score;
    await tapTalon(page, 'right', PHOENIX_TALON - 1);
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
    expect(b1).toBeCloseTo(5 / PHOENIX_TALON, 6);
    await tapTalon(page, 'left', 10);
    s = await birdState(page);
    expect(s.bird.pulses).toBe(3);
    expect(s.bird.burn).toBeGreaterThan(b1);
    const b2 = s.bird.burn;
    await tapTalon(page, 'left', PHOENIX_TALON - 16);
    s = await birdState(page);
    expect(s.bird.phase).toBe('left');
    expect(s.bird.burn).toBeGreaterThan(b2);
    await tapTalon(page, 'left', 1);
    s = await birdState(page);
    expect(s.bird.phase).toBe('hover');
    expect(s.bird.burn).toBe(1);
    expect(s.score).toBe(before + PHOENIX_TALON * 2);
    await expect.poll(() => distressOf(page)).toBe('0');
    await expect(page.getByTestId('burn-spot')).toHaveCount(0);
    await expect(page.getByTestId('char-spot')).toBeAttached();
  });

  test('toasted feathers can be collected into the bag, capped at 10', async ({ page }) => {
    test.setTimeout(150_000);
    await summonBird(page, 'phoenix');
    await tapTalon(page, 'right', PHOENIX_TALON);
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
    await freeBird(page, PHOENIX_TALON);
    const feathers = page.getByTestId('char-feathers');
    await expect(feathers).toBeAttached();
    const early = Number(await feathers.evaluate((el) => getComputedStyle(el).opacity));
    expect(early).toBeLessThanOrEqual(0.55);
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
    expect((await birdState(page)).mult).toBe(skinMultiplier('phoenix'));
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

const PHOENIX_TEST_SCALE = 2.5;
const GRAB_WIDTH: Record<'hawk' | 'phoenix', number> = { hawk: 110, phoenix: 150 * PHOENIX_TEST_SCALE };
const MIN_TALON_HIT = 56;

async function summonAny(page: Page, kind: 'hawk' | 'phoenix') {
  if (kind === 'hawk') await summonHawk(page);
  else await summonBird(page, kind);
}

test.describe('chicken game v2 bird sizes, talon hit areas and frame continuity', () => {
  for (const kind of ['hawk', 'phoenix'] as const) {
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
const stageAt = (name: string) => ESCAPE_STAGES.find((st) => st.stage === name)?.threshold ?? 0;
const PILOT_ENTRY_MARGIN = 5;
const START_SCORE_QUERY = `?variant=2&start=${stageAt('pilot') - PILOT_ENTRY_MARGIN}`;
const PLANE_VIEW = { width: 1280, height: 720 };

async function enterPilot(page: Page) {
  await gotoGame(page, START_SCORE_QUERY);
  await page.waitForFunction((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.state().score >= n, stageAt('pilot') - PILOT_ENTRY_MARGIN);
  await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(n), PILOT_ENTRY_MARGIN * 2);
  await page.waitForFunction(() => (window as unknown as { __chicken: SeqBridge }).__chicken.state().stage === 'pilot');
}

async function toRocket(page: Page) {
  await page.evaluate((n) => (window as unknown as { __chicken: SeqBridge }).__chicken.boost(n), stageAt('rocket') - stageAt('pilot'));
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
    await gotoGame(page, `?variant=2&start=${COSMOS_START_SCORE - 100}`);
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('moon');
    await game.setScore(COSMOS_START_SCORE - 1);
    await expect.poll(async () => (await game.state()).stage).toBe('moon');
    await game.setScore(COSMOS_FORCE_SCORE);
    await expect.poll(async () => (await game.state()).stage).toBe('cosmos');
    await expect(page.getByTestId('cosmos-3d')).toBeAttached();
    await expect(page.getByTestId('sunsignal-credit-cosmos')).toContainText('provided by sunsignal.app');
    await game.setScore(JUPITER_SCORE);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
  });

  test('the start marker lands in the cosmos and the band follows the score', async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${COSMOS_START_SCORE}`);
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('cosmos');
    await expect(page.getByTestId('cosmos-3d')).toHaveAttribute('data-band', 'earth', { timeout: 20_000 });
    await game.setScore(Math.round(COSMOS_START_SCORE + (JUPITER_SCORE - COSMOS_START_SCORE) * 0.55));
    await expect(page.getByTestId('cosmos-3d')).toHaveAttribute('data-band', 'belt', { timeout: 20_000 });
  });

  test('Jupiter arrival shows the ground and background Martians', async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${JUPITER_SCORE}`);
    await expect(page.getByTestId('jupiter-ground')).toBeVisible();
    expect(await page.getByTestId('martian-bg').count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('martian')).toHaveCount(0);
  });

  test('friends walk in, never more than two at once', async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${JUPITER_SCORE}`);
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
    await game.spawn('moss');
    await game.spawn('zap');
    await game.spawn('pip');
    await expect(page.getByTestId('martian')).toHaveCount(2);
    await expect(page.getByTestId('martian').first()).toHaveAttribute('data-kind', 'moss');
  });

  test(`${MARTIAN_CLICKS_GOAL} clicks earn the item and the x3 skin; Martian clicks do not score`, async ({ page }) => {
    await gotoGame(page, `?variant=2&start=${JUPITER_SCORE}`);
    const game = cosmosBridge(page);
    await expect.poll(async () => (await game.state()).stage).toBe('jupiter');
    const before = (await game.state()).score;
    await game.spawn('pip');
    await expect(page.getByTestId('martian')).toHaveCount(1);
    await pokeMartian(page, MARTIAN_CLICKS_GOAL - 1);
    await expect(page.getByTestId('martian-progress')).toHaveText(`${MARTIAN_CLICKS_GOAL - 1}/${MARTIAN_CLICKS_GOAL}`);
    expect((await game.inventory()).some((i) => i.id === 'martian-friend')).toBe(false);
    await pokeMartian(page, 1);
    await expect.poll(async () => (await game.inventory()).some((i) => i.id === 'martian-friend')).toBe(true);
    expect((await game.state()).score).toBe(before);
    expect(await game.clicks()).toBe(MARTIAN_CLICKS_GOAL);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
    expect(await game.clicks()).toBe(MARTIAN_CLICKS_GOAL);
    await game.useItem('martian-friend');
    await expect.poll(async () => (await game.state()).skin).toBe('martian');
    const worn = (await game.state()).score;
    await game.boost(1);
    expect((await game.state()).score - worn).toBe(skinMultiplier('martian'));
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
    const score = ORB_THRESHOLDS.multiply + 5;
    await page.evaluate((n) => (window as unknown as { __chicken: PaceBridge }).__chicken.setScore(n), score);
    await paceBridge(page, (b) => b.fastForward(75_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBe(1);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBeGreaterThan(10);
    expect(unlockedKinds(score, s.pace.behindPct / 100)).toContain(s.orbs[0].kind);
  });

  test('far behind pace forces the strongest unlocked orb; locked kinds never appear', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    const score = ORB_THRESHOLDS.frenzy + 30;
    await page.evaluate((n) => (window as unknown as { __chicken: PaceBridge }).__chicken.setScore(n), score);
    await paceBridge(page, (b) => b.fastForward(240_000));
    await expect.poll(async () => (await paceState(page)).orbs.map((o) => o.kind), { timeout: 4000 }).toEqual(['frenzy']);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBeGreaterThan(40);
    expect(unlockedKinds(score, s.pace.behindPct / 100)).not.toContain('eggs');
  });

  test('a player on pace still gets variety orbs, never more than three on screen', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.setScore(700));
    await paceBridge(page, (b) => b.fastForward(20_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBeGreaterThanOrEqual(1);
    const s = await paceState(page);
    expect(s.pace.behindPct).toBe(0);
    expect(unlockedKinds(700, 0)).toContain(s.orbs[0].kind);
    for (let i = 0; i < 5; i++) await paceBridge(page, (b) => b.forcePaceCheck());
    expect((await paceState(page)).orbs.length).toBeLessThanOrEqual(MAX_ORBS_ON_SCREEN);
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

  test('gap after an orb, the on-screen cap and recency rules hold', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate((n) => (window as unknown as { __chicken: PaceBridge }).__chicken.setScore(n), ORB_THRESHOLDS.frenzy + 30);
    await paceBridge(page, (b) => b.fastForward(240_000));
    await expect.poll(async () => (await paceState(page)).orbs.length, { timeout: 4000 }).toBeGreaterThanOrEqual(1);
    await paceBridge(page, (b) => b.forcePaceCheck());
    expect((await paceState(page)).orbs.length).toBeLessThanOrEqual(MAX_ORBS_ON_SCREEN);
    if (!(await paceState(page)).orbs.some((o) => o.kind === 'frenzy')) await page.evaluate(() => (window as unknown as { __chicken: { forceOrb: (k: string) => void } }).__chicken.forceOrb('frenzy'));
    for (let left = (await paceState(page)).orbs; left.length > 0; left = (await paceState(page)).orbs) {
      const next = left.find((o) => o.kind !== 'frenzy') ?? left[0];
      await page.evaluate((k) => (window as unknown as { __chicken: { collectOrb: (k: string) => void } }).__chicken.collectOrb(k), next.kind);
    }
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
    await forceBirdNow(page, 'hawk');
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
    const frenzyFactor = s.score - before;
    expect(frenzyFactor).toBeGreaterThan(1);
    expect(s.frenzyMs).toBeGreaterThan(19_050);
    await paceBridge(page, (b) => b.selectSkin('hawk'));
    const mid = (await paceState(page)).score;
    await paceBridge(page, (b) => b.boost(4));
    s = await paceState(page);
    expect(s.score - mid).toBe(4 * skinMultiplier('hawk') * frenzyFactor);
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

  test('the hawk talon count follows the click scale and ignores the skin multiplier', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoGame(page, '?variant=2');
    await paceBridge(page, (b) => b.selectSkin('eagle'));
    await forceBirdNow(page, 'hawk');
    await page.waitForFunction(() => (window as unknown as { __chicken: PaceBridge }).__chicken.state().bird.phase === 'right', null, { timeout: 8000 });
    const hawk = (await paceState(page)).bird;
    const hawkNeed = talonNeed(BIRD_SPECS.hawk.rightClicks * GAME_TUNING.clickScale, talonWeightFor('hawk', skinMultiplier('eagle')));
    expect(hawk.rightNeed).toBe(hawkNeed);
    await expect(page.getByTestId('bird-counter')).toHaveText(`front claw 0 / ${hawkNeed}`);
  });

  test('the phoenix talon count halves with a x2 skin', async ({ page }) => {
    test.setTimeout(60_000);
    for (const kind of ['phoenix'] as const) {
      const need = talonNeed(BIRD_SPECS[kind].rightClicks * GAME_TUNING.clickScale, talonWeightFor(kind, skinMultiplier('eagle')));
      await gotoGame(page, '?variant=2');
      await paceBridge(page, (b) => b.selectSkin('eagle'));
      await forceBirdNow(page, kind);
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
const MIN_PILOT_SCORE_SPAN = 100;
const PILOT_TELEPORT_WAIT_MS = 12_000;
const MIN_PILOT_TRAVEL_PX = 120;

test.describe('chicken game v2 pacing constants and plane', () => {
  test('pace curve hits its final target and rocket phases are halved', () => {
    const last = PACE_CURVE[PACE_CURVE.length - 1];
    expect(paceTarget(last.minutes * 60_000)).toBe(last.score);
    expect(paceTarget(PACE_CURVE[1].minutes * 60_000)).toBe(PACE_CURVE[1].score);
    expect(PACE_CURVE.map((p) => p.score)).toEqual([...PACE_CURVE.map((p) => p.score)].sort((a, b) => a - b));
    expect(new Set(PACE_CURVE.map((p) => p.score)).size).toBe(PACE_CURVE.length);
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
    const unlocks = ['cursor5', 'multiply', 'cursor3', 'frenzy', 'eggs', 'multiply5', 'chain', 'multiply10', 'multiply25', 'multiply100'].map((k) => ORB_REGISTRY[k as OrbKind].unlock);
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
    expect(unlockedKinds(ORB_REGISTRY.multiply5.unlock, 0)).toContain('multiply5');
    expect(unlockedKinds(ORB_REGISTRY.multiply5.unlock - 1, 0)).not.toContain('multiply5');
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

  test('golden eggs only hatch (clicking pays nothing); a hatched golden chicken is worth 5x and leaves after 33 s', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoGame(page, '?variant=2&start=3000');
    await v2(page, (b) => b.placeChicken(640, 300));
    await grab(page, 'eggs');
    await expect.poll(async () => (await v2State(page)).eggs.length, { timeout: 3000 }).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(900);
    let s = await v2State(page);
    const egg = s.eggs[0];
    await v2(page, (b) => b.placeChicken(120, 150));
    await page.waitForTimeout(300);
    const before = (await v2State(page)).score;
    await page.getByTestId('chicken-egg').first().click({ force: true });
    s = await v2State(page);
    expect(s.score - before).toBeLessThan(egg.big ? 500 : 100);
    expect(s.eggs.find((e) => e.id === egg.id)).toBeDefined();
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
    await page.getByTestId('chicken-golden').first().click({ force: true });
    const goldGain = (await v2State(page)).score - mid;
    expect(goldGain).toBeGreaterThanOrEqual(5);
    expect(goldGain).toBeLessThanOrEqual(5 + 3);
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
    const box = await page.getByTestId('chicken').getByTestId('chicken-svg').boundingBox();
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

  test('lightning turns red at its score and black with a red core at the next', async ({ page }) => {
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
    const filter = await page.getByTestId('chicken').getByTestId('chicken-svg').evaluate((el) => getComputedStyle(el).filter);
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

const BIG_CAT_ORDER = CREATURE_ORDER.filter((k) => k === 'kitty' || k === 'tiger' || k === 'lion');
import { ENDLESS_ERAS, ENDLESS_FROM, ERA_MAX_MS, ERA_MIN_MS, ERA_OVERRUN_MS, ERA_SCORE_STEP } from '../src/components/game/endless-eras';

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
  knockbacks: number;
  headsAlive: number;
  targetHits: Record<string, number>;
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
  test('the endless registry steps by the era score step and orders the cats kitty, tiger, lion', () => {
    expect(ENDLESS_ERAS[0].from).toBe(ENDLESS_FROM);
    for (let i = 1; i < ENDLESS_ERAS.length; i++) expect(ENDLESS_ERAS[i].from - ENDLESS_ERAS[i - 1].from).toBe(ERA_SCORE_STEP);
    const cats = ENDLESS_ERAS.find((e) => e.id === 'big-cats');
    expect(cats?.creatures.map((c) => c.kind)).toEqual(BIG_CAT_ORDER);
    for (let i = 1; i < (cats?.creatures.length ?? 0); i++) expect(cats!.creatures[i].atMs).toBeGreaterThan(cats!.creatures[i - 1].atMs);
    expect(ENDLESS_ERAS[0].pool).toEqual(expect.arrayContaining(['giant', 'magnet']));
    expect(ERA_REGISTRY.find((e) => e.id === 'big-cats')?.from).toBe(ENDLESS_FROM + ERA_SCORE_STEP);
    expect(ERA_REGISTRY.find((e) => e.from === ENDLESS_FROM)?.introduces).toEqual(expect.arrayContaining(['giant', 'magnet']));
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

  test('eras switch by score and by the era clock', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.evaluate((from) => {
      const b = (window as unknown as { __chicken: CreatureBridge }).__chicken;
      b.setScore(from - 1);
      b.boost(1);
    }, ENDLESS_FROM);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe('fire');
    expect((await eraOf(page)).byTime).toBe(false);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'fire-sky');
    await page.evaluate((ms) => (window as unknown as { __chicken: CreatureBridge }).__chicken.fastForward(ms), ERA_MAX_MS + 100);
    await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe('big-cats');
    expect((await eraOf(page)).byTime).toBe(true);
    expect((await eraOf(page)).queued).toEqual(GAME_TUNING.eraCreatures['big-cats'].map((c) => c.kind));
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
    const holdMs = (await creatureOf(page)).holdMs;
    const t0 = Date.now();
    for (let i = 0; i < 9; i++) await page.getByTestId('creature-body').click({ force: true });
    await waitCreaturePhase(page, ['leave', 'done']);
    expect(Date.now() - t0).toBeLessThan(holdMs);
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
    for (let i = 0; i < scaledClicks(LION_MANE_CLICKS, GAME_TUNING.clickScale); i++) await mane.click({ force: true });
    const v = await creatureOf(page);
    expect(v.tamed).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __chicken: CreatureBridge }).__chicken.state().score)).toBeGreaterThanOrEqual(before + scaledClicks(LION_MANE_CLICKS, GAME_TUNING.clickScale) * CREATURE_SPECS.lion.targets[0].raw);
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

import { CERBERUS_HEAD_CLICKS, CYCLOPS_STAY_MS, HYDRA_HEADS_MAX, HYDRA_HEADS_START, HYDRA_HEAD_CLICKS, HYDRA_KNOCKBACKS_TO_WIN, HYDRA_REGROW_MS } from '../src/components/game/creature-event';
import { skinMultiplier } from '../src/components/game/chicken-skins';
import { BIRD_SPECS, BIRD_TRIGGER_SCORE } from '../src/components/game/bird-event';
import { GATE_KEY_ERA_ID, REAL_CHICKEN_UNLOCK_SCORE } from '../src/components/game/endless-eras';
import { talonNeed, talonWeightFor } from '../src/components/game/chicken-pacing';

interface MythBridge extends CreatureBridge {
  useItem: (id: string) => void;
  forceBird: (kind: string) => void;
  shield: () => number;
  state: () => { score: number; auraDrawn: boolean; era: string | null; bird: { rightNeed: number } };
}

async function enterEra(page: Page, id: string) {
  const era = ENDLESS_ERAS.find((e) => e.id === id);
  if (!era) throw new Error(`unknown era ${id}`);
  await gotoGame(page, '?variant=2');
  await page.evaluate((target) => {
    const b = (window as unknown as { __chicken: MythBridge }).__chicken;
    b.setScore(target - 1);
    b.boost(1);
  }, era.from);
  await expect.poll(async () => (await eraOf(page)).id, { timeout: 5000 }).toBe(id);
}

const HYDRA_LIVE_STATES = ['ready', 'strike', 'bite'];
const liveHydraHead = (page: Page) => page.locator(HYDRA_LIVE_STATES.map((st) => `[data-testid^="creature-target-head-"][data-state="${st}"]`).join(', ')).first();

async function knockOneHead(page: Page) {
  const before = (await creatureOf(page)).knockbacks;
  for (let i = 0; i < HYDRA_HEAD_CLICKS + 2; i++) {
    await liveHydraHead(page).click({ force: true });
    if ((await creatureOf(page)).knockbacks > before) return;
  }
  throw new Error('head not knocked back');
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function clickClear(target: Locator, others: Locator[]) {
  const box = await target.boundingBox();
  if (!box) throw new Error('target not visible');
  const rivals: Box[] = [];
  for (const o of others) {
    const b = await o.boundingBox();
    if (b && b.width > 0) rivals.push(b);
  }
  const edge = 3;
  const candidates = [box.x + edge, box.x + box.width - edge, box.x + box.width / 2];
  const y = box.y + box.height / 2;
  const x = candidates.find((cx) => rivals.every((r) => cx < r.x || cx > r.x + r.width || y < r.y || y > r.y + r.height)) ?? candidates[2];
  await target.page().mouse.click(x, y);
}

const apart = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

test.describe('chicken game v2 myth eras', () => {
  test('the registry orders fire, big cats, jungle, myth, the gate and the forest one era step apart', () => {
    expect(ENDLESS_ERAS.map((e) => e.id)).toEqual(['fire', 'big-cats', 'jungle', 'myth-1', 'myth-2', GATE_KEY_ERA_ID]);
    ENDLESS_ERAS.forEach((e, i) => expect(e.from).toBe(ENDLESS_FROM + ERA_SCORE_STEP * i));
    expect(ENDLESS_ERAS[3].creatures.map((c) => c.kind)).toEqual(['cyclops', 'hydra']);
    expect(ENDLESS_ERAS[4].creatures.map((c) => c.kind)).toEqual(['cerberus']);
    expect(ENDLESS_ERAS[5].creatures.map((c) => c.kind)).toEqual(['tree', 'tree']);
    expect(CREATURE_SPECS.cyclops.mode).toBe('spectacle');
    expect(CREATURE_SPECS.cyclops.targets).toHaveLength(0);
    expect(CREATURE_SPECS.cerberus.dropChance).toBe(1);
  });

  test('the temple, the gate and the forest scenes follow the eras and the forest photo fades in', async ({ page }) => {
    await enterEra(page, 'myth-1');
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'temple');
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.forceEra('myth-2'));
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'temple-gate');
    await page.evaluate((id) => (window as unknown as { __chicken: MythBridge }).__chicken.forceEra(id), GATE_KEY_ERA_ID);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'forest');
    await expect(page.getByTestId('forest-scene')).toHaveCSS('background-image', /forest\.webp/);
    await expect(page.getByTestId('forest-scene')).toHaveCSS('transition-duration', '5s');
  });

  test('the real-chicken toast stays hidden at 50,000 because headlines are off', async ({ page }) => {
    await enterEra(page, 'myth-2');
    await page.evaluate((target) => {
      const b = (window as unknown as { __chicken: MythBridge }).__chicken;
      b.setScore(target - 1);
      b.boost(1);
    }, REAL_CHICKEN_UNLOCK_SCORE);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('unlock-toast')).toHaveCount(0);
  });

  test('the cyclops is spectacle only: no targets, the eye tracks, the chicken still scores, it leaves in time', async ({ page }) => {
    await enterEra(page, 'myth-1');
    expect(await forceCreature(page, 'cyclops')).toBe(true);
    await waitCreaturePhase(page, ['act']);
    await expect(page.locator('[data-testid^="creature-target-"]:visible')).toHaveCount(0);
    await expect(page.getByTestId('creature-eye')).toBeVisible();
    const before = await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().score);
    await page.getByTestId('chicken').click({ force: true });
    expect(await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().score)).toBeGreaterThan(before);
    await waitCreaturePhase(page, ['done'], CYCLOPS_STAY_MS[1] + 8000);
    const v = await creatureOf(page);
    expect(v.leftAt - v.enteredAt).toBeLessThanOrEqual(CYCLOPS_STAY_MS[1] + 4000);
  });

  test('hydra heads regrow as two up to the cap, 12 knock-backs win, the scale shields the next bird', async ({ page }) => {
    test.setTimeout(120_000);
    await enterEra(page, 'myth-1');
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.setDropRoll(0));
    expect(await forceCreature(page, 'hydra')).toBe(true);
    await waitCreaturePhase(page, ['act']);
    await expect(page.getByTestId('creature-root')).toHaveAttribute('data-heads', String(HYDRA_HEADS_START));
    const head = liveHydraHead(page);
    await expect(head).toBeVisible();
    const box = await head.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(56);
    const score0 = await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().score);
    await knockOneHead(page);
    expect((await creatureOf(page)).knockbacks).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().score)).toBeGreaterThanOrEqual(score0 + scaledClicks(HYDRA_HEAD_CLICKS, GAME_TUNING.clickScale) * CREATURE_SPECS.hydra.targets.length + scaledClicks(HYDRA_HEAD_CLICKS, GAME_TUNING.clickScale) * 5);
    const REGROW_WAIT_MS = HYDRA_REGROW_MS + 4000;
    const alive = async () => (await creatureOf(page)).headsAlive;
    for (let i = 1; i < HYDRA_HEADS_START; i++) await knockOneHead(page);
    await expect.poll(alive, { timeout: REGROW_WAIT_MS }).toBe(HYDRA_HEADS_START * 2);
    await knockOneHead(page);
    await expect.poll(alive, { timeout: REGROW_WAIT_MS }).toBe(HYDRA_HEADS_MAX);
    await knockOneHead(page);
    await page.waitForTimeout(REGROW_WAIT_MS);
    expect(await alive()).toBe(HYDRA_HEADS_MAX);
    while ((await creatureOf(page)).knockbacks < HYDRA_KNOCKBACKS_TO_WIN) {
      const v = await creatureOf(page);
      expect(v.headsAlive).toBeLessThanOrEqual(HYDRA_HEADS_MAX);
      if (v.headsAlive === 0) {
        await page.waitForTimeout(250);
        continue;
      }
      await knockOneHead(page);
    }
    expect((await creatureOf(page)).tamed).toBe(true);
    await expect(page.getByTestId('fly-to-bag')).toBeVisible();
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.inventory())).find((i) => i.id === 'hydra-scale')?.count ?? 0, { timeout: 5000 }).toBe(1);
    await waitCreaturePhase(page, ['done'], 10_000);
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.useItem('hydra-scale'));
    expect(await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.shield())).toBe(1);
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.forceBird('hawk'));
    await expect.poll(async () => page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().bird.rightNeed), { timeout: 10_000 }).toBe(talonNeed(BIRD_SPECS.hawk.rightClicks * GAME_TUNING.clickScale, talonWeightFor('hawk', 1) * 2));
    expect(await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.shield())).toBe(0);
  });

  test('cerberus catches on the third snap; outer heads first, 8 clicks each; the gate key always drops and opens the forest', async ({ page }) => {
    test.setTimeout(90_000);
    const CERBERUS_CLICKS = scaledClicks(CERBERUS_HEAD_CLICKS, GAME_TUNING.clickScale);
    await enterEra(page, 'myth-2');
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.setDropRoll(0.99));
    expect(await forceCreature(page, 'cerberus')).toBe(true);
    await waitCreaturePhase(page, ['hold'], 30_000);
    expect(await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.state().auraDrawn)).toBe(false);
    const left = page.getByTestId('creature-target-left');
    const right = page.getByTestId('creature-target-right');
    const middle = page.getByTestId('creature-target-middle');
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
    await expect(middle).toBeHidden();
    const hint = page.getByTestId('creature-hint');
    await expect(hint).toBeVisible({ timeout: 5000 });
    const [h, sc] = await Promise.all([hint.boundingBox(), page.getByTestId('chicken-score').boundingBox()]);
    expect(h && sc && apart(h, sc)).toBe(true);
    for (let i = 0; i < CERBERUS_CLICKS; i++) await clickClear(left, [right, middle]);
    await expect(left).toBeHidden();
    await expect(middle).toBeHidden();
    for (let i = 0; i < CERBERUS_CLICKS; i++) await clickClear(right, [left, middle]);
    await expect(middle).toBeVisible();
    for (let i = 0; i < CERBERUS_CLICKS; i++) await clickClear(middle, [left, right]);
    const v = await creatureOf(page);
    expect(v.tamed).toBe(true);
    expect(v.targetHits).toEqual({ left: CERBERUS_CLICKS, right: CERBERUS_CLICKS, middle: CERBERUS_CLICKS });
    await waitCreaturePhase(page, ['sit', 'leave', 'done'], 5000);
    await expect(page.getByTestId('fly-to-bag')).toBeVisible();
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.inventory())).find((i) => i.id === 'gate-key')?.count ?? 0, { timeout: 5000 }).toBe(1);
    await page.evaluate(() => (window as unknown as { __chicken: MythBridge }).__chicken.useItem('gate-key'));
    await expect.poll(async () => (await eraOf(page)).id).toBe(GATE_KEY_ERA_ID);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'forest');
    expect((await eraOf(page)).queued).toEqual(['tree', 'tree']);
  });

  test('the lion counter sits by the mane, not by the chicken, and clears the score box', async ({ page }) => {
    await enterBigCats(page);
    expect(await forceCreature(page, 'lion')).toBe(true);
    const hint = page.getByTestId('creature-hint');
    await expect(hint).toBeVisible({ timeout: 15_000 });
    const [h, mane, img, score] = await Promise.all([hint.boundingBox(), page.getByTestId('creature-target-mane').boundingBox(), page.getByTestId('creature-img').boundingBox(), page.getByTestId('chicken-score').boundingBox()]);
    expect(h && mane && img && score).toBeTruthy();
    if (!h || !mane || !img || !score) return;
    const dist = Math.hypot(h.x + h.width / 2 - (mane.x + mane.width / 2), h.y + h.height / 2 - (mane.y + mane.height / 2));
    expect(dist).toBeLessThanOrEqual(Math.max(img.width, img.height));
    expect(apart(h, score)).toBe(true);
  });
});

import { SWORD_PULLS, TREE_HP, TREE_PECK_PER_S } from '../src/components/game/creature-event';
import { CLONE_MERGE_MIN_MS, CLONE_MERGE_SPREAD_MS, CLONE_RETURN_TIMEOUT_MS, LOD_TIER_FROM, SWORD_CURSOR_CLASS, SWORD_MAX_CHICKENS } from '../src/components/game/sword';

interface ForestBridge extends MythBridge {
  swarm: (n: number) => void;
  cut: (x0: number, y0: number, x1: number, y1: number) => number;
  sword: () => { equipped: boolean; splits: number; renderTier: string; groups: number };
  grantItem: (id: string, fromX?: number, fromY?: number) => void;
  forceScene: (name: string) => void;
  creature: () => CreatureView & { swordIn: boolean; swordPulls: number; hp: number | null; targetHits: Record<string, number>; tamed: boolean };
  state: () => { score: number; auraDrawn: boolean; era: string | null; chickens: number; clones: number; spriteClones: number; renderTier: string; swordEquipped: boolean; swordSplits: number; cloneGroups: number; clonePieces: number; bird: { rightNeed: number } };
}

const forestState = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.state());
const forestCreature = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.creature());
const PERF_FRAMES = 300;
const PERF_DROPPED_FRAC = 0.1;
const MERGE_WAIT_MS = CLONE_MERGE_MIN_MS + CLONE_MERGE_SPREAD_MS + CLONE_RETURN_TIMEOUT_MS + 6000;

const frameStats = (page: Page) =>
  page.evaluate(
    (frames) =>
      new Promise<{ p95: number; dropped: number; avg: number }>((res) => {
        const t: number[] = [];
        let last = performance.now();
        const step = (ts: number) => {
          t.push(ts - last);
          last = ts;
          if (t.length < frames) requestAnimationFrame(step);
          else {
            const avg = t.reduce((a, b) => a + b, 0) / t.length;
            const dropped = t.filter((x) => x > 33.4).length;
            t.sort((a, b) => a - b);
            res({ p95: t[Math.floor(t.length * 0.95)], dropped, avg });
          }
        };
        requestAnimationFrame(step);
      }),
    PERF_FRAMES
  );

test.describe('Chicken v2 endless: forest, trees, sword and the render tiers', () => {
  test('render tiers: DOM up to 60 clones, canvas sprites to 300, LOD above', async ({ page }) => {
    await enterEra(page, GATE_KEY_ERA_ID);
    expect((await forestState(page)).renderTier).toBe('dom');
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.swarm(100));
    let s = await forestState(page);
    expect(s.chickens).toBe(100);
    expect(s.renderTier).toBe('sprite');
    await expect(page.getByTestId('chicken-clone')).toHaveCount(CLONE_DOM_LIMIT);
    expect(s.spriteClones).toBe(99 - CLONE_DOM_LIMIT);
    await page.evaluate((n) => (window as unknown as { __chicken: ForestBridge }).__chicken.swarm(n), LOD_TIER_FROM + 50);
    s = await forestState(page);
    expect(s.renderTier).toBe('lod');
    await expect(page.getByTestId('chicken-clone')).toHaveCount(CLONE_DOM_LIMIT);
    await page.evaluate((n) => (window as unknown as { __chicken: ForestBridge }).__chicken.swarm(n), SWORD_MAX_CHICKENS + 500);
    expect((await forestState(page)).chickens).toBeLessThanOrEqual(SWORD_MAX_CHICKENS);
  });

  test('1,000 chickens keep p95 frame time under budget with at most 10 % dropped frames', async ({ page }) => {
    test.setTimeout(60_000);
    await enterEra(page, GATE_KEY_ERA_ID);
    await page.evaluate((n) => (window as unknown as { __chicken: ForestBridge }).__chicken.swarm(n), SWORD_MAX_CHICKENS);
    await page.waitForTimeout(2000);
    const s = await forestState(page);
    expect(s.chickens).toBe(SWORD_MAX_CHICKENS);
    expect(s.renderTier).toBe('lod');
    const stats = await frameStats(page);
    expect(stats.p95, JSON.stringify(stats)).toBeLessThan(PERF_P95_MS);
    expect(stats.dropped, JSON.stringify(stats)).toBeLessThanOrEqual(PERF_FRAMES * PERF_DROPPED_FRAC);
    await expect(page.getByTestId('chicken-score')).toBeVisible();
  });

  test('a living tree grabs the chicken; the chicken pecks on its own, bark clicks score and chip, 0 HP releases', async ({ page }) => {
    test.setTimeout(90_000);
    await enterEra(page, GATE_KEY_ERA_ID);
    expect(await forceCreature(page, 'tree')).toBe(true);
    await waitCreaturePhase(page, ['enter'], 20_000);
    await expect(page.getByTestId('creature-img')).toHaveAttribute('src', /tree-walk/);
    await waitCreaturePhase(page, ['hold'], 30_000);
    await expect(page.getByTestId('creature-img')).toHaveAttribute('src', /tree-grab/);
    expect((await forestState(page)).auraDrawn).toBe(false);
    const hp = page.getByTestId('tree-hp');
    await expect(hp).toBeVisible();
    const bark = page.getByTestId('creature-target-bark');
    await expect(bark).toBeVisible();
    const c0 = await forestCreature(page);
    await page.waitForTimeout(1500);
    const c1 = await forestCreature(page);
    expect(c1.hp).not.toBeNull();
    expect(c1.hp as number).toBeLessThan(c0.hp as number);
    expect((c0.hp as number) - (c1.hp as number)).toBeGreaterThanOrEqual(TREE_PECK_PER_S);
    const before = (await forestState(page)).score;
    for (let i = 0; i < 10; i++) await bark.click({ force: true });
    const c2 = await forestCreature(page);
    expect((c1.hp as number) - (c2.hp as number)).toBeGreaterThanOrEqual(10);
    expect((await forestState(page)).score).toBeGreaterThanOrEqual(before + 10 * 3);
    const [h, bar, sc, chicken] = await Promise.all([page.getByTestId('creature-hint').boundingBox(), hp.boundingBox(), page.getByTestId('chicken-score').boundingBox(), page.getByTestId('chicken').boundingBox()]);
    expect(bar && sc && apart(bar, sc)).toBe(true);
    if (h) expect(apart(h, sc as NonNullable<typeof sc>)).toBe(true);
    const vw = page.viewportSize()?.width ?? 0;
    const vh = page.viewportSize()?.height ?? 0;
    expect(chicken && chicken.x >= 0 && chicken.y >= 0 && chicken.x + chicken.width <= vw && chicken.y + chicken.height <= vh).toBe(true);
    for (let i = 0; i < TREE_HP; i++) {
      if ((await forestCreature(page)).tamed) break;
      await bark.click({ force: true });
    }
    expect((await forestCreature(page)).tamed).toBe(true);
    await waitCreaturePhase(page, ['sit', 'leave', 'done'], 5000);
    await expect(page.getByTestId('creature-img')).toHaveAttribute('src', /tree-chipped/);
    await expect(hp).toBeHidden();
    await expect(page.getByTestId('creature-banner')).toHaveText(/lets go/);
  });

  test('the sword tree: 25 pulls free the sword into the bag; equip, swipe-split a cluster, pieces merge back, toggle off', async ({ page }) => {
    test.setTimeout(120_000);
    await enterEra(page, GATE_KEY_ERA_ID);
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.forceScene('sword'));
    await waitCreaturePhase(page, ['enter', 'act', 'hold'], 20_000);
    const sword = page.getByTestId('creature-target-sword');
    await expect(sword).toBeVisible();
    await expect(page.getByTestId('tree-sword')).toBeVisible();
    expect((await forestCreature(page)).swordIn).toBe(true);
    await waitCreaturePhase(page, ['hold'], 30_000);
    const before = (await forestState(page)).score;
    for (let i = 0; i < SWORD_PULLS * 2 && (await forestCreature(page)).swordPulls < SWORD_PULLS - 1; i++) await sword.click({ force: true });
    expect((await forestCreature(page)).swordPulls).toBe(SWORD_PULLS - 1);
    await expect(sword).toHaveAttribute('data-clicks', String(SWORD_PULLS - 1));
    await expect(page.getByTestId('creature-hint')).toContainText(`${SWORD_PULLS - 1} / ${SWORD_PULLS}`);
    await sword.click({ force: true });
    expect((await forestState(page)).score).toBe(before);
    await expect(page.getByTestId('fly-to-bag')).toBeVisible();
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.inventory())).find((i) => i.id === 'sword')?.count ?? 0, { timeout: 5000 }).toBe(1);
    await expect(sword).toBeHidden();
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.useItem('sword'));
    expect((await forestState(page)).swordEquipped).toBe(true);
    await expect(page.getByTestId('sword-equipped')).toBeVisible();
    await expect(page.locator(`.${SWORD_CURSOR_CLASS}`)).toHaveCount(1);
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.swarm(90));
    await page.waitForTimeout(300);
    const s0 = await forestState(page);
    const cutStart = await page.evaluate(() => {
      const b = (window as unknown as { __chicken: ForestBridge }).__chicken;
      let n = 0;
      for (let i = 0; i < 5; i++) n += b.cut(0, 100 + i * 120, window.innerWidth, 120 + i * 120);
      return n;
    });
    expect(cutStart).toBeGreaterThan(5);
    const s1 = await forestState(page);
    expect(s1.clonePieces).toBeGreaterThanOrEqual(cutStart * 2);
    expect(s1.chickens).toBeGreaterThanOrEqual(s0.chickens + (cutStart - 1) * 2);
    const swordMult = await page.evaluate(() => (window as unknown as { __chicken: { state: () => { mult: number } } }).__chicken.state().mult);
    expect(swordMult).toBeGreaterThanOrEqual(1);
    expect(s1.score).toBe(s0.score + cutStart * swordMult);
    expect(s1.swordSplits).toBe(cutStart);
    expect(s1.cloneGroups).toBeGreaterThan(0);
    await page.mouse.move(20, 400);
    await page.mouse.down();
    for (let x = 20; x < 600; x += 40) await page.mouse.move(x, 400);
    await page.mouse.up();
    expect((await forestState(page)).swordSplits).toBeGreaterThanOrEqual(cutStart);
    const afterSwipe = (await forestState(page)).clonePieces;
    await page.evaluate((ms) => (window as unknown as { __chicken: ForestBridge }).__chicken.fastForward(ms), CLONE_MERGE_MIN_MS + CLONE_MERGE_SPREAD_MS);
    await expect.poll(async () => (await forestState(page)).clonePieces, { timeout: MERGE_WAIT_MS, intervals: [500] }).toBeLessThan(afterSwipe);
    expect((await forestState(page)).chickens).toBeLessThanOrEqual(SWORD_MAX_CHICKENS);
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.useItem('sword'));
    expect((await forestState(page)).swordEquipped).toBe(false);
    await expect(page.getByTestId('sword-equipped')).toBeHidden();
    await expect(page.locator(`.${SWORD_CURSOR_CLASS}`)).toHaveCount(0);
  });

  test('the gate key opens the forest once and the trees are queued; the swarm-1000 dev scene arrives equipped', async ({ page }) => {
    await enterEra(page, 'myth-2');
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.grantItem('gate-key'));
    await page.evaluate(() => (window as unknown as { __chicken: ForestBridge }).__chicken.useItem('gate-key'));
    await expect.poll(async () => (await eraOf(page)).id).toBe(GATE_KEY_ERA_ID);
    expect((await eraOf(page)).queued).toEqual(['tree', 'tree']);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'forest');
    await gotoGame(page, '?variant=2&start=swarm-1000');
    await expect.poll(async () => (await forestState(page)).chickens, { timeout: 15_000 }).toBe(SWORD_MAX_CHICKENS);
    const s = await forestState(page);
    expect(s.swordEquipped).toBe(true);
    expect(s.renderTier).toBe('lod');
    expect((await eraOf(page)).id).toBe(GATE_KEY_ERA_ID);
  });
});

import { CREATURE_DURATION_FLOOR, CREATURE_SPEED_PER_LAP, PHOENIX2_FIRE_SKY_MS, PHOENIX2_TALON_SCALE, ROTATION_DROP_SCALE, ROTATION_FIRST_INDEX, ROTATION_LENGTH, creatureDurationScale, dropScaleForLap, eraIndexForStep, lapForStep, lapStartScore, poolForLap, stepForIndex } from '../src/components/game/endless-eras';
import { MYSTERY_EFFECTS, pickMysteryEffect } from '../src/components/game/chicken-orbs';

interface RotationBridge extends ForestBridge {
  era: () => ReturnType<ForestBridge['era']> & { step: number; lap: number; phoenixDue: boolean; fireSkyUntilMs: number };
  state: () => ReturnType<ForestBridge['state']> & { lap: number; mysteryLast: OrbKind | null; scene: string | null; bird: { kind: string | null; phase: string; rightNeed: number; leftNeed: number } };
  creature: () => ReturnType<ForestBridge['creature']> & { speed: number; dropped: boolean };
  collectOrb: (kind: OrbKind) => void;
  forceOrb: (kind: OrbKind) => void;
}

const rotation = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken);
const rotState = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.state());
const rotEra = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.era());
const rotCreature = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.creature());
const jumpTo = (page: Page, score: number) =>
  page.evaluate((n) => {
    const b = (window as unknown as { __chicken: RotationBridge }).__chicken;
    b.setScore(n - 1);
    b.boost(1);
  }, score);
const ROTATION_IDS = ENDLESS_ERAS.slice(ROTATION_FIRST_INDEX).map((e) => e.id);
const MYSTERY_KINDS = MYSTERY_EFFECTS.map((e) => e.kind);
const MYSTERY_DRAWS = 8;
const SWORD_MIN_HIT_PX = 56;
const SWORD_TRUNK_X: [number, number] = [0.15, 0.85];
const SWORD_TRUNK_Y: [number, number] = [0.45, 0.95];
const SWORD_PROBE_PULLS = 10;
const clipBottomPct = (clip: string) => Number(/inset\(0(?:px)? 0(?:px)? ([\d.]+)%(?: 0(?:px)?)?\)/.exec(clip)?.[1] ?? NaN);

test.describe('Chicken v2 endless: rotation, phoenix 2 and the Mystery orb', () => {
  test('after the forest the eras rotate big cats, jungle, myth, the gate, the forest; speed, drops and pools vary per lap', () => {
    expect(ROTATION_LENGTH).toBe(ENDLESS_ERAS.length - ROTATION_FIRST_INDEX);
    expect(lapStartScore(2)).toBe(ENDLESS_FROM + ERA_SCORE_STEP * (ROTATION_LENGTH + 1));
    const laps = [1, 2, 3].map((lap) => ROTATION_IDS.map((_, i) => ENDLESS_ERAS[eraIndexForStep(stepForIndex(ROTATION_FIRST_INDEX + i, lap))].id));
    expect(laps).toEqual([ROTATION_IDS, ROTATION_IDS, ROTATION_IDS]);
    expect(lapForStep(ROTATION_FIRST_INDEX + ROTATION_LENGTH)).toBe(2);
    expect(lapForStep(ROTATION_FIRST_INDEX + ROTATION_LENGTH * 2)).toBe(3);
    expect(eraIndexForStep(0)).toBe(0);
    expect(creatureDurationScale(1)).toBe(1);
    expect(creatureDurationScale(2)).toBeCloseTo(1 / (1 + CREATURE_SPEED_PER_LAP), 5);
    expect(creatureDurationScale(3)).toBeCloseTo(1 / (1 + CREATURE_SPEED_PER_LAP * 2), 5);
    expect(creatureDurationScale(20)).toBe(CREATURE_DURATION_FLOOR);
    expect(dropScaleForLap(1)).toBe(1);
    expect(dropScaleForLap(2)).toBe(ROTATION_DROP_SCALE);
    for (const era of ENDLESS_ERAS) {
      expect(poolForLap(era, 1)).not.toContain('mystery');
      expect(poolForLap(era, 2)).toContain('mystery');
    }
    let last: OrbKind | null = null;
    for (let i = 0; i < 200; i++) {
      const kind = pickMysteryEffect(last, Math.random);
      expect(MYSTERY_KINDS).toContain(kind);
      expect(kind).not.toBe(last);
      expect(kind).not.toBe('mystery');
      last = kind;
    }
  });

  test('lap 2 opens with phoenix 2 (150 + 150) in the fire sky, then runs the four eras; lap 3 opens with it again', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoGame(page, '?variant=2');
    await jumpTo(page, lapStartScore(2));
    await expect.poll(async () => (await rotEra(page)).lap).toBe(2);
    expect((await rotEra(page)).id).toBe(ROTATION_IDS[0]);
    await expect.poll(async () => (await rotState(page)).bird.kind, { timeout: 10_000 }).toBe('phoenix');
    await expect.poll(async () => (await rotState(page)).scene).toBe('fire-sky');
    const st = await rotState(page);
    expect(st.bird.rightNeed).toBe(talonNeed(BIRD_SPECS.phoenix.rightClicks * (PHOENIX2_TALON_SCALE * GAME_TUNING.clickScale), 1));
    expect(st.bird.leftNeed).toBe(talonNeed(BIRD_SPECS.phoenix.leftClicks * (PHOENIX2_TALON_SCALE * GAME_TUNING.clickScale), 1));
    expect(st.lap).toBe(2);
    await expect(page.getByTestId('endless-scene')).toHaveAttribute('data-scene', 'fire-sky');
    await page.evaluate((ms) => (window as unknown as { __chicken: RotationBridge }).__chicken.fastForward(ms), PHOENIX2_FIRE_SKY_MS / 2 + 500);
    await expect.poll(async () => (await rotState(page)).scene, { timeout: 5000 }).toBe(ENDLESS_ERAS[ROTATION_FIRST_INDEX].scene);
    for (let i = 1; i < ROTATION_LENGTH; i++) {
      await jumpTo(page, lapStartScore(2) + ERA_SCORE_STEP * i);
      await page.evaluate((ms) => (window as unknown as { __chicken: RotationBridge }).__chicken.fastForward(ms), (ERA_MAX_MS + ERA_OVERRUN_MS) / 2 + 500);
      await expect.poll(async () => (await rotEra(page)).id, { timeout: 30_000 }).toBe(ROTATION_IDS[i]);
      expect((await rotEra(page)).lap).toBe(2);
      expect((await rotEra(page)).phoenixDue).toBe(false);
    }
    await gotoGame(page, '?variant=2');
    await jumpTo(page, lapStartScore(3));
    await expect.poll(async () => (await rotEra(page)).lap).toBe(3);
    expect((await rotEra(page)).id).toBe(ROTATION_IDS[0]);
    await expect.poll(async () => (await rotState(page)).bird.kind, { timeout: 10_000 }).toBe('phoenix');
    expect((await rotState(page)).bird.rightNeed).toBe(talonNeed(BIRD_SPECS.phoenix.rightClicks * (PHOENIX2_TALON_SCALE * GAME_TUNING.clickScale), 1));
  });

  test('creatures run 20 % faster per lap, bounded by the floor, and repeat drops roll at half chance', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoGame(page, '?variant=2');
    await jumpTo(page, lapStartScore(2) + ERA_SCORE_STEP);
    await expect.poll(async () => (await rotEra(page)).id, { timeout: 15_000 }).toBe(ROTATION_IDS[1]);
    expect((await rotEra(page)).lap).toBe(2);
    const b = await rotation(page);
    expect(b).toBeTruthy();
    const yarnBefore = (await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.inventory())).find((i) => i.id === 'yarn-ball')?.count ?? 0;
    const lap1Roll = CREATURE_SPECS.kitty.dropChance * 0.8;
    await page.evaluate((roll) => (window as unknown as { __chicken: RotationBridge }).__chicken.setDropRoll(roll), lap1Roll);
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.forceCreature('kitty'));
    await waitCreaturePhase(page, ['enter', 'stalk', 'pounce', 'hold'], 20_000);
    expect((await rotCreature(page)).speed).toBeCloseTo(1 + CREATURE_SPEED_PER_LAP, 5);
    await expect.poll(async () => (await rotCreature(page)).dropped, { timeout: KITTY_HOLD_MS[1] + 20_000 }).toBe(true);
    await expect.poll(async () => (await rotCreature(page)).phase, { timeout: 20_000 }).toBe('done');
    expect((await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.inventory())).find((i) => i.id === 'yarn-ball')?.count ?? 0).toBe(yarnBefore);
    await page.evaluate((roll) => (window as unknown as { __chicken: RotationBridge }).__chicken.setDropRoll(roll), CREATURE_SPECS.kitty.dropChance * ROTATION_DROP_SCALE * 0.5);
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.forceCreature('kitty'));
    await expect.poll(async () => (await rotCreature(page)).dropped, { timeout: KITTY_HOLD_MS[1] + 30_000 }).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.inventory())).find((i) => i.id === 'yarn-ball')?.count ?? 0, { timeout: 10_000 }).toBe(yarnBefore + 1);
    await gotoGame(page, '?variant=2');
    await enterEra(page, 'myth-1');
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.forceCreature('kitty'));
    await waitCreaturePhase(page, ['enter', 'stalk', 'pounce', 'hold'], 20_000);
    expect((await rotCreature(page)).speed).toBe(1);
  });

  test('the Mystery ??? orb turns into a valid effect that never repeats the previous one and shows a reveal', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=mystery');
    const orb = page.locator('[data-testid="chicken-orb"][data-kind="mystery"]');
    await expect(orb).toBeVisible({ timeout: 15_000 });
    await expect(orb).toHaveAttribute('aria-label', 'Mystery ???');
    await expect(orb).toContainText('???');
    const seen: string[] = [];
    for (let i = 0; i < MYSTERY_DRAWS; i++) {
      if (i > 0) await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.forceOrb('mystery'));
      await expect(orb).toBeVisible();
      await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.collectOrb('mystery'));
      const last = (await rotState(page)).mysteryLast;
      expect(last).not.toBeNull();
      expect(MYSTERY_KINDS).toContain(last);
      if (seen.length > 0) expect(last).not.toBe(seen[seen.length - 1]);
      seen.push(last as string);
      if (i === 0) {
        const reveal = page.getByTestId('mystery-reveal');
        await expect(reveal).toBeVisible();
        await expect(reveal).toHaveAttribute('data-kind', last as string);
        await expect(reveal).toContainText('???');
      }
    }
    expect(new Set(seen).size).toBeGreaterThan(1);
  });

  test('the first Mystery ??? orb drops the Key to the City into the bag once, and the article bag shows it', async ({ page }) => {
    await gotoGame(page, '?variant=2&start=mystery');
    const orb = page.locator('[data-testid="chicken-orb"][data-kind="mystery"]');
    await expect(orb).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.collectOrb('mystery'));
    await expect(page.locator('[data-testid="fly-to-bag"][data-item-id="key-to-the-city"]')).toBeAttached();
    await page.getByTestId('inventory-bag').click();
    await expect(page.getByTestId('inventory-item-key-to-the-city')).toContainText('Key to the City');
    await expect(page.getByTestId('inventory-count-key-to-the-city')).toHaveText('x1');
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.forceOrb('mystery'));
    await expect(orb).toBeVisible();
    await page.evaluate(() => (window as unknown as { __chicken: RotationBridge }).__chicken.collectOrb('mystery'));
    await expect(page.locator('[data-testid="fly-to-bag"][data-item-id="key-to-the-city"]')).toHaveCount(0);
    await expect(page.getByTestId('inventory-count-key-to-the-city')).toHaveText('x1');
    await page.goto('/garden/article/seeking-community');
    await page.getByTestId('inventory-bag').click();
    await expect(page.getByText('Key to the City')).toBeVisible();
  });

  test('the sword sits in the trunk: a 56 px+ target over the tree, the blade clipped into the bark and sliding out as it is pulled', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoGame(page, '?variant=2&start=sword');
    await waitCreaturePhase(page, ['hold'], 60_000);
    const hit = page.getByTestId('creature-target-sword');
    await expect(hit).toBeVisible();
    const sword = page.getByTestId('tree-sword');
    await expect(sword).toBeVisible();
    await expect(page.getByTestId('tree-sword-slit')).toBeVisible();
    const box = await hit.boundingBox();
    const tree = await page.getByTestId('creature-img').boundingBox();
    if (!box || !tree) throw new Error('sword or tree missing');
    expect(box.width).toBeGreaterThanOrEqual(SWORD_MIN_HIT_PX);
    expect(box.height).toBeGreaterThanOrEqual(SWORD_MIN_HIT_PX);
    const relX = (box.x + box.width / 2 - tree.x) / tree.width;
    const relY = (box.y + box.height / 2 - tree.y) / tree.height;
    expect(relX).toBeGreaterThanOrEqual(SWORD_TRUNK_X[0]);
    expect(relX).toBeLessThanOrEqual(SWORD_TRUNK_X[1]);
    expect(relY).toBeGreaterThanOrEqual(SWORD_TRUNK_Y[0]);
    expect(relY).toBeLessThanOrEqual(SWORD_TRUNK_Y[1]);
    const clip0 = clipBottomPct(await sword.evaluate((el) => el.style.clipPath));
    expect(clip0).toBeGreaterThan(0);
    const y0 = (await sword.boundingBox())?.y ?? 0;
    for (let i = 0; i < SWORD_PROBE_PULLS; i++) await hit.click({ force: true });
    await expect.poll(async () => (await rotCreature(page)).swordPulls).toBe(SWORD_PROBE_PULLS);
    const clip1 = clipBottomPct(await sword.evaluate((el) => el.style.clipPath));
    expect(clip1).toBeLessThan(clip0);
    expect(((await sword.boundingBox())?.y ?? 0) < y0).toBe(true);
  });
});
