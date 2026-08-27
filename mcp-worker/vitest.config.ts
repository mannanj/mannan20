import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        workers: [
          {
            name: "portfolio-state-worker",
            modules: true,
            script: `
              import { WorkerEntrypoint } from "cloudflare:workers";
              export class McpArticleStateService extends WorkerEntrypoint {
                async getArticleMetrics({ slug }) {
                  return { slug, views: 0, mcpFetches: 0 };
                }
                async incrementArticleFetch({ slug }) {
                  return { slug, views: 0, mcpFetches: 1 };
                }
                async resetArticleFetches({ slug }) {
                  return { slug, views: 0, mcpFetches: 0 };
                }
              }
              export default { fetch() { return new Response("not found", { status: 404 }); } };
            `,
          },
        ],
      },
    }),
  ],
});
