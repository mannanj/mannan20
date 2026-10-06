import type { Metadata } from 'next';
import { UploadShell } from '@/components/upload/upload-shell';
import { UploadLocked } from '@/components/upload/upload-locked';
import { AnalyticsView } from '@/components/upload/analytics-view';
import { uploadViewer } from '@/lib/upload-session';
import { uploadsEnv } from '@/lib/uploads';
import { uploadAnalytics } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;

export default async function UploadAnalyticsPage() {
  const { email, owner } = await uploadViewer();
  const env = owner ? uploadsEnv() : null;

  return (
    <UploadShell email={email}>
      {owner && env ? (
        <AnalyticsView initial={await uploadAnalytics(env, Date.now() - DEFAULT_DAYS * DAY_MS)} />
      ) : (
        <UploadLocked email={email} />
      )}
    </UploadShell>
  );
}
