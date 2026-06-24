import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [url, outputPath] = process.argv.slice(2);

if (!url || !outputPath) {
  console.error('usage: node scripts/export-reading-text.mjs <url> <output-path>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1107, height: 1400 },
  deviceScaleFactor: 1,
});

await page.goto(url, { waitUntil: 'networkidle' });

const text = await page.evaluate(() => {
  const clone = document.body.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return '';

  for (const selector of [
    'script',
    'style',
    'noscript',
    '[data-no-pdf]',
    '[data-testid="header-controls"]',
    '[data-testid^="header-"]',
    '[data-testid="garden-wrapper"]',
    '[data-testid="article-views"]',
    '[aria-hidden="true"]',
  ]) {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  }

  const blocks = Array.from(
    clone.querySelectorAll('h1, h2, h3, p, li, figcaption'),
  )
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .filter((line) => line !== 'Additional Reading')
    .filter((line) => !line.includes('views'));

  return blocks.join('\n\n');
});

const out = resolve(outputPath);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${text.trim()}\n`);

await browser.close();
console.log(`Text written: ${out}`);
