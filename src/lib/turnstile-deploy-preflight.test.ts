import { describe, expect, test } from 'bun:test';
import packageJson from '../../package.json';

describe('Turnstile deployment preflight', () => {
  test('production deploy runs the preflight before the Cloudflare build', () => {
    expect(packageJson.scripts.deploy).toBe('bun run cf:deploy:production');
    expect(packageJson.scripts['cf:deploy:production']).toStartWith(
      'node scripts/check-turnstile-public-env.mjs && ',
    );
  });

  test('reports every missing public Turnstile variable without exposing values', async () => {
    const modulePath: string = '../../scripts/check-turnstile-public-env.mjs';
    const preflight = await import(modulePath).catch(() => null);

    expect(preflight).not.toBeNull();
    if (!preflight) return;

    expect(preflight.findMissingTurnstilePublicEnv({})).toEqual([
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'NEXT_PUBLIC_TURNSTILE_WORKER_URL',
    ]);
    expect(
      preflight.findMissingTurnstilePublicEnv({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site-key',
        NEXT_PUBLIC_TURNSTILE_WORKER_URL: 'https://worker.example',
      }),
    ).toEqual([]);
  });
});
