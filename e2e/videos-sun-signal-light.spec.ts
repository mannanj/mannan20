import { test, expect } from '@playwright/test';

test.describe('/videos/sun-signal-light page', () => {
  test('renders the conversation as collapsible sections with costs', async ({ page }) => {
    await page.goto('/videos/sun-signal-light');
    await expect(page.getByRole('heading', { name: 'The Light We Lost' })).toBeVisible();
    await expect(page.getByText('$4.47').first()).toBeVisible();

    const first = page.getByRole('button', { name: /Clean up the old landing work/ });
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/are we sitll on landing page rework/)).toBeVisible();
    await expect(page.getByAltText('Mannan').first()).toBeVisible();

    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect(page.getByRole('button', { name: 'Collapse all' })).toBeVisible();
    await expect(page.getByText(/Pasted text ·/).first()).toBeVisible();
  });

  test('pops out a player that actually plays the film', async ({ page }) => {
    await page.goto('/videos/sun-signal-light');
    await page.getByRole('button', { name: /Play the film/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const video = page.getByTestId('sun-video');
    const h264 = await video.evaluate((v: HTMLVideoElement) => v.canPlayType('video/mp4; codecs="avc1.42E01E"'));
    test.skip(h264 === '', 'this browser build has no H.264 decoder');

    await video.evaluate((v: HTMLVideoElement) => {
      v.muted = true;
      return v.play();
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 })
      .toBeGreaterThan(1);
    const meta = await video.evaluate((v: HTMLVideoElement) => ({
      duration: v.duration,
      width: v.videoWidth,
      error: v.error?.code ?? null,
      tracks: v.textTracks.length,
    }));
    expect(meta.error).toBeNull();
    expect(meta.duration).toBeGreaterThan(30);
    expect(meta.width).toBe(1920);
    expect(meta.tracks).toBe(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
