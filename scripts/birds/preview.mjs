import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.resolve(HERE, '../../public');
const OUT = process.env.BIRDS_OUT || path.join(process.env.HOME, 'Desktop/chicken-birds-photoreal');
const GAME_URL = process.env.BIRDS_URL || 'http://localhost:3861/game?variant=2';
const VIEWPORT = { width: 1280, height: 800 };
const SAFE = { left: 330, right: 800, top: 460, bottom: 610 };
const WAIT_SAFE_MS = 45000;

const compose = JSON.parse(await readFile(path.join(HERE, 'compose.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(PUBLIC, 'game/birds/manifest.json'), 'utf8'));

async function dataUrl(file) {
  const buf = await readFile(path.join(PUBLIC, file));
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

async function birdAssets(bird) {
  const m = manifest[bird];
  const out = {};
  for (const name of Object.keys(m)) out[name] = { ...m[name], src: await dataUrl(m[name].file) };
  return out;
}

const OVERLAY_SCRIPT = `
(() => {
  const S = window.__birdPreview = window.__birdPreview || {};
  S.clear = () => { for (const el of document.querySelectorAll('[data-bird-layer]')) el.remove(); if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; };
  S.chickenRect = () => document.querySelector('[data-testid="chicken"]').getBoundingClientRect();
  S.hudRect = () => {
    const score = String(window.__chicken.state().score);
    const leaves = [...document.querySelectorAll('body *')].filter((e) => !e.hasAttribute('data-bird-layer') && e.children.length === 0 && e.getBoundingClientRect().width > 0);
    const picks = leaves.filter((e) => { const t = (e.textContent || '').trim(); return t === score || /squeeze the chicken/i.test(t); });
    const rs = picks.map((e) => e.getBoundingClientRect());
    if (!rs.length) return { left: 0, top: 0, right: 0, bottom: 0, text: 'score block not found' };
    return { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)), text: picks.map((e) => e.textContent.trim()).join(' | ') };
  };
  S.nudge = (cfg, assets, hud) => {
    const chicken = document.querySelector('[data-testid="chicken"]');
    chicken.style.left = '0px'; chicken.style.top = '0px';
    const r = S.chickenRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const bw = cfg.body.width, bh = bw * assets['grab-body'].height / assets['grab-body'].width;
    const an0 = assets['grab-body'].anchor || cfg.body.anchor; const sh = cfg.body.anchorShift || { x: 0, y: 0 }; const an = { x: an0.x + sh.x, y: an0.y + sh.y };
    const left = cx - an.x * bw, top = cy - an.y * bh, right = left + bw, bottom = top + bh;
    const M = 24;
    let dx = 0, dy = 0;
    const hitsHud = right > hud.left - M && left < hud.right + M && top < hud.bottom + M && bottom > hud.top - M;
    if (hitsHud) { const toRight = hud.right + M - left; const toLeft = right - (hud.left - M); dx = toRight <= toLeft ? toRight : -toLeft; }
    const vl = Math.min(left, r.left) + dx, vr = Math.max(right, r.right) + dx, vt = Math.min(top, r.top), vb = Math.max(bottom, r.bottom);
    if (vl < M) dx += M - vl;
    if (vr > innerWidth - M) dx -= vr - (innerWidth - M);
    if (vt < M) dy += M - vt;
    if (vb > innerHeight - M) dy -= vb - (innerHeight - M);
    chicken.style.left = dx + 'px'; chicken.style.top = dy + 'px';
    S.nudged = { dx: Math.round(dx), dy: Math.round(dy), intercept: { x: Math.round(cx), y: Math.round(cy) } };
  };
  S.mount = (cfg, assets, opts) => {
    S.clear();
    S.nudge(cfg, assets, opts.hud);
    const chicken = document.querySelector('[data-testid="chicken"]');
    const parent = chicken.parentElement;
    const cz = getComputedStyle(chicken).zIndex;
    const base = cz;
    const front = cz === 'auto' ? 'auto' : String(Number(cz) + 1);
    const mk = (name, z, before) => {
      const img = document.createElement('img');
      img.src = assets[name].src;
      img.setAttribute('data-bird-layer', name);
      Object.assign(img.style, { position: 'fixed', left: '0px', top: '0px', pointerEvents: 'none', zIndex: String(z), transformOrigin: '0 0', willChange: 'transform', margin: '0' });
      if (before) parent.insertBefore(img, chicken); else parent.insertBefore(img, chicken.nextSibling);
      return img;
    };
    const body = mk('grab-body', base, true);
    const left = mk('talon-left', base, true);
    const right = mk('talon-right', front, false);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-bird-layer', 'hint');
    Object.assign(svg.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '2147483000' });
    document.body.appendChild(svg);
    const banner = document.createElement('div');
    banner.setAttribute('data-bird-layer', 'banner');
    banner.textContent = 'help the chicken escape!';
    Object.assign(banner.style, { position: 'fixed', left: '50%', top: opts.bannerTop + 'px', transform: 'translateX(-50%)', font: '600 22px/1.2 Geist, system-ui, sans-serif', color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '8px 16px', borderRadius: '10px', zIndex: '2147483001', pointerEvents: 'none', letterSpacing: '0.01em' });
    document.body.appendChild(banner);
    const place = (img, a, w, x, y, rot) => {
      const h = w * a.height / a.width;
      img.style.width = w + 'px'; img.style.height = h + 'px';
      img.style.transform = 'translate(' + x + 'px,' + y + 'px)' + (rot ? ' rotate(' + rot + 'deg)' : '');
      return { x, y, w, h };
    };
    const hideDebris = () => {
      for (const el of document.querySelectorAll('[data-testid="chicken-stage"] div, [data-testid="chicken-stage"] svg, [data-testid="chicken-stage"] img, [data-testid="chicken-stage"] span')) {
        if (el === chicken || chicken.contains(el) || el.closest('[data-bird-layer]') || el.dataset.birdHidden || el.contains(chicken)) continue;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.width < 120 && b.height < 120 && !(el.textContent || '').trim()) { el.style.visibility = 'hidden'; el.dataset.birdHidden = '1'; }
      }
    };
    const tick = () => {
      hideDebris();
      const r = S.chickenRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const bw = cfg.body.width;
      const bh = bw * assets['grab-body'].height / assets['grab-body'].width;
      const an0 = assets['grab-body'].anchor || cfg.body.anchor; const sh = cfg.body.anchorShift || { x: 0, y: 0 }; const an = { x: an0.x + sh.x, y: an0.y + sh.y };
      const bx = cx - an.x * bw, by = cy - an.y * bh;
      S.bodyRect = place(body, assets['grab-body'], bw, bx, by, 0);
      const rw = r.height * cfg.right.scale * assets['talon-right'].width / assets['talon-right'].height;
      S.rightRect = place(right, assets['talon-right'], rw, cx + cfg.right.dx * r.width - rw / 2, r.top + cfg.right.dy * r.height, cfg.right.rot || 0);
      const lw = r.height * cfg.left.scale * assets['talon-left'].width / assets['talon-left'].height;
      S.leftRect = place(left, assets['talon-left'], lw, cx + cfg.left.dx * r.width - lw / 2, r.top + cfg.left.dy * r.height, cfg.left.rot || 0);
      S.chicken = { left: r.left, top: r.top, width: r.width, height: r.height };
      svg.innerHTML = opts.hint ? S.hintSvg(S.rightRect, cfg) : '';
      S.raf = requestAnimationFrame(tick);
    };
    S.hintSvg = (t, cfg) => {
      const xc = t.x + t.w * cfg.right.xMark.x, yc = t.y + t.h * cfg.right.xMark.y, R = 18;
      const tail = { x: xc + 190, y: yc + 150 };
      const ang = Math.atan2(yc - tail.y, xc - tail.x);
      const head = { x: xc - Math.cos(ang) * (R + 4), y: yc - Math.sin(ang) * (R + 4) };
      const hl = 16, hw = 10;
      const p1 = { x: head.x - Math.cos(ang) * hl + Math.sin(ang) * hw, y: head.y - Math.sin(ang) * hl - Math.cos(ang) * hw };
      const p2 = { x: head.x - Math.cos(ang) * hl - Math.sin(ang) * hw, y: head.y - Math.sin(ang) * hl + Math.cos(ang) * hw };
      const shaftEnd = { x: head.x - Math.cos(ang) * (hl - 2), y: head.y - Math.sin(ang) * (hl - 2) };
      const hand = 'M9 1.5a1.5 1.5 0 0 1 3 0V10h1V5.5a1.5 1.5 0 0 1 3 0V11h1V7.5a1.5 1.5 0 0 1 3 0V13h1V9.5a1.5 1.5 0 0 1 3 0V17c0 4-3 7-7 7h-3c-2.5 0-4.5-1-6-3L1.6 14.8a1.6 1.6 0 0 1 2.5-2L7 16V1.5Z';
      return '<g stroke="#ff1a1a" stroke-width="6" stroke-linecap="round" fill="none">'
        + '<line x1="' + (xc - R) + '" y1="' + (yc - R) + '" x2="' + (xc + R) + '" y2="' + (yc + R) + '"/>'
        + '<line x1="' + (xc + R) + '" y1="' + (yc - R) + '" x2="' + (xc - R) + '" y2="' + (yc + R) + '"/>'
        + '<line x1="' + tail.x + '" y1="' + tail.y + '" x2="' + shaftEnd.x + '" y2="' + shaftEnd.y + '" stroke-width="5"/></g>'
        + '<polygon points="' + head.x + ',' + head.y + ' ' + p1.x + ',' + p1.y + ' ' + p2.x + ',' + p2.y + '" fill="#ff1a1a"/>'
        + '<g transform="translate(' + (tail.x + 2) + ',' + (tail.y + 2) + ') scale(1.6)"><path d="' + hand + '" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></g>'
        + '<text x="' + (tail.x - 8) + '" y="' + (tail.y + 62) + '" font-family="Geist, system-ui, sans-serif" font-size="20" font-weight="600" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">click the claw</text>'
        + '<text x="' + (t.x - 10) + '" y="' + (t.y + t.h * 0.5) + '" text-anchor="end" font-family="Geist, system-ui, sans-serif" font-size="16" font-weight="600" fill="#ffd54a" stroke="#000" stroke-width="4" paint-order="stroke">front claw 3 / 25</text>';
    };
    tick();
  };
  S.report = () => ({ nudged: S.nudged, chicken: S.chicken, body: S.bodyRect, right: S.rightRect, left: S.leftRect, hud: S.hudRect(), vw: innerWidth, vh: innerHeight });
})();`;

async function waitForSafeZone(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < WAIT_SAFE_MS) {
    const r = await page.evaluate(() => window.__birdPreview.chickenRect().toJSON());
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx > SAFE.left && cx < SAFE.right && cy > SAFE.top && cy < SAFE.bottom) return r;
    await page.waitForTimeout(80);
  }
  return null;
}

async function shoot(page, file) {
  await page.screenshot({ path: path.join(OUT, file) });
  const rep = await page.evaluate(() => window.__birdPreview.report());
  console.log(file, JSON.stringify(rep));
  return rep;
}

async function contactSheet(bird, file) {
  const order = ['fly-up', 'fly-level', 'fly-down', 'bank', 'away-3q', 'away-far'];
  const cell = 400;
  const comps = [];
  for (let i = 0; i < order.length; i++) {
    const a = manifest[bird][order[i]];
    if (!a) continue;
    const buf = await sharp(path.join(PUBLIC, a.file)).resize(cell - 30, cell - 60, { fit: 'inside' }).toBuffer();
    const m = await sharp(buf).metadata();
    comps.push({ input: buf, left: (i % 3) * cell + Math.round((cell - m.width) / 2), top: Math.floor(i / 3) * cell + 20 + Math.round((cell - 60 - m.height) / 2) });
    comps.push({ input: Buffer.from(`<svg width="${cell}" height="34"><text x="${cell / 2}" y="24" text-anchor="middle" font-family="Helvetica" font-size="20" font-weight="600" fill="#fff">${bird} · ${order[i]}</text></svg>`), left: (i % 3) * cell, top: Math.floor(i / 3) * cell + cell - 36 });
  }
  const sky = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell * 3}" height="${cell * 2}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b3a6b"/><stop offset="1" stop-color="#6fa3d8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  await sharp(sky).composite(comps).png().toFile(path.join(OUT, file));
  console.log(file, 'written');
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
await page.goto(GAME_URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="chicken"]', { timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__chicken), null, { timeout: 30000 });
await page.evaluate((s) => window.__chicken.setScore(s), Number(process.env.BIRDS_SCORE || 5));
await page.evaluate(OVERLAY_SCRIPT);
const hud = await page.evaluate(() => window.__birdPreview.hudRect());
console.log('hud', JSON.stringify(hud));
const bannerTop = 14;

const shots = [
  ['hawk', false, 'a-hawk-grab.png'],
  ['hawk', true, 'b-hawk-hint.png'],
  ['eagle', false, 'c-eagle-grab.png'],
  ['phoenix', false, 'd-phoenix-grab.png'],
];
async function ensureOverlay() {
  await page.waitForSelector('[data-testid="chicken"]', { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__chicken), null, { timeout: 30000 });
  const fresh = await page.evaluate(() => !window.__birdPreview);
  if (fresh) {
    await page.evaluate((s) => window.__chicken.setScore(s), Number(process.env.BIRDS_SCORE || 5));
    await page.evaluate(OVERLAY_SCRIPT);
  }
}

for (const [bird, hint, file] of shots) {
  if (!manifest[bird]) { console.log('skip', bird); continue; }
  const assets = await birdAssets(bird);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ensureOverlay();
      await page.evaluate(() => window.__birdPreview.clear());
      await page.evaluate(({ cfg, assets, opts }) => window.__birdPreview.mount(cfg, assets, opts), { cfg: compose[bird], assets, opts: { hint, bannerTop, hud } });
      await page.waitForTimeout(1800);
      await shoot(page, file);
      break;
    } catch (e) {
      console.log(`retry ${file}: ${e.message.split('\n')[0]}`);
      await page.waitForTimeout(1500);
    }
  }
}
await contactSheet('hawk', 'e-hawk-flight-frames.png');
await browser.close();
