import { Redis } from '@upstash/redis';

export const NAME_RE = /^[\p{L}\p{N} ._'-]{1,24}$/u;
export const OWNER_COOKIE = 'chicken-owner';
export const SCORE_MAX = 1_000_000;
const TOP_N = 10;
const KEEP_PER_BOARD = 200;
const MAGIC_TTL_SECONDS = 900;
const FEEDBACK_KEEP = 500;
const RENAME_HOP_LIMIT = 3;

export type Kind = 'human' | 'agent';

export interface Entry {
  name: string;
  score: number;
}

export interface Boards {
  human: Entry[];
  agent: Entry[];
}

interface OwnerRec {
  o: string;
  n: string;
  e?: number;
  r?: string;
}

export type SubmitResult =
  | { ok: true; finalName: string }
  | { ok: false; code: 'taken'; emailBound: boolean };

export type RenameResult =
  | { ok: true }
  | { ok: false; code: 'taken' | 'no-names' };

export const ENTRY_SEP = '\u001F';

const BOARD_KEYS: Record<Kind, string> = {
  human: 'game:chicken:lb:human',
  agent: 'game:chicken:lb:agent',
};
const OWNERS_KEY = 'game:chicken:lb:owners';
const FEEDBACK_KEY = 'game:chicken:feedback';
const idEmailKey = (id: string) => `game:chicken:lb:id:${id}:email`;
const idNamesKey = (id: string) => `game:chicken:lb:id:${id}:names`;
const emailKey = (email: string) => `game:chicken:lb:email:${email}`;
const magicKey = (token: string) => `game:chicken:lb:magic:${token}`;

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const memBoards: Record<Kind, Entry[]> = {
  human: [],
  agent: [],
};
const memOwners = new Map<string, OwnerRec>();
const memIdEmail = new Map<string, string>();
const memIdNames = new Map<string, Set<string>>();
const memEmailId = new Map<string, string>();
const memMagic = new Map<string, { email: string; exp: number }>();
const memFeedback: string[] = [];

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function newOwnerId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export function newMagicToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***${tld}`;
}

export function readCookieValue(header: string | null, key: string): string | null {
  if (!header) return null;
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${key}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(key.length + 1));
  } catch {
    return null;
  }
}

function entryMember(name: string): string {
  return `${name}${ENTRY_SEP}${crypto.randomUUID().slice(0, 8)}`;
}

function entryName(member: string): string {
  const sep = member.indexOf(ENTRY_SEP);
  return sep === -1 ? member : member.slice(0, sep);
}

function memTop(kind: Kind): Entry[] {
  return memBoards[kind]
    .slice(0, TOP_N)
    .map((entry) => ({ name: entry.name, score: entry.score }));
}

async function topFor(kind: Kind): Promise<Entry[]> {
  if (!redis) return memTop(kind);
  const raw = await redis.zrange<(string | number)[]>(BOARD_KEYS[kind], 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  });
  const entries: Entry[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    entries.push({ name: entryName(String(raw[i])), score: Number(raw[i + 1]) });
  }
  return entries;
}

export async function boards(): Promise<Boards> {
  const [human, agent] = await Promise.all([topFor('human'), topFor('agent')]);
  return { human, agent };
}

async function getOwner(lower: string): Promise<OwnerRec | null> {
  if (!redis) return memOwners.get(lower) ?? null;
  return await redis.hget<OwnerRec>(OWNERS_KEY, lower);
}

async function resolveRenames(lower: string): Promise<{ lower: string; rec: OwnerRec | null }> {
  let current = lower;
  let rec = await getOwner(current);
  for (let hop = 0; hop < RENAME_HOP_LIMIT && rec?.r; hop++) {
    current = rec.r;
    rec = await getOwner(current);
  }
  return { lower: current, rec };
}

async function legacyNameExists(name: string): Promise<boolean> {
  if (!redis) {
    return (
      memBoards.human.some((e) => e.name === name) ||
      memBoards.agent.some((e) => e.name === name)
    );
  }
  const [h, a] = await Promise.all([
    redis.zscore(BOARD_KEYS.human, name),
    redis.zscore(BOARD_KEYS.agent, name),
  ]);
  return h !== null || a !== null;
}

async function identityVerified(ownerId: string): Promise<boolean> {
  if (!redis) return memIdEmail.has(ownerId);
  return (await redis.get<string>(idEmailKey(ownerId))) !== null;
}

async function rememberName(ownerId: string, lower: string): Promise<void> {
  if (!redis) {
    const set = memIdNames.get(ownerId) ?? new Set<string>();
    set.add(lower);
    memIdNames.set(ownerId, set);
    return;
  }
  await redis.hset(idNamesKey(ownerId), { [lower]: 1 });
}

async function claimName(
  lower: string,
  rec: OwnerRec
): Promise<{ claimed: boolean; existing: OwnerRec | null }> {
  if (!redis) {
    const current = memOwners.get(lower);
    if (current) return { claimed: false, existing: current };
    memOwners.set(lower, rec);
    return { claimed: true, existing: null };
  }
  const set = await redis.hsetnx(OWNERS_KEY, lower, rec);
  if (set === 1) return { claimed: true, existing: null };
  return { claimed: false, existing: await redis.hget<OwnerRec>(OWNERS_KEY, lower) };
}

async function writeScore(kind: Kind, name: string, score: number): Promise<void> {
  if (!redis) {
    memBoards[kind].push({ name, score });
    memBoards[kind].sort((a, b) => b.score - a.score);
    if (memBoards[kind].length > KEEP_PER_BOARD) memBoards[kind].length = KEEP_PER_BOARD;
    return;
  }
  await redis.zadd(BOARD_KEYS[kind], { score, member: entryMember(name) });
  await redis.zremrangebyrank(BOARD_KEYS[kind], 0, -(KEEP_PER_BOARD + 1));
}

export async function submitScore(input: {
  kind: Kind;
  name: string;
  score: number;
  ownerId: string;
  cookieName: string | null;
}): Promise<SubmitResult> {
  const normalized = normalizeName(input.name);
  const { lower, rec } = await resolveRenames(normalized.toLowerCase());
  if (rec) {
    if (rec.o !== input.ownerId) {
      return { ok: false, code: 'taken', emailBound: rec.e === 1 };
    }
    await rememberName(input.ownerId, lower);
    await writeScore(input.kind, rec.n, input.score);
    return { ok: true, finalName: rec.n };
  }
  const cookieClaim =
    input.cookieName !== null &&
    normalizeName(input.cookieName).toLowerCase() === lower;
  if (!cookieClaim && (await legacyNameExists(normalized))) {
    return { ok: false, code: 'taken', emailBound: false };
  }
  const verified = await identityVerified(input.ownerId);
  const newRec: OwnerRec = verified
    ? { o: input.ownerId, n: normalized, e: 1 }
    : { o: input.ownerId, n: normalized };
  const { claimed, existing } = await claimName(lower, newRec);
  if (!claimed && existing && existing.o !== input.ownerId) {
    return { ok: false, code: 'taken', emailBound: existing.e === 1 };
  }
  await rememberName(input.ownerId, lower);
  const finalName = existing?.o === input.ownerId ? existing.n : normalized;
  await writeScore(input.kind, finalName, input.score);
  return { ok: true, finalName };
}

export async function createMagicToken(email: string): Promise<string> {
  const lower = email.trim().toLowerCase();
  const magicToken = newMagicToken();
  if (!redis) {
    memMagic.set(magicToken, { email: lower, exp: Date.now() + MAGIC_TTL_SECONDS * 1000 });
  } else {
    await redis.set(magicKey(magicToken), lower, { ex: MAGIC_TTL_SECONDS });
  }
  return magicToken;
}

export const MERGE_SCRIPT = `
local members = redis.call('HKEYS', KEYS[2])
for i = 1, #members do
  local raw = redis.call('HGET', KEYS[1], members[i])
  if raw then
    local rec = cjson.decode(raw)
    if rec.o == ARGV[1] then
      rec.o = ARGV[2]
      rec.e = 1
      redis.call('HSET', KEYS[1], members[i], cjson.encode(rec))
      redis.call('HSET', KEYS[3], members[i], 1)
    end
  end
end
if KEYS[2] ~= KEYS[3] then
  redis.call('DEL', KEYS[2])
end
local mine = redis.call('HKEYS', KEYS[3])
for i = 1, #mine do
  local raw = redis.call('HGET', KEYS[1], mine[i])
  if raw then
    local rec = cjson.decode(raw)
    if rec.o == ARGV[2] and rec.e ~= 1 then
      rec.e = 1
      redis.call('HSET', KEYS[1], mine[i], cjson.encode(rec))
    end
  end
end
return 1
`;

export async function consumeMagicToken(
  rawToken: string,
  deviceOwnerId: string | null
): Promise<{ ownerId: string; email: string; names: string[] } | null> {
  let email: string | null = null;
  if (!redis) {
    const entry = memMagic.get(rawToken);
    memMagic.delete(rawToken);
    if (entry && entry.exp > Date.now()) email = entry.email;
  } else {
    email = await redis.getdel<string>(magicKey(rawToken));
  }
  if (!email) return null;

  let ownerId: string;
  if (!redis) {
    const existing = memEmailId.get(email);
    if (existing) {
      ownerId = existing;
    } else {
      ownerId = newOwnerId();
      memEmailId.set(email, ownerId);
    }
    memIdEmail.set(ownerId, email);
    if (deviceOwnerId && deviceOwnerId !== ownerId) {
      const oldNames = memIdNames.get(deviceOwnerId) ?? new Set<string>();
      const mine = memIdNames.get(ownerId) ?? new Set<string>();
      for (const lower of oldNames) {
        const rec = memOwners.get(lower);
        if (rec && rec.o === deviceOwnerId) {
          memOwners.set(lower, { ...rec, o: ownerId, e: 1 });
          mine.add(lower);
        }
      }
      memIdNames.delete(deviceOwnerId);
      memIdNames.set(ownerId, mine);
    }
    for (const lower of memIdNames.get(ownerId) ?? []) {
      const rec = memOwners.get(lower);
      if (rec && rec.o === ownerId && rec.e !== 1) memOwners.set(lower, { ...rec, e: 1 });
    }
  } else {
    const candidate = newOwnerId();
    const set = await redis.set(emailKey(email), candidate, { nx: true });
    if (set === 'OK') {
      ownerId = candidate;
    } else {
      const existing = await redis.get<string>(emailKey(email));
      ownerId = existing ?? candidate;
    }
    await redis.set(idEmailKey(ownerId), email);
    const oldKey =
      deviceOwnerId && deviceOwnerId !== ownerId
        ? idNamesKey(deviceOwnerId)
        : `${idNamesKey(ownerId)}:none`;
    await redis.eval(
      MERGE_SCRIPT,
      [OWNERS_KEY, oldKey, idNamesKey(ownerId)],
      [deviceOwnerId ?? '', ownerId]
    );
  }
  const info = await identityInfo(ownerId);
  return { ownerId, email, names: info.names };
}

export async function identityInfo(
  ownerId: string
): Promise<{ names: string[]; email: string | null }> {
  if (!redis) {
    const names: string[] = [];
    for (const lower of memIdNames.get(ownerId) ?? []) {
      const rec = memOwners.get(lower);
      if (rec && rec.o === ownerId && !rec.r) names.push(rec.n);
    }
    return { names: names.sort(), email: memIdEmail.get(ownerId) ?? null };
  }
  const [lowers, email] = await Promise.all([
    redis.hkeys(idNamesKey(ownerId)),
    redis.get<string>(idEmailKey(ownerId)),
  ]);
  const names: string[] = [];
  if (lowers.length > 0) {
    const recs = await redis.hmget<Record<string, OwnerRec | null>>(OWNERS_KEY, ...lowers);
    if (recs) {
      for (const lower of lowers) {
        const rec = recs[lower];
        if (rec && rec.o === ownerId && !rec.r) names.push(rec.n);
      }
    }
  }
  return { names: names.sort(), email: email ?? null };
}

export const RENAME_SCRIPT = `
local existing = redis.call('HGET', KEYS[1], ARGV[2])
if existing then
  local rec = cjson.decode(existing)
  if rec.o ~= ARGV[1] then
    return 'taken'
  end
end
local newRec = { o = ARGV[1], n = ARGV[3] }
if ARGV[4] == '1' then
  newRec.e = 1
end
redis.call('HSET', KEYS[1], ARGV[2], cjson.encode(newRec))
redis.call('HSET', KEYS[4], ARGV[2], 1)
local newMember = ARGV[3]
local olds = cjson.decode(ARGV[5])
for i = 1, #olds do
  local oldLower = olds[i]
  if oldLower ~= ARGV[2] then
    local raw = redis.call('HGET', KEYS[1], oldLower)
    if raw then
      local old = cjson.decode(raw)
      if old.o == ARGV[1] and old.r == nil then
        local oldMember = old.n
        for k = 2, 3 do
          local members = redis.call('ZRANGE', KEYS[k], 0, -1)
          for j = 1, #members do
            local m = members[j]
            local base = m
            local suffix = ''
            local sep = string.find(m, ARGV[6], 1, true)
            if sep then
              base = string.sub(m, 1, sep - 1)
              suffix = string.sub(m, sep)
            end
            if base == oldMember then
              local s = redis.call('ZSCORE', KEYS[k], m)
              redis.call('ZREM', KEYS[k], m)
              if suffix == '' then
                suffix = ARGV[6] .. ARGV[7] .. j
              end
              redis.call('ZADD', KEYS[k], s, newMember .. suffix)
            end
          end
        end
        old.r = ARGV[2]
        redis.call('HSET', KEYS[1], oldLower, cjson.encode(old))
      end
    end
  end
end
return 'ok'
`;

export async function renameIdentity(input: {
  ownerId: string;
  to: string;
  from?: string;
}): Promise<RenameResult> {
  const toDisplay = normalizeName(input.to);
  const toLower = toDisplay.toLowerCase();
  const verified = await identityVerified(input.ownerId);
  let olds: string[];
  if (verified) {
    if (!redis) {
      olds = [...(memIdNames.get(input.ownerId) ?? [])];
    } else {
      olds = await redis.hkeys(idNamesKey(input.ownerId));
    }
  } else {
    if (!input.from) return { ok: false, code: 'no-names' };
    olds = [normalizeName(input.from).toLowerCase()];
  }
  if (olds.length === 0) return { ok: false, code: 'no-names' };

  if (!redis) {
    const existing = memOwners.get(toLower);
    if (existing && existing.o !== input.ownerId) return { ok: false, code: 'taken' };
    if (!existing && (await legacyNameExists(toDisplay))) return { ok: false, code: 'taken' };
    const rec: OwnerRec = verified
      ? { o: input.ownerId, n: toDisplay, e: 1 }
      : { o: input.ownerId, n: toDisplay };
    memOwners.set(toLower, rec);
    const mine = memIdNames.get(input.ownerId) ?? new Set<string>();
    mine.add(toLower);
    memIdNames.set(input.ownerId, mine);
    for (const oldLower of olds) {
      if (oldLower === toLower) continue;
      const old = memOwners.get(oldLower);
      if (!old || old.o !== input.ownerId || old.r) continue;
      for (const kind of ['human', 'agent'] as Kind[]) {
        for (const entry of memBoards[kind]) {
          if (entry.name === old.n) entry.name = toDisplay;
        }
      }
      memOwners.set(oldLower, { ...old, r: toLower });
    }
    return { ok: true };
  }

  if (!(await getOwner(toLower)) && (await legacyNameExists(toDisplay))) {
    return { ok: false, code: 'taken' };
  }
  const result = await redis.eval(
    RENAME_SCRIPT,
    [OWNERS_KEY, BOARD_KEYS.human, BOARD_KEYS.agent, idNamesKey(input.ownerId)],
    [
      input.ownerId,
      toLower,
      toDisplay,
      verified ? '1' : '0',
      JSON.stringify(olds),
      ENTRY_SEP,
      newOwnerId().slice(0, 8),
    ]
  );
  if (result === 'taken') return { ok: false, code: 'taken' };
  return { ok: true };
}

export async function pushFeedback(input: {
  message: string;
  ip: string;
  validated: boolean;
}): Promise<void> {
  const record = JSON.stringify({
    m: input.message,
    ip: input.ip,
    v: input.validated,
    at: new Date().toISOString(),
  });
  if (!redis) {
    memFeedback.unshift(record);
    if (memFeedback.length > FEEDBACK_KEEP) memFeedback.length = FEEDBACK_KEEP;
    return;
  }
  await redis.lpush(FEEDBACK_KEY, record);
  await redis.ltrim(FEEDBACK_KEY, 0, FEEDBACK_KEEP - 1);
}

export function __resetMemoryStore(): void {
  memBoards.human.length = 0;
  memBoards.agent.length = 0;
  memOwners.clear();
  memIdEmail.clear();
  memIdNames.clear();
  memEmailId.clear();
  memMagic.clear();
  memFeedback.length = 0;
}
