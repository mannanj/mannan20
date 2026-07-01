import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            SESSION_SECRET: 'test-session-secret',
            SITE_AUTH_EXCHANGE_SECRET: 'test-bearer-secret',
            RESEND_API_KEY: 'test-resend-key',
            R2_ACCOUNT_ID: 'testacct',
            R2_ACCESS_KEY_ID: 'testkeyid',
            R2_SECRET_ACCESS_KEY: 'testsecretkey',
          },
        },
      }),
    ],
    test: {
      include: ['test/**/*.spec.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
