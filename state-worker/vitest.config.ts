import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const workers = {
  wrangler: { configPath: "./wrangler.jsonc" },
  miniflare: { bindings: { STATE_SERVICE_SECRET: "test-state-key" } },
};

export default defineConfig({
  plugins: [cloudflareTest(workers)],
});
