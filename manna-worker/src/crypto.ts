const textEncoder = new TextEncoder();
const VIEWER_TOKEN_PREFIX = 'mnv1';
const VIEWER_TOKEN_TTL_SECONDS = 5 * 60;

export type ViewerClaims = {
  v: 1;
  sub: string;
  accountKey: string;
  projectId: 'meet';
  iat: number;
  exp: number;
};

export type MintedViewerToken = {
  token: string;
  accountKey: string;
  expiresAt: string;
};

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email) ? email : null;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function accountKeyForEmail(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('invalid_email');
  return sha256Hex(normalized);
}

export function randomSecret(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export async function constantTimeSecretMatches(
  provided: string,
  expected: string,
): Promise<boolean> {
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', textEncoder.encode(provided)),
    crypto.subtle.digest('SHA-256', textEncoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

export async function mintViewerToken(
  input: { email: string; projectId: 'meet'; now: number },
  secret: string,
): Promise<MintedViewerToken> {
  const email = normalizeEmail(input.email);
  if (!email || input.projectId !== 'meet' || !Number.isSafeInteger(input.now)) {
    throw new Error('invalid_viewer_claims');
  }

  const accountKey = await accountKeyForEmail(email);
  const claims: ViewerClaims = {
    v: 1,
    sub: email,
    accountKey,
    projectId: 'meet',
    iat: input.now,
    exp: input.now + VIEWER_TOKEN_TTL_SECONDS,
  };
  const encodedClaims = encodeBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const signature = await sign(encodedClaims, secret);

  return {
    token: `${VIEWER_TOKEN_PREFIX}.${encodedClaims}.${encodeBase64Url(signature)}`,
    accountKey,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export async function verifyViewerToken(
  token: string,
  secret: string,
  now: number,
): Promise<ViewerClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VIEWER_TOKEN_PREFIX) return null;

  const [, encodedClaims, encodedSignature] = parts;
  if (!encodedClaims || !encodedSignature) return null;
  const providedSignature = decodeBase64Url(encodedSignature);
  if (!providedSignature || providedSignature.byteLength !== 32) return null;

  const expectedSignature = await sign(encodedClaims, secret);
  if (!crypto.subtle.timingSafeEqual(providedSignature, expectedSignature)) return null;

  const claimsBytes = decodeBase64Url(encodedClaims);
  if (!claimsBytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(claimsBytes));
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ['v', 'sub', 'accountKey', 'projectId', 'iat', 'exp'])) {
    return null;
  }
  const email = normalizeEmail(parsed.sub);
  if (!email || parsed.sub !== email) return null;
  if (parsed.v !== 1 || parsed.projectId !== 'meet') return null;
  if (typeof parsed.accountKey !== 'string' || !/^[a-f0-9]{64}$/u.test(parsed.accountKey)) return null;
  if (!Number.isSafeInteger(parsed.iat) || !Number.isSafeInteger(parsed.exp)) return null;

  const iat = parsed.iat as number;
  const exp = parsed.exp as number;
  if (exp !== iat + VIEWER_TOKEN_TTL_SECONDS || exp <= now || iat > now + 30) return null;
  if ((await accountKeyForEmail(email)) !== parsed.accountKey) return null;

  return {
    v: 1,
    sub: email,
    accountKey: parsed.accountKey,
    projectId: 'meet',
    iat,
    exp,
  };
}

async function sign(encodedClaims: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(encodedClaims)),
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  const padded = value
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}
