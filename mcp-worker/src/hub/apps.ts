import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { FLOW_COOKIE, STATE_TTL_SECONDS, flowKey, newState, plain, readCookie, sameFlow, stateKey } from "../auth";
import { OWNER_EMAIL } from "../owner-api";
import type { AppEnv, CallerProps } from "../types";
import {
  finishSignIn,
  discover,
  listTools,
  revoke,
  seal,
  startSignIn,
  unseal,
  type LinkedTokens,
  type SignInFlow,
} from "../vendor/mcp-connector/linked-app";
import { REGISTRY, getApp, guardedFetch, pinManifest, serverOf, type HubApp } from "./registry";
import { SESSION_COOKIE, clearSessionCookie, vaultFor } from "./session";
import { sealPurpose, type HubSession, type LinkStatus } from "./vault";

const flowCookieName = (id: string) => `__Host-hub_flow_${id}`;
const flowPurpose = (id: string) => `hubflow:${id}`;

const PAGE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
};

const FORBIDDEN = "That request could not be verified.";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function redirect(location: string, extra: Record<string, string | string[]> = {}): Response {
  const headers = new Headers({ location, "cache-control": "no-store", "referrer-policy": "no-referrer" });
  for (const [k, v] of Object.entries(extra)) for (const item of Array.isArray(v) ? v : [v]) headers.append(k, item);
  return new Response(null, { status: 302, headers });
}

async function currentSession(request: Request, env: AppEnv): Promise<HubSession | null> {
  const sid = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!sid) return null;
  return vaultFor(env).getSession(sid);
}

/** Same-origin check for every mutation, on top of the per-session csrf token. */
function sameOrigin(request: Request, env: AppEnv): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (origin) return origin === env.HUB_ORIGIN;
  return site === "same-origin";
}

async function mutation(request: Request, env: AppEnv): Promise<{ session: HubSession; form: FormData } | Response> {
  if (request.method !== "POST") return plain(405, "Method not allowed.");
  if (!sameOrigin(request, env)) return plain(403, FORBIDDEN);
  const session = await currentSession(request, env);
  if (!session) return plain(403, FORBIDDEN);
  const form = await request.formData().catch(() => null);
  const csrf = String(form?.get("csrf") ?? "");
  if (!form || !csrf || !sameFlow(csrf, session.csrf)) return plain(403, FORBIDDEN);
  return { session, form };
}

function statusLabel(app: HubApp, status: LinkStatus | "none"): string {
  if (app.scope === null) return "Public, no sign-in";
  if (status === "linked") return "Authorized";
  if (status === "reauth") return "Needs re-authorization";
  if (status === "changed") return "Tools changed. Review before use.";
  return "Not authorized";
}

function renderPage(
  env: AppEnv,
  session: HubSession,
  links: Map<string, { status: LinkStatus; manifestChangedCount: number }>,
  notice?: string,
): Response {
  const csrf = esc(session.csrf);
  const button = (path: string, label: string, kind = "") =>
    `<form method="post" action="${path}"><input type="hidden" name="csrf" value="${csrf}"><button type="submit"${kind ? ` class="${kind}"` : ""}>${label}</button></form>`;
  const rows = REGISTRY.map((app) => {
    const link = links.get(app.id);
    const status: LinkStatus | "none" = link?.status ?? "none";
    let actions = "";
    if (app.scope !== null) {
      if (status === "none" || status === "reauth") actions = button(`/apps/${app.id}/authorize`, "Authorize");
      else if (status === "changed")
        actions = button(`/apps/${app.id}/confirm-tools`, "Review tools") + button(`/apps/${app.id}/revoke`, "Revoke");
      else actions = button(`/apps/${app.id}/revoke`, "Revoke");
    }
    return `<li><div><strong>${esc(app.name)}</strong><span class="s ${status}">${esc(statusLabel(app, status))}</span></div><div class="a">${actions}</div></li>`;
  }).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mannan MCP apps</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif}
main{width:100%;max-width:520px;padding:48px 16px;box-sizing:border-box}
h1{font-weight:300;font-size:26px;margin:0 0 12px}
p{color:rgba(255,255,255,.55);line-height:1.6;margin:0 0 24px}
ul{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:8px}
li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px}
li div:first-child{display:flex;flex-direction:column;gap:2px}
.s{font-size:13px;color:rgba(255,255,255,.5)}
.s.linked{color:#4ade80}.s.reauth,.s.changed{color:#fbbf24}
.a{display:flex;gap:8px}
button{font:inherit;font-size:14px;padding:8px 12px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff}
button.primary{background:#f43f5e;border-color:#f43f5e;width:100%;padding:12px 16px;font-size:15px}
.n{color:#fbbf24}
</style>
</head>
<body>
<main>
<h1>Your apps</h1>
${notice ? `<p class="n">${esc(notice)}</p>` : ""}
<p>Each app asks on its own site. Mannan MCP holds a separate key per app; revoke any time.</p>
<ul>
<li><div><strong>Mannan</strong><span class="s linked">Signed in as ${esc(OWNER_EMAIL)} — Upload included</span></div></li>
${rows}
</ul>
${button("/apps/continue", "Continue", "primary")}
</main>
</body>
</html>`;
  return new Response(html, { headers: PAGE_HEADERS });
}

async function showPage(request: Request, env: AppEnv, notice?: string): Promise<Response> {
  const session = await currentSession(request, env);
  if (!session) return plain(403, FORBIDDEN);
  const list = await vaultFor(env).list();
  return renderPage(env, session, new Map(list.map((l) => [l.appId, l])), notice);
}

// ─── /apps/login ───────────────────────────────────────────────────────────

async function login(env: AppEnv): Promise<Response> {
  const state = newState();
  await env.OAUTH_KV.put(stateKey(state), JSON.stringify({ kind: "manage" }), { expirationTtl: STATE_TTL_SECONDS });
  const flow = newState();
  await env.OAUTH_KV.put(flowKey(state), flow, { expirationTtl: STATE_TTL_SECONDS });
  const bridge = new URL("/api/mcp/uploads/authorize", env.SITE_ORIGIN);
  bridge.searchParams.set("state", state);
  return redirect(bridge.toString(), {
    "set-cookie": `${FLOW_COOKIE}=${flow}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}`,
  });
}

// ─── per-app actions ───────────────────────────────────────────────────────

function expireFlowCookie(id: string): string {
  return `${flowCookieName(id)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function authorize(request: Request, env: AppEnv, app: HubApp): Promise<Response> {
  const checked = await mutation(request, env);
  if (checked instanceof Response) return checked;
  if (app.scope === null) return plain(400, "That app needs no sign-in.");
  // Fail closed until the sealing key is set (wrangler secret put MCP_VAULT_SECRET).
  if (!env.MCP_VAULT_SECRET) return showPage(request, env, "Authorizing apps is not switched on yet.");
  const f = guardedFetch(app.mcpUrl);
  let started;
  try {
    started = await startSignIn(
      {
        appId: app.id,
        server: serverOf(app),
        clientName: "Mannan MCP",
        redirectUri: `${env.HUB_ORIGIN}/apps/${app.id}/callback`,
        returnTo: "/apps",
        owner: OWNER_EMAIL,
        scope: app.scope,
      },
      f,
    );
    if (new URL(started.location).origin !== new URL(app.mcpUrl).origin) throw new Error("authorization endpoint off-origin");
  } catch {
    return showPage(request, env, `${app.name} could not be reached. Try again shortly.`);
  }
  const sealed = await seal(env.MCP_VAULT_SECRET, flowPurpose(app.id), started.flow);
  return redirect(started.location, {
    "set-cookie": `${flowCookieName(app.id)}=${sealed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  });
}

async function callback(request: Request, env: AppEnv, app: HubApp): Promise<Response> {
  if (request.method !== "GET") return plain(405, "Method not allowed.");
  const session = await currentSession(request, env);
  if (!session) return plain(403, FORBIDDEN);
  const clear = { "set-cookie": expireFlowCookie(app.id) };
  const flow = await unseal<SignInFlow>(
    env.MCP_VAULT_SECRET,
    flowPurpose(app.id),
    readCookie(request.headers.get("cookie"), flowCookieName(app.id)),
  );
  // The flow was minted for exactly one app: a code from another authorization server cannot land here.
  if (!flow || flow.appId !== app.id || app.scope === null) {
    return new Response(FORBIDDEN, { status: 403, headers: { "cache-control": "no-store", "set-cookie": expireFlowCookie(app.id) } });
  }
  const query = new URL(request.url).searchParams;
  const f = guardedFetch(app.mcpUrl);
  const iss = query.get("iss");
  if (iss) {
    try {
      if ((await discover(serverOf(app), f)).issuer !== iss) return plain(403, FORBIDDEN);
    } catch {
      return plain(502, "Could not verify the app.");
    }
  }
  let result;
  try {
    result = await finishSignIn({ flow, query, owner: OWNER_EMAIL, server: serverOf(app) }, f);
  } catch {
    return redirect("/apps", clear);
  }
  if (!result.ok) {
    if (result.reason === "denied") return redirect("/apps", clear);
    const status = result.reason === "exchange" ? 502 : 403;
    return new Response(FORBIDDEN, { status, headers: { "cache-control": "no-store", ...clear } });
  }
  try {
    const manifest = await pinManifest(await listTools(serverOf(app), result.tokens.accessToken, f));
    const sealed = await seal(env.MCP_VAULT_SECRET, sealPurpose(app.id), result.tokens);
    await vaultFor(env).putLink(app.id, sealed, result.tokens.clientId, manifest);
  } catch {
    await revoke(serverOf(app), result.tokens, f);
    return new Response("Could not read the app's tools.", { status: 502, headers: { "cache-control": "no-store", ...clear } });
  }
  return redirect("/apps", clear);
}

async function revokeApp(request: Request, env: AppEnv, app: HubApp): Promise<Response> {
  const checked = await mutation(request, env);
  if (checked instanceof Response) return checked;
  const vault = vaultFor(env);
  const link = await vault.getLink(app.id);
  if (link) {
    const tokens = await unseal<LinkedTokens>(env.MCP_VAULT_SECRET, sealPurpose(app.id), link.tokensSealed);
    if (tokens) await revoke(serverOf(app), tokens, guardedFetch(app.mcpUrl));
    await vault.revokeLink(app.id);
  }
  return redirect("/apps");
}

async function confirmTools(request: Request, env: AppEnv, app: HubApp): Promise<Response> {
  const checked = await mutation(request, env);
  if (checked instanceof Response) return checked;
  const vault = vaultFor(env);
  const tokens = await vault.withTokens(app.id);
  if (!tokens) return showPage(request, env, `${app.name} needs to be authorized again.`);
  try {
    const manifest = await pinManifest(await listTools(serverOf(app), tokens.accessToken, guardedFetch(app.mcpUrl)));
    await vault.setManifest(app.id, manifest, "linked");
  } catch {
    return showPage(request, env, `${app.name} could not be reached. Try again shortly.`);
  }
  return redirect("/apps");
}

async function continueFlow(request: Request, env: AppEnv): Promise<Response> {
  const checked = await mutation(request, env);
  if (checked instanceof Response) return checked;
  // Bound to the pending authorization stored server-side; nothing from the request picks it.
  const consumed = await vaultFor(env).consumeSession(checked.session.sid);
  if (!consumed) return plain(403, FORBIDDEN);
  const headers = { "set-cookie": clearSessionCookie };
  if (!consumed.pending) return redirect(env.SITE_ORIGIN, headers);
  const authRequest = JSON.parse(consumed.pending.authRequest) as AuthRequest;
  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: consumed.pending.userId,
    metadata: { email: consumed.pending.email },
    scope: authRequest.scope,
    props: { userId: consumed.pending.userId, email: consumed.pending.email },
  });
  return redirect(redirectTo, headers);
}

export async function handleAppsRequest(request: Request, env: AppEnv): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/apps") {
    return request.method === "GET" ? showPage(request, env) : plain(405, "Method not allowed.");
  }
  if (pathname === "/apps/login") return request.method === "GET" ? login(env) : plain(405, "Method not allowed.");
  if (pathname === "/apps/continue") return continueFlow(request, env);
  const match = /^\/apps\/([a-z]+)\/(authorize|callback|revoke|confirm-tools)$/.exec(pathname);
  const app = match ? getApp(match[1]) : undefined;
  if (!match || !app) return plain(404, "Not found");
  switch (match[2]) {
    case "authorize":
      return authorize(request, env, app);
    case "callback":
      return callback(request, env, app);
    case "revoke":
      return revokeApp(request, env, app);
    default:
      return confirmTools(request, env, app);
  }
}

/** GET /apps.json with a hub bearer token (the OAuth provider has already authenticated it). */
export async function handleAppsJson(request: Request, env: AppEnv, props: CallerProps | undefined): Promise<Response> {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (props?.email !== OWNER_EMAIL) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  const links = new Map((await vaultFor(env).list()).map((l) => [l.appId, l]));
  const apps = REGISTRY.map((app) => {
    const link = links.get(app.id);
    return {
      appId: app.id,
      name: app.name,
      status: app.scope === null ? ("public" as const) : (link?.status ?? ("none" as const)),
      connectedAt: link?.connectedAt ?? null,
    };
  });
  return Response.json({ apps, manageUrl: `${env.HUB_ORIGIN}/apps/login` }, { headers });
}
