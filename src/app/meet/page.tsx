import { headers } from 'next/headers';
import { MeetingHome } from '@/components/meet/meeting-home';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const session = await readSiteSession((await headers()).get('cookie'));
  const { join } = await searchParams;
  return (
    <MeetingHome
      signedInEmail={session?.email ?? null}
      joinUnavailable={join === 'unavailable'}
    />
  );
}
