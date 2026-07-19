import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { mintViewerToken, verifyViewerToken } from '../src/crypto';

const SERVICE_SECRET = 'test-service-secret-not-production';
const VIEWER_SECRET = 'test-viewer-secret-not-production';

describe('viewer token crypto', () => {
  it('mints and verifies a five-minute Meet token for a normalized account', async () => {
    const minted = await mintViewerToken(
      {
        email: ' Hello@Mannan.is ',
        projectId: 'meet',
        now: 1_800_000_000,
      },
      VIEWER_SECRET,
    );

    expect(await verifyViewerToken(minted.token, VIEWER_SECRET, 1_800_000_001)).toMatchObject({
      sub: 'hello@mannan.is',
      projectId: 'meet',
      iat: 1_800_000_000,
      exp: 1_800_000_300,
    });
    expect(minted.accountKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects expired and signature-tampered tokens', async () => {
    const minted = await mintViewerToken(
      { email: 'hello@mannan.is', projectId: 'meet', now: 1_800_000_000 },
      VIEWER_SECRET,
    );
    const replacement = minted.token.endsWith('a') ? 'b' : 'a';
    const tampered = `${minted.token.slice(0, -1)}${replacement}`;

    expect(await verifyViewerToken(minted.token, VIEWER_SECRET, 1_800_000_301)).toBeNull();
    expect(await verifyViewerToken(tampered, VIEWER_SECRET, 1_800_000_001)).toBeNull();
  });
});

describe('viewer HTTP boundary', () => {
  it('requires the service bearer and never returns either secret', async () => {
    const denied = await SELF.fetch('https://manna.test/v1/viewer-token', {
      method: 'POST',
      headers: {
        authorization: 'Bearer wrong-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: 'hello@mannan.is', projectId: 'meet' }),
    });
    expect(denied.status).toBe(401);

    const allowed = await mintThroughWorker();
    const responseText = await allowed.clone().text();

    expect(allowed.status).toBe(200);
    expect(responseText).not.toContain(SERVICE_SECRET);
    expect(responseText).not.toContain(VIEWER_SECRET);
    expect(await allowed.json()).toMatchObject({
      token: expect.stringMatching(/^mnv1\./),
      expiresAt: expect.any(String),
      workerUrl: 'https://manna.test',
    });
  });

  it('rejects malformed identity and project inputs', async () => {
    for (const body of [
      { email: 'not-an-email', projectId: 'meet' },
      { email: 'hello@mannan.is', projectId: 'other' },
      { email: 'hello@mannan.is', projectId: 'meet', role: 'admin' },
    ]) {
      const response = await SELF.fetch('https://manna.test/v1/viewer-token', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${SERVICE_SECRET}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
  });

  it('mints a 30-second single-use socket ticket scoped to the viewer account', async () => {
    const viewerResponse = await mintThroughWorker();
    const { token } = await viewerResponse.json<{ token: string }>();
    const claims = await verifyViewerToken(token, VIEWER_SECRET, Math.floor(Date.now() / 1000));
    expect(claims).not.toBeNull();

    const ticketResponse = await SELF.fetch(
      'https://manna.test/v1/projects/meet/socket-ticket',
      { method: 'POST', headers: { authorization: `Bearer ${token}` } },
    );
    const { ticket, expiresAt } = await ticketResponse.json<{
      ticket: string;
      expiresAt: string;
    }>();

    expect(ticketResponse.status).toBe(200);
    expect(ticket).toMatch(/^mns1\.[a-f0-9]{64}\./);
    expect(Date.parse(expiresAt) - Date.now()).toBeLessThanOrEqual(30_000);

    const room = env.MANNA_ROOM.getByName(claims!.accountKey);
    expect(await room.consumeSocketTicket(ticket, Date.now())).toMatchObject({
      projectId: 'meet',
    });
    expect(await room.consumeSocketTicket(ticket, Date.now())).toBeNull();
  });
});

function mintThroughWorker(): Promise<Response> {
  return SELF.fetch('https://manna.test/v1/viewer-token', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SERVICE_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: 'hello@mannan.is', projectId: 'meet' }),
  });
}
