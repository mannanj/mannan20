import { Hono, type Context } from 'hono';
import type { Env } from './types';
import {
  bucketFor,
  canAccess,
  clearSessionCookie,
  consumeMagicToken,
  createSessionCookie,
  ensureUser,
  getUser,
  isFolder,
  keyFor,
  listAllowedFolders,
  mintSiteSessionCode,
  mintMagicToken,
  normalizeEmail,
  readSession,
  consumeSiteSessionCode,
  siteRoleFromDbRole,
  FOLDER_CONFIG,
  type Folder,
  type Session,
} from './auth';
import { sendMagicLink, sendSiteContinueLink } from './email';
import {
  cloudIndexPage,
  folderPage,
  messagePage,
  sentPage,
  signInPage,
} from './views';
import { admin } from './admin';
import { listingCacheKey } from './cache';
import { streamZip, type ZipSource } from './zip';

interface AppCtx {
  Bindings: Env;
  Variables: { session: Session | null };
}

const app = new Hono<AppCtx>();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  if (!email || !EMAIL_RE.test(email)) {
    return c.html(signInPage('Please enter a valid email.'), 400);
  }

  await ensureUser(c.env, email);
  const token = await mintMagicToken(c.env, email, 'cloud');
  try {
    await sendMagicLink(c.env, email, token);
  } catch (err) {
    console.error('send_magic_link_failed', err);
  }
  return c.html(sentPage());
});

app.post('/auth/site/request', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const ip =
    c.req.header('x-site-auth-ip') ??
    c.req.header('cf-connecting-ip') ??
    'unknown';
  const body = await c.req.json().catch(() => null);
  const email =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).email === 'string'
      ? normalizeEmail((body as Record<string, unknown>).email as string)
      : '';

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return c.json({ error: 'invalid-email' }, 400);
  }

  const [ipLimit, emailLimit] = await Promise.all([
    c.env.REQUEST_LIMITER.limit({ key: `site:req:${ip}` }),
    c.env.REQUEST_LIMITER.limit({ key: `site:email:${email}` }),
  ]);
  if (!ipLimit.success || !emailLimit.success) {
    return c.json({ error: 'too-many-requests' }, 429);
  }

  await ensureUser(c.env, email);
  const token = await mintMagicToken(c.env, email, 'site');
  try {
    await sendSiteContinueLink(c.env, email, token);
  } catch (err) {
    console.error('send_site_magic_link_failed', err);
    return c.json({ error: 'email-unavailable' }, 503);
  }

  return c.json({ ok: true });
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
  const email = await consumeMagicToken(c.env, token, 'cloud');
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

app.get('/auth/site/verify', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const limit = await c.env.VERIFY_LIMITER.limit({ key: `site:verify:${ip}` });
  if (!limit.success) {
    return c.html(messagePage('Too many requests', 'Please try again in a minute.'), 429);
  }
  const token = c.req.query('token');
  if (!token) {
    return c.html(messagePage('Invalid link', 'Missing token.'), 400);
  }
  const email = await consumeMagicToken(c.env, token, 'site');
  if (!email) {
    return c.html(
      messagePage('Link expired', 'That link is invalid or expired. Please request a new one.'),
      400,
    );
  }
  const code = await mintSiteSessionCode(c.env, email);
  const url = new URL(c.env.SITE_AUTH_RETURN_URL);
  url.searchParams.set('code', code);
  return c.redirect(url.toString(), 302);
});

app.post('/auth/site/exchange', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const body = await c.req.json().catch(() => null);
  const code =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).code === 'string'
      ? ((body as Record<string, unknown>).code as string)
      : '';
  if (!code) return c.json({ error: 'invalid-code' }, 400);

  const user = await consumeSiteSessionCode(c.env, code);
  if (!user) return c.json({ error: 'invalid-code' }, 400);

  return c.json({
    email: user.email,
    role: siteRoleFromDbRole(user.role),
    admin: user.role === 'admin',
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

async function handleFolderListing(c: Context<AppCtx>, folder: Folder, subpath: string) {
  type Entry = { name: string; size: number; uploaded: string };
  type Listing = { dirs: string[]; files: Entry[] };
  const cacheKey = listingCacheKey(folder, subpath);
  const cache = caches.default;
  let listing: Listing;

  const hit = await cache.match(cacheKey);
  if (hit) {
    listing = await hit.json<Listing>();
  } else {
    const cfg = FOLDER_CONFIG[folder];
    const fullPrefix = subpath ? `${cfg.keyPrefix}${subpath}/` : cfg.keyPrefix;
    const bucket = bucketFor(c.env, folder);
    const list = await bucket.list({ prefix: fullPrefix, delimiter: '/', limit: 1000 });
    const dirs = (list.delimitedPrefixes ?? [])
      .map((p) => p.slice(fullPrefix.length).replace(/\/$/, ''))
      .filter((p) => p.length > 0);
    const files = list.objects.map((o) => ({
      name: o.key.slice(fullPrefix.length),
      size: o.size,
      uploaded: o.uploaded.toISOString().slice(0, 10),
    }));
    listing = { dirs, files };
    const cacheRes = new Response(JSON.stringify(listing), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=300',
      },
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, cacheRes));
  }

  return c.html(folderPage(c.get('session')!.email, folder, subpath, listing.dirs, listing.files));
}

function normalizeSubpath(raw: string): string {
  return raw.replace(/^\/+|\/+$/g, '');
}

app.get('/cloud/:folder', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folder = c.req.param('folder');
  if (!isFolder(folder)) return c.html(messagePage('Not found', 'That folder does not exist.'), 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.html(messagePage('Forbidden', 'You do not have access to this folder.'), 403);
  }
  return handleFolderListing(c, folder, '');
});

app.get('/cloud/:folder/*', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folder = c.req.param('folder');
  if (!isFolder(folder)) return c.html(messagePage('Not found', 'That folder does not exist.'), 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.html(messagePage('Forbidden', 'You do not have access to this folder.'), 403);
  }
  const subpath = normalizeSubpath(c.req.path.slice(`/cloud/${folder}`.length));
  return handleFolderListing(c, folder, subpath);
});

function sanitizeRelativeName(raw: string): string | null {
  if (!raw) return null;
  if (raw.length > 1024) return null;
  if (raw.includes('\0')) return null;
  if (raw.startsWith('/')) return null;
  const parts = raw.split('/');
  for (const p of parts) {
    if (p === '' || p === '.' || p === '..') return null;
  }
  return raw;
}

app.post('/cloud/:folder/download', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folder = c.req.param('folder');
  if (!isFolder(folder)) return c.html(messagePage('Not found', 'That folder does not exist.'), 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.html(messagePage('Forbidden', 'You do not have access to this folder.'), 403);
  }

  const form = await c.req.formData();
  const mode = form.get('mode');
  const subpath = normalizeSubpath(String(form.get('subpath') ?? ''));
  const cfg = FOLDER_CONFIG[folder];
  const basePrefix = subpath ? `${cfg.keyPrefix}${subpath}/` : cfg.keyPrefix;
  const bucket = bucketFor(c.env, folder);

  let keys: string[] = [];
  if (mode === 'selected') {
    const names = form.getAll('name').filter((v): v is string => typeof v === 'string');
    for (const raw of names) {
      const clean = sanitizeRelativeName(raw);
      if (!clean) {
        return c.html(messagePage('Bad request', 'One or more file names were invalid.'), 400);
      }
      keys.push(`${basePrefix}${clean}`);
    }
    if (keys.length === 0) {
      return c.html(messagePage('Nothing selected', 'Pick at least one file, then click Download selected.'), 400);
    }
  } else if (mode === 'all') {
    let cursor: string | undefined;
    let guard = 0;
    do {
      const page = await bucket.list({ prefix: basePrefix, limit: 1000, cursor });
      for (const o of page.objects) {
        if (o.key.endsWith('/')) continue;
        keys.push(o.key);
      }
      cursor = page.truncated ? page.cursor : undefined;
      guard++;
    } while (cursor && guard < 50);
    if (keys.length === 0) {
      return c.html(messagePage('Empty folder', 'There are no files to download here.'), 404);
    }
  } else {
    return c.html(messagePage('Bad request', 'Missing or invalid mode.'), 400);
  }

  async function* sources(): AsyncIterable<ZipSource> {
    for (const key of keys) {
      const obj = await bucket.get(key);
      if (!obj) continue;
      const relative = key.slice(basePrefix.length);
      yield { name: relative, body: obj.body };
    }
  }

  const zipBase = subpath ? subpath.split('/').filter(Boolean).pop() ?? folder : folder;
  const stamp = new Date().toISOString().slice(0, 10);
  const zipName = `${zipBase}-${stamp}.zip`;
  return streamZip(sources(), zipName);
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
  const key = keyFor(folder, name);
  const obj = await bucketFor(c.env, folder).get(key);
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
