import { afterEach, describe, expect, it, vi } from "vitest";
import { env as testEnv, SELF } from "cloudflare:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { AppEnv } from "../src/types";
import { createOwnerServer } from "../src/owner";
import { ownerFetch } from "../src/owner-api";
import { signMcpGrant, verifyActor } from "../src/vendor/grant";
import { authorizePage, choose, connectClient, exchangeCode, firstText } from "./helpers";

const env = testEnv as unknown as AppEnv;

const OWNER_TOOLS = [
  "create_page",
  "create_share",
  "create_upload_link",
  "delete_file",
  "duplicate_file",
  "get_download_link",
  "list_chats",
  "list_files",
  "list_pages",
  "list_shares",
  "update_share",
  "upload_file",
];

afterEach(() => {
  vi.restoreAllMocks();
});

async function ownerClient(email: string) {
  const server = createOwnerServer(env, () => ({ userId: email, email }));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "t", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

describe("owner endpoint", () => {
  it("refuses /mcp without a token and advertises how to authenticate", async () => {
    const res = await SELF.fetch("https://example.com/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("serves OAuth authorization server metadata", async () => {
    const res = await SELF.fetch("https://example.com/.well-known/oauth-authorization-server");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { authorization_endpoint: string; scopes_supported: string[] };
    expect(body.authorization_endpoint).toContain("/authorize");
    expect(body.scopes_supported).toContain("uploads");
  });

  it("no longer serves /owner/mcp", async () => {
    const res = await SELF.fetch("https://example.com/owner/mcp", { method: "POST", body: "{}" });
    expect(res.status).toBe(404);
  });

  it("keeps owner tools away from guests on /mcp", async () => {
    const client = await connectClient();
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    await client.close();
    for (const tool of OWNER_TOOLS) expect(names).not.toContain(tool);
    expect(names).toContain("get_profile");
  });

  it("lists the owner tools on the owner server", async () => {
    const client = await ownerClient("hello@mannan.is");
    const names = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(names).toEqual(OWNER_TOOLS);
  });

  it("marks delete_file destructive and list_pages read-only", async () => {
    const client = await ownerClient("hello@mannan.is");
    const tools = (await client.listTools()).tools;
    expect(tools.find((tool) => tool.name === "delete_file")?.annotations?.destructiveHint).toBe(true);
    expect(tools.find((tool) => tool.name === "list_pages")?.annotations?.readOnlyHint).toBe(true);
  });

  it("returns isError for a caller who is not the owner", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = await ownerClient("someone@example.com");
    const result = await client.callTool({ name: "list_pages", arguments: {} });
    expect(result.isError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects an oversized inline upload with guidance", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = await ownerClient("hello@mannan.is");
    const result = await client.callTool({
      name: "upload_file",
      arguments: { pageId: "p", name: "big.bin", text: "x".repeat(10 * 1024 * 1024 + 1) },
    });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("create_upload_link");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("authorize choice", () => {
  it("offers sign in and continue as guest", async () => {
    const { page, html, state } = await authorizePage();
    expect(page.status).toBe(200);
    expect(html).toContain('value="signin"');
    expect(html).toContain('value="guest"');
    expect(state.length).toBeGreaterThan(20);
    expect(page.headers.get("x-frame-options")).toBe("DENY");
  });

  it("sends a guest straight back to the client with a code", async () => {
    const { state } = await authorizePage();
    const res = await choose(state, "guest");
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("https://client.example/callback");
    expect(location.searchParams.get("code")).toBeTruthy();
    expect(location.searchParams.get("state")).toBe("client-state");
  });

  it("sends sign in to the mannan.is bridge with a flow cookie", async () => {
    const { state } = await authorizePage();
    const res = await choose(state, "signin");
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("https://mannan.is/api/mcp/uploads/authorize");
    expect(location.searchParams.get("state")).toBe(state);
    expect(res.headers.get("set-cookie")).toContain("uploads_mcp_flow=");
    expect(await env.OAUTH_KV.get(`mcp:flow:${state}`)).toBeTruthy();
  });

  it("gives the signed-in owner public and Upload tools on the same /mcp (via /apps Continue)", async () => {
    const { ownerSession, postApps } = await import("./helpers");
    const session = await ownerSession();
    expect(session.redirect.headers.get("location")).toBe("/apps");
    const done = await postApps("/apps/continue", session);
    expect(done.status).toBe(302);
    const client = await connectClient(await exchangeCode(done, session.clientId, session.verifier));
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    await client.close();
    for (const tool of OWNER_TOOLS) expect(names).toContain(tool);
    expect(names).toContain("get_profile");
  });

  it("refuses an unknown state or choice", async () => {
    expect((await choose("missing-state-value", "guest")).status).toBe(400);
    const { state } = await authorizePage();
    expect((await choose(state, "admin")).status).toBe(400);
  });

  it("uses each state once", async () => {
    const { state } = await authorizePage();
    expect((await choose(state, "guest")).status).toBe(302);
    expect((await choose(state, "guest")).status).toBe(400);
  });
});

describe("callback", () => {
  async function callbackFor(email: string) {
    const state = "state-abcdefghijkl";
    const flow = "flow-secret";
    await env.OAUTH_KV.put(`mcp:authreq:${state}`, JSON.stringify({ clientId: "c", scope: [] }));
    await env.OAUTH_KV.put(`mcp:flow:${state}`, flow);
    const grant = await signMcpGrant({ sub: email, email, state }, env.MCP_GRANT_SECRET);
    return SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
      headers: { cookie: `uploads_mcp_flow=${flow}` },
      redirect: "manual",
    });
  }

  it("never gives a non-owner email the hub (test/access.spec.ts covers what members get)", async () => {
    const res = await callbackFor("someone@example.com");
    expect(res.status).toBe(400); // this fixture's stored request is not a real client's
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("set-cookie") ?? "").not.toContain("__Host-hub");
  });
});

describe("owner api", () => {
  it("builds site URLs and sends a verifiable Bearer actor token", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ batches: [] }));
    await ownerFetch(env, "GET", "/api/uploads");
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mannan.is/api/uploads");
    const auth = (init.headers as Record<string, string>).authorization;
    expect(auth.startsWith("Bearer ")).toBe(true);
    const actor = await verifyActor(auth.slice(7), env.MCP_ACTOR_SECRET);
    expect(actor?.email).toBe("hello@mannan.is");
  });

  it("surfaces the site's error text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "Page not found" }, { status: 404 }),
    );
    await expect(ownerFetch(env, "GET", "/api/uploads/x")).rejects.toThrow("Page not found");
  });
});

describe("chat namespaces", () => {
  const CHAT = "abcdefghij0123456789abcd";

  it("advertises chatId on the four file tools and kind on list_pages", async () => {
    const client = await ownerClient("hello@mannan.is");
    const tools = (await client.listTools()).tools;
    for (const name of ["list_files", "upload_file", "create_upload_link", "get_download_link"]) {
      const props = tools.find((tool) => tool.name === name)?.inputSchema.properties ?? {};
      expect(props).toHaveProperty("chatId");
    }
    const pages = tools.find((tool) => tool.name === "list_pages")?.inputSchema.properties ?? {};
    expect(pages).toHaveProperty("kind");
    expect(tools.find((tool) => tool.name === "list_chats")?.annotations?.readOnlyHint).toBe(true);
  });

  it("mentions chat namespaces in the instructions", async () => {
    const { OWNER_INSTRUCTIONS } = await import("../src/owner");
    expect(OWNER_INSTRUCTIONS).toContain("chatId");
    expect(OWNER_INSTRUCTIONS).toContain("list_chats");
  });

  it("rejects a malformed chatId before calling the site", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ files: [] }));
    const client = await ownerClient("hello@mannan.is");
    const res = await client.callTool({ name: "list_files", arguments: { chatId: "../x" } });
    expect(res.isError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("list_files with chatId asks for chat files only", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ files: [] }));
    const client = await ownerClient("hello@mannan.is");
    await client.callTool({ name: "list_files", arguments: { chatId: CHAT } });
    expect(spy.mock.calls[0][0]).toBe("https://mannan.is/api/uploads/files?kind=chat");
    await client.callTool({ name: "list_files", arguments: {} });
    expect(spy.mock.calls[1][0]).toBe("https://mannan.is/api/uploads/files?kind=page");
  });

  it("list_chats and list_pages query by kind", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ batches: [] }));
    const client = await ownerClient("hello@mannan.is");
    await client.callTool({ name: "list_chats", arguments: {} });
    await client.callTool({ name: "list_pages", arguments: {} });
    expect(spy.mock.calls[0][0]).toBe("https://mannan.is/api/uploads?kind=chat");
    expect(spy.mock.calls[1][0]).toBe("https://mannan.is/api/uploads?kind=page");
  });

  it("upload_file with chatId creates the chat batch then uploads into it", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json({ id: CHAT, file: { id: "f" } }));
    const client = await ownerClient("hello@mannan.is");
    await client.callTool({
      name: "upload_file",
      arguments: { chatId: CHAT, name: "a.txt", text: "hi" },
    });
    const [first, second] = spy.mock.calls as [string, RequestInit][];
    expect(first[0]).toBe("https://mannan.is/api/uploads");
    expect(JSON.parse(first[1].body as string)).toMatchObject({ kind: "chat", id: CHAT });
    expect(second[0]).toBe(`https://mannan.is/api/uploads/${CHAT}/files`);
  });
});
