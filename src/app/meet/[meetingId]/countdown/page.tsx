import { notFound } from 'next/navigation';
import { MeetingCountdownPopout } from '@/components/meet/meeting-countdown-popout';
import { validMeetingIdentifier } from '@/lib/meeting-bff';

export const dynamic = 'force-dynamic';

export default async function MeetingCountdownPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  if (!validMeetingIdentifier(meetingId)) notFound();
  return <MeetingCountdownPopout meetingId={meetingId} />;
}
