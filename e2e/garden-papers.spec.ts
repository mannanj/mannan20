import { expect, test } from '@playwright/test';

test.describe('garden papers', () => {
  test('paper Listen opens the audio player with paper audio chunks', async ({ page }) => {
    const audioRequests: string[] = [];

    await page.route('**/portfolio/audio/gmu-archr/chunk-*.wav', (route) => {
      audioRequests.push(route.request().url());
      route.fulfill({
        path: 'public/data/audio/mcp-intent-spike/chunk-1.wav',
        contentType: 'audio/wav',
      });
    });

    await page.goto('/garden');
    const papers = page.getByTestId('garden-papers');
    await papers.scrollIntoViewIfNeeded();

    const archr = papers.getByTestId('garden-paper-gmu-archr');
    const archrListen = archr.getByTestId('paper-listen-gmu-archr');

    await archrListen.click();

    await expect(page.getByTestId('audio-player-bar')).toBeVisible({ timeout: 10000 });
    await expect(archrListen).toContainText(/Downloading|Listening/, { timeout: 10000 });
    await expect(page.getByTestId('audio-chunk-0')).toContainText('Part 1');
    await expect
      .poll(() => audioRequests.some((url) => url.includes('/portfolio/audio/gmu-archr/chunk-1.wav')))
      .toBe(true);
  });

  test('keeps paper PDFs unloaded until a paper is expanded', async ({ page }) => {
    const pdfRequests: string[] = [];

    await page.route('**/portfolio/audio/*/chunk-*.wav', (route) => {
      route.fulfill({
        path: 'public/data/audio/mcp-intent-spike/chunk-1.wav',
        contentType: 'audio/wav',
      });
    });

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/data/documents/GMU-ARCHR.pdf') || url.includes('/data/documents/OMF-DR.pdf')) {
        pdfRequests.push(url);
      }
    });

    await page.goto('/garden');
    const panel = page.getByTestId('garden-active-panel');
    await expect(panel).toHaveAttribute('data-panel', 'writings');
    await expect(panel).not.toContainText('Taken');

    const papers = page.getByTestId('garden-papers');
    await papers.scrollIntoViewIfNeeded();
    await expect(papers.getByRole('heading', { name: 'Papers' })).toBeVisible();
    await expect(papers.locator('[aria-label="Paper preview controls"]')).toHaveCount(0);

    const archr = papers.getByTestId('garden-paper-gmu-archr');
    await expect(archr).toContainText('Apparatus for Remote Control of Humanoid Robots');
    await expect(archr).toContainText('high degree of freedom humanoid robots');

    const omf = papers.getByTestId('garden-paper-omf-dr');
    await expect(omf).toContainText('Open Modeling Framework Demand Response');
    await expect(omf).toContainText('demand response programs');

    await expect(papers.locator('iframe')).toHaveCount(0);
    expect(pdfRequests).toEqual([]);

    const archrActions = archr.getByTestId('paper-actions-gmu-archr');
    const omfActions = omf.getByTestId('paper-actions-omf-dr');
    await expect(archrActions).toBeVisible();
    await expect(omfActions).toBeVisible();

    const archrDownload = archr.getByTestId('paper-download-gmu-archr');
    await expect(archrDownload).toContainText('Download');
    await expect(archr.locator('[data-testid="paper-download-arrow-gmu-archr"]')).toHaveCount(0);
    await expect(archrDownload).toHaveAttribute('href', /\/api\/download\/gmu-archr/);
    await archrDownload.click();
    await expect(archrDownload).toContainText('Downloading');
    await expect(archrDownload.getByTestId('paper-download-gmu-archr-spinner')).toHaveCount(1);
    await expect(archrDownload).toHaveAttribute('aria-disabled', 'true');
    await expect(archrDownload).toContainText('Downloaded', { timeout: 3000 });
    await expect(archrDownload.getByTestId('paper-download-gmu-archr-check')).toHaveCount(1);
    await archrDownload.click();
    await page.waitForTimeout(250);
    await expect(archrDownload).toContainText('Downloaded');
    await expect(archrDownload).toContainText('Download again', { timeout: 7000 });
    await expect(archrDownload.getByTestId('paper-download-gmu-archr-refresh')).toHaveCount(1);
    await expect(archrDownload).toHaveAttribute('aria-disabled', 'false');

    const archrListen = archr.getByTestId('paper-listen-gmu-archr');
    const omfListen = omf.getByTestId('paper-listen-omf-dr');
    await expect(archrListen).toContainText('Listen');
    await expect(omfListen).toContainText('Listen');
    await expect(archrListen).toHaveAttribute('aria-pressed', 'false');
    await expect(omfListen).toHaveAttribute('aria-pressed', 'false');

    await archrListen.click();
    await expect(archrListen).toHaveAttribute('aria-pressed', 'true');
    await expect(archrListen).toContainText(/Downloading|Listening/);
    await expect(omfListen).toHaveAttribute('aria-pressed', 'false');
    await expect(omfListen).toContainText('Listen');
    await expect(page.getByTestId('audio-player-bar')).toBeVisible();

    await omfListen.click();
    await expect(archrListen).toHaveAttribute('aria-pressed', 'false');
    await expect(archrListen).toContainText('Listen');
    await expect(omfListen).toHaveAttribute('aria-pressed', 'true');
    await expect(omfListen).toContainText(/Downloading|Listening/);

    const archrToggle = archr.getByTestId('paper-toggle-gmu-archr');
    const archrCaret = archr.getByTestId('paper-caret-gmu-archr');
    await expect(archrToggle).toContainText('Apparatus for Remote Control of Humanoid Robots');
    await expect(archrToggle).toContainText('high degree of freedom humanoid robots');
    await expect(archrCaret).toBeVisible();
    await expect(archrCaret.getByTestId('paper-chevron-icon')).toHaveCount(1);
    await expect(archrToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(archrCaret).toHaveAttribute('aria-expanded', 'false');
    await archrToggle.getByText('high degree of freedom humanoid robots').click();
    await expect(archrToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(archrCaret).toHaveAttribute('aria-expanded', 'true');
    await expect(archr.getByTestId('paper-skeleton-gmu-archr')).toHaveCount(1);
    await expect(archr.getByTestId('paper-swirl-gmu-archr')).toHaveCount(1);
    await expect(archr.getByTitle('Apparatus for Remote Control of Humanoid Robots PDF preview')).toHaveAttribute('loading', 'lazy');
    await expect(archr.getByTitle('Apparatus for Remote Control of Humanoid Robots PDF preview')).toHaveAttribute(
      'src',
      /\/data\/documents\/GMU-ARCHR\.pdf#toolbar=0&navpanes=0&view=FitH/,
    );
    await expect.poll(() => pdfRequests.some((url) => url.includes('/data/documents/GMU-ARCHR.pdf'))).toBe(true);

    await archrToggle.getByText('Apparatus for Remote Control of Humanoid Robots').click();
    await expect(archrToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(archrCaret).toHaveAttribute('aria-expanded', 'false');
    await expect(papers.locator('iframe')).toHaveCount(0);

    const omfToggle = omf.getByTestId('paper-toggle-omf-dr');
    await omfToggle.click();
    await expect(omfToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(omf.getByTitle('Open Modeling Framework Demand Response PDF preview')).toHaveAttribute(
      'src',
      /\/data\/documents\/OMF-DR\.pdf#toolbar=0&navpanes=0&view=FitH/,
    );
    await expect.poll(() => pdfRequests.some((url) => url.includes('/data/documents/OMF-DR.pdf'))).toBe(true);
  });
});
