import type { D1Binding } from '@/lib/cf-bindings';
import { UPLOAD_OWNER_EMAIL } from '@/lib/uploads';

/**
 * Who may open which app under mannan.is. One table for every app (site_apps +
 * app_access in the `cloud` D1, migration 0011), so a grant made once applies
 * everywhere: the MCP's list_apps shows it and the app itself lets the person in.
 *
 * The catalog rows are data, written at run time by Mannan; the names of private
 * apps never appear in this (public) repository.
 *
 * Signed in is not permission: anyone can make an account with an email code.
 * Only 'public' apps, Mannan, and an explicit grant open anything.
 */

export const OWNER_EMAIL = UPLOAD_OWNER_EMAIL;

export type Visibility = 'public' | 'granted' | 'owner';
export const VISIBILITIES: readonly Visibility[] = ['public', 'granted', 'owner'];

export interface SiteApp {
  id: string;
  name: string;
  description: string;
  url: string;
  visibility: Visibility;
  sort: number;
}

export interface AppGrant {
  appId: string;
  email: string;
  grantedAt: number;
  grantedBy: string;
}

const APP_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME = 80;
const MAX_DESCRIPTION = 400;
const MAX_URL = 300;
const MAX_GRANTS_PER_APP = 500;

export const isAppId = (v: unknown): v is string => typeof v === 'string' && APP_ID.test(v);

/** Lowercased, trimmed email, or null when it isn't one. */
export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

const isOwner = (email: string | null | undefined) => !!email && email.trim().toLowerCase() === OWNER_EMAIL;

interface AppRow { id: string; name: string; description: string; url: string; visibility: string; sort: number }
const toApp = (r: AppRow): SiteApp => ({
  id: r.id, name: r.name, description: r.description, url: r.url,
  visibility: (VISIBILITIES as string[]).includes(r.visibility) ? (r.visibility as Visibility) : 'owner',
  sort: r.sort,
});

/** The apps this person may see and open: public ones, the ones granted to them, and everything for Mannan. */
export async function visibleApps(db: D1Binding, email: string | null): Promise<SiteApp[]> {
  const who = email ? email.trim().toLowerCase() : null;
  const cols = 'id, name, description, url, visibility, sort';
  const { results } = isOwner(who)
    ? await db.prepare(`SELECT ${cols} FROM site_apps ORDER BY sort, name`).all<AppRow>()
    : who
      ? await db.prepare(
        `SELECT ${cols} FROM site_apps WHERE visibility = 'public'
           OR (visibility = 'granted' AND id IN (SELECT app_id FROM app_access WHERE email = ?1))
         ORDER BY sort, name`,
      ).bind(who).all<AppRow>()
      : await db.prepare(`SELECT ${cols} FROM site_apps WHERE visibility = 'public' ORDER BY sort, name`).all<AppRow>();
  return results.map(toApp);
}

/**
 * May this person open this app? Mannan: always. Anyone else: the app must be in
 * the catalog and either public or granted to them. Unknown apps are closed.
 */
export async function canOpen(db: D1Binding, email: string | null, appId: string): Promise<boolean> {
  if (isOwner(email)) return true;
  if (!isAppId(appId)) return false;
  const app = await db.prepare(`SELECT visibility FROM site_apps WHERE id = ?1`).bind(appId).first<{ visibility: string }>();
  if (!app) return false;
  if (app.visibility === 'public') return true;
  if (app.visibility !== 'granted' || !email) return false;
  const who = email.trim().toLowerCase();
  const row = await db.prepare(`SELECT 1 AS ok FROM app_access WHERE app_id = ?1 AND email = ?2`).bind(appId, who).first<{ ok: number }>();
  return !!row;
}

// ─── Mannan's changes ─────────────────────────────────────────────────────

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate an app for the catalog. */
export function parseApp(input: unknown): Checked<Omit<SiteApp, 'sort'> & { sort?: number }> {
  const b = (input ?? {}) as Record<string, unknown>;
  if (!isAppId(b.id)) return { ok: false, error: 'id: lowercase letters, digits and dashes, up to 40' };
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name || name.length > MAX_NAME) return { ok: false, error: `name: 1 to ${MAX_NAME} characters` };
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (description.length > MAX_DESCRIPTION) return { ok: false, error: `description: up to ${MAX_DESCRIPTION} characters` };
  if (typeof b.url !== 'string' || b.url.length > MAX_URL) return { ok: false, error: 'url: an https link' };
  let url: URL;
  try { url = new URL(b.url); } catch { return { ok: false, error: 'url: an https link' }; }
  if (url.protocol !== 'https:' || url.username || url.password) return { ok: false, error: 'url: an https link' };
  if (!(VISIBILITIES as unknown[]).includes(b.visibility)) return { ok: false, error: "visibility: 'public', 'granted' or 'owner'" };
  const sort = b.sort === undefined ? undefined : Number(b.sort);
  if (sort !== undefined && (!Number.isInteger(sort) || sort < 0 || sort > 10_000)) return { ok: false, error: 'sort: a whole number 0 to 10000' };
  return { ok: true, value: { id: b.id, name, description, url: url.toString(), visibility: b.visibility as Visibility, ...(sort !== undefined ? { sort } : {}) } };
}

export async function saveApp(db: D1Binding, app: Omit<SiteApp, 'sort'> & { sort?: number }): Promise<void> {
  const now = Date.now();
  await db.prepare(
    `INSERT INTO site_apps (id, name, description, url, visibility, sort, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, url = excluded.url,
       visibility = excluded.visibility, sort = CASE WHEN ?8 THEN excluded.sort ELSE site_apps.sort END, updated_at = excluded.updated_at`,
  ).bind(app.id, app.name, app.description, app.url, app.visibility, app.sort ?? 100, now, app.sort !== undefined ? 1 : 0).run();
}

/** Remove an app and every grant on it. */
export async function removeApp(db: D1Binding, id: string): Promise<boolean> {
  if (!isAppId(id)) return false;
  await db.prepare(`DELETE FROM app_access WHERE app_id = ?1`).bind(id).run();
  const res = await db.prepare(`DELETE FROM site_apps WHERE id = ?1`).bind(id).run();
  return res.meta.changes > 0;
}

export async function listGrants(db: D1Binding, appId?: string): Promise<AppGrant[]> {
  const { results } = appId
    ? await db.prepare(`SELECT app_id, email, granted_at, granted_by FROM app_access WHERE app_id = ?1 ORDER BY email`).bind(appId).all<GrantRow>()
    : await db.prepare(`SELECT app_id, email, granted_at, granted_by FROM app_access ORDER BY app_id, email`).all<GrantRow>();
  return results.map((r) => ({ appId: r.app_id, email: r.email, grantedAt: r.granted_at, grantedBy: r.granted_by }));
}
interface GrantRow { app_id: string; email: string; granted_at: number; granted_by: string }

export async function grantAccess(db: D1Binding, appId: string, rawEmail: string, by: string): Promise<Checked<AppGrant>> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: 'email: not an email address' };
  if (!isAppId(appId)) return { ok: false, error: 'app: unknown' };
  const app = await db.prepare(`SELECT visibility FROM site_apps WHERE id = ?1`).bind(appId).first<{ visibility: string }>();
  if (!app) return { ok: false, error: 'app: unknown' };
  if (app.visibility !== 'granted') return { ok: false, error: `app: ${app.visibility === 'public' ? 'already open to everyone' : "owner-only; set its visibility to 'granted' first"}` };
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM app_access WHERE app_id = ?1`).bind(appId).first<{ n: number }>();
  if (Number(count?.n ?? 0) >= MAX_GRANTS_PER_APP) return { ok: false, error: 'app: too many people' };
  const now = Date.now();
  await db.prepare(`INSERT INTO app_access (app_id, email, granted_at, granted_by) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(app_id, email) DO NOTHING`)
    .bind(appId, email, now, by).run();
  return { ok: true, value: { appId, email, grantedAt: now, grantedBy: by } };
}

export async function revokeAccess(db: D1Binding, appId: string, rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  if (!email || !isAppId(appId)) return false;
  const res = await db.prepare(`DELETE FROM app_access WHERE app_id = ?1 AND email = ?2`).bind(appId, email).run();
  return res.meta.changes > 0;
}
