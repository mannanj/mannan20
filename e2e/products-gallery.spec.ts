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
  "Event Every",
  "SkillGuard",
  "claude-cues",
  "Meal Fairy",
];
const HIDDEN_PRODUCTS = ["Mannan MCP"];
const CONTACT_EMAIL = "hello@mannan.is";

async function enterGallery(page: Page) {
  await page.goto("/garden");
  await page.getByTestId("garden-tab-products").click();
  await page.getByTestId("products-gallery").waitFor();
  await page.getByTestId("gallery-attribution").waitFor({ state: "visible" });
  await page.waitForTimeout(2400);
}

test.describe("Phantom-style products gallery", () => {
  test("the #products hash deep-links straight into the immersive gallery", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/garden#products");
    await page.getByTestId("products-gallery").waitFor();

    await expect(page.getByTestId("products-gallery")).toBeVisible();
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
      "gallery-grid",
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

  test("grid view lists exactly the visible products, hides hidden, marks retired", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-grid").click();
    await page.getByTestId("gallery-grid-view").waitFor({ state: "visible" });

    await expect(page.locator('[data-testid^="gallery-grid-item-"]')).toHaveCount(
      VISIBLE_PRODUCTS.length,
    );
    const text = await page.getByTestId("gallery-grid-view").innerText();
    for (const title of VISIBLE_PRODUCTS) expect(text).toContain(title);
    for (const hidden of HIDDEN_PRODUCTS) expect(text).not.toContain(hidden);
    expect(text).toContain("Meal Fairy (retired)");

    await page.getByTestId("gallery-grid-close").click();
    await expect(page.getByTestId("gallery-grid-view")).toBeHidden();
  });

  test("filter narrows the products (retired facet)", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-grid").click();
    await page.getByTestId("gallery-grid-view").waitFor({ state: "visible" });
    await page.getByTestId("gallery-grid-filter-retired").click();

    await expect(page.locator('[data-testid^="gallery-grid-item-"]')).toHaveCount(1);
    await expect(page.getByTestId("gallery-grid-view")).toContainText("Meal Fairy");
    await expect(page.getByTestId("gallery-grid-view")).not.toContainText("Sun Signal");
  });

  test("opening a card animates in a detail page with a way back", async ({ page }) => {
    await enterGallery(page);
    await page.getByTestId("gallery-grid").click();
    await page.getByTestId("gallery-grid-item-sun-signal").click();

    await expect(page.getByTestId("product-detail")).toBeVisible();
    await expect(page.getByTestId("product-detail-title")).toHaveText("Sun Signal");
    await expect(page.getByTestId("product-detail-visit")).toHaveAttribute(
      "href",
      "https://sunsignal.app",
    );

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
    await page.getByTestId("garden-tab-products").click();
    await page.getByTestId("products-gallery").waitFor();
    await expect(page.getByTestId("gallery-attribution")).toBeVisible();
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
    await context.close();
  });
});
