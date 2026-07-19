import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          SERVICE_AUTH_SECRET: 'test-service-secret-not-production',
          VIEWER_TOKEN_SECRET: 'test-viewer-secret-not-production',
        },
      },
    }),
  ],
});
