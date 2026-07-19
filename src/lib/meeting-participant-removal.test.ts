import { describe, expect, test } from 'bun:test';
import {
  MeetingParticipantRemovalError,
  removeMeetingParticipant,
} from './meeting-participant-removal';

describe('meeting participant removal client', () => {
  test('sends one exact bodyless versioned removal request', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return Response.json({
        data: { membershipIntervalId: 'membership_1', version: 8 },
      });
    }) as typeof fetch;

    await expect(removeMeetingParticipant({
      meetingId: 'meeting_0123456789abcdef',
      participantId: 'guest_1',
      version: 7,
      idempotencyKey: 'browser_remove_0123456789abcdef',
      fetcher,
    })).resolves.toEqual({ membershipIntervalId: 'membership_1', version: 8 });
    expect(requests).toEqual([{
      input: '/meet/meeting_0123456789abcdef/api/participants/guest_1',
      init: {
        method: 'DELETE',
        headers: {
          'idempotency-key': 'browser_remove_0123456789abcdef',
          'if-match': '"7"',
        },
      },
    }]);
  });

  test.each([
    ['meeting_conflict', 409, 'meeting_conflict'],
    ['owner_immutable', 422, 'owner_immutable'],
    ['identity_required', 401, 'identity_required'],
    ['dependency_unavailable', 503, 'dependency_unavailable'],
  ] as const)('preserves stable failure %s', async (upstream, status, expected) => {
    const fetcher = (async () => Response.json({
      error: { code: upstream, privateDetail: 'not exposed' },
    }, { status })) as unknown as typeof fetch;
    const error = await removeMeetingParticipant({
      meetingId: 'meeting_0123456789abcdef',
      participantId: 'guest_1',
      version: 7,
      idempotencyKey: 'browser_remove_0123456789abcdef',
      fetcher,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MeetingParticipantRemovalError);
    expect(error).toMatchObject({ code: expected });
    expect(JSON.stringify(error)).not.toContain('privateDetail');
  });

  test('rejects malformed input and success data', async () => {
    await expect(removeMeetingParticipant({
      meetingId: '../unsafe',
      participantId: 'guest_1',
      version: 0,
    })).rejects.toMatchObject({ code: 'invalid_request' });
    const fetcher = (async () => Response.json({
      data: { membershipIntervalId: '', version: 7, extra: true },
    })) as unknown as typeof fetch;
    await expect(removeMeetingParticipant({
      meetingId: 'meeting_0123456789abcdef',
      participantId: 'guest_1',
      version: 7,
      fetcher,
    })).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
