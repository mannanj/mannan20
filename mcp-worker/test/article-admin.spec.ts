import { describe, expect, it } from "vitest";
import { handleArticleAdminRequest } from "../src/index";
import type { McpArticleStateService, WorkerEnv } from "../src/types";

function request(body: unknown, secret = "test-admin-secret") {
  return new Request("https://example.com/admin/article-fetches", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    MCP_ADMIN_SECRET: "test-admin-secret",
    ...overrides,
  } as WorkerEnv;
}

describe("MCP article maintenance route", () => {
  it("fails closed without its secret or state binding", async () => {
    expect((await handleArticleAdminRequest(request({}), env({ MCP_ADMIN_SECRET: undefined }))).status).toBe(503);
    expect((await handleArticleAdminRequest(request({}), env())).status).toBe(503);
  });

  it("rejects wrong authorization, invalid actions, and excluded slugs", async () => {
    const service = {} as McpArticleStateService;
    expect(
      (await handleArticleAdminRequest(request({ action: "get", slug: "health-longevity" }, "wrong"), env({ MCP_ARTICLE_STATE: service }))).status,
    ).toBe(401);
    expect(
      (await handleArticleAdminRequest(request({ action: "delete", slug: "health-longevity" }), env({ MCP_ARTICLE_STATE: service }))).status,
    ).toBe(400);
    expect(
      (await handleArticleAdminRequest(request({ action: "get", slug: "taken" }), env({ MCP_ARTICLE_STATE: service }))).status,
    ).toBe(400);
  });

  it("gets and resets exact public article metrics", async () => {
    const actions: string[] = [];
    const service = {
      async getArticleMetrics(input: { slug: string }) {
        actions.push(`get:${input.slug}`);
        return { slug: input.slug, views: 12, mcpFetches: 4 };
      },
      async incrementArticleFetch(input: { slug: string }) {
        return { slug: input.slug, views: 12, mcpFetches: 5 };
      },
      async resetArticleFetches(input: { slug: string }) {
        actions.push(`reset:${input.slug}`);
        return { slug: input.slug, views: 12, mcpFetches: 0 };
      },
    } as McpArticleStateService;
    const configured = env({ MCP_ARTICLE_STATE: service });

    const get = await handleArticleAdminRequest(
      request({ action: "get", slug: "health-longevity" }),
      configured,
    );
    expect(get.status).toBe(200);
    await expect(get.json()).resolves.toEqual({
      slug: "health-longevity",
      views: 12,
      mcpFetches: 4,
    });

    const reset = await handleArticleAdminRequest(
      request({ action: "reset", slug: "health-longevity" }),
      configured,
    );
    expect(reset.status).toBe(200);
    await expect(reset.json()).resolves.toMatchObject({ mcpFetches: 0 });
    expect(actions).toEqual(["get:health-longevity", "reset:health-longevity"]);
  });
});
