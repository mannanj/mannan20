import { createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_GUESSES = 3;
export const LOCKOUT_SECONDS = 10 * 60;
export const GRANT_TTL_SECONDS = 30 * 60;
export const MAX_GUESS_LENGTH = 200;
export const GRANT_COOKIE_NAME = '__Host-transcripts-grant';
export const TRANSCRIPTS_SLUG = 'sun-signal-transcripts';

const ACCEPTED_ANSWERS = ['steerbridge', 'faizan'] as const;
export const SIGNING_PURPOSE = 'transcripts-grant:v1';

export interface TranscriptGate {
  film: string;
  cookieName: string;
  purpose: string;
  answers: readonly string[];
  names: readonly string[];
  objectKey: string;
  filename: string;
}

export const SUN_GATE: TranscriptGate = {
  film: 'sun-signal',
  cookieName: GRANT_COOKIE_NAME,
  purpose: SIGNING_PURPOSE,
  answers: ACCEPTED_ANSWERS,
  names: [],
  objectKey: 'sun-signal/transcripts.zip',
  filename: 'sun-signal-transcripts.zip',
};

export const CIVIC_GATE: TranscriptGate = {
  film: 'civic-signal',
  cookieName: '__Host-civic-transcripts-grant',
  purpose: 'civic-transcripts-grant:v1',
  answers: ['upskillinglabs'],
  names: ['maggie', 'nicole', 'ken', 'julie'],
  objectKey: 'civic-signal/transcripts.zip',
  filename: 'civic-signal-rates-went-up-transcript.zip',
};

const GATES: Record<string, TranscriptGate> = { [SUN_GATE.film]: SUN_GATE, [CIVIC_GATE.film]: CIVIC_GATE };

export function gateForFilm(film: string | null | undefined): TranscriptGate | null {
  if (!film) return SUN_GATE;
  return Object.hasOwn(GATES, film) ? GATES[film] : null;
}

export function guessKey(ip: string, gate: TranscriptGate): string {
  return gate === SUN_GATE ? ip : `${gate.film}:${ip}`;
}

export interface GrantPayload {
  exp: number;
}

export function normalizeGuess(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .slice(0, MAX_GUESS_LENGTH)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isCorrectGuess(raw: unknown, gate: TranscriptGate = SUN_GATE): boolean {
  const normalized = normalizeGuess(raw);
  if (!normalized) return false;
  const words = normalized.split(' ');
  const joined = words.join('');
  return gate.answers.some((answer) => joined.includes(answer)) || gate.names.some((name) => words.includes(name));
}

function gateSecret(): string | null {
  const secret = process.env.MANNAN_SESSION_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function sign(payload: string, secret: string, purpose: string): string {
  return createHmac('sha256', secret).update(`${purpose}.${payload}`).digest('base64url');
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function mintGrantToken(nowMs: number = Date.now(), gate: TranscriptGate = SUN_GATE): string | null {
  const secret = gateSecret();
  if (!secret) return null;
  const payload: GrantPayload = { exp: Math.floor(nowMs / 1000) + GRANT_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded, secret, gate.purpose)}`;
}

export function verifyGrantToken(token: unknown, nowMs: number = Date.now(), gate: TranscriptGate = SUN_GATE): boolean {
  if (typeof token !== 'string' || !token) return false;
  const secret = gateSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return false;
  if (!signaturesMatch(sign(encoded, secret, gate.purpose), signature)) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== 'object') return false;
  const exp = (parsed as Record<string, unknown>).exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;
  return exp > Math.floor(nowMs / 1000);
}

export function grantCookie(token: string, gate: TranscriptGate = SUN_GATE): string {
  return `${gate.cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${GRANT_TTL_SECONDS}`;
}

export function readGrantCookie(cookieHeader: string | null, gate: TranscriptGate = SUN_GATE): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith(`${gate.cookieName}=`));
  return match ? match.slice(gate.cookieName.length + 1) : null;
}

export function hasValidGrant(cookieHeader: string | null, nowMs: number = Date.now(), gate: TranscriptGate = SUN_GATE): boolean {
  return verifyGrantToken(readGrantCookie(cookieHeader, gate), nowMs, gate);
}
