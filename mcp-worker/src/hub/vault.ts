import { DurableObject } from "cloudflare:workers";
import { needsRefresh, refresh, seal, unseal, type LinkedTokens } from "../vendor/mcp-connector/linked-app";
import { getApp, guardedFetch, serverOf, type ManifestTool } from "./registry";

export type LinkStatus = "linked" | "reauth" | "changed";
const SESSION_TTL_MS = 15 * 60_000;

export interface PendingAuthorization {
  /** JSON of the OAuth AuthRequest. */
  authRequest: string;
  userId: string;
  email: string;
}

export interface HubSession {
  sid: string;
  csrf: string;
  pending: PendingAuthorization | null;
  expiresAt: number;
}

export interface LinkRow {
  appId: string;
  tokensSealed: string;
  clientId: string;
  connectedAt: number;
  manifest: ManifestTool[];
  manifestCheckedAt: number | null;
  status: LinkStatus;
}

export interface VaultEnv {
  MCP_VAULT_SECRET: string;
}

function token(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let s = "";
  for (const b of raw) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const sealPurpose = (appId: string) => `hub:${appId}`;

/** One per owner (idFromName(email)). Single-threaded: refresh rotation and sessions cannot race. */
export class OwnerVault extends DurableObject<VaultEnv> {
  /** Replaced in tests. */
  fetchImpl: typeof fetch = (input, init) => fetch(input, init);
  private refreshing = new Map<string, Promise<LinkedTokens | null>>();

  constructor(ctx: DurableObjectState, env: VaultEnv) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS app_link(
      app_id TEXT PRIMARY KEY, tokens_sealed TEXT NOT NULL, client_id TEXT NOT NULL,
      connected_at INTEGER NOT NULL, manifest_json TEXT NOT NULL,
      manifest_checked_at INTEGER, status TEXT NOT NULL)`);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS hub_session(
      sid TEXT PRIMARY KEY, pending_json TEXT, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL)`);
  }

  // ─── sessions ──────────────────────────────────────────────────────────
  createSession(pending: PendingAuthorization | null): { sid: string; csrf: string } {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM hub_session WHERE expires_at < ?", Date.now());
    // One live session at a time keeps "single pending flow per session" simple.
    sql.exec("DELETE FROM hub_session");
    const sid = token(32);
    const csrf = token(24);
    sql.exec(
      "INSERT INTO hub_session(sid, pending_json, csrf, expires_at) VALUES(?,?,?,?)",
      sid,
      pending ? JSON.stringify(pending) : null,
      csrf,
      Date.now() + SESSION_TTL_MS,
    );
    return { sid, csrf };
  }

  getSession(sid: string): HubSession | null {
    if (!sid) return null;
    const row = this.ctx.storage.sql
      .exec<{ sid: string; pending_json: string | null; csrf: string; expires_at: number }>(
        "SELECT * FROM hub_session WHERE sid = ?",
        sid,
      )
      .toArray()[0];
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      this.deleteSession(sid);
      return null;
    }
    return {
      sid: row.sid,
      csrf: row.csrf,
      pending: row.pending_json ? (JSON.parse(row.pending_json) as PendingAuthorization) : null,
      expiresAt: row.expires_at,
    };
  }

  deleteSession(sid: string): void {
    this.ctx.storage.sql.exec("DELETE FROM hub_session WHERE sid = ?", sid);
  }

  /** Single use: returns the session (with its pending authorization) and deletes it. */
  consumeSession(sid: string): HubSession | null {
    const session = this.getSession(sid);
    if (session) this.deleteSession(sid);
    return session;
  }

  // ─── links ─────────────────────────────────────────────────────────────
  private rowToLink(row: Record<string, unknown>): LinkRow {
    return {
      appId: String(row.app_id),
      tokensSealed: String(row.tokens_sealed),
      clientId: String(row.client_id),
      connectedAt: Number(row.connected_at),
      manifest: JSON.parse(String(row.manifest_json)) as ManifestTool[],
      manifestCheckedAt: row.manifest_checked_at === null ? null : Number(row.manifest_checked_at),
      status: String(row.status) as LinkStatus,
    };
  }

  list(): Array<{ appId: string; status: LinkStatus; connectedAt: number; manifestChangedCount: number }> {
    return this.ctx.storage.sql
      .exec("SELECT * FROM app_link")
      .toArray()
      .map((row) => {
        const link = this.rowToLink(row);
        return {
          appId: link.appId,
          status: link.status,
          connectedAt: link.connectedAt,
          manifestChangedCount: link.manifest.filter((t) => t.status !== "ok").length,
        };
      });
  }

  putLink(appId: string, tokensSealed: string, clientId: string, manifest: ManifestTool[]): void {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO app_link(app_id, tokens_sealed, client_id, connected_at, manifest_json, manifest_checked_at, status)
       VALUES(?,?,?,?,?,?, 'linked')`,
      appId,
      tokensSealed,
      clientId,
      now,
      JSON.stringify(manifest),
      now,
    );
  }

  getLink(appId: string): LinkRow | null {
    const row = this.ctx.storage.sql.exec("SELECT * FROM app_link WHERE app_id = ?", appId).toArray()[0];
    return row ? this.rowToLink(row) : null;
  }

  setManifest(appId: string, manifest: ManifestTool[], status: LinkStatus): void {
    this.ctx.storage.sql.exec(
      "UPDATE app_link SET manifest_json = ?, manifest_checked_at = ?, status = ? WHERE app_id = ?",
      JSON.stringify(manifest),
      Date.now(),
      status,
      appId,
    );
  }

  markStatus(appId: string, status: LinkStatus): void {
    this.ctx.storage.sql.exec("UPDATE app_link SET status = ? WHERE app_id = ?", status, appId);
  }

  revokeLink(appId: string): void {
    this.ctx.storage.sql.exec("DELETE FROM app_link WHERE app_id = ?", appId);
  }

  clear(): void {
    this.ctx.storage.sql.exec("DELETE FROM app_link");
    this.ctx.storage.sql.exec("DELETE FROM hub_session");
  }

  // ─── tokens ────────────────────────────────────────────────────────────
  /**
   * Current tokens for an app, refreshed inside the DO when due. Concurrent
   * callers share one refresh (the refresh token rotates: a second refresh
   * with the old value would kill the link). null = no link or needs re-auth.
   * (PLAN's withTokens(app, fn): RPC cannot carry a closure into the DO, so
   * the DO hands back the fresh pair instead.)
   */
  async withTokens(appId: string): Promise<LinkedTokens | null> {
    const link = this.getLink(appId);
    if (!link || link.status === "reauth") return null;
    const tokens = await unseal<LinkedTokens>(this.env.MCP_VAULT_SECRET, sealPurpose(appId), link.tokensSealed);
    if (!tokens) return null;
    if (!needsRefresh(tokens)) return tokens;
    return this.refreshTokens(appId, tokens);
  }

  /** For a 401 from the sub-MCP: refresh now unless someone else already did. */
  async refreshAfter401(appId: string, staleAccessToken: string): Promise<LinkedTokens | null> {
    const link = this.getLink(appId);
    if (!link) return null;
    const tokens = await unseal<LinkedTokens>(this.env.MCP_VAULT_SECRET, sealPurpose(appId), link.tokensSealed);
    if (!tokens) return null;
    if (tokens.accessToken !== staleAccessToken) return tokens;
    return this.refreshTokens(appId, tokens);
  }

  private refreshTokens(appId: string, tokens: LinkedTokens): Promise<LinkedTokens | null> {
    const inflight = this.refreshing.get(appId);
    if (inflight) return inflight;
    const app = getApp(appId);
    if (!app) return Promise.resolve(null);
    const run = (async () => {
      try {
        const next = await refresh(serverOf(app), tokens, guardedFetch(app.mcpUrl, this.fetchImpl));
        if (!next) {
          this.markStatus(appId, "reauth");
          return null;
        }
        const sealed = await seal(this.env.MCP_VAULT_SECRET, sealPurpose(appId), next);
        this.ctx.storage.sql.exec("UPDATE app_link SET tokens_sealed = ? WHERE app_id = ?", sealed, appId);
        return next;
      } finally {
        this.refreshing.delete(appId);
      }
    })();
    this.refreshing.set(appId, run);
    return run;
  }
}
