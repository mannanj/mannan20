import { test, expect } from "@playwright/test";

const sampleLens = async (
  page: import("@playwright/test").Page,
): Promise<{ ratio: number; uniformFrac: number; total: number }> => {
  const lens = page.locator("[data-page-magnifier-root] .fixed.rounded-full").first();
  const shot = await lens.screenshot();
  return await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBg = 0;
    let total = 0;
    const buckets = new Map<number, number>();
    const cx = c.width / 2;
    const cy = c.height / 2;
    const radius = Math.min(c.width, c.height) / 2 - 4;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) continue;
        total++;
        const i = (y * c.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 20 || g > 20 || b > 20) nonBg++;
        const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
    }
    let maxBucket = 0;
    for (const v of buckets.values()) if (v > maxBucket) maxBucket = v;
    return {
      ratio: nonBg / Math.max(1, total),
      uniformFrac: maxBucket / Math.max(1, total),
      total,
    };
  }, shot.toString("base64"));
};

test.describe("Community magnifier validation", () => {
  test("header is visible in lens (fixed elements survive scroll)", async ({ page }) => {
    await page.goto("/garden/article/seeking-community");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await page.locator("[data-magnifier-toggle]").click();
    await page.waitForTimeout(300);

    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(400);

    const headerHome = await page
      .locator("[data-testid='header-nav-home']")
      .first()
      .boundingBox();
    expect(headerHome).not.toBeNull();
    if (!headerHome) return;
    await page.mouse.move(
      headerHome.x + headerHome.width / 2,
      headerHome.y + headerHome.height / 2,
    );
    await page.waitForTimeout(800);

    const sample = await sampleLens(page);
    expect(sample.total).toBeGreaterThan(0);
    expect(sample.ratio).toBeGreaterThan(0.001);
    expect(sample.uniformFrac).toBeLessThan(0.999);
  });

  test("lens shows content at multiple scroll positions", async ({ page }) => {
    await page.goto("/garden/article/seeking-community");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await page.locator("[data-magnifier-toggle]").click();
    await page.waitForTimeout(300);

    for (const scrollY of [0, 800, 2000, 3500]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500);
      const para = await page.locator("p").first().boundingBox();
      const tx = para ? para.x + 40 : 200;
      const ty = para ? para.y + 12 : 360;
      await page.mouse.move(tx, ty);
      await page.waitForTimeout(700);
      const sample = await sampleLens(page);
      expect.soft(sample.ratio, `non-bg pixels at scroll=${scrollY}`).toBeGreaterThan(0.02);
      expect.soft(sample.uniformFrac, `uniformity at scroll=${scrollY}`).toBeLessThan(0.97);
    }
  });

});
