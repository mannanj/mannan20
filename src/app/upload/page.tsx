import type { Metadata } from 'next';
import { UploadShell } from '@/components/upload/upload-shell';
import { UploadLocked } from '@/components/upload/upload-locked';
import { UploadsView } from '@/components/upload/uploads-view';
import { uploadViewer } from '@/lib/upload-session';
import { parseBatchKind } from '@/lib/uploads-shared';
import { listAllFiles, listBatches, uploadsEnv } from '@/lib/uploads';
import { listShares } from '@/lib/upload-shares';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upload',
  robots: { index: false, follow: false },
};

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const kind = parseBatchKind((await searchParams).kind) ?? 'page';
  const { email, owner } = await uploadViewer();
  const env = owner ? uploadsEnv() : null;

  return (
    <UploadShell email={email}>
      {owner && env ? (
        <UploadsView
          kind={kind}
          batches={await listBatches(env, kind)}
          shares={await listShares(env)}
          fileCount={(await listAllFiles(env)).length}
        />
      ) : (
        <UploadLocked email={email} />
      )}
    </UploadShell>
  );
}
