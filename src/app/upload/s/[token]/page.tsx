import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { UploadShell } from '@/components/upload/upload-shell';
import { ShareRecipient } from '@/components/upload/share-recipient';
import { readSiteSession } from '@/lib/site-session';
import { storedFiles, uploadsEnv } from '@/lib/uploads';
import { shareByToken } from '@/lib/upload-shares';
import { recordEvent } from '@/lib/upload-events';
import { canShareRead, canShareWrite, shareStatus } from '@/lib/uploads-shared';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shared with you',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = uploadsEnv();
  if (!env) notFound();
  const share = await shareByToken(env, token);
  if (!share) notFound();

  const store = await headers();
  const session = await readSiteSession(store.get('cookie')).catch(() => null);
  const email = session?.email ?? null;

  const active = shareStatus(share) === 'active';
  const readable = canShareRead(share) && (!share.signInRead || email !== null);
  const writable = canShareWrite(share) && (!share.signInWrite || email !== null);
  const needsSignIn =
    active && !email && ((share.signInRead && share.canRead) || (share.signInWrite && share.canWrite));

  const files = readable
    ? (await storedFiles(env, share.batchId))
        .filter((file) => share.fileId === null || file.id === share.fileId)
        .map((file) => ({
          id: file.id,
          title: file.title,
          size: file.size,
          createdAt: file.createdAt,
          contentType: file.contentType,
          modifiedAt: file.modifiedAt,
          batchTitle: share.batchTitle,
          uploadedBy: file.uploadedBy,
        }))
    : [];

  await recordEvent(env, {
    type: 'share_visit',
    actor: 'share',
    batchId: share.batchId,
    fileId: share.fileId,
    shareId: share.id,
  });

  return (
    <UploadShell email={email}>
      <ShareRecipient
        token={token}
        title={share.fileTitle ?? share.batchTitle}
        isFile={share.fileId !== null}
        active={active}
        readable={readable}
        writable={writable}
        needsSignIn={needsSignIn}
        files={files}
        signedInAs={email}
        expiresAt={share.expiresAt}
        uploadsLeft={share.maxUploads === null ? null : Math.max(0, share.maxUploads - share.uploadCount)}
        bytesLeft={share.maxBytes === null ? null : Math.max(0, share.maxBytes - share.usedBytes)}
        downloadsLeft={
          share.maxDownloads === null ? null : Math.max(0, share.maxDownloads - share.downloadCount)
        }
      />
    </UploadShell>
  );
}
