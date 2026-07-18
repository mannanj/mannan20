import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ConsentScreen } from '@/components/legal/consent-screen';
import { readConsentSession } from '@/lib/consent-session';

export const dynamic = 'force-dynamic';

export default async function ConsentPage() {
  const pending = readConsentSession((await headers()).get('cookie'));
  if (pending === null) redirect('/?auth=expired');

  return <ConsentScreen email={pending.email} />;
}
