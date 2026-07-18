import { Hono, type Context } from 'hono';
import type { Env } from './types';
import {
  bucketFor,
  acceptCurrentLegalTerms,
  canAccess,
  clearSessionCookie,
  consumeMagicToken,
  createSessionCookie,
  ensureUser,
  getUser,
  isFolder,
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
import { isCurrentLegalVersion } from './legal';
import {
  ResendSendError,
  sendMagicLink,
  sendSiteContinueLink,
} from './email';
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
import {
  objectKeyFor,
  parseRelativeObjectName,
  safeAttachmentDisposition,
} from './storage';

interface AppCtx {
  Bindings: Env;
  Variables: { session: Session | null };
}

const app = new Hono<AppCtx>();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ZIP_ENTRIES = 1000;
const MAX_ZIP_BYTES = 1024 * 1024 * 1024;

app.use('*', async (c, next) => {
  const session = await readSession(c.env, c.req.header('cookie') ?? null);
  c.set('session', session);
  await next();
  if (session || c.req.path.startsWith('/auth/')) {
    c.header('cache-control', 'private, no-store');
    const vary = new Set(
      (c.res.headers.get('vary') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    vary.add('Cookie');
    if (c.req.path.startsWith('/auth/')) vary.add('Authorization');
    c.header('vary', [...vary].join(', '));
  }
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

  const user = await getUser(c.env, email);
  if (!user || user.status !== 'active') {
    return c.html(sentPage());
  }
  const token = await mintMagicToken(c.env, email, 'cloud');
  try {
    await sendMagicLink(c.env, email, token);
  } catch (err) {
    const status = err instanceof ResendSendError ? err.status : undefined;
    console.error('send_magic_link_failed', { status });
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
  const returnTo =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).returnTo
      : undefined;

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
  const token = await mintMagicToken(
    c.env,
    email,
    'site',
    typeof returnTo === 'string' ? returnTo : '/',
  );
  try {
    await sendSiteContinueLink(c.env, email, token);
  } catch (err) {
    const status = err instanceof ResendSendError ? err.status : undefined;
    console.error('send_site_magic_link_failed', { status });
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
  const verified = await consumeMagicToken(c.env, token, 'cloud');
  if (!verified) {
    return c.html(
      messagePage('Link expired', 'That sign-in link is invalid or expired. Please request a new one.'),
      400,
    );
  }
  const user = await getUser(c.env, verified.email);
  if (!user || user.status !== 'active') {
    return c.html(
      messagePage('Link expired', 'That sign-in link is invalid or expired. Please request a new one.'),
      400,
    );
  }
  const cookie = await createSessionCookie(c.env, verified.email);
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
  const verified = await consumeMagicToken(c.env, token, 'site');
  if (!verified) {
    return c.html(
      messagePage('Link expired', 'That link is invalid or expired. Please request a new one.'),
      400,
    );
  }
  const code = await mintSiteSessionCode(
    c.env,
    verified.email,
    verified.returnPath,
  );
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
    accountId: user.accountId,
    email: user.email,
    role: siteRoleFromDbRole(user.role),
    admin: user.role === 'admin',
    status: user.status,
    returnTo: user.returnPath,
  });
});

app.post('/auth/site/consent', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const body: unknown = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'invalid-consent' }, 400);
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== 'accountId' ||
    keys[1] !== 'privacyVersion' ||
    keys[2] !== 'termsVersion' ||
    typeof record.accountId !== 'string' ||
    !/^[a-f0-9]{32}$/u.test(record.accountId) ||
    !isCurrentLegalVersion({
      termsVersion: record.termsVersion,
      privacyVersion: record.privacyVersion,
    })
  ) {
    return c.json({ error: 'invalid-consent' }, 400);
  }

  const result = await acceptCurrentLegalTerms(c.env, record.accountId);
  if (result === null) return c.json({ error: 'account-not-found' }, 404);
  return c.json({
    accountId: result.accountId,
    email: result.email,
    role: siteRoleFromDbRole(result.role),
    admin: result.role === 'admin',
    status: result.status,
    termsVersion: result.termsVersion,
    privacyVersion: result.privacyVersion,
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
      .filter((p) => parseRelativeObjectName(p) !== null);
    const files = list.objects
      .filter((o) => o.key.startsWith(fullPrefix))
      .map((o) => ({
        name: o.key.slice(fullPrefix.length),
        size: o.size,
        uploaded: o.uploaded.toISOString().slice(0, 10),
      }))
      .filter((entry) => parseRelativeObjectName(entry.name) !== null);
    listing = { dirs, files };
    const cacheRes = new Response(JSON.stringify(listing), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=300',
      },
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, cacheRes));
  }

  listing = {
    dirs: listing.dirs.filter((name) => parseRelativeObjectName(name) !== null),
    files: listing.files.filter((entry) => parseRelativeObjectName(entry.name) !== null),
  };

  return c.html(folderPage(c.get('session')!.email, folder, subpath, listing.dirs, listing.files));
}

function objectNameFromRequestPath(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const raw = path.slice(prefix.length);
  if (!parseRelativeObjectName(raw)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return parseRelativeObjectName(decoded);
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
  const subpath = objectNameFromRequestPath(c.req.path, `/cloud/${folder}/`);
  if (!subpath) {
    return c.html(messagePage('Bad request', 'That folder path was invalid.'), 400);
  }
  return handleFolderListing(c, folder, subpath);
});

app.post('/cloud/:folder/download', async (c) => {
  const session = c.get('session');
  if (!session) return c.redirect('/', 302);
  const folder = c.req.param('folder');
  if (!isFolder(folder)) return c.html(messagePage('Not found', 'That folder does not exist.'), 404);
  if (!(await canAccess(c.env, session.email, folder))) {
    return c.html(messagePage('Forbidden', 'You do not have access to this folder.'), 403);
  }

  const limiter = c.env.FILES_LIMITER;
  if (!limiter || typeof limiter.limit !== 'function') {
    return c.html(messagePage('Unavailable', 'File downloads are temporarily unavailable.'), 503);
  }
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const limit = await limiter.limit({ key: `files:${session.email}:${ip}` });
  if (!limit.success) {
    return c.html(messagePage('Too many requests', 'Please try again in a minute.'), 429);
  }

  const form = await c.req.formData();
  const mode = form.get('mode');
  const rawSubpath = form.get('subpath');
  if (typeof rawSubpath !== 'string') {
    return c.html(messagePage('Bad request', 'The folder path was invalid.'), 400);
  }
  const subpath = rawSubpath ? parseRelativeObjectName(rawSubpath) : '';
  if (subpath === null) {
    return c.html(messagePage('Bad request', 'The folder path was invalid.'), 400);
  }
  const cfg = FOLDER_CONFIG[folder];
  const basePrefix = subpath ? `${cfg.keyPrefix}${subpath}/` : cfg.keyPrefix;
  const bucket = bucketFor(c.env, folder);

  let keys: Array<{ key: string; size: number }> = [];
  if (mode === 'selected') {
    const names = form.getAll('name').filter((v): v is string => typeof v === 'string');
    if (names.length > MAX_ZIP_ENTRIES) {
      return c.html(messagePage('Too large', 'That archive contains too many files.'), 413);
    }
    for (const raw of names) {
      const clean = parseRelativeObjectName(raw);
      const combined = clean && subpath ? `${subpath}/${clean}` : clean;
      const key = combined ? objectKeyFor(folder, combined) : null;
      if (!clean || !key) {
        return c.html(messagePage('Bad request', 'One or more file names were invalid.'), 400);
      }
      const obj = await bucket.head(key);
      if (obj) keys.push({ key, size: obj.size });
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
        const relative = o.key.slice(basePrefix.length);
        if (!o.key.startsWith(basePrefix) || !parseRelativeObjectName(relative)) continue;
        keys.push({ key: o.key, size: o.size });
        if (keys.length > MAX_ZIP_ENTRIES) {
          return c.html(messagePage('Too large', 'That archive contains too many files.'), 413);
        }
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

  const totalBytes = keys.reduce((sum, entry) => sum + entry.size, 0);
  if (totalBytes > MAX_ZIP_BYTES) {
    return c.html(messagePage('Too large', 'That archive is too large to download.'), 413);
  }

  async function* sources(): AsyncIterable<ZipSource> {
    for (const entry of keys) {
      const relative = entry.key.slice(basePrefix.length);
      if (!entry.key.startsWith(basePrefix) || !parseRelativeObjectName(relative)) continue;
      const obj = await bucket.get(entry.key);
      if (!obj) continue;
      yield { name: relative, body: obj.body };
    }
  }

  const zipBase = subpath ? subpath.split('/').filter(Boolean).pop() ?? folder : folder;
  const stamp = new Date().toISOString().slice(0, 10);
  const zipName = `${zipBase}-${stamp}.zip`;
  return streamZip(sources(), zipName);
});

function notFoundFile(): Response {
  return Response.json({ error: 'not found' }, { status: 404 });
}

function safeStoredContentType(value: string | undefined): string {
  if (!value) return 'application/octet-stream';
  const mime = /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:\s*;\s*[\w!#$&^.+-]+\s*=\s*(?:[\w!#$&^.+-]+|"[^"\r\n]*"))*$/;
  return mime.test(value) ? value : 'application/octet-stream';
}

async function handleDirectFile(c: Context<AppCtx>) {
  const session = c.get('session');
  if (!session) return notFoundFile();
  const folder = c.req.param('folder') ?? '';
  if (!isFolder(folder)) return notFoundFile();
  const name = objectNameFromRequestPath(c.req.path, `/files/${folder}/`);
  if (!name) return notFoundFile();
  if (!(await canAccess(c.env, session.email, folder))) {
    return notFoundFile();
  }
  const key = objectKeyFor(folder, name);
  if (!key) return notFoundFile();

  const limiter = c.env.FILES_LIMITER;
  if (!limiter || typeof limiter.limit !== 'function') {
    return c.json({ error: 'service unavailable' }, 503);
  }
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const limit = await limiter.limit({ key: `files:${session.email}:${ip}` });
  if (!limit.success) return c.json({ error: 'too many requests' }, 429);

  const bucket = bucketFor(c.env, folder);
  const obj = c.req.method === 'HEAD' ? await bucket.head(key) : await bucket.get(key);
  if (!obj) return notFoundFile();

  const headers = new Headers({
    'content-disposition': safeAttachmentDisposition(name),
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'referrer-policy': 'no-referrer',
    'content-length': String(obj.size),
    'content-type': safeStoredContentType(obj.httpMetadata?.contentType),
    etag: obj.httpEtag,
  });

  return new Response(c.req.method === 'HEAD' ? null : (obj as R2ObjectBody).body, { headers });
}

app.on(['GET', 'HEAD'], '/files/:folder/:name{.+}', handleDirectFile);

app.all('/files/:folder/:name{.+}', (c) => {
  return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
});

app.route('/admin', admin);

app.notFound((c) => c.html(messagePage('Not found', 'No page here.'), 404));

app.onError((err, c) => {
  console.error('unhandled', err);
  return c.html(messagePage('Error', 'Something went wrong.'), 500);
});

export default app;

export type { Env };
