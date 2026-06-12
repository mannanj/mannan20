import { Redis } from '@upstash/redis';
import { MERGE_SCRIPT, RENAME_SCRIPT } from '../src/lib/leaderboard-store';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const NS = `smoketest:chicken:${Date.now()}`;
const OWNERS = `${NS}:owners`;
const H = `${NS}:h`;
const A = `${NS}:a`;
const NAMES1 = `${NS}:names:id1`;
const NAMES_OLD = `${NS}:names:olddev`;

let pass = 0;
let fail = 0;
function stable(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${k}:${stable(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function check(actual: unknown, expected: unknown, label: string) {
  const a = stable(actual);
  const e = stable(expected);
  if (a === e) {
    pass++;
    console.log(`PASS: ${label}`);
  } else {
    fail++;
    console.log(`FAIL: ${label} (got ${a}, want ${e})`);
  }
}

await redis.hset(OWNERS, { 'old one': { o: 'id1', n: 'Old One', e: 1 } });
await redis.hset(OWNERS, { rival: { o: 'id2', n: 'Rival' } });
await redis.zadd(H, { score: 7, member: 'Old One' }, { score: 9, member: 'Rival' });
await redis.zadd(A, { score: 3, member: 'Old One' });
await redis.hset(NAMES1, { 'old one': 1 });

const r1 = await redis.eval(
  RENAME_SCRIPT,
  [OWNERS, H, A, NAMES1],
  ['id1', 'new name', 'New Name', '1', JSON.stringify(['old one'])]
);
check(r1, 'ok', 'rename script returns ok');

const newRec = await redis.hget(OWNERS, 'new name');
check(newRec, { o: 'id1', n: 'New Name', e: 1 }, 'new owner record written');
const oldRec = await redis.hget(OWNERS, 'old one');
check(oldRec, { o: 'id1', n: 'Old One', e: 1, r: 'new name' }, 'old record points to new');
check(await redis.zscore(H, 'New Name'), 7, 'human zset migrated');
check(await redis.zscore(H, 'Old One'), null, 'old human member removed');
check(await redis.zscore(H, 'Rival'), 9, 'unrelated member untouched');
check(await redis.zscore(A, 'New Name'), 3, 'agent zset migrated');
check(await redis.hget(NAMES1, 'new name'), 1, 'names hash gained new name');

const r2 = await redis.eval(
  RENAME_SCRIPT,
  [OWNERS, H, A, NAMES1],
  ['id2', 'new name', 'New Name', '0', JSON.stringify(['rival'])]
);
check(r2, 'taken', 'rival cannot steal the new name');
check(await redis.zscore(H, 'Rival'), 9, 'rival board entry unchanged after rejection');

await redis.hset(OWNERS, { stray: { o: 'olddev', n: 'Stray' } });
await redis.hset(NAMES_OLD, { stray: 1 });
const m1 = await redis.eval(MERGE_SCRIPT, [OWNERS, NAMES_OLD, NAMES1], ['olddev', 'id1']);
check(m1, 1, 'merge script returns 1');
check(await redis.hget(OWNERS, 'stray'), { o: 'id1', n: 'Stray', e: 1 }, 'stray adopted by id1 with email flag');
check(await redis.hget(NAMES1, 'stray'), 1, 'id1 names include stray');
check(await redis.exists(NAMES_OLD), 0, 'old device names hash deleted');

const deleted = await redis.del(OWNERS, H, A, NAMES1, NAMES_OLD);
console.log(`CLEANUP: deleted ${deleted} scratch keys under ${NS}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
