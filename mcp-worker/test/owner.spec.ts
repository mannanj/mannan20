import { afterEach, describe, expect, it, vi } from "vitest";
import { env as testEnv, SELF } from "cloudflare:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { AppEnv } from "../src/types";
import { createOwnerServer } from "../src/owner";
import { ownerFetch } from "../src/owner-api";
import { signMcpGrant, verifyActor } from "../src/vendor/grant";
import { connectClient, firstText } from "./helpers";

const env = testEnv as unknown as AppEnv;

const OWNER_TOOLS = [
  "create_page",
  "create_share",
  "create_upload_link",
  "delete_file",
  "duplicate_file",
  "get_download_link",
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
  it("refuses /owner/mcp without a token and advertises how to authenticate", async () => {
    const res = await SELF.fetch("https://example.com/owner/mcp", {
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

  it("keeps owner tools off the public /mcp endpoint", async () => {
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

  it("refuses a valid grant for a non-owner email with the uniform 403", async () => {
    const res = await callbackFor("someone@example.com");
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("That sign-in could not be verified.");
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
