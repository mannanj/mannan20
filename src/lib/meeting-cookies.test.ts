import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  clearMeetingCookies,
  createGuestCandidateCookie,
  createGuestCredentialCookie,
  createPendingAccessCookie,
  readGuestCandidate,
  readGuestCredential,
  readPendingAccess,
} from './meeting-cookies';

const originalSecret = process.env.MANNAN_SESSION_SECRET;
const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';

beforeEach(() => {
  process.env.MANNAN_SESSION_SECRET = 'meeting-cookie-test-secret-at-least-32-bytes';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.MANNAN_SESSION_SECRET;
  else process.env.MANNAN_SESSION_SECRET = originalSecret;
});

describe('meeting-scoped cookies', () => {
  test('round trips a pending access secret only for its meeting path', () => {
    const cookie = createPendingAccessCookie({
      meetingId: MEETING_ID,
      secret: 'access:opaque-secret_1',
      version: 4,
      nowSeconds: 2_000_000_000,
    });
    expect(cookie).toContain('__Secure-mannan-meeting-access=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain(`Path=/meet/${MEETING_ID}`);
    expect(cookie).toContain('Max-Age=900');
    expect(readPendingAccess(cookie, MEETING_ID, 2_000_000_100)).toEqual({
      meetingId: MEETING_ID,
      secret: 'access:opaque-secret_1',
      version: 4,
      exp: 2_000_000_900,
    });
    expect(readPendingAccess(cookie, 'meeting_other', 2_000_000_100)).toBeNull();
    expect(readPendingAccess(cookie, MEETING_ID, 2_000_000_901)).toBeNull();
  });

  test('creates a signed temporary guest candidate with random opaque IDs', () => {
    const result = createGuestCandidateCookie({
      meetingId: MEETING_ID,
      displayName: '  River  ',
      nowSeconds: 2_000_000_000,
    });
    expect(result.cookie).toContain('__Secure-mannan-meeting-candidate=');
    expect(result.cookie).toContain('Max-Age=1800');
    expect(result.candidate).toMatchObject({
      kind: 'guest_candidate',
      displayName: 'River',
      participantId: expect.stringMatching(/^guest_[a-f0-9]{32}$/u),
      identitySessionId: expect.stringMatching(/^identity_[a-f0-9]{32}$/u),
    });
    expect(readGuestCandidate(result.cookie, MEETING_ID, 2_000_000_100)).toEqual(
      result.candidate,
    );
  });

  test('round trips the issued guest credential without cross-meeting reuse', () => {
    const cookie = createGuestCredentialCookie({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      credential: 'guest:opaque-credential_1',
      nowSeconds: 2_000_000_000,
    });
    expect(cookie).toContain('__Secure-mannan-meeting-guest=');
    expect(cookie).toContain('Max-Age=86400');
    expect(readGuestCredential(cookie, MEETING_ID, 2_000_000_100)).toEqual({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      credential: 'guest:opaque-credential_1',
      exp: 2_000_086_400,
    });
    expect(readGuestCredential(cookie, 'meeting_other', 2_000_000_100)).toBeNull();
  });

  test('rejects tampering and emits scoped deletion cookies', () => {
    const cookie = createPendingAccessCookie({
      meetingId: MEETING_ID,
      secret: 'access:opaque-secret_1',
      version: 1,
    });
    const value = cookie.match(/__Secure-mannan-meeting-access=([^;]+)/u)?.[1];
    expect(value).toBeDefined();
    const tampered = cookie.replace(value!, `${value!.slice(0, -1)}x`);
    expect(readPendingAccess(tampered, MEETING_ID)).toBeNull();

    const cleared = clearMeetingCookies(MEETING_ID);
    expect(cleared).toHaveLength(3);
    for (const item of cleared) {
      expect(item).toContain(`Path=/meet/${MEETING_ID}`);
      expect(item).toContain('Max-Age=0');
      expect(item).toContain('HttpOnly');
      expect(item).toContain('Secure');
    }
  });
});
