import { expect, test } from "@playwright/test";

async function expectActionsInlineWithHeading(
  page: import("@playwright/test").Page,
  headingName: string,
  actionsTestId: string,
) {
  const heading = page.getByRole("heading", { name: headingName });
  const actions = page.getByTestId(actionsTestId);

  await expect(heading).toBeVisible();
  await expect(actions).toBeVisible();

  const lastLineBox = await heading.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    );
    range.detach();
    const last = rects.sort(
      (a, b) => a.bottom - b.bottom || a.right - b.right,
    )[rects.length - 1] ?? element.getBoundingClientRect();

    return {
      x: last.x,
      y: last.y,
      width: last.width,
      height: last.height,
      right: last.right,
    };
  });

  await expect
    .poll(async () => {
      const actionsBox = await actions.boundingBox();
      if (!actionsBox) return Number.POSITIVE_INFINITY;
      return Math.abs(
        actionsBox.y +
          actionsBox.height / 2 -
          (lastLineBox.y + lastLineBox.height / 2),
      );
    })
    .toBeLessThanOrEqual(6);

  const actionsBox = await actions.boundingBox();

  expect(actionsBox).not.toBeNull();
  expect(actionsBox!.x).toBeGreaterThan(lastLineBox.right - 4);
}

async function expectArticleActionLinksOnOneLine(
  page: import("@playwright/test").Page,
  slug: string,
) {
  const download = page.getByTestId(`garden-article-download-${slug}`);
  const listen = page.getByTestId(`garden-article-listen-${slug}`);

  await expect(download).toBeVisible();
  await expect(listen).toBeVisible();

  const downloadBox = await download.boundingBox();
  const listenBox = await listen.boundingBox();

  expect(downloadBox).not.toBeNull();
  expect(listenBox).not.toBeNull();
  expect(
    Math.abs(
      downloadBox!.y +
        downloadBox!.height / 2 -
        (listenBox!.y + listenBox!.height / 2),
    ),
  ).toBeLessThanOrEqual(3);
  expect(listenBox!.x).toBeGreaterThan(downloadBox!.x + downloadBox!.width);
}

test.describe("garden article header actions", () => {
  test("configured written articles show clickable download and listen actions", async ({ page }) => {
    await page.goto("/garden/article/health-longevity");

    const actions = page.getByTestId("garden-article-actions-health-longevity");
    await expect(actions).toBeVisible();

    const download = page.getByTestId("garden-article-download-health-longevity");
    const listen = page.getByTestId("garden-article-listen-health-longevity");

    await expect(download).toContainText("Download PDF");
    await expect(download).toHaveAttribute("href", "/api/download/health-longevity");
    await expect(download).toHaveAttribute("aria-disabled", "false");
    await expect(download).toHaveCSS("cursor", "pointer");

    await expect(listen).toContainText("Listen");
    await expect(listen).toBeEnabled();
    await expect(listen).toHaveCSS("cursor", "pointer");
  });

  test("unconfigured written articles do not show header actions", async ({ page }) => {
    await page.goto("/garden/article/taken");

    await expect(page.getByRole("heading", { name: "Taken" })).toBeVisible();
    await expect(page.getByTestId("garden-article-actions-taken")).toHaveCount(0);
  });

  test("header actions sit inline to the right of a desktop article title", async ({ page }) => {
    await page.goto("/garden/article/seeking-community");

    await expectActionsInlineWithHeading(
      page,
      "On Seeking Community",
      "garden-article-actions-seeking-community",
    );
  });

  test("centered desktop article titles keep actions inline when there is room", async ({ page }) => {
    for (const article of [
      {
        path: "/garden/article/health-longevity",
        heading: "Health is an Artform",
        actions: "garden-article-actions-health-longevity",
        slug: "health-longevity",
      },
      {
        path: "/garden/article/ai-false-positives",
        heading: "AI false positives",
        actions: "garden-article-actions-ai-false-positives",
        slug: "ai-false-positives",
      },
    ]) {
      await page.goto(article.path);
      await expectActionsInlineWithHeading(page, article.heading, article.actions);
      await expectArticleActionLinksOnOneLine(page, article.slug);
    }
  });

  test("centered article titles do not shift when header actions are present", async ({ page }) => {
    await page.goto("/garden/article/health-longevity");

    const heading = page.getByRole("heading", { name: "Health is an Artform" });
    const actions = page.getByTestId("garden-article-actions-health-longevity");

    await expect(heading).toBeVisible();
    await expect(actions).toBeVisible();

    const headingBox = await heading.boundingBox();
    const viewport = page.viewportSize();

    expect(headingBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    const headingCenter = headingBox!.x + headingBox!.width / 2;
    const viewportCenter = viewport!.width / 2;

    expect(Math.abs(headingCenter - viewportCenter)).toBeLessThanOrEqual(2);
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

    await expect(page.getByTestId("audio-player-bar")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("audio-chunk-0")).toContainText("Part 1");
    await expect(page.getByTestId("audio-chunk-1")).toContainText("Part 2");
  });

  test("header actions wrap below centered titles on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto("/garden/article/health-longevity");

    const heading = page.getByRole("heading", { name: "Health is an Artform" });
    const actions = page.getByTestId("garden-article-actions-health-longevity");

    await expect(heading).toBeVisible();
    await expect(actions).toBeVisible();

    const headingBox = await heading.boundingBox();
    const actionsBox = await actions.boundingBox();
    const viewport = page.viewportSize();

    expect(headingBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    const headingCenter = headingBox!.x + headingBox!.width / 2;
    expect(Math.abs(headingCenter - viewport!.width / 2)).toBeLessThanOrEqual(2);
    expect(actionsBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height - 2);
    expect(actionsBox!.y - (headingBox!.y + headingBox!.height)).toBeLessThanOrEqual(4);
  });

  test("long desktop titles keep actions inline when there is viewport room", async ({ page }) => {
    await page.goto("/garden/article/self-parenting");

    await expectActionsInlineWithHeading(
      page,
      "Here are some things I've learned about parenting",
      "garden-article-actions-self-parenting",
    );
    await expectArticleActionLinksOnOneLine(page, "self-parenting");
  });
});
