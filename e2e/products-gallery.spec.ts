import { test, expect, type Page } from "@playwright/test";

test.use({
  launchOptions: {
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  },
});

const VISIBLE_PRODUCTS = [
  "Sun Signal",
  "Read Along",
  "Meal Fairy",
  "Poppy",
  "Greenlights",
  "Event Every",
  "SkillGuard",
  "claude-cues",
];
const HIDDEN_PRODUCTS = ["Mannan MCP"];
const CONTACT_EMAIL = "hello@mannan.is";

async function enterGallery(page: Page) {
  await page.goto("/garden");
  await page.getByTestId("garden-view-globe").click();
  await page.getByTestId("products-gallery").waitFor();
  await page.getByTestId("gallery-attribution").waitFor({ state: "visible" });
  await page.waitForTimeout(2400);
}

async function openCardDetail(page: Page): Promise<boolean> {
  const box = await page.locator('[data-testid="products-gallery"] canvas').boundingBox();
  if (!box) return false;
  const points: [number, number][] = [
    [0.44, 0.42], [0.58, 0.76], [0.67, 0.18], [0.87, 0.56],
    [0.16, 0.68], [0.5, 0.5], [0.36, 0.42], [0.64, 0.56],
    [0.5, 0.34], [0.44, 0.62], [0.6, 0.44], [0.3, 0.5],
    [0.7, 0.52], [0.18, 0.34], [0.76, 0.34], [0.82, 0.72],
  ];
  for (const [fx, fy] of points) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    if (await page.getByTestId("product-detail").isVisible().catch(() => false)) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

test.describe("Phantom-style products gallery", () => {
  test("the #products hash opens Showcase by default, and its Globe control opens the gallery", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/garden#products");
    await expect(page.getByTestId("garden-active-panel")).toHaveAttribute("data-panel", "products");
    await expect(page.getByTestId("products-showcase")).toBeVisible();
    await expect(page.getByTestId("garden-view-globe")).toBeVisible();

    await page.getByTestId("garden-view-globe").click();
    await page.getByTestId("products-gallery").waitFor();
    await expect(page.getByTestId("products-gallery").locator("canvas")).toHaveCount(1);
    await page.waitForTimeout(2400);
    expect(errors).toEqual([]);
  });

  test("HUD chrome renders the full phantom layout (parity pass)", async ({ page }) => {
    await enterGallery(page);
    for (const id of [
      "gallery-avatar-home",
      "gallery-pill-writings",
      "gallery-pill-products",
      "gallery-pill-readings",
      "gallery-filter-toggle",
      "gallery-lets-talk",
      "gallery-zoom",
      "gallery-view-showcase",
      "gallery-view-legacy",
      "gallery-sound",
      "gallery-attribution",
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });

  test("floating avatar links home", async ({ page }) => {
    await enterGallery(page);
    await expect(page.getByTestId("gallery-avatar-home")).toHaveAttribute("href", "/");
  });

  test("attribution credits phantom.land with the exact URL", async ({ page }) => {
    await enterGallery(page);
    await expect(page.getByTestId("gallery-attribution")).toHaveAttribute(
      "href",
      "https://www.phantom.land",
    );
  });

  test("Globe exposes only its Showcase and Legacy peer views", async ({ page }) => {
    await enterGallery(page);

    await expect(page.getByTestId("gallery-view-showcase")).toBeVisible();
    await expect(page.getByTestId("gallery-view-legacy")).toBeVisible();
    await expect(page.getByTestId("gallery-view-globe")).toHaveCount(0);
  });

  test("the Legacy control restores the old flat product cards and inactive view rail", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-view-legacy").click();

    await page.getByTestId("products-gallery").waitFor({ state: "detached" });
    const legacy = page.getByTestId("products-legacy");
    await expect(legacy.locator("a")).toHaveCount(VISIBLE_PRODUCTS.length);
    for (const hidden of HIDDEN_PRODUCTS) await expect(legacy).not.toContainText(hidden);
    await expect(page.getByTestId("garden-view-showcase")).toBeVisible();
    await expect(page.getByTestId("garden-view-globe")).toBeVisible();
    await expect(page.getByTestId("garden-view-legacy")).toHaveCount(0);

    await page.getByTestId("garden-view-globe").click();
    await expect(page.getByTestId("products-gallery")).toBeVisible();
  });

  test("the Showcase control exits Globe back to the default collection", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-view-showcase").click();

    await expect(page.getByTestId("products-gallery")).toHaveCount(0);
    await expect(page.getByTestId("products-showcase")).toBeVisible();
    await expect(page.getByTestId("garden-view-globe")).toBeVisible();
    await expect(page.getByTestId("garden-view-legacy")).toBeVisible();
    await expect(page.getByTestId("garden-view-showcase")).toHaveCount(0);
  });

  test("WebGL unavailability returns Globe to Showcase", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "WebGLRenderingContext", {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto("/garden");
    await page.getByTestId("garden-view-globe").click();

    await expect(page.getByTestId("products-gallery")).toHaveCount(0);
    await expect(page.getByTestId("products-showcase")).toBeVisible();
  });

  test("clicking a product card opens a basic detail page with a Back button", async ({ page }) => {
    await enterGallery(page);
    expect(await openCardDetail(page)).toBe(true);

    await expect(page.getByTestId("product-detail-title")).not.toBeEmpty();
    await expect(page.getByTestId("product-detail-visit")).toHaveAttribute("href", /.+/);
    await expect(page.getByTestId("product-detail-back")).toContainText("Back");
    await expect(page.getByTestId("product-detail-back")).not.toContainText("Gallery");
    await expect(page.getByTestId("product-detail")).not.toContainText("basic detail view");

    await page.getByTestId("product-detail-back").click();
    await expect(page.getByTestId("product-detail")).toHaveCount(0);
    await expect(page.getByTestId("products-gallery")).toBeVisible();
  });

  test("zoom icon steps through discrete levels", async ({ page }) => {
    await enterGallery(page);
    const zoom = page.getByTestId("gallery-zoom");
    await expect(zoom).toHaveAttribute("data-zoom-index", "0");
    await zoom.click();
    await expect(zoom).toHaveAttribute("data-zoom-index", "1");
    await zoom.click();
    await expect(zoom).toHaveAttribute("data-zoom-index", "2");
  });

  test("sound toggle is quiet by default and flips state", async ({ page }) => {
    await enterGallery(page);
    const sound = page.getByTestId("gallery-sound");
    await expect(sound).toHaveAttribute("data-sound", "off");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await sound.click();
    await expect(sound).toHaveAttribute("data-sound", "on");
    await expect(sound).toHaveAttribute("aria-pressed", "true");
  });

  test("Let's Talk overlay is gated for unvalidated visitors and leaks no contact data", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-lets-talk").click();
    await page.getByTestId("lets-talk-overlay").waitFor({ state: "visible" });

    await expect(page.getByTestId("lets-talk-gated")).toBeVisible();
    await expect(page.getByTestId("lets-talk-verify")).toBeVisible();
    await expect(page.getByTestId("lets-talk-revealed")).toHaveCount(0);
    expect(await page.content()).not.toContain(CONTACT_EMAIL);
  });

  test("Let's Talk verify routes through the existing contact-reveal modal", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-lets-talk").click();
    await page.getByTestId("lets-talk-verify").click();
    await expect(page.getByTestId("contact-modal")).toBeVisible();
  });

  test("validated visitors see real contact details in the overlay", async ({ page, context }) => {
    await context.addCookies([
      { name: "contact_revealed", value: "1", url: "http://localhost:3847" },
    ]);
    await enterGallery(page);
    await page.getByTestId("gallery-lets-talk").click();
    await page.getByTestId("lets-talk-overlay").waitFor({ state: "visible" });

    await expect(page.getByTestId("lets-talk-revealed")).toBeVisible();
    await expect(page.getByTestId("lets-talk-gated")).toHaveCount(0);
    await expect(page.getByTestId("lets-talk-email")).toHaveText(CONTACT_EMAIL);
  });

  test("switching category exits the gallery back to the flat garden", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-pill-writings").click();
    await page.getByTestId("products-gallery").waitFor({ state: "detached" });

    await expect(page.getByTestId("garden-active-panel")).toHaveAttribute(
      "data-panel",
      "writings",
    );
  });

  test("reduced-motion users still reach an interactive gallery", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/garden");
    await page.getByTestId("garden-view-globe").click();
    await page.getByTestId("products-gallery").waitFor();
    await expect(page.getByTestId("gallery-attribution")).toBeVisible();
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
    await context.close();
  });
});
