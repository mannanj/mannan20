import { describe, expect, test } from 'bun:test';
import {
  meetingResultResponse,
  quotedVersion,
  readMeetingJson,
  sameOrigin,
  validMeetingIdentifier,
} from './meeting-bff';

describe('meeting browser boundary', () => {
  test('requires an exact same-origin mutation source', () => {
    const good = new Request('https://mannan.is/api/meetings', {
      method: 'POST',
      headers: { origin: 'https://mannan.is' },
    });
    expect(sameOrigin(good)).toBe(true);
    expect(sameOrigin(new Request(good.url, { method: 'POST' }))).toBe(false);
    expect(
      sameOrigin(
        new Request(good.url, {
          method: 'POST',
          headers: { origin: 'https://attacker.example' },
        }),
      ),
    ).toBe(false);
  });

  test('reads only a bounded JSON object and exact quoted version', async () => {
    expect(
      await readMeetingJson(
        new Request('https://mannan.is/api/meetings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"title":"Planning"}',
        }),
      ),
    ).toEqual({ title: 'Planning' });
    expect(
      await readMeetingJson(
        new Request('https://mannan.is/api/meetings', {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: '{}',
        }),
      ),
    ).toBeNull();
    expect(
      quotedVersion(
        new Request('https://mannan.is', { headers: { 'if-match': '"42"' } }),
      ),
    ).toBe(42);
    expect(quotedVersion(new Request('https://mannan.is', { headers: { 'if-match': '42' } }))).toBeUndefined();
  });

  test('maps only the stable Worker envelope and safe metadata', async () => {
    const success = meetingResultResponse({
      ok: true,
      status: 201,
      data: { meetingId: 'meeting_1' },
      etag: '"1"',
      location: '/meet/meeting_1',
    });
    expect(success.status).toBe(201);
    expect(success.headers.get('etag')).toBe('"1"');
    expect(await success.json()).toEqual({ data: { meetingId: 'meeting_1' } });

    const failure = meetingResultResponse({
      ok: false,
      status: 409,
      errorCode: 'meeting_conflict',
    });
    expect(await failure.json()).toEqual({ error: { code: 'meeting_conflict' } });
  });

  test('accepts only canonical path identifiers', () => {
    expect(validMeetingIdentifier('meeting_01-abc')).toBe(true);
    expect(validMeetingIdentifier('../private')).toBe(false);
    expect(validMeetingIdentifier('two words')).toBe(false);
  });
});
