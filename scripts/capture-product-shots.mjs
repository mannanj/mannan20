import { chromium } from "@playwright/test";

const SHOTS = [
  { url: "https://meal-fairy-ce3bf.web.app", out: "public/meal-fairy.png" },
  { url: "https://skillguard.sh", out: "public/skillguard.png" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1000, height: 760 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const { url, out } of SHOTS) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1000, height: 760 } });
  console.log("captured", out);
}

await browser.close();
