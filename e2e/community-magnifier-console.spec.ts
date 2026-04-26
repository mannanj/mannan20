import { test, expect } from "@playwright/test";

test("magnifier produces no console errors when toggled", async ({ page }) => {
  const errors: string[] = [];
  const isEnvErr = (s: string) =>
    /WebGL|THREE\.WebGLRenderer|Failed to load resource/i.test(s);
  page.on("pageerror", (e) => {
    if (!isEnvErr(e.message)) errors.push(`pageerror: ${e.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!isEnvErr(text)) errors.push(`console.error: ${text}`);
  });

  await page.goto("/garden/article/seeking-community");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.locator("[data-magnifier-toggle]").click();
  await page.mouse.move(640, 400);
  await page.waitForTimeout(2000);
  await page.mouse.click(640, 400);
  await page.waitForTimeout(800);
  await page.mouse.click(640, 400);
  await page.waitForTimeout(800);

  expect(errors).toEqual([]);
});
