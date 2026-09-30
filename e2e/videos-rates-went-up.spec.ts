import { test, expect, type Page } from '@playwright/test';
import { stubTurnstile } from './helpers/contact-form';

const PAGE = '/videos/rates-went-up';
const DOWNLOAD = '/api/transcripts/download?film=civic-signal';

const octet = () => Math.floor(Math.random() * 254) + 1;
const freshIp = () => `10.${octet()}.${octet()}.${octet()}`;

async function openGate(page: Page) {
  await stubTurnstile(page);
  await page.goto(PAGE);
  const button = page.getByTestId('transcripts-download-button');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId('transcripts-gate-modal')).toBeVisible();
  await expect(page.getByTestId('transcript-gate-textarea')).toBeVisible({ timeout: 15000 });
}

test.describe('/videos/rates-went-up page', () => {
  test('renders the conversation as collapsible sections with costs', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('rowheader', { name: 'All in' })).toBeVisible();
    await expect(page.getByText(/of it thinking/)).toHaveCount(0);

    const first = page.getByRole('button', { name: /Find the video skill/ });
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/do you see the video making skill/)).toBeVisible();

    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect(page.getByText(/maggie|nicole|julie|upskilling/i)).toHaveCount(0);
    await page.screenshot({ path: 'e2e/screenshots/rates-went-up.png', fullPage: false });
  });

  test('/ai-energy-tool reaches the film page', async ({ page }) => {
    await page.goto('/ai-energy-tool');
    await expect(page).toHaveURL(/\/videos\/rates-went-up$/);
    await expect(page.getByTestId('transcripts-download-button')).toBeVisible();
  });

  test('pops out a player that actually plays the film', async ({ page }) => {
    await page.goto(PAGE);
    await page.getByRole('button', { name: /Play the film/ }).click();
    const video = page.getByTestId('civic-video');
    const h264 = await video.evaluate((v: HTMLVideoElement) => v.canPlayType('video/mp4; codecs="avc1.42E01E"'));
    test.skip(h264 === '', 'this browser build has no H.264 decoder');
    await video.evaluate((v: HTMLVideoElement) => {
      v.muted = true;
      return v.play();
    });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(1);
    const meta = await video.evaluate((v: HTMLVideoElement) => ({ duration: v.duration, error: v.error?.code ?? null, tracks: v.textTracks.length }));
    expect(meta.error).toBeNull();
    expect(meta.duration).toBeGreaterThan(80);
    expect(meta.tracks).toBe(1);
  });
});

test.describe('the civic gate against the real API', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': freshIp() } });

  test('a team name unlocks the civic transcript and nothing else', async ({ page }) => {
    await openGate(page);
    await expect(page.getByTestId('transcript-gate-hints')).toContainText('Civic Signal team');
    await page.getByTestId('transcript-gate-textarea').fill('Maggie');

    const link = page.getByTestId('transcripts-download-link');
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(link).toHaveAttribute('href', DOWNLOAD);

    const response = await page.request.get(DOWNLOAD);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toContain('civic-signal-rates-went-up-transcript.zip');
    expect((await response.body()).subarray(0, 2).toString('latin1')).toBe('PK');

    expect((await page.request.get('/api/transcripts/download')).status()).toBe(403);
  });
});

test.describe('the civic gate with the workplace answer', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': freshIp() } });

  test('upskilling-labs unlocks the download', async ({ page }) => {
    await openGate(page);
    await page.getByTestId('transcript-gate-textarea').fill('Upskilling-Labs');
    await expect(page.getByTestId('transcripts-download-link')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('the civic download route without a grant', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': freshIp() } });

  test('refuses an ungranted request, a sun grant name, and unknown films', async ({ request }) => {
    expect((await request.get(DOWNLOAD)).status()).toBe(403);
    expect((await request.get('/api/transcripts/download?film=nope')).status()).toBe(404);
    const wrong = await request.post('/api/transcripts/verify?film=civic-signal', { data: { message: 'faizan' } });
    expect((await wrong.json()).unlocked).toBe(false);
  });
});
