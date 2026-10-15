import { afterEach, describe, expect, it } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { seal } from "../src/vendor/mcp-connector/linked-app";
import { sealPurpose, type OwnerVault } from "../src/hub/vault";
import { vaultFor } from "../src/hub/session";
import { hubEnv } from "./helpers";

afterEach(async () => {
  await vaultFor(hubEnv).clear();
});

describe("OwnerVault sessions", () => {
  it("consumes a session exactly once and keeps the pending authorization server-side", async () => {
    const vault = vaultFor(hubEnv);
    const { sid, csrf } = await vault.createSession({ authRequest: "{}", userId: "u", email: "hello@mannan.is" });
    expect((await vault.getSession(sid))?.csrf).toBe(csrf);
    expect((await vault.consumeSession(sid))?.pending?.userId).toBe("u");
    expect(await vault.consumeSession(sid)).toBeNull();
    expect(await vault.getSession(sid)).toBeNull();
  });

  it("a new session replaces the old one; unknown or empty ids resolve to null", async () => {
    const vault = vaultFor(hubEnv);
    const a = await vault.createSession(null);
    const b = await vault.createSession(null);
    expect(await vault.getSession(a.sid)).toBeNull();
    expect(await vault.getSession(b.sid)).not.toBeNull();
    expect(await vault.getSession("")).toBeNull();
  });

  it("expires sessions", async () => {
    const vault = vaultFor(hubEnv);
    const { sid } = await vault.createSession(null);
    await runInDurableObject(vault, (_i, state) => {
      state.storage.sql.exec("UPDATE hub_session SET expires_at = 1");
    });
    expect(await vault.getSession(sid)).toBeNull();
  });

  it("clear() drops links and sessions", async () => {
    const vault = vaultFor(hubEnv);
    const { sid } = await vault.createSession(null);
    await vault.putLink("calendar", "x", "c", []);
    await vault.clear();
    expect(await vault.list()).toEqual([]);
    expect(await vault.getSession(sid)).toBeNull();
  });
});

describe("OwnerVault tokens", () => {
  async function linkWithExpiredToken(vault: ReturnType<typeof vaultFor>) {
    const sealed = await seal(hubEnv.MCP_VAULT_SECRET, sealPurpose("calendar"), {
      clientId: "c", accessToken: "old", refreshToken: "r1", expiresAt: Date.now() - 1000,
    });
    await vault.putLink("calendar", sealed, "c", []);
  }

  function fakeRefresh(counter: { n: number }, status = 200): typeof fetch {
    return (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-authorization-server")) {
        return Response.json({ issuer: "i", authorization_endpoint: "https://calendar-mcp.mannanteam.workers.dev/a", token_endpoint: "https://calendar-mcp.mannanteam.workers.dev/token" });
      }
      counter.n += 1;
      await new Promise((r) => setTimeout(r, 20));
      return status === 200
        ? Response.json({ access_token: `new-${counter.n}`, refresh_token: `r${counter.n + 1}`, expires_in: 3600 })
        : new Response("{}", { status });
    }) as typeof fetch;
  }

  it("two concurrent withTokens produce exactly one refresh", async () => {
    const vault = vaultFor(hubEnv);
    await linkWithExpiredToken(vault);
    const counter = { n: 0 };
    const results = await runInDurableObject(vault, async (instance: OwnerVault) => {
      instance.fetchImpl = fakeRefresh(counter);
      return Promise.all([instance.withTokens("calendar"), instance.withTokens("calendar")]);
    });
    expect(counter.n).toBe(1);
    expect(results[0]?.accessToken).toBe("new-1");
    expect(results[1]?.accessToken).toBe("new-1");
    // persisted, sealed, and not refreshed again
    const again = await runInDurableObject(vault, async (instance: OwnerVault) => {
      instance.fetchImpl = fakeRefresh(counter);
      return instance.withTokens("calendar");
    });
    expect(again?.accessToken).toBe("new-1");
    expect(counter.n).toBe(1);
  });

  it("refreshAfter401 does not refresh again when another caller already did", async () => {
    const vault = vaultFor(hubEnv);
    await linkWithExpiredToken(vault);
    const counter = { n: 0 };
    const out = await runInDurableObject(vault, async (instance: OwnerVault) => {
      instance.fetchImpl = fakeRefresh(counter);
      await instance.withTokens("calendar");
      return instance.refreshAfter401("calendar", "old");
    });
    expect(out?.accessToken).toBe("new-1");
    expect(counter.n).toBe(1);
  });

  it("a refused refresh marks the link reauth (kept, not deleted) and withholds tokens", async () => {
    const vault = vaultFor(hubEnv);
    await linkWithExpiredToken(vault);
    const counter = { n: 0 };
    const out = await runInDurableObject(vault, async (instance: OwnerVault) => {
      instance.fetchImpl = fakeRefresh(counter, 400);
      return instance.withTokens("calendar");
    });
    expect(out).toBeNull();
    expect((await vault.getLink("calendar"))?.status).toBe("reauth");
    expect(await vault.withTokens("calendar")).toBeNull();
    expect((await vault.list())[0]?.status).toBe("reauth");
  });
});
