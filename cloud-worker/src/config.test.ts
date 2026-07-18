import { describe, expect, test } from 'bun:test';

interface Binding {
  binding?: string;
  bucket_name?: string;
  database_name?: string;
  database_id?: string;
  name?: string;
  namespace_id?: string;
  simple?: { limit: number; period: number };
}

interface WorkerConfig {
  vars?: Record<string, string>;
  d1_databases?: Binding[];
  r2_buckets?: Binding[];
  ratelimits?: Binding[];
  env?: Record<string, WorkerConfig & { name?: string }>;
}

const config = JSON.parse(
  await Bun.file(new URL('../wrangler.jsonc', import.meta.url)).text(),
) as WorkerConfig;

function binding(items: Binding[] | undefined, name: string): Binding | undefined {
  return items?.find((item) => item.binding === name || item.name === name);
}

describe('storage boundary configuration', () => {
  test('keeps the production general-files binding on the public bucket before cutover', () => {
    expect(binding(config.r2_buckets, 'FILES')?.bucket_name).toBe('portfolio-files');
  });

  test('declares the authenticated file limiter in production', () => {
    expect(binding(config.ratelimits, 'FILES_LIMITER')).toEqual({
      name: 'FILES_LIMITER',
      namespace_id: '1003',
      simple: { limit: 120, period: 60 },
    });
  });

  test('defines an isolated storage canary with the private general-files bucket', () => {
    const canary = config.env?.['storage-canary'];
    expect(canary?.name).toBe('cloud-worker-storage-canary');
    expect(binding(canary?.r2_buckets, 'FILES')?.bucket_name).toBe('portfolio-private-files');
    expect(binding(canary?.r2_buckets, 'FILES_HANS')?.bucket_name).toBe('mannan-hans');
    expect(binding(canary?.r2_buckets, 'FILES_BACKUPS')?.bucket_name).toBe(
      'deep-calm-weave-backups',
    );
    expect(binding(canary?.d1_databases, 'DB')).toMatchObject({
      database_name: 'cloud',
      database_id: '6aac55fe-a879-40ea-891e-4723cdb60891',
    });
    expect(binding(canary?.ratelimits, 'FILES_LIMITER')).toEqual({
      name: 'FILES_LIMITER',
      namespace_id: '1103',
      simple: { limit: 120, period: 60 },
    });
  });

  test('defines identity staging on the shared account database without production file access', () => {
    const staging = config.env?.['identity-staging'];

    expect(staging?.name).toBe('cloud-worker-identity-staging');
    expect(binding(staging?.d1_databases, 'DB')).toMatchObject({
      database_name: 'cloud',
      database_id: '6aac55fe-a879-40ea-891e-4723cdb60891',
    });
    expect(binding(staging?.r2_buckets, 'FILES')?.bucket_name).toBe(
      'cloud-identity-staging-files',
    );
    expect(binding(staging?.r2_buckets, 'FILES_HANS')?.bucket_name).toBe(
      'cloud-identity-staging-hans',
    );
    expect(binding(staging?.r2_buckets, 'FILES_BACKUPS')?.bucket_name).toBe(
      'cloud-identity-staging-backups',
    );
    expect(staging?.vars?.PUBLIC_BASE_URL).toBe(
      'https://cloud-worker-identity-staging.mannanteam.workers.dev',
    );
    expect(staging?.vars?.SITE_AUTH_RETURN_URL).toBe(
      'https://meet-staging-mannan20.vercel.app/api/auth/cloudflare-callback',
    );
  });

  test('never stores Worker secrets in plain-text vars', () => {
    const secretNames = ['SESSION_SECRET', 'RESEND_API_KEY', 'SITE_AUTH_EXCHANGE_SECRET'];
    for (const vars of [
      config.vars,
      config.env?.['storage-canary']?.vars,
      config.env?.['identity-staging']?.vars,
    ]) {
      for (const name of secretNames) expect(vars).not.toHaveProperty(name);
    }
  });
});
