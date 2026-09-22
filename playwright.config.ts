import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

function loadLocalEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, '');
  }
}

loadLocalEnv('.env.local');

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: externalBaseURL ?? 'http://localhost:3847',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'bun run dev',
        port: 3847,
        reuseExistingServer: true,
      },
});
