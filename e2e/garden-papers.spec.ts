import { expect, test } from '@playwright/test';

test.describe('garden papers', () => {
  test('keeps paper PDFs unloaded until a paper is expanded', async ({ page }) => {
    const pdfRequests: string[] = [];

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

    const archrDownload = archr.getByTestId('paper-download-gmu-archr');
    await expect(archrDownload).toContainText('Download PDF');
    await expect(archrDownload.getByTestId('paper-download-arrow-gmu-archr')).toHaveCount(1);
    await expect(archrDownload).toHaveAttribute('href', /\/api\/download\/gmu-archr/);
    await archrDownload.click();
    await expect(archrDownload).toContainText('Downloading');
    await expect(archrDownload.getByTestId('paper-download-spinner-gmu-archr')).toHaveCount(1);
    await expect(archrDownload).toHaveAttribute('aria-disabled', 'true');
    await expect(archrDownload).toContainText('Downloaded', { timeout: 3000 });
    await expect(archrDownload.getByTestId('paper-download-check-gmu-archr')).toHaveCount(1);
    await archrDownload.click();
    await page.waitForTimeout(250);
    await expect(archrDownload).toContainText('Downloaded');
    await expect(archrDownload).toContainText('Download again', { timeout: 7000 });
    await expect(archrDownload.getByTestId('paper-download-refresh-gmu-archr')).toHaveCount(1);
    await expect(archrDownload).toHaveAttribute('aria-disabled', 'false');

    const archrToggle = archr.getByTestId('paper-toggle-gmu-archr');
    await expect(archrToggle).toContainText('Apparatus for Remote Control of Humanoid Robots');
    await expect(archrToggle).toContainText('high degree of freedom humanoid robots');
    await expect(archrToggle.getByTestId('paper-caret-gmu-archr')).toHaveText('>');
    await expect(archrToggle).toHaveAttribute('aria-expanded', 'false');
    await archrToggle.getByText('high degree of freedom humanoid robots').click();
    await expect(archrToggle).toHaveAttribute('aria-expanded', 'true');
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
