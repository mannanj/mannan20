import { describe, expect, test } from "bun:test";
import { GALLERY_PRODUCTS } from "./gallery-data";

describe("gallery product classification", () => {
  test("only SkillGuard and claude-cues are marked AI-designed", () => {
    const aiDesigned = GALLERY_PRODUCTS.filter((product) => product.aiDesigned).map(
      (product) => product.title,
    );

    expect(aiDesigned).toEqual(["SkillGuard", "claude-cues"]);
  });
});
