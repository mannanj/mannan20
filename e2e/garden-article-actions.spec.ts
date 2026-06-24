import { expect, test } from "@playwright/test";

test.describe("garden article header actions", () => {
  test("written articles always show disabled download and listen actions before assets exist", async ({ page }) => {
    await page.goto("/garden/article/health-longevity");

    const actions = page.getByTestId("garden-article-actions-health-longevity");
    await expect(actions).toBeVisible();

    const download = page.getByTestId("garden-article-download-health-longevity");
    const listen = page.getByTestId("garden-article-listen-health-longevity");

    await expect(download).toContainText("Download PDF");
    await expect(download).toHaveAttribute("aria-disabled", "true");
    await expect(download).not.toHaveAttribute("href", /.+/);
    await expect(download).toHaveCSS("cursor", "not-allowed");

    await expect(listen).toContainText("Listen");
    await expect(listen).toBeDisabled();
    await expect(listen).toHaveCSS("cursor", "not-allowed");
  });

  test("header actions sit inline to the right of a desktop article title", async ({ page }) => {
    await page.goto("/garden/article/seeking-community");

    const heading = page.getByRole("heading", { name: "On Seeking Community" });
    const actions = page.getByTestId("garden-article-actions-seeking-community");

    await expect(heading).toBeVisible();
    await expect(actions).toBeVisible();

    const headingBox = await heading.boundingBox();
    const actionsBox = await actions.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(actionsBox!.x).toBeGreaterThan(headingBox!.x + headingBox!.width - 4);
    expect(Math.abs(actionsBox!.y - headingBox!.y)).toBeLessThan(28);
  });
});
