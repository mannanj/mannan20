import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { presignPutUrl } from '../src/drops/presign';

describe('presignPutUrl', () => {
  it('produces a SigV4 presigned PUT URL for the mannan-drops bucket', async () => {
    const url = await presignPutUrl(env, 'drops/share_abc/p1/uuid-photo.jpg', 600);
    const u = new URL(url);
    expect(u.host).toBe('testacct.r2.cloudflarestorage.com');
    expect(u.pathname).toBe('/mannan-drops/drops/share_abc/p1/uuid-photo.jpg');
    expect(u.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(u.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(u.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(u.searchParams.get('X-Amz-Credential')).toContain('testkeyid');
  });
});
