import { chromium } from "@playwright/test";

const SHOTS = [
  {
    name: "Greenlights",
    url: "https://www.gogo.green",
    out: "public/greenlights.png",
  },
  { url: "https://meal-fairy-ce3bf.web.app", out: "public/meal-fairy.png" },
  { url: "https://skillguard.sh", out: "public/skillguard.png" },
];

const selected = process.argv[2]?.toLowerCase();
const shots = selected
  ? SHOTS.filter((shot) =>
      [shot.name, shot.url, shot.out].some((value) =>
        value?.toLowerCase().includes(selected),
      ),
    )
  : SHOTS;

if (selected && shots.length === 0) {
  console.error(`No product shot matched "${process.argv[2]}".`);
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1000, height: 760 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const { url, out } of shots) {
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
