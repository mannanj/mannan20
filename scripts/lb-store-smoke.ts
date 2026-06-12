process.env.UPSTASH_REDIS_REST_KV_REST_API_URL = '';
process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = '';

const {
  boards,
  consumeMagicToken,
  createMagicToken,
  identityInfo,
  newOwnerId,
  pushFeedback,
  renameIdentity,
  submitScore,
} = await import('../src/lib/leaderboard-store');

let pass = 0;
let fail = 0;
function check(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS: ${label}`);
  } else {
    fail++;
    console.log(`FAIL: ${label} (got ${a}, want ${e})`);
  }
}

const alice = newOwnerId();
const bob = newOwnerId();

const r1 = await submitScore({ kind: 'human', name: 'Alice Hen', score: 3, ownerId: alice, cookieName: null });
check(r1, { ok: true, finalName: 'Alice Hen' }, 'fresh claim');

const r2 = await submitScore({ kind: 'human', name: 'alice hen', score: 9, ownerId: bob, cookieName: null });
check(r2, { ok: false, code: 'taken', emailBound: false }, 'case-insensitive theft rejected');

const r3 = await submitScore({ kind: 'human', name: 'Alice Hen', score: 8, ownerId: alice, cookieName: null });
check(r3, { ok: true, finalName: 'Alice Hen' }, 'owner improves own score');

const r3b = await submitScore({ kind: 'agent', name: 'Alice Bot', score: 2, ownerId: alice, cookieName: null });
check(r3b.ok, true, 'second name claimed on agent board');

const token = await createMagicToken('Alice@Example.com');
const claim1 = await consumeMagicToken(token, alice);
check(claim1?.email, 'alice@example.com', 'claim lowercases email');
check(claim1?.names, ['Alice Bot', 'Alice Hen'], 'device names migrated to email identity');
const verifiedId = claim1!.ownerId;
check(verifiedId === alice, false, 'email identity gets its own ownerId');

const replay = await consumeMagicToken(token, alice);
check(replay, null, 'magic token is single-use');

const r4 = await submitScore({ kind: 'human', name: 'Alice Hen', score: 11, ownerId: alice, cookieName: null });
check(r4, { ok: false, code: 'taken', emailBound: true }, 'old anonymous id lost ownership after merge');

const me = await identityInfo(verifiedId);
check(me, { names: ['Alice Bot', 'Alice Hen'], email: 'alice@example.com' }, 'identity info');

const bobClaim = await submitScore({ kind: 'human', name: 'Bobby Roo', score: 1, ownerId: bob, cookieName: null });
check(bobClaim.ok, true, 'thief claims his own fresh name');
const steal = await renameIdentity({ ownerId: bob, to: 'Alice Hen', from: 'Bobby Roo' });
check(steal, { ok: false, code: 'taken' }, 'rename cannot steal an owned name');

const rename = await renameIdentity({ ownerId: verifiedId, to: 'Queen Cluck' });
check(rename, { ok: true }, 'verified rename-all succeeds');

const b1 = await boards();
check(
  b1.human.find((e) => e.name === 'Queen Cluck'),
  { name: 'Queen Cluck', score: 8 },
  'human board migrated with best score'
);
check(b1.human.some((e) => e.name === 'Alice Hen'), false, 'old name removed from human board');
check(b1.agent, [{ name: 'Queen Cluck', score: 2 }], 'agent board migrated too');

const redirect = await submitScore({ kind: 'human', name: 'Alice Hen', score: 20, ownerId: verifiedId, cookieName: null });
check(redirect, { ok: true, finalName: 'Queen Cluck' }, 'submit to old name follows rename');

const b2 = await boards();
check(
  b2.human.find((e) => e.name === 'Queen Cluck'),
  { name: 'Queen Cluck', score: 20 },
  'redirected score lands on new name'
);
check(b2.human.some((e) => e.name === 'Alice Hen'), false, 'old name absent after redirect');

const me2 = await identityInfo(verifiedId);
check(me2.names, ['queen cluck'].map(() => 'Queen Cluck'), 'renamed identity lists only the new name');

const thief2 = await submitScore({ kind: 'human', name: 'queen cluck', score: 50, ownerId: bob, cookieName: null });
check(thief2, { ok: false, code: 'taken', emailBound: true }, 'renamed name protected and emailBound');

const cookieRename = await renameIdentity({ ownerId: bob, to: 'Bobby' });
check(cookieRename, { ok: false, code: 'no-names' }, 'unverified rename requires from-name');

await pushFeedback({ message: 'memory smoke', ip: 'test', validated: false });
console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
