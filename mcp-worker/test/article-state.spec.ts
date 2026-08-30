import { describe, expect, it } from "vitest";
import {
  getArticleMetrics,
  recordArticleFetch,
  resetArticleFetches,
} from "../src/article-state";
import type { McpArticleStateService, WorkerEnv } from "../src/types";

function testEnv(service?: McpArticleStateService): WorkerEnv {
  return { MCP_ARTICLE_STATE: service } as WorkerEnv;
}

describe("MCP article state adapter", () => {
  it("records one operation with a unique operation id", async () => {
    const calls: Array<{ opId: string; slug: string }> = [];
    const service: McpArticleStateService = {
      async getArticleMetrics() {
        return { slug: "health-longevity", views: 0, mcpFetches: 0 };
      },
      async incrementArticleFetch(input) {
        calls.push(input);
        return { slug: input.slug, views: 0, mcpFetches: 1 };
      },
      async resetArticleFetches(input) {
        return { slug: input.slug, views: 0, mcpFetches: 0 };
      },
    };

    await recordArticleFetch(testEnv(service), "health-longevity");

    expect(calls).toHaveLength(1);
    expect(calls[0].slug).toBe("health-longevity");
    expect(calls[0].opId).toMatch(/^[a-f0-9]{32}$/);
  });

  it("keeps article serving available when state is missing or throws", async () => {
    await expect(recordArticleFetch(testEnv(), "health-longevity")).resolves.toBeUndefined();
    const throwing = {
      async incrementArticleFetch() {
        throw new Error("state unavailable");
      },
    } as McpArticleStateService;
    await expect(recordArticleFetch(testEnv(throwing), "health-longevity")).resolves.toBeUndefined();
  });

  it("uses strict state reads and resets for maintenance", async () => {
    let reset = false;
    const service = {
      async getArticleMetrics(input: { slug: string }) {
        return { slug: input.slug, views: 8, mcpFetches: reset ? 0 : 4 };
      },
      async incrementArticleFetch(input: { slug: string }) {
        return { slug: input.slug, views: 8, mcpFetches: 5 };
      },
      async resetArticleFetches(input: { slug: string }) {
        reset = true;
        return { slug: input.slug, views: 8, mcpFetches: 0 };
      },
    } as McpArticleStateService;

    await expect(getArticleMetrics(testEnv(service), "seeking-community")).resolves.toMatchObject({
      mcpFetches: 4,
    });
    await expect(resetArticleFetches(testEnv(service), "seeking-community")).resolves.toMatchObject({
      mcpFetches: 0,
    });
    await expect(getArticleMetrics(testEnv(), "seeking-community")).rejects.toThrow(
      "MCP article state is unavailable",
    );
  });
});
