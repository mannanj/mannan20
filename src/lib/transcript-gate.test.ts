import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  GRANT_COOKIE_NAME,
  SIGNING_PURPOSE,
  GRANT_TTL_SECONDS,
  LOCKOUT_SECONDS,
  MAX_GUESSES,
  grantCookie,
  hasValidGrant,
  isCorrectGuess,
  mintGrantToken,
  normalizeGuess,
  readGrantCookie,
  verifyGrantToken,
} from './transcript-gate';

const SECRET = 'test-secret-for-transcript-gate';
const original = process.env.MANNAN_SESSION_SECRET;

beforeEach(() => {
  process.env.MANNAN_SESSION_SECRET = SECRET;
});

afterEach(() => {
  if (original === undefined) delete process.env.MANNAN_SESSION_SECRET;
  else process.env.MANNAN_SESSION_SECRET = original;
});


function signWith(encoded: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(`${SIGNING_PURPOSE}.${encoded}`).digest('base64url');
}

function signedToken(payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${signWith(encoded)}`;
}

describe('constants', () => {
  test('three guesses inside a ten minute lockout', () => {
    expect(MAX_GUESSES).toBe(3);
    expect(LOCKOUT_SECONDS).toBe(600);
  });
});

describe('normalizeGuess', () => {
  test('lowercases and collapses punctuation to single spaces', () => {
    expect(normalizeGuess('  Hi,   I am   FAIZAN! ')).toBe('hi i am faizan');
  });

  test('returns empty for non-strings and blank input', () => {
    expect(normalizeGuess(undefined)).toBe('');
    expect(normalizeGuess(null)).toBe('');
    expect(normalizeGuess(42)).toBe('');
    expect(normalizeGuess({})).toBe('');
    expect(normalizeGuess('   ')).toBe('');
    expect(normalizeGuess('!!!')).toBe('');
  });

  test('truncates before normalizing so a long payload cannot smuggle an answer past the cap', () => {
    const padded = `${'x'.repeat(400)} faizan`;
    expect(normalizeGuess(padded)).not.toContain('faizan');
  });
});

describe('isCorrectGuess', () => {
  test('accepts the workplace answer in any case, bare or in a sentence', () => {
    for (const guess of ['steerbridge', 'SteerBridge', 'STEERBRIDGE', 'I work at Steerbridge.', 'steerbridge!']) {
      expect(isCorrectGuess(guess)).toBe(true);
    }
  });

  test('accepts the name answer in any case', () => {
    for (const guess of ['faizan', 'Faizan', 'FAIZAN', "it's Faizan", 'faizan.']) {
      expect(isCorrectGuess(guess)).toBe(true);
    }
  });

  test('accepts the answers split across whitespace or hyphens', () => {
    expect(isCorrectGuess('steer bridge')).toBe(true);
    expect(isCorrectGuess('Steer-Bridge')).toBe(true);
  });

  test('rejects wrong answers, near misses and empty input', () => {
    for (const guess of ['', '   ', 'steerbrige', 'steer', 'bridge', 'faiz', 'zan', 'acme', 'mannan', 'faizzan']) {
      expect(isCorrectGuess(guess)).toBe(false);
    }
  });

  test('rejects non-string input', () => {
    expect(isCorrectGuess(undefined)).toBe(false);
    expect(isCorrectGuess(null)).toBe(false);
    expect(isCorrectGuess(['faizan'])).toBe(false);
    expect(isCorrectGuess({ toString: () => 'faizan' })).toBe(false);
  });
});

describe('grant tokens', () => {
  test('a freshly minted token verifies', () => {
    const token = mintGrantToken();
    expect(token).toBeTruthy();
    expect(verifyGrantToken(token)).toBe(true);
  });

  test('a token is rejected once past its expiry', () => {
    const now = Date.now();
    const token = mintGrantToken(now)!;
    expect(verifyGrantToken(token, now + (GRANT_TTL_SECONDS - 5) * 1000)).toBe(true);
    expect(verifyGrantToken(token, now + (GRANT_TTL_SECONDS + 5) * 1000)).toBe(false);
  });

  test('a tampered payload is rejected', () => {
    const token = mintGrantToken()!;
    const [, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ exp: 9_999_999_999 }), 'utf8').toString('base64url');
    expect(verifyGrantToken(`${forged}.${signature}`)).toBe(false);
  });

  test('a tampered signature is rejected', () => {
    const token = mintGrantToken()!;
    const [payload, signature] = token.split('.');
    const flipped = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    expect(verifyGrantToken(`${payload}.${flipped}`)).toBe(false);
  });

  test('a token minted under a different secret is rejected', () => {
    const token = mintGrantToken()!;
    process.env.MANNAN_SESSION_SECRET = 'a-completely-different-secret';
    expect(verifyGrantToken(token)).toBe(false);
  });

  test('malformed tokens are rejected rather than throwing', () => {
    for (const bad of ['', '.', 'a.b.c', 'onlyonepart', '.sig', 'payload.', 'null.null', '!!!.???']) {
      expect(verifyGrantToken(bad)).toBe(false);
    }
    expect(verifyGrantToken(undefined)).toBe(false);
    expect(verifyGrantToken(null)).toBe(false);
    expect(verifyGrantToken(123)).toBe(false);
  });

  test('a correctly signed payload whose exp is not a number is still rejected', () => {
    for (const exp of ['forever', '9999999999', null, true, Infinity, NaN, undefined]) {
      const token = signedToken({ exp });
      expect(verifyGrantToken(token)).toBe(false);
    }
  });

  test('a correctly signed payload that is not an object is rejected', () => {
    for (const payload of ['"a string"', '42', 'null', '[1,2]']) {
      const encoded = Buffer.from(payload, 'utf8').toString('base64url');
      expect(verifyGrantToken(`${encoded}.${signWith(encoded)}`)).toBe(false);
    }
  });

  test('a valid token with extra dot-separated junk appended is rejected', () => {
    const token = mintGrantToken()!;
    expect(verifyGrantToken(token)).toBe(true);
    expect(verifyGrantToken(`${token}.extra`)).toBe(false);
    expect(verifyGrantToken(`prefix.${token}`)).toBe(false);
  });

  test('fails closed when the signing secret is absent', () => {
    const token = mintGrantToken()!;
    delete process.env.MANNAN_SESSION_SECRET;
    expect(mintGrantToken()).toBeNull();
    expect(verifyGrantToken(token)).toBe(false);
  });

  test('fails closed when the signing secret is empty', () => {
    const token = mintGrantToken()!;
    process.env.MANNAN_SESSION_SECRET = '';
    expect(mintGrantToken()).toBeNull();
    expect(verifyGrantToken(token)).toBe(false);
  });
});

describe('cookies', () => {
  test('the grant cookie is host-locked, httpOnly and not readable by script', () => {
    const cookie = grantCookie('abc.def');
    expect(cookie).toStartWith(`${GRANT_COOKIE_NAME}=abc.def;`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${GRANT_TTL_SECONDS}`);
  });

  test('reads its own cookie out of a crowded header', () => {
    const token = mintGrantToken()!;
    const header = `other=1; ${GRANT_COOKIE_NAME}=${token}; another=2`;
    expect(readGrantCookie(header)).toBe(token);
    expect(hasValidGrant(header)).toBe(true);
  });

  test('is not fooled by a cookie whose name merely ends with the grant name', () => {
    const token = mintGrantToken()!;
    expect(readGrantCookie(`not-${GRANT_COOKIE_NAME}=${token}`)).toBeNull();
    expect(hasValidGrant(`not-${GRANT_COOKIE_NAME}=${token}`)).toBe(false);
  });

  test('no cookie header means no grant', () => {
    expect(readGrantCookie(null)).toBeNull();
    expect(hasValidGrant(null)).toBe(false);
    expect(hasValidGrant('')).toBe(false);
    expect(hasValidGrant('unrelated=1')).toBe(false);
  });

  test('a site-session token cannot be replayed as a grant', () => {
    const encoded = Buffer.from(JSON.stringify({ email: 'x@y.z', role: 'admin', exp: 9_999_999_999 }), 'utf8').toString('base64url');
    const { createHmac } = require('node:crypto');
    const sessionStyleSig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
    expect(verifyGrantToken(`${encoded}.${sessionStyleSig}`)).toBe(false);
  });
});
