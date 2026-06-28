import { expect, test, type Locator, type Page } from "@playwright/test";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

async function getBox(locator: Locator): Promise<Rect> {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();

  return {
    ...box!,
    right: box!.x + box!.width,
    bottom: box!.y + box!.height,
  };
}

async function getLastLineBox(locator: Locator): Promise<Rect> {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    );
    range.detach();

    const last =
      rects.sort((a, b) => a.bottom - b.bottom || a.right - b.right).at(-1) ??
      element.getBoundingClientRect();

    return {
      x: last.x,
      y: last.y,
      width: last.width,
      height: last.height,
      right: last.right,
      bottom: last.bottom,
    };
  });
}

function centerX(rect: Rect) {
  return rect.x + rect.width / 2;
}

function centerY(rect: Rect) {
  return rect.y + rect.height / 2;
}

async function expectArticleActionLinksOnOneLine(page: Page, slug: string) {
  const download = page.getByTestId(`garden-article-download-${slug}`);
  const listen = page.getByTestId(`garden-article-listen-${slug}`);

  await expect(download).toBeVisible();
  await expect(listen).toBeVisible();

  const downloadBox = await getBox(download);
  const listenBox = await getBox(listen);

  expect(Math.abs(centerY(downloadBox) - centerY(listenBox))).toBeLessThanOrEqual(3);
  expect(listenBox.x).toBeGreaterThan(downloadBox.x + downloadBox.width);
}

async function expectActionsAnchoredToMetadata({
  page,
  slug,
  headingName,
  metaText,
  metaTreatment,
  centeredMeta = false,
}: {
  page: Page;
  slug: string;
  headingName: string;
  metaText: string;
  metaTreatment: Locator;
  centeredMeta?: boolean;
}) {
  const heading = page.getByRole("heading", { name: headingName });
  const actions = page.getByTestId(`garden-article-actions-${slug}`);

  await expect(heading).toBeVisible();
  await expect(page.getByText(metaText, { exact: true })).toBeVisible();
  await expect(actions).toBeVisible();

  const headingLine = await getLastLineBox(heading);
  const metaBox = await getBox(metaTreatment);
  const actionsBox = await getBox(actions);

  expect(actionsBox.x).toBeGreaterThanOrEqual(metaBox.right + 8);
  expect(Math.abs(actionsBox.bottom - metaBox.bottom)).toBeLessThanOrEqual(5);

  expect(Math.abs(centerY(actionsBox) - centerY(headingLine))).toBeGreaterThan(12);
  expect(Math.abs(actionsBox.bottom - headingLine.bottom)).toBeGreaterThan(12);

  if (centeredMeta) {
    const viewport = page.viewportSize();

    expect(viewport).not.toBeNull();
    expect(Math.abs(centerX(metaBox) - viewport!.width / 2)).toBeLessThanOrEqual(3);
  }

  await expectArticleActionLinksOnOneLine(page, slug);
}

test.describe("garden article metadata actions", () => {
  test("configured written articles show clickable download and listen actions", async ({ page }) => {
    await page.goto("/garden/article/health-longevity");

    const actions = page.getByTestId("garden-article-actions-health-longevity");
    await expect(actions).toBeVisible();

    const download = page.getByTestId("garden-article-download-health-longevity");
    const listen = page.getByTestId("garden-article-listen-health-longevity");

    await expect(download).toContainText("Download");
    await expect(download).not.toContainText("PDF");
    await expect(download).toHaveAttribute("href", "/api/download/health-longevity");
    await expect(download).toHaveAttribute("aria-disabled", "false");
    await expect(download).toHaveCSS("cursor", "pointer");

    await expect(listen).toContainText("Listen");
    await expect(listen).toBeEnabled();
    await expect(listen).toHaveCSS("cursor", "pointer");
  });

  test("unconfigured written articles do not show metadata actions", async ({ page }) => {
    await page.goto("/garden/article/taken");

    await expect(page.getByRole("heading", { name: "Taken" })).toBeVisible();
    await expect(page.getByTestId("garden-article-actions-taken")).toHaveCount(0);
  });

  test("metadata actions sit to the right of the centered Health metadata pill", async ({
    page,
  }) => {
    await page.goto("/garden/article/health-longevity");

    const metaText = page.getByText("March 15, 2026 · 3 min read", {
      exact: true,
    });

    await expectActionsAnchoredToMetadata({
      page,
      slug: "health-longevity",
      headingName: "Health is an Artform",
      metaText: "March 15, 2026 · 3 min read",
      metaTreatment: metaText.locator("xpath=.."),
      centeredMeta: true,
    });
  });

  test("metadata actions sit to the right of the Seeking Community inline metadata", async ({
    page,
  }) => {
    await page.goto("/garden/article/seeking-community");

    const metaText = "April 7, 2026 · 8 min read · 1,800 words";

    await expectActionsAnchoredToMetadata({
      page,
      slug: "seeking-community",
      headingName: "On Seeking Community",
      metaText,
      metaTreatment: page.getByText(metaText, { exact: true }),
    });
  });

  test("metadata actions are added to configured articles that did not have visible metadata", async ({
    page,
  }) => {
    await page.goto("/garden/article/self-parenting");

    const metaText = "June 2, 2026 · 3 min read · 480 words";

    await expectActionsAnchoredToMetadata({
      page,
      slug: "self-parenting",
      headingName: "Here are some things I've learned about parenting",
      metaText,
      metaTreatment: page.getByText(metaText, { exact: true }),
      centeredMeta: true,
    });
  });

  test("centered article titles do not shift when metadata actions are present", async ({
    page,
  }) => {
    await page.goto("/garden/article/health-longevity");

    const heading = page.getByRole("heading", { name: "Health is an Artform" });
    const actions = page.getByTestId("garden-article-actions-health-longevity");

    await expect(heading).toBeVisible();
    await expect(actions).toBeVisible();

    const headingBox = await getBox(heading);
    const viewport = page.viewportSize();

    expect(viewport).not.toBeNull();
    expect(Math.abs(centerX(headingBox) - viewport!.width / 2)).toBeLessThanOrEqual(2);
  });

  test("configured article Listen opens the bottom audio player", async ({ page }) => {
    await page.route("**/portfolio/audio/health-longevity/chunk-*.wav", async (route) => {
      const url = route.request().url();
      const chunk = url.includes("chunk-2.wav") ? "chunk-2.wav" : "chunk-1.wav";
      await route.fulfill({
        path: `public/data/audio/health-longevity/${chunk}`,
        contentType: "audio/wav",
      });
    });

    await page.goto("/garden/article/health-longevity");
    await page.getByTestId("garden-article-listen-health-longevity").click();

    await expect(page.getByTestId("audio-player-bar")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("audio-chunk-0")).toContainText("Part 1");
    await expect(page.getByTestId("audio-chunk-1")).toContainText("Part 2");
  });

  test("metadata actions wrap below the metadata pill on narrow screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto("/garden/article/health-longevity");

    const heading = page.getByRole("heading", { name: "Health is an Artform" });
    const metaText = page.getByText("March 15, 2026 · 3 min read", {
      exact: true,
    });
    const metaTreatment = metaText.locator("xpath=..");
    const actions = page.getByTestId("garden-article-actions-health-longevity");

    await expect(heading).toBeVisible();
    await expect(metaText).toBeVisible();
    await expect(actions).toBeVisible();

    const headingBox = await getBox(heading);
    const metaBox = await getBox(metaTreatment);
    const actionsBox = await getBox(actions);
    const viewport = page.viewportSize();

    expect(viewport).not.toBeNull();
    expect(Math.abs(centerX(headingBox) - viewport!.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(centerX(metaBox) - viewport!.width / 2)).toBeLessThanOrEqual(3);
    expect(actionsBox.y).toBeGreaterThanOrEqual(metaBox.bottom - 1);
    expect(actionsBox.y - metaBox.bottom).toBeLessThanOrEqual(8);
    expect(actionsBox.y).toBeGreaterThan(headingBox.bottom);
    expect(actionsBox.right).toBeLessThanOrEqual(viewport!.width - 16);
  });
});
