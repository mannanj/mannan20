import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signMcpGrant, verifyActor } from "../src/vendor/grant";
import { authorizePage, choose, connectClient, exchangeCode, guestToken, hubEnv, toolJson } from "./helpers";

async function memberToken(email: string): Promise<string> {
  const { state, clientId, verifier } = await authorizePage();
  const chosen = await choose(state, "signin");
  const flow = /uploads_mcp_flow=([^;]+)/.exec(chosen.headers.get("set-cookie") ?? "")?.[1] ?? "";
  const grant = await signMcpGrant({ sub: email, email, state }, hubEnv.MCP_GRANT_SECRET);
  const done = await SELF.fetch(`https://example.com/callback?state=${state}&grant=${encodeURIComponent(grant)}`, {
    headers: { cookie: `uploads_mcp_flow=${flow}` },
    redirect: "manual",
  });
  return exchangeCode(done, clientId, verifier);
}

function fakeSite(answer: (email: string) => Response) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url !== "https://mannan.is/api/inventory") throw new Error(`unexpected fetch ${url}`);
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    const actor = await verifyActor(auth.replace(/^Bearer /, ""), env.MCP_ACTOR_SECRET);
    if (!actor) return Response.json({ error: "Sign in first" }, { status: 401 });
    return answer(actor.email);
  });
}

type Mine = { items: { id: string; count: number }[]; scores: Record<string, number>; signedInAs: string };

afterEach(() => vi.restoreAllMocks());

describe("get_my_inventory", () => {
  it("guests do not get the tool", async () => {
    const client = await connectClient(await guestToken());
    const names = (await client.listTools()).tools.map((t) => t.name);
    await client.close();
    expect(names).not.toContain("get_my_inventory");
  });

  it("a member gets their own bag and score, asked as themselves", async () => {
    const token = await memberToken("alice@example.com");
    fakeSite((email) => Response.json({ email, items: [{ id: "egg", count: 3 }], scores: { "chicken-v3": 40 } }));
    const client = await connectClient(token);
    const result = toolJson<Mine>(await client.callTool({ name: "get_my_inventory", arguments: {} }));
    await client.close();
    expect(result.signedInAs).toBe("alice@example.com");
    expect(result.items).toEqual([{ id: "egg", count: 3 }]);
    expect(result.scores["chicken-v3"]).toBe(40);
  });

  it("an answer for another account or a site error is an error, never someone else's bag", async () => {
    const token = await memberToken("alice@example.com");
    for (const answer of [
      () => Response.json({ email: "bob@example.com", items: [], scores: {} }),
      () => Response.json({ error: "x" }, { status: 500 }),
    ]) {
      vi.restoreAllMocks();
      fakeSite(answer);
      const client = await connectClient(token);
      const result = await client.callTool({ name: "get_my_inventory", arguments: {} });
      await client.close();
      expect((result as { isError?: boolean }).isError).toBe(true);
    }
  });
});
