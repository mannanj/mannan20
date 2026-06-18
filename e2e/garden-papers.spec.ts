import { expect, test } from '@playwright/test';

test.describe('garden papers', () => {
  test('adds the two published papers to the bottom of the writing panel with lazy native PDF frames', async ({ page }) => {
    await page.goto('/garden');
    const panel = page.getByTestId('garden-active-panel');
    await expect(panel).toHaveAttribute('data-panel', 'writings');

    const papers = page.getByTestId('garden-papers');
    await papers.scrollIntoViewIfNeeded();
    await expect(papers.getByRole('heading', { name: 'Papers' })).toBeVisible();

    const archr = papers.getByTestId('garden-paper-gmu-archr');
    await expect(archr).toContainText('Apparatus for Remote Control of Humanoid Robots');
    await expect(archr).toContainText('high degree of freedom humanoid robots');
    await expect(archr.getByTestId('paper-skeleton-gmu-archr')).toHaveCount(1);
    await expect(archr.getByTestId('paper-swirl-gmu-archr')).toHaveCount(1);
    await expect(archr.getByTitle('Apparatus for Remote Control of Humanoid Robots PDF preview')).toHaveAttribute('loading', 'lazy');
    await expect(archr.getByTitle('Apparatus for Remote Control of Humanoid Robots PDF preview')).toHaveAttribute(
      'src',
      /\/data\/documents\/GMU-ARCHR\.pdf#toolbar=0&navpanes=0&view=FitH/,
    );

    const omf = papers.getByTestId('garden-paper-omf-dr');
    await expect(omf).toContainText('Open Modeling Framework Demand Response');
    await expect(omf).toContainText('demand response programs');
    await expect(omf.getByTestId('paper-skeleton-omf-dr')).toHaveCount(1);
    await expect(omf.getByTestId('paper-swirl-omf-dr')).toHaveCount(1);
    await expect(omf.getByTitle('Open Modeling Framework Demand Response PDF preview')).toHaveAttribute('loading', 'lazy');
    await expect(omf.getByTitle('Open Modeling Framework Demand Response PDF preview')).toHaveAttribute(
      'src',
      /\/data\/documents\/OMF-DR\.pdf#toolbar=0&navpanes=0&view=FitH/,
    );
  });
});
