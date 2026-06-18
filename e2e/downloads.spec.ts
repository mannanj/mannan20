import { test, expect } from '@playwright/test';

const DOWNLOAD_SLUGS = [
  { slug: 'resume', contentType: 'application/pdf', filename: 'Mannan_Javid_Resume.pdf', minBytes: 60000 },
  { slug: 'cover-letter', contentType: 'application/pdf', filename: 'mannan-javid-cover-letter.pdf', minBytes: 400 },
  { slug: 'gmu-archr', contentType: 'application/pdf', filename: 'GMU-ARCHR.pdf', minBytes: 1000000 },
  { slug: 'omf-dr', contentType: 'application/pdf', filename: 'OMF-DR.pdf', minBytes: 300000 },
  { slug: 'immortalism-manifesto', contentType: 'application/pdf', filename: 'immortalism-manifesto.pdf', minBytes: 200000 },
  { slug: 'mcp-intent-spike', contentType: 'application/pdf', filename: 'mcp-intent-spike.pdf', minBytes: 40000 },
  { slug: 'affiliate-leads-redesign', contentType: 'text/markdown', filename: 'affiliate-leads-redesign.md', minBytes: 5000 },
];

const RATE_LIMIT = 10;

function uniqueIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

test.describe('Rate-limited downloads served from R2', () => {
  test('every advertised download streams the right file', async ({ request }) => {
    const ip = uniqueIp();
    for (const { slug, contentType, filename, minBytes } of DOWNLOAD_SLUGS) {
      const res = await request.get(`/api/download/${slug}`, { headers: { 'x-forwarded-for': ip } });
      expect(res.status(), slug).toBe(200);
      expect(res.headers()['content-type'], slug).toBe(contentType);
      expect(res.headers()['content-disposition'], slug).toContain(`filename="${filename}"`);
      expect(res.headers()['cache-control'], slug).toContain('no-store');
      expect(Number(res.headers()['x-ratelimit-limit']), slug).toBe(RATE_LIMIT);
      const body = await res.body();
      expect(body.length, slug).toBeGreaterThan(minBytes);
    }
  });

  test('unknown slugs return 404', async ({ request }) => {
    const res = await request.get('/api/download/not-a-real-file', {
      headers: { 'x-forwarded-for': uniqueIp() },
    });
    expect(res.status()).toBe(404);
  });

  test('the 11th download within a minute is rejected with 429 and Retry-After', async ({ request }) => {
    const ip = uniqueIp();
    for (let i = 1; i <= RATE_LIMIT; i++) {
      const res = await request.get('/api/download/cover-letter', { headers: { 'x-forwarded-for': ip } });
      expect(res.status(), `request ${i}`).toBe(200);
      expect(Number(res.headers()['x-ratelimit-remaining']), `remaining after ${i}`).toBe(RATE_LIMIT - i);
    }
    const blocked = await request.get('/api/download/cover-letter', { headers: { 'x-forwarded-for': ip } });
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()['x-ratelimit-remaining']).toBe('0');
    const retryAfter = Number(blocked.headers()['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  test('rate limiting is per IP', async ({ request }) => {
    const blockedIp = uniqueIp();
    for (let i = 0; i < RATE_LIMIT; i++) {
      await request.get('/api/download/cover-letter', { headers: { 'x-forwarded-for': blockedIp } });
    }
    const blocked = await request.get('/api/download/cover-letter', { headers: { 'x-forwarded-for': blockedIp } });
    expect(blocked.status()).toBe(429);

    const fresh = await request.get('/api/download/cover-letter', { headers: { 'x-forwarded-for': uniqueIp() } });
    expect(fresh.status()).toBe(200);
  });

  test('downloading the resume through the modal saves the PDF', async ({ page }) => {
    await page.goto('/#download-resume');
    await expect(page.locator('text=Would you like to download')).toBeVisible({ timeout: 10000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-modal-primary]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Mannan_Javid_Resume.pdf');
  });

  test('pages load nothing from Vercel Blob and render images from R2', async ({ page }) => {
    const blobRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('blob.vercel-storage')) blobRequests.push(req.url());
    });

    await page.goto('/');
    await page.goto('/garden/article/seeking-community');
    const articleImage = page.locator('img[alt="Illustrated scene of car camping in the mountains"]');
    await articleImage.scrollIntoViewIfNeeded();
    await expect(articleImage).toBeVisible();
    await expect
      .poll(async () => articleImage.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    expect(blobRequests).toEqual([]);
  });
});
