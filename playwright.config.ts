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
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'bun run dev',
    port: 3847,
    reuseExistingServer: true,
    env: {
      MANNAN_SESSION_SECRET: 'playwright-consent-session-secret',
    },
  },
});
