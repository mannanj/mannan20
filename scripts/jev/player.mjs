import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

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
const IN_FLIGHT = 2;
const VISIBLE_MIN = 0.5;
const REFINE_BELOW = 0.45;
const CROP = 420;
const VELOCITY_WINDOW_MS = 1500;
const MAX_LEAD_PX = 220;
const PARK = { x: VIEW.width - 6, y: VIEW.height - 6 };
const SCENES = {
  landscape: 'a near-black background with faint hand-drawn line art of hills, mountains, trees or buildings',
  ocean: 'a dark blue sea with a bright white wavy water line across the screen and a sun',
  sky: 'a light, medium-blue daytime sky with soft white cloud bars and a dark mountain silhouette along the bottom',
  space: 'outer space with stars and the Earth below',
  moon: 'a grey moon surface under a black starry sky',
};
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
  return res.json();
}

const FRAME_QUESTIONS = {
  board_open: {
    type: 'noul',
    instructions:
      'Is a dark "Leaderboard" panel (with Humans and Agents tabs, a name field, or a list of scores) slid up and covering the lower part of `screen`?',
  },
  board_toggle: {
    type: 'box',
    instructions: 'the small "Leaderboard" text with a little caret arrow, centered near the very bottom edge of `screen`',
  },
  visible: {
    type: 'noul',
    instructions:
      'Is the cartoon rubber chicken visible anywhere in `screen`? It may be riding a surfboard, flying a red biplane, sitting inside a white rocket, or standing on the ground.',
  },
  chicken: {
    type: 'box',
    instructions:
      'the cartoon rubber chicken in `screen`, together with the surfboard, red biplane or white rocket it is riding if there is one. Not the big score number, not small baby chicks.',
  },
  scene: {
    type: 'choice',
    instructions: 'Which background scene is `screen` showing?',
    criteria: SCENES,
  },
};

const CROP_QUESTIONS = {
  chicken: {
    type: 'box',
    instructions: 'the cartoon rubber chicken, or the rocket, plane or surfboard carrying it, in `screen`',
  },
};

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
    boardForced: 0, boardSeen: 0, boardClosed: 0, boardMisses: 0, boardOpenedAt: 0, boardCloseMs: [],
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

  async function frame() {
    const capturedAt = Date.now();
    const [jpeg, truth] = await Promise.all([page.screenshot({ type: 'jpeg', quality: 70 }), truthRect()]);
    const t0 = Date.now();
    const out = await ask(jpeg, FRAME_QUESTIONS);
    stats.requests++;
    const a = out.answers;
    stats.scene = a.scene?.choice ?? stats.scene;
    if ((a.board_open?.noul ?? 0) >= BOARD_OPEN_MIN) {
      await closeBoard(a.board_toggle);
      stats.latency.push(Date.now() - t0);
      return;
    }
    stats.boardMisses = 0;
    if ((a.visible?.noul ?? 0) < VISIBLE_MIN) {
      stats.latency.push(Date.now() - t0);
      return;
    }
    let b = { ...boxPx(a.chicken.box, { x: 0, y: 0 }, VIEW.width, VIEW.height), conf: a.chicken.confidence, refined: false };
    if (b.conf < REFINE_BELOW) {
      const cx = Math.min(Math.max(b.x + b.w / 2 - CROP / 2, 0), VIEW.width - CROP);
      const cy = Math.min(Math.max(b.y + b.h / 2 - CROP / 2, 0), VIEW.height - CROP);
      const crop = await page.screenshot({ type: 'jpeg', quality: 80, clip: { x: cx, y: cy, width: CROP, height: CROP } });
      const r = await ask(crop, CROP_QUESTIONS);
      stats.requests++;
      if (r.answers.chicken.confidence > b.conf) {
        b = { ...boxPx(r.answers.chicken.box, { x: cx, y: cy }, CROP, CROP), conf: r.answers.chicken.confidence, refined: true };
      }
    }
    stats.latency.push(Date.now() - t0);
    if (truth) stats.ious.push(iou(b, truth));
    track.push({ t: capturedAt, x: b.x + b.w / 2, y: b.y + b.h / 2 });
    while (track.length && capturedAt - track[0].t > VELOCITY_WINDOW_MS) track.shift();
    lastBox = b;
    await strike(b, capturedAt);
  }

  async function closeBoard(toggle) {
    stats.boardSeen++;
    if (stats.boardMisses >= 2) {
      await page.keyboard.press('Escape');
    } else {
      const t = boxPx(toggle.box, { x: 0, y: 0 }, VIEW.width, VIEW.height);
      await page.mouse.click(t.x + t.w / 2, t.y + t.h / 2);
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

  async function strike(b, capturedAt) {
    const now = Date.now();
    let vx = 0;
    let vy = 0;
    if (track.length >= 2) {
      const first = track[0];
      const last = track[track.length - 1];
      const dt = last.t - first.t;
      if (dt > 0) {
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
      }
    }
    const lead = now - capturedAt;
    const lx = Math.max(-MAX_LEAD_PX, Math.min(MAX_LEAD_PX, vx * lead));
    const ly = Math.max(-MAX_LEAD_PX, Math.min(MAX_LEAD_PX, vy * lead));
    const aim = {
      x: Math.min(VIEW.width - 2, Math.max(2, b.x + b.w / 2 + lx)),
      y: Math.min(VIEW.height - 2, Math.max(2, b.y + b.h * 0.55 + ly)),
    };
    if (Math.abs(aim.x - VIEW.width / 2) < TOGGLE_ZONE.halfW && aim.y > VIEW.height - TOGGLE_ZONE.h) {
      aim.y = VIEW.height - TOGGLE_ZONE.h;
    }
    await page.mouse.click(aim.x, aim.y);
    await page.mouse.move(PARK.x, PARK.y);
    stats.clicks++;
    const s = await state();
    if (s.stage) stats.stagesSeen.add(s.stage);
    const mean = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0);
    await draw(page, {
      box: b,
      aim,
      hud: [
        `JEV plays the chicken game  (${MODEL})`,
        `score ${s.score}   stage ${s.stage ?? 'classic'}   tier ${s.tier}`,
        `clicks ${stats.clicks}   hit rate ${(((s.score - startScore) / Math.max(1, stats.clicks)) * 100).toFixed(0)}%`,
        `jev latency ${mean(stats.latency.slice(-20)).toFixed(0)} ms   box IoU ${mean(stats.ious.slice(-20)).toFixed(2)}`,
        `jev sees: ${stats.scene || '...'}`,
        `${opts.title ? `clip: ${opts.title}   ` : ''}time ${((Date.now() - start) / 1000).toFixed(0)}s / ${Math.round(minutes * 60)}s`,
      ].join('\n'),
    });
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
      while (inFlight < IN_FLIGHT) {
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

  const webm = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
  const mp4 = path.join(outDir, `${label}-${stamp}.mp4`);
  if (webm) {
    const video = ['-i', path.join(videoDir, webm)];
    const sound = audio ? ['-itsoffset', String(Math.max(0, (audio.startedAt - videoStartedAt) / 1000)), '-i', audioPath] : [];
    const mux = audio ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k'] : [];
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...video, ...sound, ...mux, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', mp4]);
  }
  const mean = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0);
  const report = {
    url,
    stopReason,
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
