import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
const stateUrl = process.env.PORTFOLIO_STATE_WORKER_URL?.replace(/\/+$/, '');
const stateSecret = process.env.STATE_SERVICE_SECRET;

if (!redisUrl || !redisToken || !stateUrl || !stateSecret) {
  throw new Error('Missing Upstash or portfolio-state migration environment');
}

const redis = new Redis({ url: redisUrl, token: redisToken });
const separator = '\u001f';
const boardKeys = {
  human: 'game:chicken:lb:human',
  agent: 'game:chicken:lb:agent',
};
const gardenSlugs = [
  'health-longevity',
  'seeking-community',
  'self-parenting',
  'ai-false-positives',
  'taken',
  'funny-frustrations',
];

async function state(path, body) {
  const response = await fetch(`${stateUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-state-service-key': stateSecret,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Portfolio state ${path} failed (${response.status})`);
  return response.json();
}

const boardEntries = [];
for (const [kind, key] of Object.entries(boardKeys)) {
  const raw = await redis.zrange(key, 0, -1, { withScores: true });
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const member = String(raw[index]);
    boardEntries.push({
      kind,
      name: member.split(separator, 1)[0],
      score: Number(raw[index + 1]),
      created_at: Date.now() + index,
    });
  }
}

const ownerHash = (await redis.hgetall('game:chicken:lb:owners')) ?? {};
const owners = [];
const identityNames = [];
const ownerIds = new Set();
for (const [lowerName, rawRecord] of Object.entries(ownerHash)) {
  const record = typeof rawRecord === 'string' ? JSON.parse(rawRecord) : rawRecord;
  if (!record || typeof record !== 'object') throw new Error('Invalid owner record in source');
  owners.push({
    lower_name: lowerName,
    owner_id: record.o,
    display_name: record.n,
    email_bound: record.e === 1,
    renamed_to: record.r ?? null,
  });
  identityNames.push({ owner_id: record.o, lower_name: lowerName });
  ownerIds.add(record.o);
}

const identityEmails = [];
for (const ownerId of ownerIds) {
  const email = await redis.get(`game:chicken:lb:id:${ownerId}:email`);
  if (typeof email === 'string' && email) identityEmails.push({ email, owner_id: ownerId });
}

const gardenViews = [];
for (const slug of gardenSlugs) {
  const raw = await redis.get(`garden:views:${slug}`);
  const views = Number(raw ?? 0);
  if (!Number.isFinite(views) || views < 0) throw new Error('Invalid garden count in source');
  gardenViews.push({ slug, views });
}

const data = { boardEntries, owners, identityNames, identityEmails, gardenViews };
const before = await state('/v1/admin/export', {});
const populated = ['boardEntries', 'owners', 'identityNames', 'identityEmails', 'gardenViews']
  .some((key) => Array.isArray(before[key]) && before[key].length > 0);
if (!populated) {
  await state('/v1/admin/import', {
    opId: `migration_${crypto.randomUUID().replaceAll('-', '')}`,
    data,
  });
}
const exported = await state('/v1/admin/export', {});

const expectedCounts = {
  boardEntries: boardEntries.length,
  owners: owners.length,
  identityNames: identityNames.length,
  identityEmails: identityEmails.length,
  gardenViews: gardenViews.length,
};
const actualCounts = Object.fromEntries(
  Object.keys(expectedCounts).map((key) => [key, Array.isArray(exported[key]) ? exported[key].length : -1]),
);
if (JSON.stringify(expectedCounts) !== JSON.stringify(actualCounts)) {
  throw new Error('Portfolio state verification counts do not match source');
}

const sourceViews = new Map(gardenViews.map(({ slug, views }) => [slug, views]));
if (exported.gardenViews.some((row) => row.views < (sourceViews.get(row.slug) ?? 0))) {
  throw new Error('Portfolio state garden-view verification fell below the source');
}

console.log(JSON.stringify({ ok: true, migrated: expectedCounts }));
