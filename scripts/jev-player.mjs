import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const API = 'https://api.typesafe.ai/v1/systemone';
const MODEL = process.env.JEV_MODEL ?? 'jev-latest';
const KEY = process.env.TYPESAFE_API_KEY;
const URL_ = process.env.GAME_URL ?? 'https://mannan.is/game?variant=2';
const MINUTES = Number(process.env.PLAY_MINUTES ?? 10);
const OUT_DIR = process.env.OUT_DIR ?? path.join(os.homedir(), 'Desktop');
const SUBMIT = process.env.SUBMIT_SCORE !== '0';
const AGENT_NAME = 'jev';
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

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const videoDir = path.join(os.tmpdir(), `jev-video-${stamp}`);
  mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEW, recordVideo: { dir: videoDir, size: VIEW } });
  const page = await context.newPage();
  await page.goto(URL_);
  await page.waitForFunction(() => window.__chicken !== undefined, null, { timeout: 90_000 });
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 }).catch(() => {});
  await overlay(page);
  await page.mouse.move(PARK.x, PARK.y);

  const track = [];
  const stats = { requests: 0, errors: 0, clicks: 0, latency: [], ious: [], stagesSeen: new Set(), scene: '' };
  const start = Date.now();
  const deadline = start + MINUTES * 60_000;
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
        `clicks ${stats.clicks}   hit rate ${((s.score / Math.max(1, stats.clicks)) * 100).toFixed(0)}%`,
        `jev latency ${mean(stats.latency.slice(-20)).toFixed(0)} ms   box IoU ${mean(stats.ious.slice(-20)).toFixed(2)}`,
        `jev sees: ${stats.scene || '...'}`,
        `time ${((Date.now() - start) / 1000).toFixed(0)}s / ${MINUTES * 60}s`,
      ].join('\n'),
    });
  }

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

  const final = await state();
  let submitted = null;
  if (SUBMIT && final.score >= 1) {
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
  await page.waitForTimeout(1500);
  await context.close();
  await browser.close();

  const webm = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
  const mp4 = path.join(OUT_DIR, `jev-plays-chicken-${stamp}.mp4`);
  if (webm) {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(videoDir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', mp4]);
  }
  const mean = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0);
  const report = {
    url: URL_,
    model: MODEL,
    minutes: MINUTES,
    score: final.score,
    stage: final.stage ?? null,
    stagesSeen: [...stats.stagesSeen],
    clicks: stats.clicks,
    hitRate: +(final.score / Math.max(1, stats.clicks)).toFixed(3),
    requests: stats.requests,
    errors: stats.errors,
    meanLatencyMs: Math.round(mean(stats.latency)),
    meanBoxIoU: +mean(stats.ious).toFixed(3),
    submitted,
    video: webm ? mp4 : null,
  };
  writeFileSync(mp4.replace(/\.mp4$/, '.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
