import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LinkedAppError, McpSession, type ToolAnnotations } from "../vendor/mcp-connector/linked-app";
import { OWNER_EMAIL } from "../owner-api";
import type { AppEnv } from "../types";
import { REGISTRY, guardedFetch, pinManifest, serverOf, toolHash, type HubApp } from "./registry";
import { vaultFor } from "./session";
import type { LinkRow } from "./vault";

/**
 * The hub as an MCP client: the owner's sessions see each linked app's tools as
 * `<appId>__<tool>`, served from the manifest pinned at Authorize and forwarded
 * with that app's own sub-token. Nothing here is registered for anyone else.
 */

const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
const RECHECK_AFTER_MS = 60 * 60_000;
const RECHECK_TIMEOUT_MS = 4_000;
const CALL_TIMEOUT_MS = 25_000;
/** Text returned to the client is cut here; structuredContent is never touched. */
export const RESULT_TEXT_CAP = 100_000;
const REAUTH_URL = "https://mcp.mannanteam.workers.dev/apps/login";

type ToolOutput = { content: Array<Record<string, unknown>>; structuredContent?: Record<string, unknown>; isError?: boolean };

const errorResult = (message: string): ToolOutput => ({ content: [{ type: "text", text: message }], isError: true });
const reauthMessage = (app: HubApp) => `${app.name} needs to be authorized again. Open ${REAUTH_URL} to re-authorize it, then retry.`;

/** Only the app's own origin, no redirects, no Origin header, and no Authorization when tokenless. */
function subFetch(app: HubApp, accessToken: string, timeoutMs: number): typeof fetch {
  const guarded = guardedFetch(app.mcpUrl);
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.delete("origin");
    if (!accessToken) headers.delete("authorization");
    return guarded(input, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  }) as typeof fetch;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; reauth: boolean; message: string };

/** One lazy McpSession per attempt; a 401 refreshes once and retries once, then the link is marked for re-auth. */
async function withSession<T>(
  env: AppEnv,
  app: HubApp,
  timeoutMs: number,
  fn: (session: McpSession) => Promise<T>,
): Promise<Outcome<T>> {
  const vault = vaultFor(env);
  let access = "";
  if (app.scope !== null) {
    const tokens = await vault.withTokens(app.id);
    if (!tokens) return { ok: false, reauth: true, message: reauthMessage(app) };
    access = tokens.accessToken;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return { ok: true, value: await fn(new McpSession(serverOf(app), access, subFetch(app, access, timeoutMs))) };
    } catch (error) {
      if (error instanceof LinkedAppError && error.code === "unauthorized" && app.scope !== null) {
        if (attempt === 0) {
          const next = await vault.refreshAfter401(app.id, access);
          if (next) {
            access = next.accessToken;
            continue;
          }
        }
        await vault.markStatus(app.id, "reauth");
        return { ok: false, reauth: true, message: reauthMessage(app) };
      }
      if (error instanceof LinkedAppError) return { ok: false, reauth: false, message: `${app.name}: ${error.message}` };
      return { ok: false, reauth: false, message: `Could not reach ${app.name}. Try again shortly.` };
    }
  }
  return { ok: false, reauth: false, message: `Could not reach ${app.name}. Try again shortly.` };
}

/** Cut text blocks so the sum stays under the cap. Everything else is untouched. */
export function capResultText(result: ToolOutput, cap = RESULT_TEXT_CAP): ToolOutput {
  if (!Array.isArray(result.content)) return result;
  let used = 0;
  let omitted = 0;
  const content = result.content.map((block) => {
    if (block?.type !== "text" || typeof block.text !== "string") return block;
    const room = Math.max(0, cap - used);
    if (block.text.length <= room) {
      used += block.text.length;
      return block;
    }
    omitted += block.text.length - room;
    used = cap;
    return { ...block, text: block.text.slice(0, room) };
  });
  if (!omitted) return result;
  content.push({ type: "text", text: `[Mannan MCP cut this result: ${omitted} characters omitted]` });
  return { ...result, content };
}

const DESTRUCTIVE_NAME = /(^|[_-])(delete|remove|destroy|deactivate|revoke|cancel|purge|clear|drop)([_-]|$)/;
const WRITE_NAME = /(^|[_-])(create|add|update|set|submit|send|upload|duplicate|restore|invite|share|move|rename|write|edit|post|import)([_-]|$)/;

/**
 * The annotations the hub advertises for a proxied tool. A sub-MCP's claim can
 * only make a tool look MORE dangerous, never less: a name that says delete or
 * write wins over readOnlyHint:true, and a tool with no declared hint is a write.
 */
export function safeAnnotations(name: string, given?: ToolAnnotations): ToolAnnotations {
  const out: ToolAnnotations = { ...(given ?? {}) };
  const lower = name.toLowerCase();
  if (typeof out.readOnlyHint !== "boolean") out.readOnlyHint = false;
  if (DESTRUCTIVE_NAME.test(lower)) {
    out.destructiveHint = true;
    out.readOnlyHint = false;
  } else if (WRITE_NAME.test(lower)) {
    out.readOnlyHint = false;
  }
  if (out.readOnlyHint) delete out.destructiveHint;
  return out;
}

/** Compare a live tools/list against the pin; a differing hash withholds that tool. Never adds tools. */
async function recheck(env: AppEnv, app: HubApp, link: LinkRow): Promise<LinkRow> {
  const vault = vaultFor(env);
  const listed = await withSession(env, app, RECHECK_TIMEOUT_MS, (s) => s.listTools());
  if (!listed.ok) return link;
  const manifest = link.manifest.map((tool) => ({ ...tool }));
  const pinned = new Map(manifest.map((tool) => [tool.name, tool]));
  for (const live of listed.value) {
    const pin = pinned.get(live.name);
    if (!pin || (await toolHash(live)) === pin.sha256) continue;
    // Pinned before annotations existed: if the rest is byte-identical, adopt the
    // annotations silently. Anything else (or a pin that had annotations) is a change.
    if (
      pin.status === "ok" &&
      pin.annotations === undefined &&
      live.annotations !== undefined &&
      (await toolHash({ name: live.name, description: live.description, inputSchema: live.inputSchema })) === pin.sha256
    ) {
      pin.annotations = live.annotations;
      pin.sha256 = await toolHash(live);
      continue;
    }
    pin.status = "changed";
  }
  const anyChanged = manifest.some((tool) => tool.status !== "ok");
  const status = anyChanged ? "changed" : link.status === "changed" ? "linked" : link.status;
  await vault.setManifest(app.id, manifest, status);
  return { ...link, manifest, status, manifestCheckedAt: Date.now() };
}

async function loadLink(env: AppEnv, app: HubApp, allowRecheck: boolean): Promise<LinkRow | null> {
  const vault = vaultFor(env);
  let link = (await vault.getLink(app.id)) as unknown as LinkRow | null;
  if (!link) {
    if (app.scope !== null) return null;
    // Public app: nothing to authorize, so the first sight of its tools is the pin.
    const listed = await withSession(env, app, RECHECK_TIMEOUT_MS, (s) => s.listTools());
    if (!listed.ok) return null;
    await vault.putLink(app.id, "", "", await pinManifest(listed.value));
    return (await vault.getLink(app.id)) as unknown as LinkRow | null;
  }
  if (allowRecheck && (link.manifestCheckedAt === null || Date.now() - link.manifestCheckedAt > RECHECK_AFTER_MS)) {
    link = await recheck(env, app, link);
  }
  return link;
}

function register(server: McpServer, env: AppEnv, app: HubApp, tool: LinkRow["manifest"][number]): void {
  const name = `${app.id}__${tool.name}`;
  if (!NAME_RE.test(name)) return;
  let inputSchema: z.ZodType<Record<string, unknown>>;
  try {
    inputSchema = (z.fromJSONSchema as (schema: unknown) => unknown)(tool.inputSchema) as z.ZodType<Record<string, unknown>>;
  } catch {
    return;
  }
  server.registerTool(
    name,
    {
      description: `[${app.name} tool, via Mannan MCP] ${tool.description}`,
      inputSchema,
      annotations: safeAnnotations(tool.name, tool.annotations),
    },
    async (args: unknown): Promise<any> => {
      const limiter = env.PROXY_LIMITER;
      if (!limiter) return errorResult("Rate limiter unavailable.");
      try {
        if (!(await limiter.limit({ key: `proxy:${app.id}` })).success) {
          return errorResult(`Too many ${app.name} calls. Try again in a minute.`);
        }
      } catch {
        return errorResult("Rate limiter unavailable.");
      }
      try {
        // McpSession.request is the vendored file's only way to get the whole
        // result (content AND structuredContent); callTool flattens it.
        const outcome = await withSession(env, app, CALL_TIMEOUT_MS, (session) =>
          (session as unknown as { request(m: string, p: Record<string, unknown>): Promise<unknown> }).request(
            "tools/call",
            { name: tool.name, arguments: (args ?? {}) as Record<string, unknown> },
          ),
        );
        if (!outcome.ok) return errorResult(outcome.message);
        const result = outcome.value as ToolOutput | undefined;
        if (!result || typeof result !== "object") return errorResult(`${app.name} returned no result.`);
        return capResultText(result);
      } catch {
        return errorResult(`Could not reach ${app.name}. Try again shortly.`);
      }
    },
  );
}

/**
 * Owner sessions only. `recheck` is true on tools/list: manifests older than an
 * hour are compared with the live tools and any changed tool is withheld.
 */
export async function registerProxiedTools(
  server: McpServer,
  env: AppEnv,
  ownerEmail: string | undefined,
  opts: { recheck?: boolean } = {},
): Promise<void> {
  if (ownerEmail !== OWNER_EMAIL) return;
  try {
    const links = await Promise.all(
      REGISTRY.map((app) => loadLink(env, app, opts.recheck === true).catch(() => null)),
    );
    REGISTRY.forEach((app, index) => {
      const link = links[index];
      if (!link) return;
      for (const tool of link.manifest) {
        if (tool.status !== "ok") continue;
        try {
          register(server, env, app, tool);
        } catch {
          // A tool the SDK refuses (duplicate or malformed schema) is skipped, never fatal.
        }
      }
    });
  } catch {
    // The vault being down must not take the owner's other tools with it.
  }
}
