import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ACCESS_COOKIE = '__Secure-mannan-meeting-access';
const CANDIDATE_COOKIE = '__Secure-mannan-meeting-candidate';
const GUEST_COOKIE = '__Secure-mannan-meeting-guest';
const ACCESS_TTL_SECONDS = 15 * 60;
const CANDIDATE_TTL_SECONDS = 30 * 60;
const GUEST_TTL_SECONDS = 24 * 60 * 60;
const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const CREDENTIAL_RE = /^[A-Za-z0-9._~:-]{1,512}$/u;

export interface GuestCandidate {
  kind: 'guest_candidate';
  participantId: string;
  displayName: string;
  identitySessionId: string;
}

interface SignedPayload {
  v: 1;
  meetingId: string;
  exp: number;
}

function secret(): string {
  const value = process.env.MANNAN_SESSION_SECRET;
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('MANNAN_SESSION_SECRET must be at least 32 bytes');
  }
  return value;
}

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_RE.test(value);
}

function validCredential(value: unknown): value is string {
  return typeof value === 'string' && CREDENTIAL_RE.test(value);
}

function meetingPath(meetingId: string): string {
  if (!validIdentifier(meetingId)) throw new Error('Invalid meeting ID');
  return `/meet/${meetingId}`;
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const part = cookieHeader.split(/;\s*/u).find((item) => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

function signature(kind: string, meetingId: string, encoded: string): string {
  return createHmac('sha256', secret())
    .update(`meeting-cookie\u0000${kind}\u0000${meetingId}\u0000${encoded}`)
    .digest('base64url');
}

function equalSignature(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function serialize(
  name: string,
  kind: string,
  meetingId: string,
  payload: Record<string, unknown>,
  maxAge: number,
): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const value = `${encoded}.${signature(kind, meetingId, encoded)}`;
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=${meetingPath(meetingId)}; Max-Age=${maxAge}`;
}

function parse(
  cookieHeader: string | null,
  name: string,
  kind: string,
  meetingId: string,
  nowSeconds: number,
): Record<string, unknown> | null {
  if (!validIdentifier(meetingId)) return null;
  const value = cookieValue(cookieHeader, name);
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (!equalSignature(signature(kind, meetingId, parts[0]), parts[1])) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;
  const record = decoded as Record<string, unknown>;
  if (
    record.v !== 1 ||
    record.meetingId !== meetingId ||
    typeof record.exp !== 'number' ||
    !Number.isSafeInteger(record.exp) ||
    record.exp <= nowSeconds
  ) {
    return null;
  }
  return record;
}

export function createPendingAccessCookie(input: {
  meetingId: string;
  secret: string;
  version: number;
  nowSeconds?: number;
}): string {
  if (
    !validCredential(input.secret) ||
    !Number.isSafeInteger(input.version) ||
    input.version <= 0
  ) {
    throw new Error('Invalid access credential');
  }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  return serialize(
    ACCESS_COOKIE,
    'access',
    input.meetingId,
    {
      v: 1,
      meetingId: input.meetingId,
      secret: input.secret,
      version: input.version,
      exp: now + ACCESS_TTL_SECONDS,
    },
    ACCESS_TTL_SECONDS,
  );
}

export function readPendingAccess(
  cookieHeader: string | null,
  meetingId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): (Omit<SignedPayload, 'v'> & { secret: string; version: number }) | null {
  const record = parse(cookieHeader, ACCESS_COOKIE, 'access', meetingId, nowSeconds);
  if (
    record === null ||
    !validCredential(record.secret) ||
    typeof record.version !== 'number' ||
    !Number.isSafeInteger(record.version) ||
    record.version <= 0
  ) {
    return null;
  }
  return {
    meetingId,
    secret: record.secret,
    version: record.version,
    exp: record.exp as number,
  };
}

export function createGuestCandidateCookie(input: {
  meetingId: string;
  displayName: string;
  nowSeconds?: number;
}): { cookie: string; candidate: GuestCandidate } {
  const displayName = input.displayName.trim();
  if (displayName.length === 0 || displayName.length > 100) {
    throw new Error('Invalid guest display name');
  }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const candidate: GuestCandidate = {
    kind: 'guest_candidate',
    participantId: `guest_${randomBytes(16).toString('hex')}`,
    displayName,
    identitySessionId: `identity_${randomBytes(16).toString('hex')}`,
  };
  return {
    candidate,
    cookie: serialize(
      CANDIDATE_COOKIE,
      'candidate',
      input.meetingId,
      { v: 1, meetingId: input.meetingId, ...candidate, exp: now + CANDIDATE_TTL_SECONDS },
      CANDIDATE_TTL_SECONDS,
    ),
  };
}

export function readGuestCandidate(
  cookieHeader: string | null,
  meetingId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): GuestCandidate | null {
  const record = parse(cookieHeader, CANDIDATE_COOKIE, 'candidate', meetingId, nowSeconds);
  if (
    record === null ||
    record.kind !== 'guest_candidate' ||
    !validIdentifier(record.participantId) ||
    typeof record.displayName !== 'string' ||
    record.displayName.trim() !== record.displayName ||
    record.displayName.length === 0 ||
    record.displayName.length > 100 ||
    !validIdentifier(record.identitySessionId)
  ) {
    return null;
  }
  return {
    kind: 'guest_candidate',
    participantId: record.participantId,
    displayName: record.displayName,
    identitySessionId: record.identitySessionId,
  };
}

export function createGuestCredentialCookie(input: {
  meetingId: string;
  participantId: string;
  credential: string;
  nowSeconds?: number;
}): string {
  if (!validIdentifier(input.participantId) || !validCredential(input.credential)) {
    throw new Error('Invalid guest credential');
  }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  return serialize(
    GUEST_COOKIE,
    'guest',
    input.meetingId,
    {
      v: 1,
      meetingId: input.meetingId,
      participantId: input.participantId,
      credential: input.credential,
      exp: now + GUEST_TTL_SECONDS,
    },
    GUEST_TTL_SECONDS,
  );
}

export function readGuestCredential(
  cookieHeader: string | null,
  meetingId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): (Omit<SignedPayload, 'v'> & { participantId: string; credential: string }) | null {
  const record = parse(cookieHeader, GUEST_COOKIE, 'guest', meetingId, nowSeconds);
  if (
    record === null ||
    !validIdentifier(record.participantId) ||
    !validCredential(record.credential)
  ) {
    return null;
  }
  return {
    meetingId,
    participantId: record.participantId,
    credential: record.credential,
    exp: record.exp as number,
  };
}

function clearCookie(name: string, meetingId: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=${meetingPath(meetingId)}; Max-Age=0`;
}

export function clearMeetingCookies(meetingId: string): string[] {
  return [
    clearCookie(ACCESS_COOKIE, meetingId),
    clearCookie(CANDIDATE_COOKIE, meetingId),
    clearCookie(GUEST_COOKIE, meetingId),
  ];
}
