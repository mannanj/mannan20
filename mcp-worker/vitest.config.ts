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
              const allowed = new Set(["funny-frustrations", "health-longevity", "seeking-community"]);
              const counts = new Map();
              const operations = new Map();
              const metrics = (slug) => ({ slug, views: 0, mcpFetches: counts.get(slug) ?? 0 });
              export class McpArticleStateService extends WorkerEntrypoint {
                async getArticleMetrics({ slug }) {
                  return allowed.has(slug) ? metrics(slug) : { error: "invalid_input" };
                }
                async incrementArticleFetch({ opId, slug }) {
                  if (!allowed.has(slug)) return { error: "invalid_input" };
                  if (operations.has(opId)) return operations.get(opId);
                  counts.set(slug, (counts.get(slug) ?? 0) + 1);
                  const result = metrics(slug);
                  operations.set(opId, result);
                  return result;
                }
                async resetArticleFetches({ opId, slug }) {
                  if (!allowed.has(slug)) return { error: "invalid_input" };
                  if (operations.has(opId)) return operations.get(opId);
                  counts.set(slug, 0);
                  const result = metrics(slug);
                  operations.set(opId, result);
                  return result;
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
