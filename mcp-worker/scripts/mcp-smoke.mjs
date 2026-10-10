import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] ?? "https://mcp.mannanteam.workers.dev/mcp";
const origin = new URL(url).origin;
const redirectUri = "http://localhost:9/smoke-callback";

const base64Url = (bytes) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const unauthenticated = await fetch(url, { method: "POST", body: "{}" });
if (unauthenticated.status !== 401) throw new Error(`expected 401 without a token, got ${unauthenticated.status}`);

const registered = await fetch(`${origin}/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    client_name: "mcp-smoke",
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: "none",
  }),
});
const { client_id: clientId } = await registered.json();
const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = base64Url(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
);
const authorize = new URL(`${origin}/authorize`);
authorize.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  redirect_uri: redirectUri,
  code_challenge: challenge,
  code_challenge_method: "S256",
  state: "smoke",
}).toString();
const page = await (await fetch(authorize)).text();
const state = /name="state" value="([^"]+)"/.exec(page)?.[1];
if (!state || !page.includes('value="guest"')) throw new Error("sign-in page missing guest choice");
const chosen = await fetch(`${origin}/authorize`, {
  method: "POST",
  body: new URLSearchParams({ state, choice: "guest" }),
  redirect: "manual",
});
const code = new URL(chosen.headers.get("location") ?? "").searchParams.get("code");
if (!code) throw new Error(`guest choice returned no code (${chosen.status})`);
const tokenResponse = await fetch(`${origin}/token`, {
  method: "POST",
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  }),
});
const { access_token: accessToken } = await tokenResponse.json();
if (!accessToken) throw new Error("guest token exchange failed");

const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(
  new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
  }),
);
const { tools } = await client.listTools();
if (tools.length !== 11) throw new Error(`expected 11 tools, got ${tools.length}`);
const result = await client.callTool({ name: "get_profile", arguments: {} });
const text = result.content?.[0]?.text ?? "";
if (!text.includes("Mannan Javid")) throw new Error("get_profile missing name");
const search = await client.callTool({ name: "search", arguments: { query: "prediabetes" } });
const searchText = search.content?.[0]?.text ?? "";
if (!searchText.includes("health-longevity")) throw new Error("search miss");
const article = await client.callTool({
  name: "get_article",
  arguments: { slug: "health-longevity" },
});
const articleText = article.content?.[0]?.text ?? "";
if (!articleText.includes("health optimization stopped being a hobby")) {
  throw new Error("get_article missing full text");
}
await client.close();
console.log(`smoke ok: guest sign-in, 11 public tools and full article text live at ${url}`);
