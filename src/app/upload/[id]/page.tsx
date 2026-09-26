import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UploadShell } from '@/components/upload/upload-shell';
import { UploadLocked } from '@/components/upload/upload-locked';
import { UploadDetail } from '@/components/upload/upload-detail';
import { uploadViewer } from '@/lib/upload-session';
import { getBatch, isId, listFiles, uploadsEnv } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upload',
  robots: { index: false, follow: false },
};

export default async function UploadBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { email, owner } = await uploadViewer();

  if (!owner) {
    return (
      <UploadShell email={email}>
        <UploadLocked email={email} />
      </UploadShell>
    );
  }

  const { id } = await params;
  const env = uploadsEnv();
  if (!env || !isId(id)) notFound();

  const batch = await getBatch(env, id);
  if (!batch) notFound();

  return (
    <UploadShell email={email}>
      <UploadDetail batch={batch} files={await listFiles(env, id)} />
    </UploadShell>
  );
}
