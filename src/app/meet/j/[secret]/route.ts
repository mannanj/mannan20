import { createPendingAccessCookie } from '@/lib/meeting-cookies';
import { validMeetingIdentifier } from '@/lib/meeting-bff';
import { meetingWorkerRequest } from '@/lib/meeting-worker';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ secret: string }> },
) {
  const { secret } = await context.params;
  const result = await meetingWorkerRequest<{ meetingId: string }>({
    method: 'POST',
    path: '/v1/admission/resolve',
    body: { secret },
  });
  if (!result.ok || !validMeetingIdentifier(result.data.meetingId)) {
    return new Response(null, {
      status: 303,
      headers: { location: new URL('/meet?join=unavailable', request.url).toString() },
    });
  }
  try {
    const response = new Response(null, {
      status: 303,
      headers: {
        location: new URL(`/meet/${result.data.meetingId}`, request.url).toString(),
      },
    });
    response.headers.append(
      'set-cookie',
      createPendingAccessCookie({ meetingId: result.data.meetingId, secret }),
    );
    return response;
  } catch {
    return new Response(null, {
      status: 303,
      headers: { location: new URL('/meet?join=unavailable', request.url).toString() },
    });
  }
}
