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

export async function mintMagicToken(
  env: Env,
  email: string,
  purpose: 'cloud' | 'site' = 'cloud',
): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const expires = Date.now() + TOKEN_TTL_MS;
  await env.DB.prepare(
    'INSERT INTO magic_tokens (token, email, expires_at, purpose) VALUES (?, ?, ?, ?)',
  )
    .bind(await hashSecret(token), normalizeEmail(email), expires, purpose)
    .run();
  return token;
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
