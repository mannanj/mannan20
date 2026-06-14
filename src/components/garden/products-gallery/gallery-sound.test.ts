import { describe, expect, test } from "bun:test";
import { getGallerySound } from "./gallery-sound";

describe("gallery sound", () => {
  test("a fresh singleton is silent by default until explicitly enabled", () => {
    expect(getGallerySound().isEnabled()).toBe(false);
  });
});
