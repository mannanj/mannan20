import { Hono } from 'hono';
import type { ViewerTokenResponse } from '@mannan/manna-protocol';
import {
  authenticateViewer,
  hasServiceAuthorization,
  parseDeviceToken,
  parseEnrollmentCode,
  readBearer,
  readBoundedJson,
} from './auth';
import { mintViewerToken, normalizeEmail } from './crypto';
import type { MannaEnv } from './env';

export { MannaRoom } from './room';

const app = new Hono<{ Bindings: MannaEnv }>();

app.get('/health', (context) => context.json({ ok: true }));

app.post('/v1/viewer-token', async (context) => {
  if (!(await hasServiceAuthorization(context.req.raw, context.env.SERVICE_AUTH_SECRET))) {
    return context.json({ error: 'unauthorized' }, 401);
  }

  const body = await readBoundedJson(context.req.raw);
  if (!body || !hasExactKeys(body, ['email', 'projectId'])) {
    return context.json({ error: 'invalid_request' }, 400);
  }
  const email = normalizeEmail(body.email);
  if (!email || body.projectId !== 'meet') {
    return context.json({ error: 'invalid_request' }, 400);
  }

  const minted = await mintViewerToken(
    { email, projectId: 'meet', now: Math.floor(Date.now() / 1000) },
    context.env.VIEWER_TOKEN_SECRET,
  );
  const response: ViewerTokenResponse = {
    token: minted.token,
    expiresAt: minted.expiresAt,
    workerUrl: new URL(context.req.url).origin,
  };
  context.header('Cache-Control', 'no-store');
  return context.json(response);
});

app.post('/v1/projects/meet/socket-ticket', async (context) => {
  const claims = await authenticateViewer(context.req.raw, context.env.VIEWER_TOKEN_SECRET);
  if (!claims || claims.projectId !== 'meet') {
    return context.json({ error: 'unauthorized' }, 401);
  }
  const room = context.env.MANNA_ROOM.getByName(claims.accountKey);
  const ticket = await room.createSocketTicket(claims.accountKey, claims.exp);
  context.header('Cache-Control', 'no-store');
  return context.json(ticket);
});

app.post('/v1/enrollments', async (context) => {
  const claims = await authenticateViewer(context.req.raw, context.env.VIEWER_TOKEN_SECRET);
  if (!claims) return context.json({ error: 'unauthorized' }, 401);
  const room = context.env.MANNA_ROOM.getByName(claims.accountKey);
  const enrollment = await room.createEnrollment(claims.accountKey);
  context.header('Cache-Control', 'no-store');
  return context.json(enrollment);
});

app.post('/v1/enrollments/exchange', async (context) => {
  const body = await readBoundedJson(context.req.raw);
  if (!body || !hasExactKeys(body, ['code', 'name'])) {
    return context.json({ error: 'invalid_enrollment' }, 400);
  }
  if (typeof body.code !== 'string' || typeof body.name !== 'string') {
    return context.json({ error: 'invalid_enrollment' }, 400);
  }
  const credential = parseEnrollmentCode(body.code);
  if (!credential) return context.json({ error: 'invalid_enrollment' }, 400);
  const room = context.env.MANNA_ROOM.getByName(credential.accountKey);
  const device = await room.exchangeEnrollment(body.code, body.name);
  if (!device) return context.json({ error: 'invalid_enrollment' }, 400);
  context.header('Cache-Control', 'no-store');
  return context.json(device);
});

app.get('/v1/devices', async (context) => {
  const claims = await authenticateViewer(context.req.raw, context.env.VIEWER_TOKEN_SECRET);
  if (!claims) return context.json({ error: 'unauthorized' }, 401);
  const room = context.env.MANNA_ROOM.getByName(claims.accountKey);
  context.header('Cache-Control', 'no-store');
  return context.json({ devices: await room.listDevices() });
});

app.delete('/v1/devices/:id', async (context) => {
  const claims = await authenticateViewer(context.req.raw, context.env.VIEWER_TOKEN_SECRET);
  if (!claims) return context.json({ error: 'unauthorized' }, 401);
  const deviceId = context.req.param('id');
  if (!/^[a-f0-9-]{36}$/iu.test(deviceId)) return context.json({ error: 'not_found' }, 404);
  const room = context.env.MANNA_ROOM.getByName(claims.accountKey);
  const revoked = await room.revokeDevice(deviceId);
  return revoked
    ? new Response(null, { status: 204 })
    : context.json({ error: 'not_found' }, 404);
});

app.post('/v1/events', async (context) => {
  const token = readBearer(context.req.raw);
  const credential = token ? parseDeviceToken(token) : null;
  if (!token || !credential) return context.json({ error: 'unauthorized' }, 401);
  const room = context.env.MANNA_ROOM.getByName(credential.accountKey);
  if (!(await room.authenticateDevice(token))) {
    return context.json({ error: 'unauthorized' }, 401);
  }
  return context.json({ error: 'not_implemented' }, 501);
});

app.notFound((context) => context.json({ error: 'not_found' }, 404));

app.onError((error, context) => {
  console.error(
    JSON.stringify({
      message: 'unhandled_request_error',
      requestId: crypto.randomUUID(),
      path: new URL(context.req.url).pathname,
      errorName: error.name,
    }),
  );
  return context.json({ error: 'internal_error' }, 500);
});

export default app;

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}
