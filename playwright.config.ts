import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:3847',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'bun run dev',
    port: 3847,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'e2e-synthetic-turnstile-site-key',
      NEXT_PUBLIC_TURNSTILE_WORKER_URL: 'https://e2e.invalid/turnstile-siteverify-mannan20',
    },
  },
});
