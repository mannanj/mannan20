import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import sharp from 'sharp';
import { SKIN_RANK, TIMING, buildQuestions, decide, questionKeys } from './strategy.mjs';

const API = 'https://api.typesafe.ai/v1/systemone';
const MODEL = process.env.JEV_MODEL ?? 'jev-latest';
const KEY = process.env.TYPESAFE_API_KEY;
const URL_ = process.env.GAME_URL ?? 'https://mannan.is/game?variant=2';
const MINUTES = Number(process.env.PLAY_MINUTES ?? 10);
const OUT_DIR = process.env.OUT_DIR ?? path.join(os.homedir(), 'Desktop');
const SUBMIT = process.env.SUBMIT_SCORE !== '0';
const AGENT_NAME = 'My Name Jev';
const OWNER_COOKIE = 'chicken-owner';
const OWNER_KEYCHAIN = 'chicken-game-jev-owner';
const BOARD_OPEN_MIN = 0.6;
const FORCE_BOARD_EVERY_S = Number(process.env.FORCE_BOARD_EVERY_S ?? 0);
const TOGGLE_ZONE = { halfW: 90, h: 44 };
const VIEW = { width: 1280, height: 800 };
const IN_FLIGHT = Number(process.env.IN_FLIGHT ?? 2);
const SHOT_WIDTH = Number(process.env.JEV_W ?? 960);
const SHOT_QUALITY = Number(process.env.JEV_Q ?? 50);
const MAX_TOKENS = Number(process.env.MAX_TOKENS ?? 25_000_000);
const STUCK_SECONDS = Number(process.env.STUCK_SECONDS ?? 30);
const GRIP_STUCK_FACTOR = 3;
const STUCK_POLL_MS = 500;
const HIT_WINDOW = 40;
const BAG_SETTLE_MS = 250;
const PRICE_PER_MTOK = 0.042;
const DEBUG = process.env.JEV_DEBUG === '1';
const GRIP_ACTIVE_MS = 10000;
const GRIP_RESET_MS = 5000;
const BAG_EXPECT_MS = 6000;
const EGG_RESET_MS = 40000;
const LEAD_MAX_GAP_MS = 2500;
const LEAD_MAX_SPEED = 600;
const VELOCITY_WINDOW_MS = 1500;
const MAX_LEAD_PX = 220;
const PARK = { x: 6, y: VIEW.height - 6 };
const PICKUP_BAG_DELAY_MS = 2000;
const ERROR_BACKOFF_MS = 1000;
const STOP_TAIL_MS = 1500;
const START_SETTLE_MS = 600;
const STOP_POLL_MS = 200;
const AUDIO_TIMESLICE_MS = 1000;

const AUDIO_TAP = `(() => {
  const taps = new WeakMap();
  window.__jevAudio = { recs: [] };
  const original = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const result = original.call(this, target, ...rest);
    if (target instanceof AudioDestinationNode) {
      const ctx = target.context;
      let tap = taps.get(ctx);
      if (!tap) {
        tap = ctx.createMediaStreamDestination();
        taps.set(ctx, tap);
        const entry = { chunks: [], startedAt: Date.now(), rec: new MediaRecorder(tap.stream, { mimeType: 'audio/webm;codecs=opus' }) };
        entry.rec.ondataavailable = (e) => e.data.size && entry.chunks.push(e.data);
        entry.rec.start(${AUDIO_TIMESLICE_MS});
        window.__jevAudio.recs.push(entry);
      }
      original.call(this, tap);
    }
    return result;
  };
})();`;

async function collectAudio(page) {
  return page.evaluate(async () => {
    const recs = window.__jevAudio?.recs ?? [];
    await Promise.all(
      recs.map(
        (e) =>
          new Promise((r) => {
            if (e.rec.state === 'inactive') return r();
            e.rec.onstop = r;
            e.rec.stop();
          })
      )
    );
    const size = (e) => e.chunks.reduce((s, c) => s + c.size, 0);
    const best = recs.filter((e) => size(e) > 0).sort((a, b) => size(b) - size(a))[0];
    if (!best) return null;
    const buf = new Uint8Array(await new Blob(best.chunks, { type: 'audio/webm' }).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(bin), startedAt: best.startedAt, contexts: recs.length };
  });
}

if (!KEY) {
  console.error('TYPESAFE_API_KEY is not set');
  process.exit(1);
}

const usage = { input: 0, requests: 0 };

async function shrink(jpeg) {
  return SHOT_WIDTH >= VIEW.width ? jpeg : sharp(jpeg).resize({ width: SHOT_WIDTH }).jpeg({ quality: SHOT_QUALITY }).toBuffer();
}

async function ask(jpeg, questions) {
  const ref = `screen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const form = new FormData();
  form.append(
    'request',
    new Blob(
      [JSON.stringify({ model: MODEL, state: { screen: ref }, assets: { [ref]: { type: 'image', part: 'shot' } }, questions })],
      { type: 'application/json' }
    )
  );
  form.append('shot', new Blob([jpeg], { type: 'image/jpeg' }), 'shot.jpg');
  const res = await fetch(API, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'TypeSafe-Danger-Zone-Images': 'true' },
    body: form,
  });
  if (!res.ok) throw new Error(`jev ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  usage.input += json.usage?.input_tokens ?? 0;
  usage.requests++;
  return json;
}

async function overlay(page) {
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'jev-box';
    box.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;border:2px solid #39ff88;border-radius:6px;box-shadow:0 0 12px rgba(57,255,136,.6);display:none';
    const tag = document.createElement('div');
    tag.style.cssText =
      'position:absolute;left:-2px;top:-20px;font:600 11px ui-monospace,monospace;color:#04150b;background:#39ff88;padding:1px 5px;border-radius:4px;white-space:nowrap';
    box.appendChild(tag);
    const aim = document.createElement('div');
    aim.id = 'jev-aim';
    aim.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid #ff4fd8;border-radius:50%;display:none';
    const hud = document.createElement('div');
    hud.id = 'jev-hud';
    hud.style.cssText =
      'position:fixed;z-index:99999;left:12px;top:12px;pointer-events:none;font:600 12px/1.45 ui-monospace,monospace;color:#d8ffe8;background:rgba(0,0,0,.55);padding:8px 10px;border-radius:8px;border:1px solid rgba(57,255,136,.35);white-space:pre';
    document.body.append(box, aim, hud);
  });
}

async function draw(page, d) {
  await page.evaluate((d) => {
    const box = document.getElementById('jev-box');
    const aim = document.getElementById('jev-aim');
    const hud = document.getElementById('jev-hud');
    if (!box || !aim || !hud) return;
    if (d.box) {
      Object.assign(box.style, { display: 'block', left: `${d.box.x}px`, top: `${d.box.y}px`, width: `${d.box.w}px`, height: `${d.box.h}px` });
      box.firstChild.textContent = `jev: chicken ${d.box.conf.toFixed(2)}${d.box.refined ? ' (crop)' : ''}`;
    } else box.style.display = 'none';
    if (d.aim) Object.assign(aim.style, { display: 'block', left: `${d.aim.x}px`, top: `${d.aim.y}px` });
    hud.textContent = d.hud;
  }, d);
}

function readOwner() {
  try {
    return execFileSync('security', ['find-generic-password', '-a', os.userInfo().username, '-s', OWNER_KEYCHAIN, '-w'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

function saveOwner(value) {
  execFileSync('security', ['add-generic-password', '-U', '-a', os.userInfo().username, '-s', OWNER_KEYCHAIN, '-w', value]);
}

function boxPx(edges, origin, scaleW, scaleH) {
  return {
    x: origin.x + edges.left * scaleW,
    y: origin.y + edges.top * scaleH,
    w: (edges.right - edges.left) * scaleW,
    h: (edges.bottom - edges.top) * scaleH,
  };
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.width);
  const y2 = Math.min(a.y + a.h, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.width * b.height - inter || 1);
}

export async function play(opts = {}) {
  const url = opts.url ?? URL_;
  const minutes = opts.seconds ? opts.seconds / 60 : MINUTES;
  const submit = opts.submit ?? SUBMIT;
  const outDir = opts.outDir ?? OUT_DIR;
  const label = opts.label ?? 'jev-plays-chicken';
  const forceBoardEvery = opts.forceBoardEverySeconds ?? FORCE_BOARD_EVERY_S;
  const tailMs = opts.tailMs ?? STOP_TAIL_MS;
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const videoDir = path.join(os.tmpdir(), `jev-video-${stamp}`);
  mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: VIEW, recordVideo: { dir: videoDir, size: VIEW } });
  await context.addInitScript(AUDIO_TAP);
  const videoStartedAt = Date.now();
  const page = await context.newPage();
  const savedOwner = readOwner();
  if (savedOwner) {
    await context.addCookies([{ name: OWNER_COOKIE, value: savedOwner, url: new URL(url).origin }]);
  }
  await page.goto(url);
  await page.waitForFunction(() => window.__chicken !== undefined, null, { timeout: 90_000 });
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 }).catch(() => {});
  await overlay(page);
  if (opts.setup) await opts.setup(page);
  await page.mouse.move(PARK.x, PARK.y);

  const track = [];
  const stats = {
    requests: 0, errors: 0, clicks: 0, latency: [], ious: [], stagesSeen: new Set(), scene: '',
    debug: [], rules: {}, birdPhases: [], skinUpgrades: [], itemsUsed: [], bestSkinRank: 1, lastRule: '', boardForced: 0, boardSeen: 0, boardClosed: 0, boardMisses: 0, boardOpenedAt: 0, boardCloseMs: [],
  };
  const forceTimer = forceBoardEvery > 0
    ? setInterval(async () => {
        stats.boardForced++;
        stats.boardOpenedAt = Date.now();
        await page.evaluate(() => window.__chicken.openSheet?.()).catch(() => {});
      }, forceBoardEvery * 1000)
    : null;
  await page.waitForTimeout(START_SETTLE_MS);
  const startScore = (await page.evaluate(() => window.__chicken.state().score)) ?? 0;
  const start = Date.now();
  const usageStart = usage.input;
  const deadline = start + minutes * 60_000;
  let stopReason = 'time';
  let lastBox = null;
  let inFlight = 0;
  let stopping = false;

  const state = () => page.evaluate(() => window.__chicken.state());
  const truthRect = () =>
    page.evaluate(() => {
      const r = document.querySelector('[data-testid="chicken"]')?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ctx = {
    now: 0, wornRank: 1, bagReadyAt: 0, bagMisses: 0, stuckMs: 0, hitRate: 1, gripStage: 0, score: startScore, scene: '', martianClicks: 0,
    askedAt: { scene: 0, board: 0, badge: 0 }, orbSeenAt: -Infinity, lastGripAt: -Infinity, pickupAt: -Infinity, bagOpenExpected: false, bagOpenedAt: 0,
    gateStage: false, gripping: false, gripEpisodes: 0, pendingUse: null, firstEggAt: null, jupiterSeenAt: -Infinity, chickenMissing: false,
  };
  let gripFrames = 0;
  let gripFlat = 0;
  let gripTotal = -1;
  let lastRise = Date.now();
  let lastScore = startScore;
  let lastPhase = '';
  const stuckLimitMs = (opts.stuckSeconds ?? STUCK_SECONDS) * 1000;

  const poll = setInterval(async () => {
    const s = await state().catch(() => null);
    if (!s) return;
    if (s.score > lastScore) {
      lastScore = s.score;
      lastRise = Date.now();
    }
    const phase = s.bird?.phase ?? '';
    if (phase !== lastPhase) {
      stats.birdPhases.push({ t: +((Date.now() - start) / 1000).toFixed(1), kind: s.bird?.kind ?? null, phase });
      lastPhase = phase;
    }
    const worn = SKIN_RANK[s.skin] ?? 1;
    if (worn > stats.bestSkinRank) {
      stats.skinUpgrades.push({ t: +((Date.now() - start) / 1000).toFixed(1), skin: s.skin, mult: worn });
      stats.bestSkinRank = worn;
    }
    ctx.score = s.score;
    ctx.gateStage = (s.stage === 'rocket' || s.stage === 'moon') && s.stagePhase !== 'live';
    if (s.stage === 'jupiter' || ctx.scene === 'jupiter') ctx.martianClicks = await page.evaluate(() => window.__chicken.martianClicks?.() ?? 0).catch(() => 0);
    const gripActive = Date.now() - ctx.lastGripAt < GRIP_ACTIVE_MS;
    const limit = stuckLimitMs * (gripActive ? GRIP_STUCK_FACTOR : 1);
    if (usage.input - usageStart > MAX_TOKENS && !stopping) {
      stopReason = 'tokens';
      stopping = true;
    }
    if (Date.now() - lastRise > limit && !stopping) {
      stopReason = 'stuck';
      stopping = true;
    }
  }, STUCK_POLL_MS);

  const clickAt = async (x, y) => {
    await page.mouse.click(x, y);
    stats.clicks++;
  };

  async function frame() {
    const capturedAt = Date.now();
    const [jpeg, truth] = await Promise.all([page.screenshot({ type: 'jpeg', quality: SHOT_QUALITY }), truthRect()]);
    const t0 = Date.now();
    ctx.now = Date.now();
    ctx.pickupAt = Math.max(ctx.pickupAt, globalThis.__jevPickupAt ?? -Infinity);
    const keys = questionKeys(ctx);
    for (const [group, probe] of [['scene', 'scene'], ['board', 'board_open'], ['badge', 'badge']]) if (keys.includes(probe)) ctx.askedAt[group] = ctx.now;
    const out = await ask(await shrink(jpeg), buildQuestions(keys));
    stats.requests++;
    stats.scene = out.answers.scene?.choice ?? stats.scene;
    ctx.scene = stats.scene;
    if (ctx.scene === 'jupiter') ctx.jupiterSeenAt = Date.now();
    ctx.now = Date.now();
    ctx.stuckMs = ctx.now - lastRise;
    ctx.hitRate = stats.clicks > 20 ? (lastScore - startScore) / stats.clicks : 1;
    if (ctx.bagOpenExpected && ctx.now - ctx.bagOpenedAt > BAG_EXPECT_MS) {
      ctx.bagOpenExpected = false;
      ctx.bagReadyAt = ctx.now + TIMING.bagCooldownMs[Math.min(ctx.bagMisses, TIMING.bagCooldownMs.length - 1)];
      ctx.bagMisses++;
    }
    const plan = decide(out.answers, ctx, VIEW);
    if (DEBUG) {
      const at = +((Date.now() - start) / 1000).toFixed(1);
      const n = (k) => (out.answers[k]?.noul ?? out.answers[k]?.confidence ?? null);
      stats.debug.push({ t: at, rule: plan.rule, source: plan.target?.source, x: Math.round(plan.target?.x ?? 0), y: Math.round(plan.target?.y ?? 0), side: out.answers.claw_side?.choice, bird: n('bird_fly'), birdBox: out.answers.bird_box?.confidence, feather: n('feather'), badge: n('badge'), bagOpen: n('bag_open'), rc: await page.evaluate(() => window.__chicken.state().bird?.recoveryClicks), bx: Math.round(plan.target?.w ?? 0), bh: Math.round(plan.target?.h ?? 0), scene: ctx.scene, mc: ctx.martianClicks, mart: n('martian'), hit: Math.round(ctx.hitRate * 100) / 100, panel: await page.evaluate(() => Boolean(document.querySelector('[data-testid="inventory-panel"]'))), items: await page.evaluate(() => window.__chicken.inventory?.().map((i) => i.id).join(',')), keys: keys.length });
    }
    stats.rules[plan.rule] = (stats.rules[plan.rule] ?? 0) + 1;
    stats.latency.push(Date.now() - t0);
    stats.lastRule = plan.rule;
    if (ctx.pendingUse && (out.answers.bag_open?.noul ?? 0) >= 0.6 && (out.answers[`has_${ctx.pendingUse}`]?.noul ?? 1) < 0.6) {
      ctx.wornRank = Math.max(ctx.wornRank, SKIN_RANK[ctx.pendingUse]);
      ctx.pendingUse = null;
    }
    ctx.chickenMissing = Boolean(plan.chickenMissing);
    if (gripFrames >= TIMING.gripEpisodeMinFrames && ctx.now - ctx.lastGripAt > TIMING.gripLostMs) {
      ctx.gripEpisodes++;
      gripFrames = 0;
    }
    ctx.gripping = gripFrames > 0 && ctx.now - ctx.lastGripAt < TIMING.gripLostMs;
    if (plan.orb) ctx.orbSeenAt = ctx.now;
    if (plan.rule !== 'egg' && ctx.firstEggAt !== null && ctx.now - ctx.firstEggAt > EGG_RESET_MS) ctx.firstEggAt = null;
    if (plan.grip) {
      if (ctx.now - ctx.lastGripAt > GRIP_RESET_MS) {
        ctx.gripStage = 0;
        gripFlat = 0;
        gripTotal = -1;
      }
      ctx.lastGripAt = ctx.now;
      gripFrames++;
    }
    if (plan.kind === 'wait') {
      await draw(page, { box: null, aim: null, hud: hudText(plan) });
      await sleep(plan.restMs);
      return;
    }
    if (plan.kind === 'close-board') return closeBoard(plan.target);
    const t = plan.target;
    const box = { x: t.left, y: t.top, w: t.w, h: t.h, conf: t.conf ?? 1 };
    if (plan.kind === 'chicken') {
      if (truth) stats.ious.push(iou(box, truth));
      track.push({ t: capturedAt, x: t.x, y: t.y });
      while (track.length && capturedAt - track[0].t > VELOCITY_WINDOW_MS) track.shift();
      await strike(box, capturedAt);
      return;
    }
    const v = leadVelocity(plan.rule, capturedAt, t);
    const clicks = plan.clicks ?? 1;
    for (let i = 0; i < clicks; i++) {
      const lag = Date.now() - capturedAt;
      await clickAt(clampTo(t.x + v.vx * lag, VIEW.width), clampTo(t.y + v.vy * lag, VIEW.height));
      if (i < clicks - 1) await sleep(plan.gapMs ?? TIMING.clickGapMs);
    }
    await page.mouse.move(PARK.x, PARK.y);
    if (plan.grip) await checkGripProgress();
    afterAction(plan);
    await draw(page, { box, aim: { x: t.x, y: t.y }, hud: hudText(plan) });
    if (plan.kind === 'open-bag' || plan.kind === 'use' || plan.kind === 'close-bag') await sleep(BAG_SETTLE_MS);
  }

  const lastTarget = new Map();
  const clampTo = (v, max) => Math.min(max - 2, Math.max(2, v));

  function leadVelocity(rule, at, t) {
    const prev = lastTarget.get(rule);
    lastTarget.set(rule, { at, x: t.x, y: t.y });
    if (!prev) return { vx: 0, vy: 0 };
    const dt = at - prev.at;
    if (dt <= 0 || dt > LEAD_MAX_GAP_MS) return { vx: 0, vy: 0 };
    const vx = (t.x - prev.x) / dt;
    const vy = (t.y - prev.y) / dt;
    return Math.hypot(vx, vy) * 1000 > LEAD_MAX_SPEED ? { vx: 0, vy: 0 } : { vx, vy };
  }

  async function checkGripProgress() {
    const s = await state();
    const total = (s.bird?.leftClicks ?? 0) + (s.bird?.rightClicks ?? 0);
    gripFlat = total === gripTotal ? gripFlat + 1 : 0;
    gripTotal = total;
    if (gripFlat >= TIMING.gripFlatBursts) {
      ctx.gripStage++;
      gripFlat = 0;
    }
  }

  function afterAction(plan) {
    const now = Date.now();
    if (plan.kind === 'open-bag') {
      ctx.bagOpenExpected = true;
      ctx.bagOpenedAt = now;
    }
    if (plan.pickup) {
      ctx.pickupAt = now;
      ctx.bagMisses = 0;
      ctx.bagReadyAt = now + PICKUP_BAG_DELAY_MS;
    }
    if (plan.kind === 'use') {
      ctx.pendingUse = plan.item;
      ctx.bagMisses = 0;
      stats.itemsUsed.push({ t: +((now - start) / 1000).toFixed(1), item: plan.item });
    }
    if (plan.kind === 'close-bag') {
      ctx.bagOpenExpected = false;
      ctx.bagReadyAt = now + TIMING.bagCooldownMs[Math.min(ctx.bagMisses, TIMING.bagCooldownMs.length - 1)];
      ctx.bagMisses++;
    }
  }

  function hudText(plan) {
    return [
      `JEV  (${MODEL})   rule: ${plan.rule}`,
      `score ${lastScore}   clicks ${stats.clicks}   worn x${ctx.wornRank}`,
      `${opts.title ? `clip: ${opts.title}   ` : ''}time ${((Date.now() - start) / 1000).toFixed(0)}s / ${Math.round(minutes * 60)}s`,
    ].join('\n');
  }

  async function closeBoard(toggle) {
    stats.boardSeen++;
    if (stats.boardMisses >= 2) {
      await page.keyboard.press('Escape');
    } else {
      await page.mouse.click(toggle.x, toggle.y);
      await page.mouse.move(PARK.x, PARK.y);
    }
    stats.boardMisses++;
    const open = await page.evaluate(() => document.getElementById('chicken-leaderboard-panel')?.getAttribute('aria-hidden') === 'false');
    if (!open) {
      stats.boardClosed++;
      if (stats.boardOpenedAt) stats.boardCloseMs.push(Date.now() - stats.boardOpenedAt);
      stats.boardOpenedAt = 0;
      stats.boardMisses = 0;
    }
    await draw(page, { box: null, aim: null, hud: `JEV: leaderboard is open, closing it first (${stats.boardClosed} closed)` });
  }

  function velocity() {
    if (track.length < 2) return { vx: 0, vy: 0 };
    const first = track[0];
    const last = track[track.length - 1];
    const dt = last.t - first.t;
    return dt > 0 ? { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt } : { vx: 0, vy: 0 };
  }

  async function strike(b, capturedAt) {
    const { vx, vy } = velocity();
    const slow = Math.hypot(vx, vy) * 1000 < TIMING.slowSpeedPxPerS;
    const n = slow ? TIMING.clicksSlow : TIMING.clicksMoving;
    const baseX = b.x + b.w / 2;
    const baseY = b.y + b.h * 0.55;
    let aim = { x: baseX, y: baseY };
    for (let i = 0; i < n; i++) {
      const lead = Date.now() - capturedAt;
      const lx = Math.max(-MAX_LEAD_PX, Math.min(MAX_LEAD_PX, vx * lead));
      const ly = Math.max(-MAX_LEAD_PX, Math.min(MAX_LEAD_PX, vy * lead));
      aim = { x: Math.min(VIEW.width - 2, Math.max(2, baseX + lx)), y: Math.min(VIEW.height - 2, Math.max(2, baseY + ly)) };
      if (Math.abs(aim.x - VIEW.width / 2) < TOGGLE_ZONE.halfW && aim.y > VIEW.height - TOGGLE_ZONE.h) aim.y = VIEW.height - TOGGLE_ZONE.h;
      await clickAt(aim.x, aim.y);
      if (i < n - 1) await sleep(TIMING.clickGapMs);
    }
    await page.mouse.move(PARK.x, PARK.y);
    const s = await state();
    if (s.stage) stats.stagesSeen.add(s.stage);
    const mean = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0);
    await draw(page, {
      box: b,
      aim,
      hud: [
        `JEV plays the chicken game  (${MODEL})`,
        `score ${s.score}   stage ${s.stage ?? 'classic'}   tier ${s.tier}   x${ctx.wornRank}`,
        `clicks ${stats.clicks}   hit rate ${(((s.score - startScore) / Math.max(1, stats.clicks)) * 100).toFixed(0)}%`,
        `jev latency ${mean(stats.latency.slice(-20)).toFixed(0)} ms   box IoU ${mean(stats.ious.slice(-20)).toFixed(2)}`,
        `jev sees: ${stats.scene || '...'}`,
        `${opts.title ? `clip: ${opts.title}   ` : ''}time ${((Date.now() - start) / 1000).toFixed(0)}s / ${Math.round(minutes * 60)}s`,
      ].join('\n'),
    });
    if (slow) await sleep(TIMING.slowRestMs);
  }

  const stopTimer = opts.stopWhen
    ? setInterval(async () => {
        if (stopping) return;
        const s = await state().catch(() => null);
        if (s && opts.stopWhen(s, stats)) {
          stopReason = 'condition';
          clearInterval(stopTimer);
          setTimeout(() => {
            stopping = true;
          }, tailMs);
        }
      }, STOP_POLL_MS)
    : null;
  await new Promise((resolve) => {
    const pump = () => {
      if (Date.now() > deadline) stopping = true;
      if (stopping) {
        if (inFlight === 0) resolve();
        return;
      }
      while (inFlight < (ctx.gripping || ctx.bagOpenExpected ? 1 : IN_FLIGHT)) {
        inFlight++;
        frame()
          .catch((e) => {
            stats.errors++;
            if (stats.errors % 10 === 1) console.error(String(e).slice(0, 200));
            return new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS));
          })
          .finally(() => {
            inFlight--;
            setTimeout(pump, 0);
          });
      }
    };
    pump();
  });

  if (forceTimer) clearInterval(forceTimer);
  if (stopTimer) clearInterval(stopTimer);
  clearInterval(poll);
  const final = await state();
  let submitted = null;
  if (submit && final.score >= 1) {
    submitted = await page.evaluate(
      async ({ name, score }) => {
        const r = await fetch('/api/game/leaderboard', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, score, kind: 'agent' }),
        });
        const j = await r.json().catch(() => ({}));
        return { status: r.status, you: j.you ?? null, error: j.error ?? null };
      },
      { name: AGENT_NAME, score: final.score }
    );
  }
  const owner = (await context.cookies()).find((c) => c.name === OWNER_COOKIE)?.value;
  if (owner && owner !== savedOwner && submitted?.status === 200) saveOwner(owner);
  await page.waitForTimeout(1500);
  const audio = await collectAudio(page).catch(() => null);
  const audioPath = path.join(videoDir, 'audio.webm');
  if (audio) writeFileSync(audioPath, Buffer.from(audio.b64, 'base64'));
  await context.close();
  await browser.close();

  const webm = readdirSync(videoDir).find((f) => f.endsWith('.webm') && f !== 'audio.webm');
  const mp4 = path.join(outDir, `${label}-${stamp}.mp4`);
  if (webm) {
    const video = ['-i', path.join(videoDir, webm)];
    const sound = audio ? ['-itsoffset', String(Math.max(0, (audio.startedAt - videoStartedAt) / 1000)), '-i', audioPath] : [];
    const mux = audio ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k'] : [];
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...video, ...sound, ...mux, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', mp4]);
  }
  const mean = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0);
  const spent = usage.input - usageStart;
  const elapsedMin = Math.max(1e-6, (Date.now() - start) / 60_000);
  const report = {
    inputTokens: spent,
    costUsd: +((spent * PRICE_PER_MTOK) / 1e6).toFixed(4),
    tokensPerMin: Math.round(spent / elapsedMin),
    usdPerMin: +((spent * PRICE_PER_MTOK) / 1e6 / elapsedMin).toFixed(4),
    scorePerMin: +((final.score - startScore) / elapsedMin).toFixed(1),
    scorePerUsd: spent ? Math.round((final.score - startScore) / ((spent * PRICE_PER_MTOK) / 1e6)) : 0,
    settings: { width: SHOT_WIDTH, quality: SHOT_QUALITY, inFlight: IN_FLIGHT },
    rules: stats.rules,
    ...(DEBUG ? { debug: stats.debug } : {}),
    birdPhases: stats.birdPhases,
    skinUpgrades: stats.skinUpgrades,
    itemsUsed: stats.itemsUsed,
    url,
    stopReason,
    finalState: { skin: final.skin, mult: final.mult, clones: final.clones, cursors: final.cursors, stage: final.stage ?? null, stagePhase: final.stagePhase ?? null, bird: { kind: final.bird?.kind ?? null, phase: final.bird?.phase ?? null } },
    model: MODEL,
    seconds: Math.round((Date.now() - start) / 1000),
    score: final.score,
    stage: final.stage ?? null,
    stagesSeen: [...stats.stagesSeen],
    clicks: stats.clicks,
    startScore,
    hitRate: +((final.score - startScore) / Math.max(1, stats.clicks)).toFixed(3),
    requests: stats.requests,
    errors: stats.errors,
    meanLatencyMs: Math.round(mean(stats.latency)),
    meanBoxIoU: +mean(stats.ious).toFixed(3),
    submitted,
    video: webm ? mp4 : null,
    audio: Boolean(audio),
    leaderboard: {
      forcedOpen: stats.boardForced,
      seenOpenFrames: stats.boardSeen,
      closed: stats.boardClosed,
      meanCloseMs: Math.round(mean(stats.boardCloseMs)),
    },
  };
  writeFileSync(mp4.replace(/\.mp4$/, '.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  play().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
