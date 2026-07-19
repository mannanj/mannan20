import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { verifyViewerToken } from '../src/crypto';
import type { MannaRoom } from '../src/room';

const SERVICE_SECRET = 'test-service-secret-not-production';
const VIEWER_SECRET = 'test-viewer-secret-not-production';

describe('collector enrollment and revocation', () => {
  it('creates a ten-minute enrollment and exchanges it exactly once', async () => {
    const viewer = await mintViewer('enroll-once@mannan.is');
    const enrollmentResponse = await request('/v1/enrollments', viewer, {
      method: 'POST',
    });
    const enrollment = await enrollmentResponse.json<{
      code: string;
      expiresAt: string;
    }>();

    expect(enrollmentResponse.status).toBe(200);
    expect(enrollment.code).toMatch(/^mne1\.[a-f0-9]{64}\./);
    expect(Date.parse(enrollment.expiresAt) - Date.now()).toBeLessThanOrEqual(600_000);

    const exchanged = await exchange(enrollment.code, "Mannan's Mac");
    const body = await exchanged.json<{
      deviceToken: string;
      device: { id: string; name: string; revokedAt: null };
    }>();
    expect(exchanged.status).toBe(200);
    expect(body.deviceToken).toMatch(/^mnd1\.[a-f0-9]{64}\./);
    expect(body.device).toMatchObject({ name: "Mannan's Mac", revokedAt: null });

    const repeated = await exchange(enrollment.code, "Mannan's Mac");
    expect(repeated.status).toBe(400);
    expect(await repeated.json()).toEqual({ error: 'invalid_enrollment' });
  });

  it('expires enrollments and stores only credential hashes', async () => {
    const viewer = await mintViewer('expiry@mannan.is');
    const claims = await verifyViewerToken(viewer, VIEWER_SECRET, Math.floor(Date.now() / 1000));
    expect(claims).not.toBeNull();
    const room = env.MANNA_ROOM.getByName(claims!.accountKey);
    const enrollment = await room.createEnrollment(claims!.accountKey, 1_000);

    expect(await room.exchangeEnrollment(enrollment.code, 'Expired Mac', 601_001)).toBeNull();

    const fresh = await room.createEnrollment(claims!.accountKey, Date.now());
    const device = await room.exchangeEnrollment(fresh.code, 'Private Mac', Date.now());
    expect(device).not.toBeNull();

    await runInDurableObject(room, async (_instance: MannaRoom, state) => {
      const rows = state.storage.sql
        .exec<{ token_hash: string }>('SELECT token_hash FROM devices')
        .toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(rows)).not.toContain(device!.deviceToken);
    });
  });

  it('authenticates a device, lists safe metadata, and revokes immediately', async () => {
    const viewer = await mintViewer('revoke@mannan.is');
    const enrollmentResponse = await request('/v1/enrollments', viewer, { method: 'POST' });
    const { code } = await enrollmentResponse.json<{ code: string }>();
    const exchangeResponse = await exchange(code, "Mannan's Mac");
    const { deviceToken, device } = await exchangeResponse.json<{
      deviceToken: string;
      device: { id: string };
    }>();

    const accepted = await request('/v1/events', deviceToken, {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
      headers: { 'content-type': 'application/json' },
    });
    expect(accepted.status).toBe(501);

    const listed = await request('/v1/devices', viewer);
    const listedText = await listed.clone().text();
    expect(listed.status).toBe(200);
    expect(listedText).not.toContain(deviceToken);
    expect(await listed.json()).toMatchObject({
      devices: [expect.objectContaining({ id: device.id, name: "Mannan's Mac", revokedAt: null })],
    });

    const revoked = await request(`/v1/devices/${device.id}`, viewer, { method: 'DELETE' });
    expect(revoked.status).toBe(204);

    const afterRevocation = await request('/v1/events', deviceToken, { method: 'POST' });
    const wrongToken = `${deviceToken.slice(0, -1)}${deviceToken.endsWith('a') ? 'b' : 'a'}`;
    const wrong = await request('/v1/events', wrongToken, { method: 'POST' });
    expect(afterRevocation.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await afterRevocation.json()).toEqual(await wrong.json());
  });

  it('keeps viewer and device authority separate', async () => {
    const viewer = await mintViewer('separation@mannan.is');
    const enrollmentResponse = await request('/v1/enrollments', viewer, { method: 'POST' });
    const { code } = await enrollmentResponse.json<{ code: string }>();
    const exchangeResponse = await exchange(code, 'Boundary Mac');
    const { deviceToken } = await exchangeResponse.json<{ deviceToken: string }>();

    expect((await request('/v1/events', viewer, { method: 'POST' })).status).toBe(401);
    expect((await request('/v1/devices', deviceToken)).status).toBe(401);
    expect(
      (
        await request('/v1/projects/meet/socket-ticket', deviceToken, {
          method: 'POST',
        })
      ).status,
    ).toBe(401);
  });
});

async function mintViewer(email: string): Promise<string> {
  const response = await SELF.fetch('https://manna.test/v1/viewer-token', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SERVICE_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, projectId: 'meet' }),
  });
  return (await response.json<{ token: string }>()).token;
}

function request(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  return SELF.fetch(`https://manna.test${path}`, { ...init, headers });
}

function exchange(code: string, name: string): Promise<Response> {
  return SELF.fetch('https://manna.test/v1/enrollments/exchange', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, name }),
  });
}
