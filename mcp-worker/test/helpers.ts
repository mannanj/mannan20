import { SELF } from "cloudflare:test";
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
