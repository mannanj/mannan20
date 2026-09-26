import { createRequire } from 'module';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
mkdirSync('frames', { recursive: true }); mkdirSync('out', { recursive: true });
const [mode = 'full', a = '0', b = '33.5', step = '1'] = process.argv.slice(2);
const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto('http://127.0.0.1:8765/src/index.html');
await page.evaluate(() => window.ready);
writeFileSync('events.json', JSON.stringify(await page.evaluate(() => window.EVENTS)));
const grab = t => page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t).then(s => Buffer.from(s, 'base64'));
if (mode === 'stills') {
  for (let t = +a; t <= +b + 1e-9; t += +step) writeFileSync(`frames/t${t.toFixed(2).padStart(6, '0')}.png`, await grab(t));
} else {
  const fps = 30, n = Math.round(+b * fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', 'out/video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < n; f++) { const buf = await grab(f / fps); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (f % 150 === 0) console.log('frame', f, '/', n); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close(); srv.kill();
