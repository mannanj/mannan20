import { expect, test } from '@playwright/test';

const POPOUT_BODY_HEIGHT = 250;

test.describe('garden skills', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/garden');
    await page.getByRole('tab', { name: 'Writings' }).first().click();
  });

  test('storyboard skill sits under Skills in Writings, marked AI-generated', async ({ page }) => {
    const skills = page.getByTestId('garden-skills');
    await skills.scrollIntoViewIfNeeded();

    await expect(skills.getByRole('heading', { name: 'Skills' })).toBeVisible();
    await expect(skills.getByRole('heading', { name: 'Storyboard' })).toBeVisible();
    await expect(skills.getByText('AI-Generated')).toBeVisible();

    await skills.getByTestId('ai-designed-info').hover();
    await expect(skills.getByTestId('ai-designed-tooltip')).toContainText(
      'This skill was written primarily with AI',
    );
  });

  test('opening the skill renders SKILL.md in a 250px scrolling popout', async ({ page }) => {
    const card = page.getByTestId('garden-skill-storyboard');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const markdown = page.getByTestId('garden-skill-markdown');
    await expect(markdown.getByRole('heading', { name: 'Rule 1: Shoot before, not after' })).toBeVisible();
    await expect(markdown).not.toContainText('name: storyboard');

    const scroller = await markdown.evaluate((el) => {
      const parent = el.parentElement!;
      return { client: parent.clientHeight, scroll: parent.scrollHeight };
    });
    expect(scroller.client).toBe(POPOUT_BODY_HEIGHT);
    expect(scroller.scroll).toBeGreaterThan(POPOUT_BODY_HEIGHT);

    const box = await page.getByTestId('garden-skill-markdown').boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);

    await page.keyboard.press('Escape');
    await expect(markdown).toBeHidden();
  });
});
