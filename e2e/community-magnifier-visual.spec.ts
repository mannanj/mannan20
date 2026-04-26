import { test } from "@playwright/test";

test("visual: capture lens screenshots at each zoom level", async ({ page }) => {
  await page.goto("/garden/article/seeking-community");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await page.locator("[data-magnifier-toggle]").click();
  await page.waitForTimeout(300);

  await page.mouse.move(640, 400);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "e2e/screenshots/magnifier-level0.png", fullPage: false });

  await page.mouse.click(640, 400);
  await page.waitForTimeout(400);
  await page.mouse.move(640, 400);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/screenshots/magnifier-level1.png", fullPage: false });

  await page.mouse.click(640, 400);
  await page.waitForTimeout(400);
  await page.mouse.move(640, 400);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/screenshots/magnifier-level2.png", fullPage: false });
});
