import { describe, expect, test } from 'bun:test';
import {
  loadUpcomingMeetings,
  MeetingDirectoryClientError,
  type UpcomingMeeting,
  type UpcomingMeetingPage,
} from './meeting-directory';

const MEETING_ID = 'meeting_0123456789abcdef';
const SECOND_MEETING_ID = 'meeting_abcdef0123456789';
const STARTS_AT = '2026-07-20T14:00:00.000Z';
const ENDS_AT = '2026-07-20T15:00:00.000Z';

function meeting(
  overrides: Partial<UpcomingMeeting> = {},
): UpcomingMeeting {
  return {
    meetingId: MEETING_ID,
    title: 'Planning',
    status: 'scheduled',
    role: 'owner',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    durationSeconds: 3600,
    participantCount: 2,
    version: 3,
    canonicalPath: `/meet/${MEETING_ID}`,
    ...overrides,
  };
}

function page(
  meetings: readonly UpcomingMeeting[] = [meeting()],
  nextCursor?: string,
): UpcomingMeetingPage {
  return {
    serverNow: '2026-07-19T12:00:00.000Z',
    meetings,
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

function jsonData(data: unknown, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

describe('meeting directory client', () => {
  test('loads exact first and cursor pages through literal no-store GETs', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const firstMeetings = Array.from({ length: 25 }, (_, index) => {
      const id = `meeting_${String(index + 1).padStart(16, '0')}`;
      const startsAt = new Date(Date.parse(STARTS_AT) + index * 60_000)
        .toISOString();
      const endsAt = new Date(Date.parse(startsAt) + 3_600_000).toISOString();
      return meeting({
        meetingId: id,
        startsAt,
        endsAt,
        canonicalPath: `/meet/${id}`,
      });
    });
    const responses = [
      jsonData(page(firstMeetings, 'cursor_1')),
      jsonData(page([
        meeting({
          meetingId: SECOND_MEETING_ID,
          title: null,
          role: 'participant',
          startsAt: '2026-07-21T14:00:00.000Z',
          endsAt: '2026-07-21T15:00:00.000Z',
          canonicalPath: `/meet/${SECOND_MEETING_ID}`,
        }),
      ])),
    ];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return responses.shift()!;
    }) as typeof fetch;

    await expect(loadUpcomingMeetings(undefined, fetchImpl)).resolves.toEqual(
      page(firstMeetings, 'cursor_1'),
    );
    const second = await loadUpcomingMeetings('cursor_1', fetchImpl);
    expect(second.meetings[0]!.canonicalPath).toBe(
      `/meet/${SECOND_MEETING_ID}`,
    );
    expect(requests).toEqual([
      {
        url: '/api/meetings',
        init: { method: 'GET', cache: 'no-store' },
      },
      {
        url: '/api/meetings/upcoming/cursor_1',
        init: { method: 'GET', cache: 'no-store' },
      },
    ]);
  });

  test('accepts 25 unique live-first rows and exact nullable titles', async () => {
    const meetings = Array.from({ length: 25 }, (_, index) => {
      const id = `meeting_${String(index + 1).padStart(16, '0')}`;
      const startsAt = new Date(Date.parse(STARTS_AT) + index * 60_000)
        .toISOString();
      const endsAt = new Date(Date.parse(startsAt) + 3_600_000).toISOString();
      return meeting({
        meetingId: id,
        title: index === 0 ? null : `Meeting ${index + 1}`,
        status: index < 2 ? 'live' : 'scheduled',
        startsAt,
        endsAt,
        canonicalPath: `/meet/${id}`,
      });
    });

    await expect(loadUpcomingMeetings(undefined, (async () =>
      jsonData(page(meetings, 'next_page'))) as unknown as typeof fetch))
      .resolves.toEqual(page(meetings, 'next_page'));
  });

  test('rejects extra, missing, duplicate, unsafe, and incoherent rows', async () => {
    const invalidPages: unknown[] = [
      { ...page(), privateAccountEmail: 'private@example.com' },
      { meetings: [meeting()] },
      page(Array.from({ length: 26 }, () => meeting())),
      page([meeting(), meeting()]),
      page([meeting({ meetingId: '../unsafe', canonicalPath: '/meet/../unsafe' })]),
      page([meeting({ canonicalPath: '/meet/another-meeting' })]),
      page([meeting({ title: 'x'.repeat(201) })]),
      page([meeting({ title: 'Unsafe\nmeeting' })]),
      page([meeting({ status: 'ended' as never })]),
      page([meeting({ role: 'administrator' as never })]),
      page([meeting({ startsAt: 'tomorrow' })]),
      page([meeting({ endsAt: STARTS_AT })]),
      page([meeting({ durationSeconds: 3599 })]),
      page([meeting({ participantCount: 0 })]),
      page([meeting({ version: 0 })]),
      page([{ ...meeting(), privateToken: 'private' } as never]),
      page([meeting({ status: 'scheduled' }), meeting({
        meetingId: SECOND_MEETING_ID,
        status: 'live',
        canonicalPath: `/meet/${SECOND_MEETING_ID}`,
      })]),
      page([meeting(), meeting({
        meetingId: SECOND_MEETING_ID,
        startsAt: '2026-07-20T13:00:00.000Z',
        endsAt: '2026-07-20T14:00:00.000Z',
        canonicalPath: `/meet/${SECOND_MEETING_ID}`,
      })]),
      page([meeting()], 'bad.cursor'),
      page([], 'cursor_without_rows'),
    ];

    for (const data of invalidPages) {
      await expect(loadUpcomingMeetings(undefined, (async () =>
        jsonData(data)) as unknown as typeof fetch)).rejects.toMatchObject({
        code: 'dependency_unavailable',
      });
    }
  });

  test('rejects malformed envelopes, JSON, UTF-8, redirects, and 64-KiB overflow', async () => {
    const responses = [
      Response.json({ data: page(), extra: true }),
      new Response('{'),
      new Response(Uint8Array.from([0xc3, 0x28])),
      new Response('', { headers: { 'content-length': '65537' } }),
      new Response('', { headers: { 'content-length': '-1' } }),
      new Response('', { headers: { 'content-length': 'private' } }),
      new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(65_537));
          controller.close();
        },
      })),
      new Response(new ReadableStream({
        start(controller) {
          controller.error(new Error('private stream detail'));
        },
      })),
      jsonData(page()),
    ];
    Object.defineProperty(responses.at(-1)!, 'redirected', { value: true });

    for (const response of responses) {
      await expect(loadUpcomingMeetings(undefined, (async () =>
        response) as unknown as typeof fetch)).rejects.toMatchObject({
        code: 'dependency_unavailable',
      });
    }
  });

  test('maps only stable errors without retaining response or caught detail', async () => {
    for (const [status, code] of [
      [400, 'invalid_request'],
      [401, 'identity_required'],
      [503, 'dependency_unavailable'],
    ] as const) {
      const error = await loadUpcomingMeetings(undefined, (async () =>
        Response.json({ error: { code } }, { status })) as unknown as typeof fetch)
        .catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(MeetingDirectoryClientError);
      expect(error).toMatchObject({ code });
      expect(JSON.stringify(error)).not.toMatch(/response|private|stack/i);
    }

    const network = await loadUpcomingMeetings(undefined, (async () => {
      throw new Error('private network detail');
    }) as unknown as typeof fetch).catch((failure: unknown) => failure);
    expect(network).toMatchObject({ code: 'dependency_unavailable' });
    expect(JSON.stringify(network)).not.toContain('private network detail');

    for (const response of [
      Response.json({ error: { code: 'unknown_private_code' } }, { status: 418 }),
      Response.json({
        error: { code: 'identity_required', privateDetail: 'private' },
      }, { status: 401 }),
    ]) {
      const error = await loadUpcomingMeetings(
        undefined,
        (async () => response) as unknown as typeof fetch,
      ).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: 'dependency_unavailable' });
      expect(JSON.stringify(error)).not.toContain('privateDetail');
    }
  });

  test('rejects unsafe cursors before fetch', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonData(page());
    }) as unknown as typeof fetch;

    for (const cursor of ['', 'bad.cursor', '../unsafe', 'x'.repeat(1025)]) {
      await expect(loadUpcomingMeetings(cursor, fetchImpl)).rejects.toMatchObject({
        code: 'invalid_request',
      });
    }
    expect(calls).toBe(0);
  });
});
