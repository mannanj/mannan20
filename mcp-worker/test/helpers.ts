import { SELF, env as testEnv } from "cloudflare:test";
import { vi } from "vitest";
import { signMcpGrant } from "../src/vendor/grant";
import type { AppEnv } from "../src/types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ORIGIN = "https://example.com";
const REDIRECT_URI = "https://client.example/callback";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function authorizePage() {
  const registered = await SELF.fetch(`${ORIGIN}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "test-client",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
    }),
  });
  const { client_id: clientId } = (await registered.json()) as { client_id: string };
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const authorize = new URL(`${ORIGIN}/authorize`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("state", "client-state");
  const page = await SELF.fetch(authorize.toString());
  const html = await page.text();
  const state = /name="state" value="([^"]+)"/.exec(html)?.[1] ?? "";
  return { page, html, state, clientId, verifier };
}

export function choose(state: string, choice: string) {
  return SELF.fetch(`${ORIGIN}/authorize`, {
    method: "POST",
    body: new URLSearchParams({ state, choice }),
    redirect: "manual",
  });
}

export async function guestToken(): Promise<string> {
  const { state, clientId, verifier } = await authorizePage();
  const chosen = await choose(state, "guest");
  return exchangeCode(chosen, clientId, verifier);
}

export async function exchangeCode(
  redirect: Response,
  clientId: string,
  verifier: string,
): Promise<string> {
  const code = new URL(redirect.headers.get("location") ?? "").searchParams.get("code") ?? "";
  const token = await SELF.fetch(`${ORIGIN}/token`, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  const { access_token: accessToken } = (await token.json()) as { access_token: string };
  return accessToken;
}

export async function connectClient(token?: string) {
  const accessToken = token ?? (await guestToken());
  const transport = new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), {
    fetch: ((url: string | URL, init?: RequestInit) =>
      SELF.fetch(url, init)) as unknown as typeof fetch,
    requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

export function firstText(result: unknown): string {
  const blocks = (result as { content: Array<{ type: string; text?: string }> }).content;
  const block = blocks[0];
  if (!block || block.type !== "text" || typeof block.text !== "string") {
    throw new Error("expected text content block");
  }
  return block.text;
}

export function toolJson<T>(result: unknown): T {
  return JSON.parse(firstText(result)) as T;
}

// ─── hub (owner sign-in, /apps, fake sub-MCP) ─────────────────────────────


export const hubEnv = testEnv as unknown as AppEnv;
export const HUB_URL = "https://example.com";

export interface OwnerSession {
  cookie: string;
  csrf: string;
  clientId: string;
  verifier: string;
  redirect: Response;
}

export function csrfOf(html: string): string {
  return /name="csrf" value="([^"]+)"/.exec(html)?.[1] ?? "";
}

/** Owner signs in as an OAuth client: lands on /apps with a hub session (not yet authorized). */
export async function ownerSession(): Promise<OwnerSession> {
  const { state, clientId, verifier } = await authorizePage();
  const chosen = await choose(state, "signin");
  const flow = /uploads_mcp_flow=([^;]+)/.exec(chosen.headers.get("set-cookie") ?? "")?.[1] ?? "";
  const grant = await signMcpGrant({ sub: "owner-id", email: "hello@mannan.is", state }, hubEnv.MCP_GRANT_SECRET);
  const redirect = await SELF.fetch(`${HUB_URL}/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
    headers: { cookie: `uploads_mcp_flow=${flow}` },
    redirect: "manual",
  });
  return withCsrf(redirect, clientId, verifier);
}

async function withCsrf(redirect: Response, clientId: string, verifier: string): Promise<OwnerSession> {
  const cookie = /(__Host-hub=[^;]+)/.exec(redirect.headers.get("set-cookie") ?? "")?.[1] ?? "";
  const page = await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie } });
  return { cookie, csrf: csrfOf(await page.text()), clientId, verifier, redirect };
}

/** Owner opens /apps/login (manage session, no OAuth client waiting). */
export async function manageSession(): Promise<OwnerSession> {
  const login = await SELF.fetch(`${HUB_URL}/apps/login`, { redirect: "manual" });
  const state = new URL(login.headers.get("location") ?? "").searchParams.get("state") ?? "";
  const flow = /uploads_mcp_flow=([^;]+)/.exec(login.headers.get("set-cookie") ?? "")?.[1] ?? "";
  const grant = await signMcpGrant({ sub: "owner-id", email: "hello@mannan.is", state }, hubEnv.MCP_GRANT_SECRET);
  const redirect = await SELF.fetch(`${HUB_URL}/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
    headers: { cookie: `uploads_mcp_flow=${flow}` },
    redirect: "manual",
  });
  return withCsrf(redirect, "", "");
}

export function postApps(
  path: string,
  session: { cookie: string; csrf: string },
  opts: { origin?: string | null; csrf?: string | null; cookie?: string | null; headers?: Record<string, string>; fields?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const origin = opts.origin === undefined ? hubEnv.HUB_ORIGIN : opts.origin;
  if (origin) headers.origin = origin;
  const cookie = opts.cookie === undefined ? session.cookie : opts.cookie;
  if (cookie) headers.cookie = cookie;
  const body = new URLSearchParams();
  const csrf = opts.csrf === undefined ? session.csrf : opts.csrf;
  if (csrf !== null) body.set("csrf", csrf);
  for (const [k, v] of Object.entries(opts.fields ?? {})) body.set(k, v);
  return SELF.fetch(`${HUB_URL}${path}`, { method: "POST", headers, body, redirect: "manual" });
}

export const SUB_TOOLS = [
  { name: "list_events", description: "List events", inputSchema: { type: "object", properties: { from: { type: "string" } } } },
  { name: "get_event", description: "Get one event", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
];

export interface FakeSub {
  calls: Array<{ url: string; method: string; headers: Headers; body: string }>;
  registered: unknown[];
  revoked: string[];
  tools: typeof SUB_TOOLS;
  issuer?: string;
  authorizationEndpoint?: string;
  spy: ReturnType<typeof vi.spyOn>;
}

/** Stubs global fetch for one registry origin; everything else is refused. */
export function fakeSub(origin: string, overrides: Partial<Pick<FakeSub, "tools" | "issuer" | "authorizationEndpoint">> = {}): FakeSub {
  const sub: FakeSub = {
    calls: [],
    registered: [],
    revoked: [],
    tools: overrides.tools ?? SUB_TOOLS,
    issuer: overrides.issuer,
    authorizationEndpoint: overrides.authorizationEndpoint,
    spy: undefined as never,
  };
  let refreshCount = 0;
  sub.spy = vi.spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : init?.body ? String(init.body) : "";
    sub.calls.push({ url: url.toString(), method: init?.method ?? "GET", headers, body });
    if (url.origin !== origin) return new Response("blocked", { status: 599 });
    const json = (value: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...extra } });
    switch (url.pathname) {
      case "/.well-known/oauth-authorization-server":
        return json({
          issuer: sub.issuer ?? origin,
          authorization_endpoint: sub.authorizationEndpoint ?? `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          registration_endpoint: `${origin}/register`,
          revocation_endpoint: `${origin}/revoke`,
        });
      case "/register":
        sub.registered.push(JSON.parse(body));
        return json({ client_id: "sub-client-1" });
      case "/token": {
        const params = new URLSearchParams(body);
        if (params.get("grant_type") === "refresh_token") {
          refreshCount += 1;
          return json({ access_token: `at-refreshed-${refreshCount}`, refresh_token: `rt-${refreshCount}`, expires_in: 3600 });
        }
        return json({ access_token: "sub-access-1", refresh_token: "sub-refresh-1", expires_in: 3600 });
      }
      case "/revoke":
        sub.revoked.push(new URLSearchParams(body).get("token") ?? "");
        return new Response(null, { status: 200 });
      case "/mcp": {
        const message = JSON.parse(body) as { id?: number; method: string };
        if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (message.method === "initialize") {
          return json({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake", version: "1" } } });
        }
        if (message.method === "tools/list") return json({ jsonrpc: "2.0", id: message.id, result: { tools: sub.tools } });
        return json({ jsonrpc: "2.0", id: message.id, error: { message: "unsupported" } });
      }
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch);
  return sub;
}

export const CALENDAR_ORIGIN = "https://calendar-mcp.mannanteam.workers.dev";
