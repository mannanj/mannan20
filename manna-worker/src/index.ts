import { Hono } from 'hono';
import type { MannaEnv } from './env';

export { MannaRoom } from './room';

const app = new Hono<{ Bindings: MannaEnv }>();

app.get('/health', (context) => context.json({ ok: true }));

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
