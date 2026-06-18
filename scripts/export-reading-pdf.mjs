import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [url, outputPath] = process.argv.slice(2);

if (!url || !outputPath) {
  console.error('usage: node scripts/export-reading-pdf.mjs <url> <output-path>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1107, height: 1400 },
  deviceScaleFactor: 1,
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: `
    [data-no-pdf] { display: none !important; }
    [data-testid="header-controls"] { display: none !important; }
    [data-testid^="header-"] { display: none !important; }
    [data-testid="garden-wrapper"] { display: none !important; }
    .header-link { display: none !important; }
    body { background: #0b0b0b !important; }
    article { padding-top: 96px !important; padding-bottom: 96px !important; }
  `,
});
await page.emulateMedia({ media: 'screen' });

const height = await page.evaluate(() => {
  const body = document.body;
  const html = document.documentElement;
  return Math.ceil(Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight,
  ));
});

const out = resolve(outputPath);
mkdirSync(dirname(out), { recursive: true });
await page.pdf({
  path: out,
  width: '1107px',
  height: `${height}px`,
  printBackground: true,
  margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
});

await browser.close();
console.log(`PDF written: ${out}`);
