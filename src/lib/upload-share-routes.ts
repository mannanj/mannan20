import { NextResponse } from 'next/server';
import { storedFiles, uploadsEnv } from '@/lib/uploads';
import { issueTicket } from '@/lib/download-stream';
import { THUMBNAIL_MAX_BYTES, previewableImageType } from '@/lib/uploads-shared';
import { resolveShare, reserveDownload, type ShareDenial } from '@/lib/upload-shares';
import { serveDownload, type UploadTarget } from '@/lib/upload-handlers';

const DENIAL_STATUS: Record<ShareDenial, number> = {
  'not-found': 404,
  unavailable: 403,
  'sign-in': 401,
};

const DENIAL_MESSAGE: Record<ShareDenial, string> = {
  'not-found': 'Not found',
  unavailable: 'This link is no longer available',
  'sign-in': 'Sign in to use this link',
};

function deny(reason: ShareDenial): NextResponse {
  return NextResponse.json({ error: DENIAL_MESSAGE[reason] }, { status: DENIAL_STATUS[reason] });
}

export async function shareTarget(
  request: Request,
  token: string,
  need: 'write' | 'continue',
): Promise<{ ok: true; target: UploadTarget } | { ok: false; response: NextResponse }> {
  const env = uploadsEnv();
  if (!env?.SHARED_UPLOADS) {
    return { ok: false, response: NextResponse.json({ error: 'Storage unavailable' }, { status: 503 }) };
  }
  const resolved = await resolveShare(env, token, need, request.headers.get('cookie'));
  if (!resolved.ok) return { ok: false, response: deny(resolved.reason) };
  if (resolved.share.fileId) return { ok: false, response: deny('unavailable') };
  return {
    ok: true,
    target: {
      env,
      batchId: resolved.share.batchId,
      bucket: 'shared',
      shareId: resolved.share.id,
      actor: 'share',
      uploaderEmail: resolved.viewer,
    },
  };
}

export async function shareDownload(request: Request, token: string): Promise<Response> {
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  const resolved = await resolveShare(env, token, 'read', request.headers.get('cookie'));
  if (!resolved.ok) return deny(resolved.reason);
  const { share } = resolved;

  const files = (await storedFiles(env, share.batchId)).filter(
    (file) => share.fileId === null || file.id === share.fileId,
  );

  return serveDownload(request, {
    env,
    title: share.fileTitle ?? share.batchTitle,
    files,
    actor: 'share',
    shareId: share.id,
    spend: () => reserveDownload(env, share.id),
  });
}

export async function sharePreview(request: Request, token: string): Promise<Response> {
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  const resolved = await resolveShare(env, token, 'read', request.headers.get('cookie'));
  if (!resolved.ok) return deny(resolved.reason);
  const { share } = resolved;

  const fileId = new URL(request.url).searchParams.get('file');
  const file = (await storedFiles(env, share.batchId)).find(
    (entry) => entry.id === fileId && (share.fileId === null || entry.id === share.fileId),
  );
  if (!file) return deny('not-found');

  const imageType = previewableImageType(file.contentType);
  if (!imageType || file.size > THUMBNAIL_MAX_BYTES) {
    return NextResponse.json({ error: 'No preview' }, { status: 415 });
  }
  const path = await issueTicket(env.UPLOADS_DB, {
    kind: 'file',
    name: file.title,
    contentType: imageType,
    inline: true,
    entries: [
      {
        bucket: file.bucket,
        key: file.objectKey,
        name: file.title,
        size: file.size,
        modified: file.modifiedAt ?? file.createdAt,
      },
    ],
  });
  return Response.redirect(new URL(path, request.url).toString(), 303);
}
