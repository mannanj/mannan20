import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";

export interface Env {
  PORTFOLIO_STATE: DurableObjectNamespace<PortfolioState>;
  STATE_SERVICE_SECRET: string;
}

type Kind = "human" | "agent";
type LimitKind = "download" | "leaderboard" | "magic" | "feedback" | "garden-view" | "contact-intent" | "validate-contact" | "cloud-files";
type Row = Record<string, SqlStorageValue>;

const INSTANCE_NAME = "portfolio-state-v1";
const MAX_BODY_BYTES = 16 * 1024;
const NAME_RE = /^[\p{L}\p{N} ._'\-]{1,24}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOP_N = 10;
const KEEP_PER_BOARD = 200;
const MAGIC_TTL_MS = 15 * 60 * 1000;
const FEEDBACK_KEEP = 500;
const RENAME_HOP_LIMIT = 3;
const OPERATION_RETENTION_MS = 24 * 60 * 60 * 1000;
const OPERATIONS_MAX = 10_000;
const RATE_HITS_MAX = 10_000;
const LIMITS: Record<LimitKind, { max: number; ms: number }> = {
  download: { max: 10, ms: 60_000 },
  leaderboard: { max: 6, ms: 60_000 },
  magic: { max: 3, ms: 15 * 60_000 },
  feedback: { max: 4, ms: 10 * 60_000 },
  "garden-view": { max: 20, ms: 60_000 },
  "contact-intent": { max: 10, ms: 60 * 60_000 },
  "validate-contact": { max: 10, ms: 60 * 60_000 },
  "cloud-files": { max: 120, ms: 60_000 },
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

function fail(status: number, code: string): Response {
  return json({ ok: false, code }, status);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, max = 256): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function validName(value: unknown): string | null {
  const name = requiredString(value, 100);
  if (!name) return null;
  const normalized = normalizeName(name);
  return NAME_RE.test(normalized) ? normalized : null;
}

function validEmail(value: unknown): string | null {
  const email = requiredString(value, 254)?.trim().toLowerCase();
  return email && EMAIL_RE.test(email) ? email : null;
}

function validOwner(value: unknown): string | null {
  const owner = requiredString(value, 80);
  return owner && /^[a-zA-Z0-9_-]{8,80}$/.test(owner) ? owner : null;
}

function validOp(value: unknown): string | null {
  const op = requiredString(value, 128);
  return op && /^[a-zA-Z0-9_-]{8,128}$/.test(op) ? op : null;
}

function validKind(value: unknown): Kind | null {
  return value === "human" || value === "agent" ? value : null;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export class PortfolioState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS board_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK(kind IN ('human','agent')), name TEXT NOT NULL, score INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS board_entries_rank ON board_entries(kind, score DESC, id ASC);
      CREATE TABLE IF NOT EXISTS owners (lower_name TEXT PRIMARY KEY, owner_id TEXT NOT NULL, display_name TEXT NOT NULL, email_bound INTEGER NOT NULL DEFAULT 0, renamed_to TEXT);
      CREATE INDEX IF NOT EXISTS owners_owner ON owners(owner_id);
      CREATE TABLE IF NOT EXISTS identity_names (owner_id TEXT NOT NULL, lower_name TEXT NOT NULL, PRIMARY KEY(owner_id, lower_name));
      CREATE TABLE IF NOT EXISTS identity_emails (email TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS magic_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS magic_expiry ON magic_tokens(expires_at);
      CREATE TABLE IF NOT EXISTS magic_creations (op_id TEXT PRIMARY KEY, email TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT NOT NULL, ip_hash TEXT NOT NULL, validated INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS garden_views (slug TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS rate_hits (bucket TEXT NOT NULL, subject_hash TEXT NOT NULL, occurred_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS rate_window ON rate_hits(bucket, subject_hash, occurred_at);
      CREATE TABLE IF NOT EXISTS operations (op_id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, response_json TEXT NOT NULL, created_at INTEGER NOT NULL);
      INSERT OR IGNORE INTO _sql_schema_migrations(id, applied_at) VALUES (1, unixepoch() * 1000);
    `);
  }

  private rows<T extends Row>(query: string, ...params: unknown[]): T[] {
    return this.ctx.storage.sql.exec<T>(query, ...params).toArray();
  }

  private one<T extends Row>(query: string, ...params: unknown[]): T | null {
    return this.rows<T>(query, ...params)[0] ?? null;
  }

  private operation<T>(endpoint: string, opId: string, work: () => T): T {
    // Leave room for the operation recorded below so the hard bound is never
    // exceeded, even when the table is already at capacity.
    this.compactOperations(OPERATIONS_MAX - 1);
    const existing = this.one<{ endpoint: string; response_json: string }>("SELECT endpoint, response_json FROM operations WHERE op_id = ?", opId);
    if (existing) {
      if (existing.endpoint !== endpoint) throw new StateError("op_id_conflict", 409);
      return JSON.parse(existing.response_json) as T;
    }
    const result = work();
    this.ctx.storage.sql.exec("INSERT INTO operations(op_id, endpoint, response_json, created_at) VALUES (?, ?, ?, ?)", opId, endpoint, JSON.stringify(result), Date.now());
    return result;
  }

  private compactOperations(keep = OPERATIONS_MAX): void {
    const cutoff = Date.now() - OPERATION_RETENTION_MS;
    this.ctx.storage.sql.exec("DELETE FROM operations WHERE created_at < ?", cutoff);
    this.ctx.storage.sql.exec("DELETE FROM operations WHERE op_id IN (SELECT op_id FROM operations ORDER BY created_at DESC, op_id DESC LIMIT -1 OFFSET ?)", keep);
    this.ctx.storage.sql.exec("DELETE FROM magic_creations WHERE created_at < ?", cutoff);
  }

  private resolveOwner(lower: string): { lower: string; row: { owner_id: string; display_name: string; email_bound: number; renamed_to: string | null } | null } {
    let current = lower;
    let row = this.one<{ owner_id: string; display_name: string; email_bound: number; renamed_to: string | null }>("SELECT owner_id, display_name, email_bound, renamed_to FROM owners WHERE lower_name = ?", current);
    for (let hop = 0; hop < RENAME_HOP_LIMIT && row?.renamed_to; hop += 1) {
      current = row.renamed_to;
      row = this.one("SELECT owner_id, display_name, email_bound, renamed_to FROM owners WHERE lower_name = ?", current);
    }
    return { lower: current, row };
  }

  private verified(ownerId: string): boolean {
    return !!this.one("SELECT 1 AS found FROM identity_emails WHERE owner_id = ?", ownerId);
  }

  boards(): { human: Array<{ name: string; score: number }>; agent: Array<{ name: string; score: number }> } {
    const board = (kind: Kind) => this.rows<{ name: string; score: number }>("SELECT name, score FROM board_entries WHERE kind = ? ORDER BY score DESC, id ASC LIMIT ?", kind, TOP_N);
    return { human: board("human"), agent: board("agent") };
  }

  submitScore(input: { opId: string; kind: Kind; name: string; score: number; ownerId: string; cookieName?: string | null }): { ok: true; finalName: string } | { ok: false; code: "taken"; emailBound: boolean } {
    return this.operation("score.submit", input.opId, () => {
      const initial = input.name.toLowerCase();
      const { lower, row } = this.resolveOwner(initial);
      let finalName = input.name;
      if (row) {
        if (row.owner_id !== input.ownerId) return { ok: false as const, code: "taken" as const, emailBound: row.email_bound === 1 };
        finalName = row.display_name;
      } else {
        const cookieClaim = input.cookieName && normalizeName(input.cookieName).toLowerCase() === lower;
        const legacy = this.one("SELECT 1 AS found FROM board_entries WHERE name = ? LIMIT 1", input.name);
        if (!cookieClaim && legacy) return { ok: false as const, code: "taken" as const, emailBound: false };
        this.ctx.storage.sql.exec("INSERT INTO owners(lower_name, owner_id, display_name, email_bound) VALUES (?, ?, ?, ?)", lower, input.ownerId, input.name, this.verified(input.ownerId) ? 1 : 0);
      }
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO identity_names(owner_id, lower_name) VALUES (?, ?)", input.ownerId, lower);
      this.ctx.storage.sql.exec("INSERT INTO board_entries(kind, name, score, created_at) VALUES (?, ?, ?, ?)", input.kind, finalName, input.score, Date.now());
      this.ctx.storage.sql.exec("DELETE FROM board_entries WHERE id IN (SELECT id FROM board_entries WHERE kind = ? ORDER BY score DESC, id ASC LIMIT -1 OFFSET ?)", input.kind, KEEP_PER_BOARD);
      return { ok: true as const, finalName };
    });
  }

  async createMagic(input: { opId: string; email: string }): Promise<{ token: string; expiresAt: number }> {
    this.compactOperations();
    const otherOperation = this.one("SELECT 1 AS found FROM operations WHERE op_id = ?", input.opId);
    if (otherOperation) throw new StateError("op_id_conflict", 409);
    const existing = this.one<{ email: string; expires_at: number }>("SELECT email, expires_at FROM magic_creations WHERE op_id = ?", input.opId);
    if (existing && existing.email !== input.email) throw new StateError("op_id_conflict", 409);
    // The raw token is reproducible for idempotent retries but is never stored.
    const token = `do1_${await sha256(`magic:${input.opId}:${input.email}:${this.env.STATE_SERVICE_SECRET}`)}`;
    if (existing) return { token, expiresAt: existing.expires_at };
    const result = { token, expiresAt: Date.now() + MAGIC_TTL_MS };
    this.ctx.storage.sql.exec("DELETE FROM magic_tokens WHERE expires_at <= ?", Date.now());
    const tokenHash = await sha256(token);
    this.ctx.storage.sql.exec("INSERT INTO magic_tokens(token_hash, email, expires_at) VALUES (?, ?, ?)", tokenHash, input.email, result.expiresAt);
    this.ctx.storage.sql.exec("INSERT INTO magic_creations(op_id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)", input.opId, input.email, tokenHash, result.expiresAt, Date.now());
    return result;
  }

  async consumeMagic(input: { opId: string; token: string; deviceOwnerId?: string | null }): Promise<{ ownerId: string; email: string; names: string[] } | null> {
    this.compactOperations(OPERATIONS_MAX - 1);
    const existing = this.one<{ endpoint: string; response_json: string }>("SELECT endpoint, response_json FROM operations WHERE op_id = ?", input.opId);
    if (existing) {
      if (existing.endpoint !== "magic.consume") throw new StateError("op_id_conflict", 409);
      return JSON.parse(existing.response_json) as { ownerId: string; email: string; names: string[] } | null;
    }
    const tokenHash = await sha256(input.token);
    const token = this.one<{ email: string; expires_at: number }>("SELECT email, expires_at FROM magic_tokens WHERE token_hash = ?", tokenHash);
    this.ctx.storage.sql.exec("DELETE FROM magic_tokens WHERE token_hash = ?", tokenHash);
    let result: { ownerId: string; email: string; names: string[] } | null = null;
    if (token && token.expires_at > Date.now()) {
      const emailRecord = this.one<{ owner_id: string }>("SELECT owner_id FROM identity_emails WHERE email = ?", token.email);
      const ownerId = emailRecord?.owner_id ?? crypto.randomUUID().replace(/-/g, "");
      if (!emailRecord) this.ctx.storage.sql.exec("INSERT INTO identity_emails(email, owner_id) VALUES (?, ?)", token.email, ownerId);
      if (input.deviceOwnerId && input.deviceOwnerId !== ownerId) {
        this.ctx.storage.sql.exec("UPDATE owners SET owner_id = ?, email_bound = 1 WHERE owner_id = ?", ownerId, input.deviceOwnerId);
        this.ctx.storage.sql.exec("INSERT OR IGNORE INTO identity_names(owner_id, lower_name) SELECT ?, lower_name FROM identity_names WHERE owner_id = ?", ownerId, input.deviceOwnerId);
        this.ctx.storage.sql.exec("DELETE FROM identity_names WHERE owner_id = ?", input.deviceOwnerId);
      }
      this.ctx.storage.sql.exec("UPDATE owners SET email_bound = 1 WHERE owner_id = ?", ownerId);
      result = { ownerId, email: token.email, names: this.identityInfo(ownerId).names };
    }
    this.ctx.storage.sql.exec("INSERT INTO operations(op_id, endpoint, response_json, created_at) VALUES (?, ?, ?, ?)", input.opId, "magic.consume", JSON.stringify(result), Date.now());
    return result;
  }

  identityInfo(ownerId: string): { names: string[]; email: string | null } {
    const names = this.rows<{ display_name: string }>(`SELECT o.display_name FROM identity_names n JOIN owners o ON o.lower_name = n.lower_name WHERE n.owner_id = ? AND o.owner_id = ? AND o.renamed_to IS NULL ORDER BY o.display_name ASC`, ownerId, ownerId).map((row) => row.display_name);
    return { names, email: this.one<{ email: string }>("SELECT email FROM identity_emails WHERE owner_id = ?", ownerId)?.email ?? null };
  }

  renameIdentity(input: { opId: string; ownerId: string; to: string; from?: string | null }): { ok: true } | { ok: false; code: "taken" | "no-names" } {
    return this.operation("identity.rename", input.opId, () => {
      const verified = this.verified(input.ownerId);
      let olds = verified ? this.rows<{ lower_name: string }>("SELECT lower_name FROM identity_names WHERE owner_id = ?", input.ownerId).map((row) => row.lower_name) : input.from ? [input.from.toLowerCase()] : [];
      if (!olds.length) return { ok: false as const, code: "no-names" as const };
      const lower = input.to.toLowerCase();
      const existing = this.one<{ owner_id: string }>("SELECT owner_id FROM owners WHERE lower_name = ?", lower);
      if (existing && existing.owner_id !== input.ownerId) return { ok: false as const, code: "taken" as const };
      if (!existing && this.one("SELECT 1 AS found FROM board_entries WHERE name = ? LIMIT 1", input.to)) return { ok: false as const, code: "taken" as const };
      if (!existing) this.ctx.storage.sql.exec("INSERT INTO owners(lower_name, owner_id, display_name, email_bound) VALUES (?, ?, ?, ?)", lower, input.ownerId, input.to, verified ? 1 : 0);
      else this.ctx.storage.sql.exec("UPDATE owners SET display_name = ?, email_bound = MAX(email_bound, ?), renamed_to = NULL WHERE lower_name = ?", input.to, verified ? 1 : 0, lower);
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO identity_names(owner_id, lower_name) VALUES (?, ?)", input.ownerId, lower);
      for (const old of olds) {
        if (old === lower) continue;
        const row = this.one<{ display_name: string; owner_id: string; renamed_to: string | null }>("SELECT display_name, owner_id, renamed_to FROM owners WHERE lower_name = ?", old);
        if (!row || row.owner_id !== input.ownerId || row.renamed_to) continue;
        this.ctx.storage.sql.exec("UPDATE board_entries SET name = ? WHERE name = ?", input.to, row.display_name);
        this.ctx.storage.sql.exec("UPDATE owners SET renamed_to = ? WHERE lower_name = ?", lower, old);
      }
      return { ok: true as const };
    });
  }

  async pushFeedback(input: { opId: string; message: string; ip: string; validated: boolean }): Promise<{ ok: true }> {
    const ipHash = await sha256(input.ip);
    return this.operation("feedback.push", input.opId, () => {
      this.ctx.storage.sql.exec("INSERT INTO feedback(message, ip_hash, validated, created_at) VALUES (?, ?, ?, ?)", input.message, ipHash, input.validated ? 1 : 0, Date.now());
      this.ctx.storage.sql.exec("DELETE FROM feedback WHERE id NOT IN (SELECT id FROM feedback ORDER BY id DESC LIMIT ?)", FEEDBACK_KEEP);
      return { ok: true as const };
    });
  }

  gardenGet(slug: string): { slug: string; views: number } {
    return { slug, views: this.one<{ views: number }>("SELECT views FROM garden_views WHERE slug = ?", slug)?.views ?? 0 };
  }

  gardenIncrement(input: { opId: string; slug: string }): { slug: string; views: number } {
    return this.operation("garden.increment", input.opId, () => {
      this.ctx.storage.sql.exec("INSERT INTO garden_views(slug, views) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET views = views + 1", input.slug);
      return this.gardenGet(input.slug);
    });
  }

  async limit(input: { opId: string; kind: LimitKind; subject: string }): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | { error: "rate_limit_capacity" }> {
    const subjectHash = await sha256(input.subject);
    return this.operation("rate.check", input.opId, () => {
      const config = LIMITS[input.kind];
      const now = Date.now();
      const currentStart = Math.floor(now / config.ms) * config.ms;
      const previousStart = currentStart - config.ms;
      // Expire each policy on its own schedule. Short policies therefore cannot
      // fill the global cap with rows that no longer affect decisions.
      for (const [kind, policy] of Object.entries(LIMITS)) {
        this.ctx.storage.sql.exec(
          "DELETE FROM rate_hits WHERE bucket = ? AND occurred_at <= ?",
          kind,
          now - (policy.ms * 2 + 1_000),
        );
      }
      if (input.kind === "cloud-files") {
        const windowStart = now - config.ms;
        this.ctx.storage.sql.exec(
          "DELETE FROM rate_hits WHERE bucket = ? AND occurred_at <= ?",
          input.kind,
          windowStart,
        );
        const window = this.one<{ count: number; oldest: number | null }>(`
          SELECT COUNT(*) AS count, MIN(occurred_at) AS oldest
          FROM rate_hits
          WHERE bucket = ? AND subject_hash = ? AND occurred_at > ?
        `, input.kind, subjectHash, windowStart);
        const current = window?.count ?? 0;
        const reset = current > 0 && window?.oldest != null
          ? window.oldest + config.ms
          : now + config.ms;
        if (current >= config.max) {
          return { success: false, limit: config.max, remaining: 0, reset };
        }
        const total = this.one<{ count: number }>("SELECT COUNT(*) AS count FROM rate_hits")?.count ?? 0;
        if (total >= RATE_HITS_MAX) return { error: "rate_limit_capacity" as const };
        this.ctx.storage.sql.exec("INSERT INTO rate_hits(bucket, subject_hash, occurred_at) VALUES (?, ?, ?)", input.kind, subjectHash, now);
        return { success: true, limit: config.max, remaining: config.max - current - 1, reset };
      }
      // Preserve Upstash's two-bucket weighted sliding-window algorithm for
      // migrated public-site policies whose parity depends on those semantics.
      const counts = this.one<{ previous_count: number; current_count: number }>(`
        SELECT
          SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous_count,
          SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS current_count
        FROM rate_hits
        WHERE bucket = ? AND subject_hash = ? AND occurred_at >= ?
      `, previousStart, currentStart, currentStart, input.kind, subjectHash, previousStart);
      const previous = counts?.previous_count ?? 0;
      const current = counts?.current_count ?? 0;
      const percentageInCurrent = (now % config.ms) / config.ms;
      const weightedPrevious = Math.floor((1 - percentageInCurrent) * previous);
      const reset = currentStart + config.ms;
      if (weightedPrevious + current >= config.max) {
        return { success: false, limit: config.max, remaining: 0, reset };
      }
      const total = this.one<{ count: number }>("SELECT COUNT(*) AS count FROM rate_hits")?.count ?? 0;
      if (total >= RATE_HITS_MAX) return { error: "rate_limit_capacity" as const };
      this.ctx.storage.sql.exec("INSERT INTO rate_hits(bucket, subject_hash, occurred_at) VALUES (?, ?, ?)", input.kind, subjectHash, now);
      return { success: true, limit: config.max, remaining: config.max - weightedPrevious - current - 1, reset };
    });
  }

  adminExport(): Record<string, unknown> {
    return {
      version: 1,
      boardEntries: this.rows("SELECT kind, name, score, created_at FROM board_entries ORDER BY id ASC"),
      owners: this.rows("SELECT lower_name, owner_id, display_name, email_bound, renamed_to FROM owners"),
      identityNames: this.rows("SELECT owner_id, lower_name FROM identity_names"),
      identityEmails: this.rows("SELECT email, owner_id FROM identity_emails"),
      gardenViews: this.rows("SELECT slug, views FROM garden_views"),
      feedbackSummary: this.one<{ count: number }>("SELECT COUNT(*) AS count FROM feedback")?.count ?? 0,
    };
  }

  adminImport(input: { opId: string; data: Record<string, unknown> }): { ok: true; imported: Record<string, number> } {
    return this.operation("admin.import", input.opId, () => {
      const imported: Record<string, number> = {};
      const arrays: Array<[string, string, string[], (row: Record<string, unknown>) => unknown[]]> = [
        ["boardEntries", "INSERT INTO board_entries(kind, name, score, created_at) VALUES (?, ?, ?, ?)", ["kind", "name", "score", "created_at"], (row) => [row.kind, row.name, row.score, row.created_at ?? Date.now()]],
        ["owners", "INSERT OR REPLACE INTO owners(lower_name, owner_id, display_name, email_bound, renamed_to) VALUES (?, ?, ?, ?, ?)", ["lower_name", "owner_id", "display_name"], (row) => [row.lower_name, row.owner_id, row.display_name, row.email_bound ? 1 : 0, row.renamed_to ?? null]],
        ["identityNames", "INSERT OR IGNORE INTO identity_names(owner_id, lower_name) VALUES (?, ?)", ["owner_id", "lower_name"], (row) => [row.owner_id, row.lower_name]],
        ["identityEmails", "INSERT OR REPLACE INTO identity_emails(email, owner_id) VALUES (?, ?)", ["email", "owner_id"], (row) => [row.email, row.owner_id]],
        ["gardenViews", "INSERT INTO garden_views(slug, views) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET views = excluded.views", ["slug", "views"], (row) => [row.slug, row.views]],
      ];
      for (const [key, statement, required, values] of arrays) {
        const raw = input.data[key];
        if (raw === undefined) continue;
        if (!Array.isArray(raw) || raw.some((row) => !isObject(row) || required.some((field) => row[field] === undefined))) throw new StateError("invalid_import", 400);
        for (const row of raw) this.ctx.storage.sql.exec(statement, ...values(row as Record<string, unknown>));
        imported[key] = raw.length;
      }
      for (const kind of ["human", "agent"] as const) this.ctx.storage.sql.exec("DELETE FROM board_entries WHERE id IN (SELECT id FROM board_entries WHERE kind = ? ORDER BY score DESC, id ASC LIMIT -1 OFFSET ?)", kind, KEEP_PER_BOARD);
      return { ok: true as const, imported };
    });
  }
}

class StateError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

export class FileRateLimitService extends WorkerEntrypoint<Env> {
  async limitFileAccess(input: { subject: string }): Promise<
    { success: boolean; limit: number; remaining: number; reset: number }
    | { error: "invalid_input" | "rate_limit_capacity" }
  > {
    const subject = requiredString(input?.subject, 512);
    if (!subject) return { error: "invalid_input" };
    const state = this.env.PORTFOLIO_STATE.getByName(INSTANCE_NAME);
    return state.limit({
      opId: `cloud-files-${crypto.randomUUID()}`,
      kind: "cloud-files",
      subject,
    });
  }
}

const REMOTE_STATE_ERRORS: Record<string, number> = {
  invalid_import: 400,
  op_id_conflict: 409,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return fail(404, "not_found");
    const supplied = request.headers.get("x-state-service-key");
    if (!supplied || !env.STATE_SERVICE_SECRET || !stableEqual(supplied, env.STATE_SERVICE_SECRET)) return fail(401, "unauthorized");
    const body = await readJson(request);
    if (!body) return fail(400, "invalid_json");
    const state = env.PORTFOLIO_STATE.getByName(INSTANCE_NAME);
    try {
      const path = new URL(request.url).pathname;
      if (path === "/v1/boards") return json(await state.boards());
      if (path === "/v1/identity/info") { const ownerId = validOwner(body.ownerId); return ownerId ? json(await state.identityInfo(ownerId)) : fail(400, "invalid_input"); }
      if (path === "/v1/garden/views/get") { const slug = requiredString(body.slug, 120); return slug ? json(await state.gardenGet(slug)) : fail(400, "invalid_input"); }
      if (path === "/v1/admin/export") return json(await state.adminExport());
      const opId = validOp(body.opId);
      if (!opId) return fail(400, "invalid_op_id");
      if (path === "/v1/scores/submit") {
        const kind = validKind(body.kind), name = validName(body.name), ownerId = validOwner(body.ownerId), score = body.score;
        if (!kind || !name || !ownerId || !Number.isInteger(score) || (score as number) < 0 || (score as number) > 1_000_000) return fail(400, "invalid_input");
        const cookieName = body.cookieName === null || body.cookieName === undefined ? null : validName(body.cookieName); if (body.cookieName !== null && body.cookieName !== undefined && !cookieName) return fail(400, "invalid_input");
        return json(await state.submitScore({ opId, kind, name, ownerId, score: score as number, cookieName }));
      }
      if (path === "/v1/magic/create") { const email = validEmail(body.email); return email ? json(await state.createMagic({ opId, email })) : fail(400, "invalid_input"); }
      if (path === "/v1/magic/consume") { const token = requiredString(body.token, 200); const deviceOwnerId = body.deviceOwnerId === null || body.deviceOwnerId === undefined ? null : validOwner(body.deviceOwnerId); return token && /^do1_[a-f0-9]{64}$/i.test(token) && (body.deviceOwnerId === null || body.deviceOwnerId === undefined || deviceOwnerId) ? json(await state.consumeMagic({ opId, token, deviceOwnerId })) : fail(400, "invalid_input"); }
      if (path === "/v1/identity/rename") { const ownerId = validOwner(body.ownerId), to = validName(body.to), from = body.from === undefined || body.from === null ? null : validName(body.from); return ownerId && to && (body.from === undefined || body.from === null || from) ? json(await state.renameIdentity({ opId, ownerId, to, from })) : fail(400, "invalid_input"); }
      if (path === "/v1/feedback") { const message = requiredString(body.message, 4_000), ip = requiredString(body.ip, 200); return message && ip && typeof body.validated === "boolean" ? json(await state.pushFeedback({ opId, message, ip, validated: body.validated })) : fail(400, "invalid_input"); }
      if (path === "/v1/garden/views/increment") { const slug = requiredString(body.slug, 120); return slug ? json(await state.gardenIncrement({ opId, slug })) : fail(400, "invalid_input"); }
      if (path === "/v1/rate/check") {
        const kind = body.kind as LimitKind, subject = requiredString(body.subject, 512);
        if (!LIMITS[kind] || !subject) return fail(400, "invalid_input");
        const result = await state.limit({ opId, kind, subject });
        return "error" in result ? fail(503, result.error) : json(result);
      }
      if (path === "/v1/admin/import") return isObject(body.data) ? json(await state.adminImport({ opId, data: body.data })) : fail(400, "invalid_input");
      return fail(404, "not_found");
    } catch (error) {
      if (error instanceof StateError) return fail(error.status, error.code);
      // WorkerEntrypoint RPC serializes application exceptions as plain remote
      // Errors, so preserve the small allowlisted status contract explicitly.
      if (error instanceof Error && REMOTE_STATE_ERRORS[error.message]) {
        return fail(REMOTE_STATE_ERRORS[error.message], error.message);
      }
      return fail(500, "internal_error");
    }
  },
};
