import { callPortfolioState, stateOperationId } from './portfolio-state-client';

export const NAME_RE = /^[\p{L}\p{N} ._'-]{1,24}$/u;
export const OWNER_COOKIE = 'chicken-owner';
export const SCORE_MAX = 1_000_000;
const TOP_N = 10;
const KEEP_PER_BOARD = 200;
const MAGIC_TTL_SECONDS = 900;
const FEEDBACK_KEEP = 500;
const RENAME_HOP_LIMIT = 3;

export type Kind = 'human' | 'agent';
export interface Entry { name: string; score: number }
export interface Boards { human: Entry[]; agent: Entry[] }
interface OwnerRec { o: string; n: string; e?: number; r?: string }
export type SubmitResult =
  | { ok: true; finalName: string }
  | { ok: false; code: 'taken'; emailBound: boolean };
export type RenameResult =
  | { ok: true }
  | { ok: false; code: 'taken' | 'no-names' };

const memBoards: Record<Kind, Entry[]> = { human: [], agent: [] };
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
  const match = header.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${key}=`));
  if (!match) return null;
  try { return decodeURIComponent(match.slice(key.length + 1)); } catch { return null; }
}

function memTop(kind: Kind): Entry[] {
  return memBoards[kind].slice(0, TOP_N).map((entry) => ({ ...entry }));
}

function resolveRenames(lower: string): { lower: string; rec: OwnerRec | null } {
  let current = lower;
  let rec = memOwners.get(current) ?? null;
  for (let hop = 0; hop < RENAME_HOP_LIMIT && rec?.r; hop += 1) {
    current = rec.r;
    rec = memOwners.get(current) ?? null;
  }
  return { lower: current, rec };
}

function rememberName(ownerId: string, lower: string): void {
  const names = memIdNames.get(ownerId) ?? new Set<string>();
  names.add(lower);
  memIdNames.set(ownerId, names);
}

function writeScore(kind: Kind, name: string, score: number): void {
  memBoards[kind].push({ name, score });
  memBoards[kind].sort((a, b) => b.score - a.score);
  if (memBoards[kind].length > KEEP_PER_BOARD) memBoards[kind].length = KEEP_PER_BOARD;
}

export async function boards(): Promise<Boards> {
  const state = await callPortfolioState<Boards>('/v1/boards', {});
  return state ?? { human: memTop('human'), agent: memTop('agent') };
}

export async function submitScore(input: {
  kind: Kind; name: string; score: number; ownerId: string; cookieName: string | null;
}): Promise<SubmitResult> {
  const state = await callPortfolioState<SubmitResult>('/v1/scores/submit', {
    opId: stateOperationId(), ...input,
  });
  if (state !== undefined) return state;
  const normalized = normalizeName(input.name);
  const { lower, rec } = resolveRenames(normalized.toLowerCase());
  if (rec) {
    if (rec.o !== input.ownerId) return { ok: false, code: 'taken', emailBound: rec.e === 1 };
    rememberName(input.ownerId, lower);
    writeScore(input.kind, rec.n, input.score);
    return { ok: true, finalName: rec.n };
  }
  const cookieClaim = input.cookieName !== null && normalizeName(input.cookieName).toLowerCase() === lower;
  const legacyExists = memBoards.human.some((entry) => entry.name === normalized)
    || memBoards.agent.some((entry) => entry.name === normalized);
  if (!cookieClaim && legacyExists) return { ok: false, code: 'taken', emailBound: false };
  const newRec: OwnerRec = memIdEmail.has(input.ownerId)
    ? { o: input.ownerId, n: normalized, e: 1 }
    : { o: input.ownerId, n: normalized };
  const existing = memOwners.get(lower);
  if (existing && existing.o !== input.ownerId) {
    return { ok: false, code: 'taken', emailBound: existing.e === 1 };
  }
  if (!existing) memOwners.set(lower, newRec);
  rememberName(input.ownerId, lower);
  const finalName = existing?.n ?? normalized;
  writeScore(input.kind, finalName, input.score);
  return { ok: true, finalName };
}

export async function createMagicToken(email: string): Promise<string> {
  const state = await callPortfolioState<{ token: string }>('/v1/magic/create', {
    opId: stateOperationId(), email,
  });
  if (state !== undefined) return state.token;
  const token = newMagicToken();
  memMagic.set(token, { email: email.trim().toLowerCase(), exp: Date.now() + MAGIC_TTL_SECONDS * 1000 });
  return token;
}

export async function consumeMagicToken(
  rawToken: string,
  deviceOwnerId: string | null,
): Promise<{ ownerId: string; email: string; names: string[] } | null> {
  const state = await callPortfolioState<{ ownerId: string; email: string; names: string[] } | null>(
    '/v1/magic/consume',
    { opId: stateOperationId(), token: rawToken, deviceOwnerId },
  );
  if (state !== undefined) return state;
  const entry = memMagic.get(rawToken);
  memMagic.delete(rawToken);
  if (!entry || entry.exp <= Date.now()) return null;
  const ownerId = memEmailId.get(entry.email) ?? newOwnerId();
  memEmailId.set(entry.email, ownerId);
  memIdEmail.set(ownerId, entry.email);
  if (deviceOwnerId && deviceOwnerId !== ownerId) {
    const oldNames = memIdNames.get(deviceOwnerId) ?? new Set<string>();
    for (const lower of oldNames) {
      const rec = memOwners.get(lower);
      if (rec?.o === deviceOwnerId) memOwners.set(lower, { ...rec, o: ownerId, e: 1 });
      rememberName(ownerId, lower);
    }
    memIdNames.delete(deviceOwnerId);
  }
  for (const lower of memIdNames.get(ownerId) ?? []) {
    const rec = memOwners.get(lower);
    if (rec?.o === ownerId && rec.e !== 1) memOwners.set(lower, { ...rec, e: 1 });
  }
  const info = await identityInfo(ownerId);
  return { ownerId, email: entry.email, names: info.names };
}

export async function identityInfo(ownerId: string): Promise<{ names: string[]; email: string | null }> {
  const state = await callPortfolioState<{ names: string[]; email: string | null }>(
    '/v1/identity/info', { ownerId },
  );
  if (state !== undefined) return state;
  const names: string[] = [];
  for (const lower of memIdNames.get(ownerId) ?? []) {
    const rec = memOwners.get(lower);
    if (rec?.o === ownerId && !rec.r) names.push(rec.n);
  }
  return { names: names.sort(), email: memIdEmail.get(ownerId) ?? null };
}

export async function renameIdentity(input: {
  ownerId: string; to: string; from?: string;
}): Promise<RenameResult> {
  const state = await callPortfolioState<RenameResult>('/v1/identity/rename', {
    opId: stateOperationId(), ...input,
  });
  if (state !== undefined) return state;
  const toDisplay = normalizeName(input.to);
  const toLower = toDisplay.toLowerCase();
  const verified = memIdEmail.has(input.ownerId);
  const olds = verified
    ? [...(memIdNames.get(input.ownerId) ?? [])]
    : input.from ? [normalizeName(input.from).toLowerCase()] : [];
  if (!olds.length) return { ok: false, code: 'no-names' };
  const existing = memOwners.get(toLower);
  if (existing && existing.o !== input.ownerId) return { ok: false, code: 'taken' };
  const legacyExists = memBoards.human.some((entry) => entry.name === toDisplay)
    || memBoards.agent.some((entry) => entry.name === toDisplay);
  if (!existing && legacyExists) return { ok: false, code: 'taken' };
  if (!existing) {
    memOwners.set(toLower, verified
      ? { o: input.ownerId, n: toDisplay, e: 1 }
      : { o: input.ownerId, n: toDisplay });
  } else {
    memOwners.set(toLower, {
      o: existing.o,
      n: toDisplay,
      ...(existing.e === 1 || verified ? { e: 1 } : {}),
    });
  }
  rememberName(input.ownerId, toLower);
  for (const oldLower of olds) {
    if (oldLower === toLower) continue;
    const old = memOwners.get(oldLower);
    if (!old || old.o !== input.ownerId || old.r) continue;
    for (const kind of ['human', 'agent'] as Kind[]) {
      for (const entry of memBoards[kind]) if (entry.name === old.n) entry.name = toDisplay;
    }
    memOwners.set(oldLower, { ...old, r: toLower });
  }
  return { ok: true };
}

export async function pushFeedback(input: {
  message: string; ip: string; validated: boolean;
}): Promise<void> {
  const state = await callPortfolioState<{ ok: true }>('/v1/feedback', {
    opId: stateOperationId(), ...input,
  });
  if (state !== undefined) return;
  memFeedback.unshift(JSON.stringify({ m: input.message, ip: input.ip, v: input.validated, at: new Date().toISOString() }));
  if (memFeedback.length > FEEDBACK_KEEP) memFeedback.length = FEEDBACK_KEEP;
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
