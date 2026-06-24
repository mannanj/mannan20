import { describe, expect, test } from "bun:test";
import type { AudioChunk } from "@/lib/audio-config";
import {
  resolveGardenArticleActions,
  type GardenArticleActionConfig,
} from "./garden-article-actions";

const chunks: AudioChunk[] = [
  { url: "/audio/example/chunk-1.wav", key: "example/chunk-1", label: "Part 1" },
];

describe("garden article actions", () => {
  test("marks download and listen actions unavailable when no assets are configured", () => {
    const actions = resolveGardenArticleActions("missing-article", {});

    expect(actions.download.enabled).toBe(false);
    expect(actions.download.href).toBeNull();
    expect(actions.listen.enabled).toBe(false);
    expect(actions.listen.chunks).toEqual([]);
  });

  test("enables download and listen actions when real assets are configured", () => {
    const config: GardenArticleActionConfig = {
      "health-longevity": {
        download: { href: "/api/download/health-longevity" },
        listen: { chunks },
      },
    };

    const actions = resolveGardenArticleActions("health-longevity", config);

    expect(actions.download.enabled).toBe(true);
    expect(actions.download.href).toBe("/api/download/health-longevity");
    expect(actions.listen.enabled).toBe(true);
    expect(actions.listen.chunks).toEqual(chunks);
  });
});
