import type { Metadata } from 'next';
import { UploadShell } from '@/components/upload/upload-shell';
import { UploadLocked } from '@/components/upload/upload-locked';
import { FilesExplorer } from '@/components/upload/files-explorer';
import { uploadViewer } from '@/lib/upload-session';
import { listAllFiles, uploadsEnv } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'All files',
  robots: { index: false, follow: false },
};

export default async function AllFilesPage() {
  const { email, owner } = await uploadViewer();
  const env = owner ? uploadsEnv() : null;

  return (
    <UploadShell email={email}>
      {owner && env ? (
        <FilesExplorer files={await listAllFiles(env)} />
      ) : (
        <UploadLocked email={email} />
      )}
    </UploadShell>
  );
}
