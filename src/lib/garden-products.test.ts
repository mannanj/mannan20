import { describe, expect, test } from "bun:test";
import {
  GARDEN_PRODUCTS,
  getGardenProductActions,
  getVisibleGardenProducts,
} from "./garden-products";

describe("garden products", () => {
  test("keeps the approved visible order and tools split", () => {
    const visible = getVisibleGardenProducts();

    expect(visible.map((product) => product.title)).toEqual([
      "Sun Signal",
      "Read Along",
      "Meal Fairy",
      "Poppy",
      "Greenlights",
      "Event Every",
      "SkillGuard",
      "claude-cues",
    ]);
    expect(
      visible.slice(0, 3).every((product) => product.group === "products"),
    ).toBe(true);
    expect(
      visible.slice(3).every((product) => product.group === "tools"),
    ).toBe(true);
  });

  test("uses the approved public source URLs", () => {
    const sourceByTitle = Object.fromEntries(
      getVisibleGardenProducts().map((product) => [
        product.title,
        product.sourceHref,
      ]),
    );

    expect(sourceByTitle).toMatchObject({
      "Sun Signal": "https://github.com/mannanj/sun-signal",
      "Event Every": "https://github.com/mannanj/event-every",
      SkillGuard: "https://github.com/mannanj/skillguard",
      "claude-cues": "https://github.com/mannanj/beep-boop",
    });
  });

  test("prefers source, then download, then explore", () => {
    const sun = GARDEN_PRODUCTS.find(
      (product) => product.title === "Sun Signal",
    )!;
    const poppy = GARDEN_PRODUCTS.find(
      (product) => product.title === "Poppy",
    )!;
    const readAlong = GARDEN_PRODUCTS.find(
      (product) => product.title === "Read Along",
    )!;

    expect(getGardenProductActions(sun)[0]).toMatchObject({
      label: "View Source",
      href: "https://github.com/mannanj/sun-signal",
    });
    expect(getGardenProductActions(poppy)[0]).toMatchObject({
      label: "Download Poppy",
      href: "https://getpoppy.io/download",
    });
    expect(getGardenProductActions(readAlong)).toEqual([
      {
        label: "Explore Read Along",
        href: "https://tryreadalong.com",
        kind: "explore",
      },
    ]);
  });
});
