import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { MeetingRoom } from '@/components/meet/meeting-room';
import { readGuestCredential, readPendingAccess } from '@/lib/meeting-cookies';
import { validMeetingIdentifier } from '@/lib/meeting-bff';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  if (!validMeetingIdentifier(meetingId)) notFound();
  const cookie = (await headers()).get('cookie');
  const session = await readSiteSession(cookie);
  return (
    <MeetingRoom
      meetingId={meetingId}
      signedInEmail={session?.email ?? null}
      hasAdmission={readPendingAccess(cookie, meetingId) !== null}
      hasGuestCredential={readGuestCredential(cookie, meetingId) !== null}
    />
  );
}
