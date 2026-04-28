import { Hono } from 'hono';
import type { Env } from './types';
import {
  FOLDERS,
  bucketFor,
  isFolder,
  keyFor,
  normalizeEmail,
  mintMagicToken,
  getUser,
  type Session,
} from './auth';
import { sendMagicLink } from './email';
import { listingCacheKey } from './cache';

interface AdminCtx {
  Bindings: Env;
  Variables: { session: Session };
}

export const admin = new Hono<AdminCtx>();

admin.use('*', async (c, next) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const user = await getUser(c.env, session.email);
  if (!user || user.role !== 'admin') return c.json({ error: 'forbidden' }, 403);
  await next();
});

admin.post('/invite', async (c) => {
  const body = await c.req.json<{ email?: string; folders?: string[] }>().catch(() => ({}));
  const email = body.email ? normalizeEmail(body.email) : '';
  const folders = (body.folders ?? []).filter(isFolder);
  if (!email || folders.length === 0) {
    return c.json({ error: 'email and folders[] required' }, 400);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO users (email, role, created_at) VALUES (?, 'client', ?) ON CONFLICT(email) DO NOTHING",
  )
    .bind(email, now)
    .run();

  const stmts = folders.map((folder) =>
    c.env.DB.prepare(
      'INSERT INTO folder_members (email, folder) VALUES (?, ?) ON CONFLICT DO NOTHING',
    ).bind(email, folder),
  );
  if (stmts.length) await c.env.DB.batch(stmts);

  const token = await mintMagicToken(c.env, email);
  await sendMagicLink(c.env, email, token);

  return c.json({ ok: true, email, folders });
});

admin.post('/grant', async (c) => {
  const body = await c.req.json<{ email?: string; folder?: string }>().catch(() => ({}));
  const email = body.email ? normalizeEmail(body.email) : '';
  if (!email || !body.folder || !isFolder(body.folder)) {
    return c.json({ error: 'email and valid folder required' }, 400);
  }
  const user = await getUser(c.env, email);
  if (!user) return c.json({ error: 'user not found; invite first' }, 404);
  await c.env.DB.prepare(
    'INSERT INTO folder_members (email, folder) VALUES (?, ?) ON CONFLICT DO NOTHING',
  )
    .bind(email, body.folder)
    .run();
  return c.json({ ok: true });
});

admin.post('/revoke', async (c) => {
  const body = await c.req.json<{ email?: string; folder?: string }>().catch(() => ({}));
  const email = body.email ? normalizeEmail(body.email) : '';
  if (!email || !body.folder || !isFolder(body.folder)) {
    return c.json({ error: 'email and valid folder required' }, 400);
  }
  await c.env.DB.prepare(
    'DELETE FROM folder_members WHERE email = ? AND folder = ?',
  )
    .bind(email, body.folder)
    .run();
  return c.json({ ok: true });
});

admin.post('/upload', async (c) => {
  const form = await c.req.formData();
  const folder = form.get('folder');
  const file = form.get('file');
  if (typeof folder !== 'string' || !isFolder(folder)) {
    return c.json({ error: `folder must be one of ${FOLDERS.join(', ')}` }, 400);
  }
  if (!(file instanceof File)) {
    return c.json({ error: 'file required (multipart)' }, 400);
  }
  const key = keyFor(folder, file.name);
  await bucketFor(c.env, folder).put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  c.executionCtx.waitUntil(caches.default.delete(listingCacheKey(folder)));
  return c.json({ ok: true, key, size: file.size });
});

admin.get('/users', async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT email, role, created_at FROM users ORDER BY created_at DESC',
  ).all();
  const members = await c.env.DB.prepare(
    'SELECT email, folder FROM folder_members',
  ).all();
  return c.json({ users: users.results, folder_members: members.results });
});
