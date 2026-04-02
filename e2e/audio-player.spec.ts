import { test, expect, Page } from '@playwright/test';

const ARTICLE_URL = '/episodes/immortalism-manifesto';
const BLOB_PATTERN = '**/audio/manifesto/chunk-*.wav';

async function navigateToArticle(page: Page) {
  await page.goto(ARTICLE_URL);
  await expect(page.locator('h1')).toContainText('Immortalism Manifesto');
}

async function openPlayerAndWaitForPlayback(page: Page) {
  await page.getByTestId('audio-listen-btn').click();
  await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 60000 });
}

test.describe('Episodes Audio Player', () => {
  test.describe('Article page loads correctly', () => {
    test('shows article with header links', async ({ page }) => {
      await navigateToArticle(page);
      await expect(page.locator('text=Bryan Johnson')).toBeVisible();
      await expect(page.getByTestId('audio-download-pdf')).toBeVisible();
      await expect(page.getByTestId('audio-listen-btn')).toBeVisible();
      await page.screenshot({ path: 'e2e/screenshots/audio-article-header.png' });
    });

    test('Listen button has correct styling', async ({ page }) => {
      await navigateToArticle(page);
      const listenBtn = page.getByTestId('audio-listen-btn');
      await expect(listenBtn).toBeVisible();
      await expect(listenBtn).toHaveCSS('cursor', 'pointer');
    });

    test('episodes index page links to article', async ({ page }) => {
      await page.goto('/episodes');
      await expect(page.locator('text=Immortalism Manifesto')).toBeVisible();
      await page.click('text=Immortalism Manifesto');
      await expect(page).toHaveURL(/immortalism-manifesto/);
      await expect(page.locator('h1')).toContainText('Immortalism Manifesto');
    });
  });

  test.describe('Player lifecycle', () => {
    test('clicking Listen opens the bottom player bar', async ({ page }) => {
      await navigateToArticle(page);
      await expect(page.getByTestId('audio-player-bar')).not.toBeVisible();

      await page.getByTestId('audio-listen-btn').click();
      await expect(page.getByTestId('audio-player-bar')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'e2e/screenshots/audio-player-open.png' });
    });

    test('Listen text changes to Downloading then Playing', async ({ page }) => {
      await navigateToArticle(page);
      await page.getByTestId('audio-listen-btn').click();

      const downloading = page.locator('text=Downloading');
      const playing = page.locator('text=Playing');
      await expect(downloading.or(playing)).toBeVisible({ timeout: 30000 });

      await expect(playing).toBeVisible({ timeout: 60000 });
    });

    test('close button dismisses the player', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      const closeBtn = page.locator('button[aria-label="Close player"]');
      await closeBtn.click();

      await expect(page.getByTestId('audio-player-bar')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('audio-listen-btn')).toBeVisible();
    });

    test('after close, Listen button is clickable again', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await page.locator('button[aria-label="Close player"]').click();
      await expect(page.getByTestId('audio-listen-btn')).toBeVisible({ timeout: 5000 });

      await page.getByTestId('audio-listen-btn').click();
      await expect(page.getByTestId('audio-player-bar')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Playback controls', () => {
    test('play/pause button toggles', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await page.locator('button[aria-label="Pause"]').click();
      await expect(page.locator('button[aria-label="Play"]')).toBeVisible({ timeout: 5000 });

      await page.locator('button[aria-label="Play"]').click();
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 5000 });
    });

    test('progress bar is visible and clickable', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      const progressBar = page.getByTestId('audio-progress-bar');
      await expect(progressBar).toBeVisible();

      const box = await progressBar.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        const timeBefore = await page.getByTestId('audio-time-display').textContent();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        await page.waitForTimeout(500);
        const timeAfter = await page.getByTestId('audio-time-display').textContent();
        expect(timeAfter).not.toBe(timeBefore);
      }
      await page.screenshot({ path: 'e2e/screenshots/audio-progress-seek.png' });
    });

    test('time display shows valid format', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      const timeDisplay = page.getByTestId('audio-time-display');
      await expect(timeDisplay).toBeVisible();
      const text = await timeDisplay.textContent();
      expect(text).toMatch(/\d+:\d{2}\s*\/\s*\d+:\d{2}/);
    });
  });

  test.describe('Part selector', () => {
    test('shows Part 1, Part 2, Part 3 buttons', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await expect(page.getByTestId('audio-chunk-0')).toBeVisible();
      await expect(page.getByTestId('audio-chunk-1')).toBeVisible();
      await expect(page.getByTestId('audio-chunk-2')).toBeVisible();
    });

    test('Part 1 is active by default', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await expect(page.getByTestId('audio-chunk-0')).toHaveClass(/bg-white/);
    });

    test('clicking Part 2 switches chunk and highlights it', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await page.getByTestId('audio-chunk-1').click();

      await expect(page.getByTestId('audio-chunk-1')).toHaveClass(/bg-white/, { timeout: 10000 });
      await expect(page.getByTestId('audio-chunk-0')).not.toHaveClass(/bg-white/);
    });

    test('switching parts activates only the selected part', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await page.getByTestId('audio-chunk-1').click();
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 60000 });

      await page.getByTestId('audio-chunk-2').click();
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 60000 });

      await expect(page.getByTestId('audio-chunk-2')).toHaveClass(/bg-white/);
      await expect(page.getByTestId('audio-chunk-0')).not.toHaveClass(/bg-white/);
      await expect(page.getByTestId('audio-chunk-1')).not.toHaveClass(/bg-white/);
    });
  });

  test.describe('Keyboard controls', () => {
    test('spacebar toggles play/pause', async ({ page }) => {
      await navigateToArticle(page);
      await openPlayerAndWaitForPlayback(page);

      await page.evaluate(() => document.body.focus());
      await page.keyboard.press('Space');
      await expect(page.locator('button[aria-label="Play"]')).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Space');
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('IndexedDB caching', () => {
    test('second play does not re-fetch audio from network', async ({ page }) => {
      await navigateToArticle(page);

      let firstFetchCount = 0;
      await page.route(BLOB_PATTERN, (route) => {
        firstFetchCount++;
        route.continue();
      });

      await openPlayerAndWaitForPlayback(page);
      await page.waitForTimeout(2000);

      await page.locator('button[aria-label="Close player"]').click();
      await expect(page.getByTestId('audio-listen-btn')).toBeVisible({ timeout: 5000 });

      expect(firstFetchCount).toBeGreaterThan(0);

      let secondFetchCount = 0;
      await page.unroute(BLOB_PATTERN);
      await page.route(BLOB_PATTERN, (route) => {
        secondFetchCount++;
        route.continue();
      });

      await page.getByTestId('audio-listen-btn').click();
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 60000 });
      await page.waitForTimeout(2000);

      expect(secondFetchCount).toBe(0);
    });
  });

  test.describe('Static content', () => {
    test('Download PDF link works', async ({ page }) => {
      await navigateToArticle(page);
      const pdfLink = page.getByTestId('audio-download-pdf');
      await expect(pdfLink).toHaveAttribute('href', '/data/documents/immortalism-manifesto.pdf');
      await expect(pdfLink).toHaveAttribute('target', '_blank');
    });

    test('Bryan Johnson X link is correct', async ({ page }) => {
      await navigateToArticle(page);
      const xLink = page.locator('a:has-text("Bryan Johnson")');
      await expect(xLink).toHaveAttribute('href', /x\.com\/bryan_johnson/);
      await expect(xLink).toHaveAttribute('target', '_blank');
    });

    test('back link navigates to episodes', async ({ page }) => {
      await navigateToArticle(page);
      await page.click('text=Episodes');
      await expect(page).toHaveURL(/\/episodes$/);
    });

    test('article footer has X link', async ({ page }) => {
      await navigateToArticle(page);
      const footerLink = page.locator('footer a:has-text("Read original post on X")');
      await expect(footerLink).toBeVisible();
      await expect(footerLink).toHaveAttribute('href', /x\.com\/bryan_johnson/);
    });
  });
});
