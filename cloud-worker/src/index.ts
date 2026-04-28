import { Hono } from 'hono';
import type { Env } from './types';
import {
  canAccess,
  clearSessionCookie,
  consumeMagicToken,
  createSessionCookie,
  getUser,
  isFolder,
  listAllowedFolders,
  mintMagicToken,
  normalizeEmail,
  readSession,
  type Session,
} from './auth';
import { sendMagicLink } from './email';
import {
  cloudIndexPage,
  folderPage,
  messagePage,
  sentPage,
  signInPage,
} from './views';
import { admin } from './admin';

interface AppCtx {
  Bindings: Env;
  Variables: { session: Session | null };
}

const app = new Hono<AppCtx>();

app.use('*', async (c, next) => {
  const session = await readSession(c.env, c.req.header('cookie') ?? null);
  c.set('session', session);
  await next();
});

app.get('/', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/cloud', 302);
  return c.html(signInPage());
});

app.post('/auth/request', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const limit = await c.env.REQUEST_LIMITER.limit({ key: `req:${ip}` });
  if (!limit.success) {
    return c.html(messagePage('Too many requests', 'Please try again in a minute.'), 429);
  }
  const form = await c.req.formData().catch(() => null);
  const raw = form?.get('email');
  const email = typeof raw === 'string' ? normalizeEmail(raw) : '';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return c.html(signInPage('Please enter a valid email.'), 400);
  }

  const user = await getUser(c.env, email);
  if (user) {
    const token = await mintMagicToken(c.env, email);
    try {
      await sendMagicLink(c.env, email, token);
    } catch (err) {
      console.error('send_magic_link_failed', err);
    }
  }
  return c.html(sentPage());
});

app.get('/auth/verify', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const limit = await c.env.VERIFY_LIMITER.limit({ key: `verify:${ip}` });
  if (!limit.success) {
    return c.html(messagePage('Too many requests', 'Please try again in a minute.'), 429);
  }
  const token = c.req.query('token');
  if (!token) {
    return c.html(messagePage('Invalid link', 'Missing token.'), 400);
  }
  const email = await consumeMagicToken(c.env, token);
  if (!email) {
    return c.html(
      messagePage('Link expired', 'That sign-in link is invalid or expired. Please request a new one.'),
      400,
    );
  }
  const cookie = await createSessionCookie(c.env, email);
  return new Response(null, {
    status: 302,
    headers: { Location: '/cloud', 'Set-Cookie': cookie },
  });
});

app.post('/auth/sign-out', (c) => {
  return new Response(null, {
    status: 302,
    headers: { Location: '/', 'Set-Cookie': clearSessionCookie() },
  });
});

app.get('/cloud', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folders = await listAllowedFolders(c.env, session.email);
  return c.html(cloudIndexPage(session.email, folders));
});

app.get('/cloud/:folder', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folder = c.req.param('folder');
  if (!isFolder(folder)) return c.html(messagePage('Not found', 'That folder does not exist.'), 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.html(messagePage('Forbidden', 'You do not have access to this folder.'), 403);
  }
  const list = await c.env.FILES.list({ prefix: `${folder}/`, limit: 1000 });
  const files = list.objects.map((o) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded.toISOString().slice(0, 10),
  }));
  return c.html(folderPage(session.email, folder, files));
});

app.get('/files/:folder/:name{.+}', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const folder = c.req.param('folder');
  const name = c.req.param('name');
  if (!isFolder(folder)) return c.json({ error: 'not found' }, 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.json({ error: 'forbidden' }, 403);
  }
  const key = `${folder}/${name}`;
  const obj = await c.env.FILES.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('content-length', String(obj.size));
  headers.set('content-disposition', `attachment; filename="${name.split('/').pop()}"`);
  return new Response(obj.body, { headers });
});

app.route('/admin', admin);

app.notFound((c) => c.html(messagePage('Not found', 'No page here.'), 404));

app.onError((err, c) => {
  console.error('unhandled', err);
  return c.html(messagePage('Error', 'Something went wrong.'), 500);
});

export default app;

export type { Env };
