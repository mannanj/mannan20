import { test, expect } from '@playwright/test';

test.describe('header controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home button is visible in header', async ({ page }) => {
    const homeBtn = page.getByTestId('header-home-button');
    await expect(homeBtn).toBeVisible();
  });

  test('clicking home button scrolls to top of page', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(200);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(500);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(500);
  });

  test('home button scrolls on first click without delay', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(500);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(500);
  });

  test('home button shows "Return to Home" tooltip on hover', async ({ page }) => {
    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.hover();
    await expect(page.getByText('Return to Home')).toBeVisible();
  });

  test('hovering header controls expands social links', async ({ page }) => {
    const controls = page.getByTestId('header-controls');
    const linkedin = page.getByTestId('header-linkedin-link');
    const github = page.getByTestId('header-github-link');

    await expect(linkedin).toBeVisible();
    await expect(github).toBeVisible();

    const beforeLinkedin = await linkedin.boundingBox();
    await controls.hover();
    await page.waitForTimeout(400);
    const afterLinkedin = await linkedin.boundingBox();

    expect(afterLinkedin!.x).toBeGreaterThan(beforeLinkedin!.x);
  });

  test('linkedin link has correct href', async ({ page }) => {
    const linkedin = page.getByTestId('header-linkedin-link');
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/mannanjavid/');
    await expect(linkedin).toHaveAttribute('target', '_blank');
  });

  test('github link has correct href', async ({ page }) => {
    const github = page.getByTestId('header-github-link');
    await expect(github).toHaveAttribute('href', 'https://github.com/mannanj');
    await expect(github).toHaveAttribute('target', '_blank');
  });

  test('nav links scroll to sections', async ({ page }) => {
    const aboutLink = page.locator('#about-link');
    await aboutLink.click();
    await page.waitForTimeout(500);
    const aboutY = await page.evaluate(() => window.scrollY);
    expect(aboutY).toBeGreaterThan(100);

    const homeLink = page.locator('#home-link');
    await homeLink.click();
    await page.waitForTimeout(500);
    const homeY = await page.evaluate(() => window.scrollY);
    expect(homeY).toBeLessThan(aboutY);
  });

  test('clicking home button from contact section returns to top', async ({ page }) => {
    const contactLink = page.locator('#contact-link');
    await contactLink.click();
    await page.waitForTimeout(500);
    const contactY = await page.evaluate(() => window.scrollY);
    expect(contactY).toBeGreaterThan(200);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(500);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(500);
  });

  test('social links show tooltips on hover after expand', async ({ page }) => {
    const controls = page.getByTestId('header-controls');
    await controls.hover();
    await page.waitForTimeout(1100);

    const linkedin = page.getByTestId('header-linkedin-link');
    await linkedin.hover();
    await expect(page.getByText('View my LinkedIn')).toBeVisible();

    const github = page.getByTestId('header-github-link');
    await github.hover();
    await expect(page.getByText('View my GitHub')).toBeVisible();
  });
});
