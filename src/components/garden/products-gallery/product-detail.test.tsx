import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductDetail } from "./product-detail";
import { GALLERY_PRODUCTS } from "./gallery-data";

describe("product detail metadata", () => {
  test("shows the AI-Designed disclosure beside the year for an AI-designed app", () => {
    const product = GALLERY_PRODUCTS.find((item) => item.title === "claude-cues");
    if (!product) throw new Error("claude-cues fixture missing");

    const markup = renderToStaticMarkup(
      <ProductDetail product={product} onClose={() => undefined} />,
    );

    expect(markup).toContain("2026");
    expect(markup).toContain("AI-Designed");
    expect(markup).toContain(
      "These apps were designed primarily with AI and have received limited human review or refinement.",
    );
  });

  test("does not show the AI-Designed disclosure for other products", () => {
    const product = GALLERY_PRODUCTS.find((item) => item.title === "Poppy");
    if (!product) throw new Error("Poppy fixture missing");

    const markup = renderToStaticMarkup(
      <ProductDetail product={product} onClose={() => undefined} />,
    );

    expect(markup).not.toContain("AI-Designed");
  });
});
