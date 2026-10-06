import type { Metadata } from 'next';
import { UploadShell } from '@/components/upload/upload-shell';
import { UploadLocked } from '@/components/upload/upload-locked';
import { UploadsView } from '@/components/upload/uploads-view';
import { uploadViewer } from '@/lib/upload-session';
import { listAllFiles, listBatches, uploadsEnv } from '@/lib/uploads';
import { listShares } from '@/lib/upload-shares';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upload',
  robots: { index: false, follow: false },
};

export default async function UploadPage() {
  const { email, owner } = await uploadViewer();
  const env = owner ? uploadsEnv() : null;

  return (
    <UploadShell email={email}>
      {owner && env ? (
        <UploadsView
          batches={await listBatches(env)}
          shares={await listShares(env)}
          fileCount={(await listAllFiles(env)).length}
        />
      ) : (
        <UploadLocked email={email} />
      )}
    </UploadShell>
  );
}
