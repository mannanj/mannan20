import { test, expect } from "@playwright/test";

test.describe("Community page magnifier", () => {
  test("lens shows page content (not solid background) over canvas", async ({ page }) => {
    await page.goto("/garden/article/seeking-community");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await page.locator("[data-magnifier-toggle]").click();
    await page.waitForTimeout(300);

    const target = { x: 640, y: 400 };
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(2000);

    const lens = page.locator("[data-page-magnifier-root] .fixed.rounded-full").first();
    await expect(lens).toBeVisible();
    const box = await lens.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const lensShot = await lens.screenshot();

    const buf = lensShot;
    const sig = await page.evaluate(async (b64) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let nonBgPixels = 0;
      let totalPixels = 0;
      const cx = c.width / 2;
      const cy = c.height / 2;
      const radius = Math.min(c.width, c.height) / 2 - 4;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > radius * radius) continue;
          totalPixels++;
          const i = (y * c.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 20 || g > 20 || b > 20) nonBgPixels++;
        }
      }
      return { nonBgPixels, totalPixels, ratio: nonBgPixels / Math.max(1, totalPixels) };
    }, buf.toString("base64"));

    expect(sig.totalPixels).toBeGreaterThan(0);
    expect(sig.ratio).toBeGreaterThan(0.05);
  });
});
