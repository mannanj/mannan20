import type { Env } from './types';

export const FOLDERS = ['general', 'hans', 'hans-backups'] as const;
export type Folder = typeof FOLDERS[number];

export function isFolder(value: string): value is Folder {
  return (FOLDERS as readonly string[]).includes(value);
}

type BucketBinding = 'FILES' | 'FILES_HANS' | 'FILES_BACKUPS';

export const FOLDER_CONFIG: Record<Folder, { binding: BucketBinding; keyPrefix: string }> = {
  general:        { binding: 'FILES', keyPrefix: 'general/' },
  hans:           { binding: 'FILES_HANS', keyPrefix: '' },
  'hans-backups': { binding: 'FILES_BACKUPS', keyPrefix: '' },
};

export function bucketFor(env: Env, folder: Folder): R2Bucket {
  return env[FOLDER_CONFIG[folder].binding];
}

export function stripFolderPrefix(folder: Folder, key: string): string {
  const prefix = FOLDER_CONFIG[folder].keyPrefix;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const SITE_CODE_TTL_MS = 2 * 60 * 1000;
const COOKIE_NAME = '__Host-session';
const ADMIN_EMAIL = 'hello@mannan.is';

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

async function verify(secret: string, payload: string, sig: string): Promise<boolean> {
  const key = await importKey(secret);
  try {
    return await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(payload));
  } catch {
    return false;
  }
}

export interface Session {
  email: string;
  exp: number;
}

export function dbRoleForEmail(email: string): 'admin' | 'client' {
  return normalizeEmail(email) === ADMIN_EMAIL ? 'admin' : 'client';
}

export function siteRoleFromDbRole(role: string): 'admin' | 'user' {
  return role === 'admin' ? 'admin' : 'user';
}

export async function createSessionCookie(env: Env, email: string): Promise<string> {
  const payload: Session = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const payloadStr = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await sign(env.SESSION_SECRET, payloadStr);
  const value = `${payloadStr}.${sig}`;
  return `${COOKIE_NAME}=${value}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function readSession(env: Env, cookieHeader: string | null): Promise<Session | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  const [payloadStr, sig] = value.split('.');
  if (!payloadStr || !sig) return null;
  if (!(await verify(env.SESSION_SECRET, payloadStr, sig))) return null;
  let parsed: Session;
  try {
    parsed = JSON.parse(dec.decode(b64urlDecode(payloadStr)));
  } catch {
    return null;
  }
  if (typeof parsed.email !== 'string' || typeof parsed.exp !== 'number') return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

export async function getUser(env: Env, email: string): Promise<{ email: string; role: string } | null> {
  return env.DB.prepare('SELECT email, role FROM users WHERE email = ?')
    .bind(email)
    .first<{ email: string; role: string }>();
}

export async function ensureUser(env: Env, email: string): Promise<{ email: string; role: string }> {
  const normalized = normalizeEmail(email);
  const role = dbRoleForEmail(normalized);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO users (email, role, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       role = CASE
         WHEN excluded.role = 'admin' THEN 'admin'
         ELSE users.role
       END`,
  )
    .bind(normalized, role, now)
    .run();
  const user = await getUser(env, normalized);
  if (!user) throw new Error('failed to ensure user');
  return user;
}

export async function canAccess(env: Env, email: string, folder: Folder): Promise<boolean> {
  const user = await getUser(env, email);
  if (!user) return false;
  if (user.role === 'admin') return true;
  const row = await env.DB.prepare(
    'SELECT 1 FROM folder_members WHERE email = ? AND folder = ?',
  )
    .bind(email, folder)
    .first();
  return !!row;
}

export async function listAllowedFolders(env: Env, email: string): Promise<Folder[]> {
  const user = await getUser(env, email);
  if (!user) return [];
  if (user.role === 'admin') return [...FOLDERS];
  const rows = await env.DB.prepare('SELECT folder FROM folder_members WHERE email = ?')
    .bind(email)
    .all<{ folder: string }>();
  return (rows.results ?? [])
    .map((r) => r.folder)
    .filter((f): f is Folder => isFolder(f));
}

export async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type MagicPurpose = 'cloud' | 'site';

const CODE_DIGITS = 8;
const CODE_SPACE = 10 ** CODE_DIGITS;
const CODE_SAMPLE_CEILING = Math.floor(2 ** 32 / CODE_SPACE) * CODE_SPACE;
export const MAX_ATTEMPTS_PER_CODE = 5;
export const MAX_FAILURES_PER_EMAIL = 10;
const FAILURE_WINDOW_MS = 60 * 60 * 1000;

export function generateSignInCode(): string {
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= CODE_SAMPLE_CEILING);
  return String(buffer[0] % CODE_SPACE).padStart(CODE_DIGITS, '0');
}

export function formatSignInCode(digits: string): string {
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
}

export function normalizeSignInCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === CODE_DIGITS ? digits : null;
}

async function hashSignInCode(env: Env, purpose: MagicPurpose, email: string, digits: string): Promise<string> {
  return sign(env.SESSION_SECRET, `signin-code:${purpose}:${email}:${digits}`);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function mintMagicToken(
  env: Env,
  rawEmail: string,
  purpose: MagicPurpose = 'cloud',
): Promise<{ token: string; code: string }> {
  const email = normalizeEmail(rawEmail);
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const code = generateSignInCode();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM magic_tokens WHERE purpose = ? AND email = ? AND expires_at <= ?').bind(purpose, email, now),
    env.DB.prepare(
      'INSERT INTO magic_tokens (token, email, expires_at, purpose, code_hash) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      await hashSecret(token),
      email,
      now + TOKEN_TTL_MS,
      purpose,
      await hashSignInCode(env, purpose, email, code),
    ),
  ]);
  return { token, code };
}

async function recordCodeFailure(env: Env, email: string, now: number): Promise<void> {
  await env.DB.prepare('INSERT INTO sign_in_code_failures (email, failed_at) VALUES (?, ?)')
    .bind(email, now)
    .run();
}

export async function consumeSignInCode(
  env: Env,
  rawEmail: string,
  digits: string,
  purpose: MagicPurpose,
): Promise<string | null> {
  const email = normalizeEmail(rawEmail);
  const now = Date.now();
  const windowStart = now - FAILURE_WINDOW_MS;

  await env.DB.prepare('DELETE FROM sign_in_code_failures WHERE failed_at <= ?').bind(windowStart).run();
  const failures = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM sign_in_code_failures WHERE email = ? AND failed_at > ?',
  )
    .bind(email, windowStart)
    .first<{ n: number }>();
  if ((failures?.n ?? 0) >= MAX_FAILURES_PER_EMAIL) return null;

  const { results: rows } = await env.DB.prepare(
    'SELECT token, code_hash FROM magic_tokens WHERE purpose = ? AND email = ? AND code_hash IS NOT NULL AND expires_at > ? AND code_attempts < ?',
  )
    .bind(purpose, email, now, MAX_ATTEMPTS_PER_CODE)
    .all<{ token: string; code_hash: string }>();

  const expected = await hashSignInCode(env, purpose, email, digits);
  const match = rows.find((row) => constantTimeEqual(expected, row.code_hash));
  if (match) {
    const consumed = await env.DB.prepare(
      'DELETE FROM magic_tokens WHERE token = ? AND code_attempts < ? AND expires_at > ? RETURNING email',
    )
      .bind(match.token, MAX_ATTEMPTS_PER_CODE, now)
      .first<{ email: string }>();
    if (consumed) return consumed.email;
  }

  await recordCodeFailure(env, email, now);
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE magic_tokens SET code_attempts = code_attempts + 1 WHERE purpose = ? AND email = ? AND code_hash IS NOT NULL',
    ).bind(purpose, email),
    env.DB.prepare(
      'DELETE FROM magic_tokens WHERE purpose = ? AND email = ? AND code_attempts >= ?',
    ).bind(purpose, email, MAX_ATTEMPTS_PER_CODE),
  ]);
  return null;
}

export async function consumeMagicToken(
  env: Env,
  token: string,
  purpose: 'cloud' | 'site' = 'cloud',
): Promise<string | null> {
  const row = await env.DB.prepare(
    'DELETE FROM magic_tokens WHERE token = ? AND purpose = ? RETURNING email, expires_at',
  )
    .bind(await hashSecret(token), purpose)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  return row.email;
}

export async function mintSiteSessionCode(env: Env, email: string): Promise<string> {
  const code = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare(
    'INSERT INTO site_session_codes (code_hash, email, expires_at) VALUES (?, ?, ?)',
  )
    .bind(await hashSecret(code), normalizeEmail(email), Date.now() + SITE_CODE_TTL_MS)
    .run();
  return code;
}

export async function consumeSiteSessionCode(
  env: Env,
  code: string,
): Promise<{ email: string; role: string } | null> {
  const codeHash = await hashSecret(code);
  const row = await env.DB.prepare(
    'DELETE FROM site_session_codes WHERE code_hash = ? RETURNING email, expires_at',
  )
    .bind(codeHash)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  return getUser(env, row.email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
