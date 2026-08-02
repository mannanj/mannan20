import { env, runInDurableObject, SELF } from "cloudflare:test";
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
    await expect(stub.renameIdentity({ opId: "rename-identity-002", ownerId: claimed!.ownerId, to: "Before" })).resolves.toEqual({ ok: true });
    expect(await stub.boards()).toEqual({ human: [{ name: "Before", score: 8 }], agent: [] });
    expect(await stub.identityInfo(claimed!.ownerId)).toEqual({ email: "ada@example.test", names: ["Before"] });
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

  it("enforces both contact limits at exactly ten requests per hour", async () => {
    const stub = state();
    for (const kind of ["contact-intent", "validate-contact"] as const) {
      for (let index = 0; index < 10; index += 1) {
        await expect(stub.limit({
          opId: `${kind.replaceAll("-", "")}-${index.toString().padStart(2, "0")}`,
          kind,
          subject: `subject-${kind}`,
        })).resolves.toMatchObject({ success: true, limit: 10, remaining: 9 - index });
      }
      await expect(stub.limit({
        opId: `${kind.replaceAll("-", "")}-blocked`,
        kind,
        subject: `subject-${kind}`,
      })).resolves.toMatchObject({ success: false, limit: 10, remaining: 0 });
    }
  });

  it("enforces the cloud file boundary at exactly 120 requests per minute", async () => {
    const stub = state();
    for (let index = 0; index < 120; index += 1) {
      await expect(stub.limit({
        opId: `cloud-files-${index.toString().padStart(3, "0")}`,
        kind: "cloud-files",
        subject: "person@example.test:198.51.100.7",
      })).resolves.toMatchObject({ success: true, limit: 120, remaining: 119 - index });
    }
    await expect(stub.limit({
      opId: "cloud-files-blocked",
      kind: "cloud-files",
      subject: "person@example.test:198.51.100.7",
    })).resolves.toMatchObject({ success: false, limit: 120, remaining: 0 });
  });

  it("expires cloud file hits on a true rolling-window boundary", async () => {
    const stub = state();
    const subject = "rolling@example.test:198.51.100.8";
    const subjectBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject));
    const subjectHash = [...new Uint8Array(subjectBytes)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    await runInDurableObject(stub, (_instance: PortfolioState, objectState) => {
      objectState.storage.sql.exec(
        "INSERT INTO rate_hits(bucket, subject_hash, occurred_at) VALUES ('cloud-files', ?, ?)",
        subjectHash,
        Date.now() - 60_001,
      );
    });

    await expect(stub.limit({
      opId: "cloud-files-after-expiry",
      kind: "cloud-files",
      subject,
    })).resolves.toMatchObject({ success: true, limit: 120, remaining: 119 });
    await runInDurableObject(stub, (_instance: PortfolioState, objectState) => {
      expect(objectState.storage.sql.exec<{ count: number }>(
        "SELECT COUNT(*) AS count FROM rate_hits WHERE bucket = 'cloud-files' AND subject_hash = ?",
        subjectHash,
      ).one().count).toBe(1);
    });
  });

  it("globally compacts expired rate hits and fails closed at the storage cap", async () => {
    const expiredStub = state();
    await runInDurableObject(expiredStub, (_instance: PortfolioState, objectState) => {
      objectState.storage.sql.exec(
        "INSERT INTO rate_hits(bucket, subject_hash, occurred_at) VALUES ('download', 'expired-subject', ?)",
        Date.now() - 2 * 60 * 1000 - 1_001,
      );
    });
    await expiredStub.limit({ opId: "global-rate-compact-01", kind: "download", subject: "fresh-subject" });
    await runInDurableObject(expiredStub, (_instance: PortfolioState, objectState) => {
      expect(objectState.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM rate_hits WHERE subject_hash = 'expired-subject'").one().count).toBe(0);
    });

    const cappedStub = env.PORTFOLIO_STATE.getByName("portfolio-state-v1");
    await runInDurableObject(cappedStub, (_instance: PortfolioState, objectState) => {
      objectState.storage.sql.exec(`
        WITH RECURSIVE sequence(value) AS (
          SELECT 1 UNION ALL SELECT value + 1 FROM sequence WHERE value < 10000
        )
        INSERT INTO rate_hits(bucket, subject_hash, occurred_at)
        SELECT 'download', printf('subject-%05d', value), ? FROM sequence
      `, Date.now());
    });
    const response = await SELF.fetch("https://portfolio-state-worker/v1/rate/check", {
      method: "POST",
      headers: { "content-type": "application/json", "x-state-service-key": "test-state-key" },
      body: JSON.stringify({
        opId: "global-rate-capacity-01",
        kind: "download",
        subject: "new-subject",
      }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, code: "rate_limit_capacity" });
  });
});
