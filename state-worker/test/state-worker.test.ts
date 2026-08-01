import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { PortfolioState } from "../src/index";

function state() {
  return env.PORTFOLIO_STATE.getByName(`portfolio-state-test-${crypto.randomUUID()}`);
}

describe("portfolio state durable object", () => {
  it("keeps score ownership transactional and idempotent", async () => {
    const stub = state();
    await expect(stub.submitScore({ opId: "submit-owner-0001", kind: "human", name: "Ada", score: 80, ownerId: "owner_abcdefgh" })).resolves.toEqual({ ok: true, finalName: "Ada" });
    await expect(stub.submitScore({ opId: "submit-owner-0001", kind: "human", name: "Ada", score: 80, ownerId: "owner_abcdefgh" })).resolves.toEqual({ ok: true, finalName: "Ada" });
    await expect(stub.submitScore({ opId: "submit-owner-0002", kind: "agent", name: "Ada", score: 99, ownerId: "owner_ijklmnop" })).resolves.toEqual({ ok: false, code: "taken", emailBound: false });
    await expect(stub.boards()).resolves.toEqual({ human: [{ name: "Ada", score: 80 }], agent: [] });
  });

  it("consumes do1 magic tokens once, merges identity names, and renames scores", async () => {
    const stub = state();
    await stub.submitScore({ opId: "magic-score-0001", kind: "human", name: "Before", score: 8, ownerId: "device_owner_001" });
    const magic = await stub.createMagic({ opId: "magic-create-0001", email: "ada@example.test" });
    expect(magic.token).toMatch(/^do1_[a-f0-9]{64}$/);
    expect(await stub.createMagic({ opId: "magic-create-0001", email: "ada@example.test" })).toEqual(magic);
    await runInDurableObject(stub, (_instance: PortfolioState, objectState) => {
      expect(objectState.storage.sql.exec<{ token_hash: string }>("SELECT token_hash FROM magic_tokens").one().token_hash).not.toBe(magic.token);
      expect(objectState.storage.sql.exec<{ response_json: string }>("SELECT response_json FROM operations WHERE endpoint = 'magic.create'").toArray()).toEqual([]);
    });
    const claimed = await stub.consumeMagic({ opId: "magic-consume-001", token: magic.token, deviceOwnerId: "device_owner_001" });
    expect(claimed).not.toBeNull();
    expect(claimed?.names).toEqual(["Before"]);
    expect(await stub.consumeMagic({ opId: "magic-consume-002", token: magic.token })).toBeNull();
    await expect(stub.renameIdentity({ opId: "rename-identity-001", ownerId: claimed!.ownerId, to: "After" })).resolves.toEqual({ ok: true });
    expect(await stub.boards()).toEqual({ human: [{ name: "After", score: 8 }], agent: [] });
    expect(await stub.identityInfo(claimed!.ownerId)).toEqual({ email: "ada@example.test", names: ["After"] });
  });

  it("uses exact rolling limits, tracks garden views, and caps feedback", async () => {
    const stub = state();
    for (let index = 0; index < 6; index += 1) {
      await expect(stub.limit({ opId: `limit-op-000${index}`, kind: "leaderboard", subject: "198.51.100.1" })).resolves.toMatchObject({ success: true, remaining: 5 - index });
    }
    await expect(stub.limit({ opId: "limit-op-0010", kind: "leaderboard", subject: "198.51.100.1" })).resolves.toMatchObject({ success: false, remaining: 0, limit: 6 });
    await stub.gardenIncrement({ opId: "garden-view-0001", slug: "taken" });
    await stub.gardenIncrement({ opId: "garden-view-0002", slug: "taken" });
    expect(await stub.gardenGet("taken")).toEqual({ slug: "taken", views: 2 });
    for (let index = 0; index < 501; index += 1) await stub.pushFeedback({ opId: `feedback-op-${index.toString().padStart(4, "0")}`, message: `feedback ${index}`, ip: "198.51.100.1", validated: true });
    await runInDurableObject(stub, (_instance: PortfolioState, objectState) => {
      expect(objectState.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM feedback").one().count).toBe(500);
      expect(objectState.storage.sql.exec<{ raw: string }>("SELECT ip_hash AS raw FROM feedback LIMIT 1").one().raw).not.toBe("198.51.100.1");
      for (let index = 0; index <= 10_000; index += 1) objectState.storage.sql.exec("INSERT OR REPLACE INTO operations(op_id, endpoint, response_json, created_at) VALUES (?, 'seed', '{}', ?)", `seed-${index}`, Date.now());
    });
    await stub.limit({ opId: "limit-op-compaction", kind: "download", subject: "198.51.100.2" });
    await runInDurableObject(stub, (_instance: PortfolioState, objectState) => {
      expect(objectState.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM operations").one().count).toBeLessThanOrEqual(10_000);
    });
  });
});
