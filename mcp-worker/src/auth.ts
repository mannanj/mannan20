import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { verifyMcpGrant } from "./vendor/grant";
import { OWNER_EMAIL } from "./owner-api";
import type { AppEnv, OwnerProps } from "./types";

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

export async function handleAuthorize(request: Request, env: AppEnv): Promise<Response> {
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
