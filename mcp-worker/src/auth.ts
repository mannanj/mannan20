import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { verifyMcpGrant } from "./vendor/grant";
import { OWNER_EMAIL } from "./owner-api";
import type { AppEnv, CallerProps, OwnerProps } from "./types";

const STATE_TTL_SECONDS = 600;
const FLOW_COOKIE = "uploads_mcp_flow";
const UNVERIFIED_MESSAGE = "That sign-in could not be verified.";

const stateKey = (state: string) => `mcp:authreq:${state}`;
const flowKey = (state: string) => `mcp:flow:${state}`;

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sameFlow(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function newState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

const CHOICE_HTML = (state: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect to Mannan</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif}
main{width:100%;max-width:400px;padding:48px 16px;box-sizing:border-box}
h1{font-weight:300;font-size:26px;margin:0 0 12px}
p{color:rgba(255,255,255,.55);line-height:1.6;margin:0 0 24px}
form{display:flex;flex-direction:column;gap:12px}
button{font:inherit;font-size:15px;padding:12px 16px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff}
button[value=signin]{background:#f43f5e;border-color:#f43f5e}
small{display:block;margin-top:24px;color:rgba(255,255,255,.4)}
</style>
</head>
<body>
<main>
<h1>Connect to Mannan</h1>
<p>Guests get Mannan's public profile, writing and projects. Signing in also gives Mannan's account the Upload tools.</p>
<form method="post" action="/authorize">
<input type="hidden" name="state" value="${state}">
<button type="submit" name="choice" value="signin">Sign in</button>
<button type="submit" name="choice" value="guest">Continue as guest</button>
</form>
<small>If this wasn't you, close this page.</small>
</main>
</body>
</html>`;

export async function handleAuthorize(request: Request, env: AppEnv): Promise<Response> {
  if (request.method === "POST") return handleChoice(request, env);

  let authRequest: AuthRequest;
  try {
    authRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch {
    return plain(400, "Invalid authorization request.");
  }

  const state = newState();
  await env.OAUTH_KV.put(stateKey(state), JSON.stringify(authRequest), {
    expirationTtl: STATE_TTL_SECONDS,
  });

  return new Response(CHOICE_HTML(state), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "content-security-policy": "frame-ancestors 'none'",
    },
  });
}

async function handleChoice(request: Request, env: AppEnv): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const state = String(form?.get("state") ?? "");
  const choice = String(form?.get("choice") ?? "");
  if (!state || (choice !== "guest" && choice !== "signin")) {
    return plain(400, "Invalid authorization request.");
  }

  const stored = await env.OAUTH_KV.get(stateKey(state));
  if (!stored) return plain(400, "That took too long. Start connecting again.");

  if (choice === "guest") {
    await env.OAUTH_KV.delete(stateKey(state));
    const authRequest = JSON.parse(stored) as AuthRequest;
    const userId = `guest-${crypto.randomUUID()}`;
    const props: CallerProps = { userId };
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: authRequest,
      userId,
      metadata: { guest: true },
      scope: [],
      props,
    });
    return Response.redirect(redirectTo, 302);
  }

  const flow = newState();
  await env.OAUTH_KV.put(flowKey(state), flow, { expirationTtl: STATE_TTL_SECONDS });

  const bridge = new URL("/api/mcp/uploads/authorize", env.SITE_ORIGIN);
  bridge.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: bridge.toString(),
      "cache-control": "no-store",
      "set-cookie": `${FLOW_COOKIE}=${flow}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}`,
    },
  });
}

export async function handleCallback(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const grant = url.searchParams.get("grant") ?? "";
  if (!state || !grant) return plain(400, "Missing authorization response.");

  const stored = await env.OAUTH_KV.get(stateKey(state));
  if (!stored) return plain(400, "That took too long. Start connecting again.");

  const expectedFlow = await env.OAUTH_KV.get(flowKey(state));
  const presentedFlow = readCookie(request.headers.get("cookie"), FLOW_COOKIE);
  const boundToThisBrowser =
    expectedFlow !== null && presentedFlow !== null && sameFlow(expectedFlow, presentedFlow);

  await env.OAUTH_KV.delete(flowKey(state));

  if (!boundToThisBrowser) {
    await env.OAUTH_KV.delete(stateKey(state));
    return plain(403, UNVERIFIED_MESSAGE);
  }

  await env.OAUTH_KV.delete(stateKey(state));

  const verified = await verifyMcpGrant(grant, env.MCP_GRANT_SECRET, { expectedState: state });
  if (!verified.ok || verified.payload.email !== OWNER_EMAIL) {
    return plain(403, UNVERIFIED_MESSAGE);
  }

  const authRequest = JSON.parse(stored) as AuthRequest;
  const props: OwnerProps = { userId: verified.payload.sub, email: verified.payload.email };

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: verified.payload.sub,
    metadata: { email: verified.payload.email },
    scope: authRequest.scope,
    props,
  });

  return Response.redirect(redirectTo, 302);
}
