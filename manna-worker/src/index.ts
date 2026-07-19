import { Hono } from 'hono';
import type { ViewerTokenResponse } from '@mannan/manna-protocol';
import { authenticateViewer, hasServiceAuthorization, readBoundedJson } from './auth';
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
