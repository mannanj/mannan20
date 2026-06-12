import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';

delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

const store = await import('./leaderboard-store');

describe('leaderboard store (memory fallback)', () => {
  beforeAll(() => {
    expect(process.env.UPSTASH_REDIS_REST_KV_REST_API_URL).toBeUndefined();
    expect(process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN).toBeUndefined();
  });

  beforeEach(() => {
    store.__resetMemoryStore();
  });

  test('keeps every score a name submits, including lower ones', async () => {
    const ownerId = store.newOwnerId();
    for (const score of [5, 12, 3]) {
      const result = await store.submitScore({
        kind: 'human',
        name: 'Alice',
        score,
        ownerId,
        cookieName: null,
      });
      expect(result.ok).toBe(true);
    }
    const { human } = await store.boards();
    expect(human).toEqual([
      { name: 'Alice', score: 12 },
      { name: 'Alice', score: 5 },
      { name: 'Alice', score: 3 },
    ]);
  });

  test('interleaves multiple entries per name with other players by score', async () => {
    const alice = store.newOwnerId();
    const bob = store.newOwnerId();
    await store.submitScore({ kind: 'human', name: 'Alice', score: 4, ownerId: alice, cookieName: null });
    await store.submitScore({ kind: 'human', name: 'Bob', score: 8, ownerId: bob, cookieName: null });
    await store.submitScore({ kind: 'human', name: 'Alice', score: 10, ownerId: alice, cookieName: null });
    const { human } = await store.boards();
    expect(human.map((e) => `${e.name}:${e.score}`)).toEqual(['Alice:10', 'Bob:8', 'Alice:4']);
  });

  test('a rename carries all of a name’s entries to the new name', async () => {
    const ownerId = store.newOwnerId();
    await store.submitScore({ kind: 'human', name: 'Bob', score: 7, ownerId, cookieName: null });
    await store.submitScore({ kind: 'human', name: 'Bob', score: 9, ownerId, cookieName: null });
    const renamed = await store.renameIdentity({ ownerId, to: 'Bobby', from: 'Bob' });
    expect(renamed.ok).toBe(true);
    const { human } = await store.boards();
    expect(human).toEqual([
      { name: 'Bobby', score: 9 },
      { name: 'Bobby', score: 7 },
    ]);
    const followUp = await store.submitScore({
      kind: 'human',
      name: 'Bob',
      score: 2,
      ownerId,
      cookieName: null,
    });
    expect(followUp.ok).toBe(true);
    if (followUp.ok) expect(followUp.finalName).toBe('Bobby');
  });

  test('a name still belongs to its first owner', async () => {
    const first = store.newOwnerId();
    const second = store.newOwnerId();
    const claim = await store.submitScore({
      kind: 'human',
      name: 'Carol',
      score: 6,
      ownerId: first,
      cookieName: null,
    });
    expect(claim.ok).toBe(true);
    const stolen = await store.submitScore({
      kind: 'human',
      name: 'carol',
      score: 99,
      ownerId: second,
      cookieName: null,
    });
    expect(stolen.ok).toBe(false);
    const { human } = await store.boards();
    expect(human).toEqual([{ name: 'Carol', score: 6 }]);
  });

  test('boards cap at the top ten entries', async () => {
    const ownerId = store.newOwnerId();
    for (let i = 1; i <= 14; i++) {
      await store.submitScore({
        kind: 'agent',
        name: 'Clawde',
        score: i,
        ownerId,
        cookieName: null,
      });
    }
    const { agent } = await store.boards();
    expect(agent).toHaveLength(10);
    expect(agent[0]).toEqual({ name: 'Clawde', score: 14 });
    expect(agent[9]).toEqual({ name: 'Clawde', score: 5 });
  });

  test('rename refuses a name owned by someone else', async () => {
    const first = store.newOwnerId();
    const second = store.newOwnerId();
    await store.submitScore({ kind: 'human', name: 'Dana', score: 3, ownerId: first, cookieName: null });
    await store.submitScore({ kind: 'human', name: 'Eve', score: 4, ownerId: second, cookieName: null });
    const result = await store.renameIdentity({ ownerId: second, to: 'Dana', from: 'Eve' });
    expect(result.ok).toBe(false);
  });
});
