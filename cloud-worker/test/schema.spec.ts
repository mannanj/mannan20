import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('worker test harness', () => {
  it('applies existing migrations and exposes D1', async () => {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first<{ name: string }>();
    expect(row?.name).toBe('users');
  });
});
