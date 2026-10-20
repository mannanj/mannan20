import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signMcpGrant, verifyActor } from "../src/vendor/grant";
import { ACCESS_TOOLS } from "../src/access-tools";
import { authorizePage, choose, connectClient, exchangeCode, guestToken, hubEnv, toolJson } from "./helpers";

const OWNER_ONLY = ["list_pages", "upload_file", "delete_file", ...ACCESS_TOOLS];

/** A mannan.is account (not Mannan) signs in as an OAuth client and gets a token. */
async function memberToken(email: string): Promise<string> {
  const { state, clientId, verifier } = await authorizePage();
  const chosen = await choose(state, "signin");
  const flow = /uploads_mcp_flow=([^;]+)/.exec(chosen.headers.get("set-cookie") ?? "")?.[1] ?? "";
  const grant = await signMcpGrant({ sub: email, email, state }, hubEnv.MCP_GRANT_SECRET);
  const done = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
    headers: { cookie: `uploads_mcp_flow=${flow}` },
    redirect: "manual",
  });
  expect(done.status).toBe(302);
  expect(new URL(done.headers.get("location") ?? "").origin).toBe("https://client.example");
  return exchangeCode(done, clientId, verifier);
}

/** Fake mannan.is /api/access/apps; records the actor each call was made as. */
function fakeSite(answer: (email: string) => Response | Promise<Response>) {
  const actors: string[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url !== "https://mannan.is/api/access/apps") throw new Error(`unexpected fetch ${url}`);
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    const actor = await verifyActor(auth.replace(/^Bearer /, ""), env.MCP_ACTOR_SECRET);
    if (!actor) return Response.json({ error: "Sign in first" }, { status: 401 });
    actors.push(actor.email);
    return answer(actor.email);
  });
  return { spy, actors };
}

const siteApps = (email: string, apps: unknown[]) => Response.json({ email, apps });
type AppsResult = { apps: { name: string; url: string }[]; signedInAs?: string; note?: string };

afterEach(() => vi.restoreAllMocks());

describe("signing in with another mannan.is account", () => {
  it("completes straight to the client (no /apps hub) and gets no owner or app tools", async () => {
    const client = await connectClient(await memberToken("alice@example.com"));
    const names = (await client.listTools()).tools.map((t) => t.name);
    await client.close();
    expect(names).toContain("list_apps");
    expect(names).toContain("get_profile");
    for (const tool of OWNER_ONLY) expect(names).not.toContain(tool);
    expect(names.some((n) => n.includes("__"))).toBe(false);
  });

  it("calling an owner tool by name anyway is refused", async () => {
    const client = await connectClient(await memberToken("alice@example.com"));
    for (const name of ["list_pages", "grant_app_access", "list_app_catalog"]) {
      const result = await client.callTool({ name, arguments: name === "grant_app_access" ? { app: "blink", email: "x@example.com" } : {} }).catch((e) => ({ isError: true, e }));
      expect((result as { isError?: boolean }).isError).toBe(true);
    }
    await client.close();
  });

  it("lookalikes of the owner's address are members, not the owner", async () => {
    for (const email of ["hello@mannan.is.evil.com", "xhello@mannan.is", "hello@mannan.iss"]) {
      const client = await connectClient(await memberToken(email));
      const names = (await client.listTools()).tools.map((t) => t.name);
      await client.close();
      for (const tool of OWNER_ONLY) expect(names).not.toContain(tool);
    }
  });

  it("the owner's address in other capitalisation goes to the owner's hub, never straight to owner tools", async () => {
    const { state } = await authorizePage();
    const chosen = await choose(state, "signin");
    const flow = /uploads_mcp_flow=([^;]+)/.exec(chosen.headers.get("set-cookie") ?? "")?.[1] ?? "";
    const grant = await signMcpGrant({ sub: "x", email: "Hello@Mannan.IS", state }, hubEnv.MCP_GRANT_SECRET);
    const res = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
      headers: { cookie: `uploads_mcp_flow=${flow}` },
      redirect: "manual",
    });
    expect(res.headers.get("location")).toBe("/apps");
  });

  it("a member cannot open the owner's /apps management sign-in", async () => {
    const login = await SELF.fetch("https://example.com/apps/login", { redirect: "manual" });
    const state = new URL(login.headers.get("location") ?? "").searchParams.get("state") ?? "";
    const flow = /uploads_mcp_flow=([^;]+)/.exec(login.headers.get("set-cookie") ?? "")?.[1] ?? "";
    const grant = await signMcpGrant({ sub: "alice@example.com", email: "alice@example.com", state }, hubEnv.MCP_GRANT_SECRET);
    const res = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
      headers: { cookie: `uploads_mcp_flow=${flow}` },
      redirect: "manual",
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("__Host-hub");
  });

  it("a grant signed with another key, or for another state, is refused", async () => {
    const forge = [
      (state: string) => signMcpGrant({ sub: "a", email: "alice@example.com", state }, "some-other-secret-0123456789abcdef"),
      () => signMcpGrant({ sub: "a", email: "alice@example.com", state: "another-state-value" }, hubEnv.MCP_GRANT_SECRET),
    ];
    for (const make of forge) {
      const { state } = await authorizePage();
      const chosen = await choose(state, "signin");
      const flow = /uploads_mcp_flow=([^;]+)/.exec(chosen.headers.get("set-cookie") ?? "")?.[1] ?? "";
      const grant = await make(state);
      const res = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
        headers: { cookie: `uploads_mcp_flow=${flow}` },
        redirect: "manual",
      });
      expect(res.status).toBe(403);
    }
  });

  it("a member's grant without this browser's flow cookie is refused", async () => {
    const { state } = await authorizePage();
    await choose(state, "signin");
    const grant = await signMcpGrant({ sub: "a", email: "alice@example.com", state }, hubEnv.MCP_GRANT_SECRET);
    const res = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, { redirect: "manual" });
    expect(res.status).toBe(403);
  });
});

describe("list_apps", () => {
  it("guests get the public list and the site is never asked", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = await connectClient(await guestToken());
    const result = toolJson<AppsResult>(await client.callTool({ name: "list_apps", arguments: {} }));
    await client.close();
    expect(result.apps.length).toBeGreaterThan(0);
    expect(result.signedInAs).toBeUndefined();
    expect(spy.mock.calls.some(([u]) => String(u).includes("/api/access"))).toBe(false);
  });

  it("a member gets public apps plus the ones the site says are theirs, asked as themselves", async () => {
    const token = await memberToken("alice@example.com");
    const site = fakeSite((email) => siteApps(email, [{ id: "blink", name: "Blink", description: "d", url: "https://mannan.is/blink" }]));
    const client = await connectClient(token);
    const result = toolJson<AppsResult>(await client.callTool({ name: "list_apps", arguments: {} }));
    await client.close();
    expect(site.actors).toEqual(["alice@example.com"]);
    expect(result.signedInAs).toBe("alice@example.com");
    expect(result.apps.map((a) => a.url)).toContain("https://mannan.is/blink");
  });

  it("two members get their own lists, never each other's", async () => {
    const a = await memberToken("alice@example.com");
    const b = await memberToken("bob@example.com");
    fakeSite((email) => siteApps(email, email === "alice@example.com" ? [{ id: "blink", name: "Blink", url: "https://mannan.is/blink" }] : []));
    const ca = await connectClient(a);
    const cb = await connectClient(b);
    const ra = toolJson<AppsResult>(await ca.callTool({ name: "list_apps", arguments: {} }));
    const rb = toolJson<AppsResult>(await cb.callTool({ name: "list_apps", arguments: {} }));
    await ca.close(); await cb.close();
    expect(ra.apps.map((x) => x.url)).toContain("https://mannan.is/blink");
    expect(rb.apps.map((x) => x.url)).not.toContain("https://mannan.is/blink");
  });

  it("an answer for a different account, a site error, or junk falls back to the public list", async () => {
    const token = await memberToken("alice@example.com");
    for (const answer of [
      () => siteApps("bob@example.com", [{ name: "Blink", url: "https://mannan.is/blink" }]),
      () => Response.json({ error: "x" }, { status: 500 }),
      () => new Response("not json"),
      () => Response.json({ email: "alice@example.com", apps: "nope" }),
    ]) {
      vi.restoreAllMocks();
      fakeSite(answer);
      const client = await connectClient(token);
      const result = toolJson<AppsResult>(await client.callTool({ name: "list_apps", arguments: {} }));
      await client.close();
      expect(result.apps.map((x) => x.url)).not.toContain("https://mannan.is/blink");
      expect(result.note).toBeTruthy();
    }
  });

  it("drops non-https or malformed links from the site's answer", async () => {
    const token = await memberToken("alice@example.com");
    fakeSite((email) => siteApps(email, [
      { name: "Bad", url: "javascript:alert(1)" }, { name: "Http", url: "http://mannan.is/x" }, { name: 5, url: "https://mannan.is/y" }, { name: "Ok", url: "https://mannan.is/ok" },
    ]));
    const client = await connectClient(token);
    const urls = toolJson<AppsResult>(await client.callTool({ name: "list_apps", arguments: {} })).apps.map((a) => a.url);
    await client.close();
    expect(urls).toContain("https://mannan.is/ok");
    for (const bad of ["javascript:alert(1)", "http://mannan.is/x", "https://mannan.is/y"]) expect(urls).not.toContain(bad);
  });
});

describe("access tools (Mannan's)", () => {
  async function accessClient(email: string) {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { registerAccessTools } = await import("../src/access-tools");
    const server = registerAccessTools(new McpServer({ name: "t", version: "1" }), hubEnv, () => ({ userId: email, email }));
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    const client = new Client({ name: "t", version: "1" });
    await client.connect(c);
    return client;
  }

  it("refuse anyone but Mannan, before calling the site", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = await accessClient("alice@example.com");
    const result = await client.callTool({ name: "grant_app_access", arguments: { app: "blink", email: "bob@example.com" } });
    expect(result.isError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("call the site's access routes as Mannan", async () => {
    const calls: { url: string; method: string; actor: string | undefined; body: unknown }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const auth = new Headers(init?.headers).get("authorization") ?? "";
      calls.push({ url: String(input), method: init?.method ?? "GET", actor: (await verifyActor(auth.slice(7), env.MCP_ACTOR_SECRET))?.email, body: init?.body ? JSON.parse(String(init.body)) : null });
      return Response.json({ ok: true });
    });
    const client = await accessClient("hello@mannan.is");
    await client.callTool({ name: "grant_app_access", arguments: { app: "blink", email: "bob@example.com" } });
    await client.callTool({ name: "revoke_app_access", arguments: { app: "blink", email: "bob@example.com" } });
    expect(calls).toEqual([
      { url: "https://mannan.is/api/access/grants", method: "POST", actor: "hello@mannan.is", body: { app: "blink", email: "bob@example.com" } },
      { url: "https://mannan.is/api/access/grants", method: "DELETE", actor: "hello@mannan.is", body: { app: "blink", email: "bob@example.com" } },
    ]);
  });
});
