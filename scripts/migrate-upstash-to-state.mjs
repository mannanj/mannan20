const redisUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
const stateUrl = process.env.PORTFOLIO_STATE_WORKER_URL?.replace(/\/+$/, '');
const stateSecret = process.env.STATE_SERVICE_SECRET;
const migrationMode = process.env.MIGRATION_MODE ?? 'import-empty';

if (!redisUrl || !redisToken || !stateUrl || !stateSecret) {
  throw new Error('Missing Upstash or portfolio-state migration environment');
}

async function redis(...command) {
  const response = await fetch(redisUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${redisToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error('Upstash migration read failed');
  return payload.result;
}

async function scanKeys(pattern) {
  const keys = [];
  let cursor = '0';
  do {
    const result = await redis('SCAN', cursor, 'MATCH', pattern, 'COUNT', 1000);
    if (!Array.isArray(result) || !Array.isArray(result[1])) throw new Error('Invalid Upstash scan response');
    cursor = String(result[0]);
    keys.push(...result[1].map(String));
  } while (cursor !== '0');
  return keys;
}
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
  const raw = await redis('ZRANGE', key, 0, -1, 'WITHSCORES');
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

const ownerPairs = (await redis('HGETALL', 'game:chicken:lb:owners')) ?? [];
const ownerHash = Object.fromEntries(
  Array.from({ length: Math.floor(ownerPairs.length / 2) }, (_, index) => [
    ownerPairs[index * 2],
    ownerPairs[index * 2 + 1],
  ]),
);
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
for (const key of await scanKeys('game:chicken:lb:id:*:email')) {
  const match = /^game:chicken:lb:id:([^:]+):email$/.exec(key);
  if (!match) throw new Error('Invalid identity email key in source');
  ownerIds.add(match[1]);
}
for (const ownerId of ownerIds) {
  const email = await redis('GET', `game:chicken:lb:id:${ownerId}:email`);
  if (typeof email === 'string' && email) identityEmails.push({ email, owner_id: ownerId });
}

const gardenViews = [];
for (const slug of gardenSlugs) {
  const raw = await redis('GET', `garden:views:${slug}`);
  const views = Number(raw ?? 0);
  if (!Number.isFinite(views) || views < 0) throw new Error('Invalid garden count in source');
  gardenViews.push({ slug, views });
}

const feedbackCount = Number(await redis('LLEN', 'game:chicken:feedback'));
if (!Number.isInteger(feedbackCount) || feedbackCount < 0) {
  throw new Error('Invalid feedback count in source');
}
if (feedbackCount !== 0) {
  throw new Error('Source feedback is non-empty; this migration requires an explicit feedback export');
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
} else if (migrationMode !== 'verify-existing') {
  throw new Error('Portfolio state is already populated; set MIGRATION_MODE=verify-existing to compare without importing');
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

function canonical(rows, fields) {
  return rows
    .map((row) => Object.fromEntries(fields.map((field) => [field, row[field] ?? null])))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

for (const [key, fields] of Object.entries({
  boardEntries: ['kind', 'name', 'score'],
  owners: ['lower_name', 'owner_id', 'display_name', 'email_bound', 'renamed_to'],
  identityNames: ['owner_id', 'lower_name'],
  identityEmails: ['email', 'owner_id'],
})) {
  if (JSON.stringify(canonical(data[key], fields)) !== JSON.stringify(canonical(exported[key], fields))) {
    throw new Error(`Portfolio state ${key} verification does not match source`);
  }
}

if (exported.feedbackSummary !== feedbackCount) {
  throw new Error('Portfolio state feedback verification does not match source');
}

const sourceViews = new Map(gardenViews.map(({ slug, views }) => [slug, views]));
if (exported.gardenViews.some((row) => !sourceViews.has(row.slug) || row.views < sourceViews.get(row.slug))) {
  throw new Error('Portfolio state garden-view verification fell below the source');
}

console.log(JSON.stringify({ ok: true, migrated: expectedCounts }));
