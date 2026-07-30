import { expect, test, type Locator } from '@playwright/test';

const lineHeightRatio = async (locator: Locator) =>
  locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
  });

test('education project descriptions use tighter spacing than employment descriptions', async ({ page }) => {
  await page.goto('/#about');
  await page.locator('[data-education-more]').click();

  const educationDescription = page
    .getByTestId('archr-project')
    .getByText('Lead developer for an intuitive teleoperation system', { exact: false });
  const employmentDescription = page.getByText(
    'AI product studio & consulting agency shipping production-grade full-stack AI platforms.',
    { exact: true },
  );

  await expect(educationDescription).toBeVisible();
  await expect(employmentDescription).toBeVisible();
  expect(await lineHeightRatio(educationDescription)).toBeCloseTo(1.35, 1);
  expect(await lineHeightRatio(employmentDescription)).toBeCloseTo(1.6, 1);
});
