'use client';

import { useCallback, useState } from 'react';
import { MAX_UPLOAD_BYTES, UPLOAD_PART_SIZE } from '@/lib/uploads-shared';

export interface PendingUpload {
  key: string;
  name: string;
  size: number;
  progress: number;
  error: string | null;
}

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof body?.error === 'string') return new Error(body.error);
  return new Error(res.status === 413 ? 'Too large' : 'Upload failed');
}

export interface UploadExtras {
  firstName?: string;
  lastName?: string;
}

async function uploadWhole(base: string, file: File, extras: UploadExtras): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('lastModified', String(file.lastModified));
  if (extras.firstName) form.append('firstName', extras.firstName);
  if (extras.lastName) form.append('lastName', extras.lastName);
  const res = await fetch(`${base}/files`, { method: 'POST', body: form });
  if (!res.ok) throw await failure(res);
}

async function uploadInParts(
  base: string,
  file: File,
  extras: UploadExtras,
  onProgress: (percent: number) => void,
): Promise<void> {
  const started = await fetch(`${base}/multipart`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type,
      lastModified: file.lastModified,
      firstName: extras.firstName,
      lastName: extras.lastName,
    }),
  });
  if (!started.ok) throw await failure(started);

  const { fileId, partSize, parts } = (await started.json()) as {
    fileId: string;
    partSize: number;
    parts: number;
  };

  const uploaded: { partNumber: number; etag: string }[] = [];
  try {
    for (let part = 1; part <= parts; part += 1) {
      const chunk = file.slice((part - 1) * partSize, part * partSize);
      const res = await fetch(`${base}/multipart/${fileId}?part=${part}`, {
        method: 'PUT',
        body: chunk,
      });
      if (!res.ok) throw await failure(res);
      uploaded.push((await res.json()) as { partNumber: number; etag: string });
      onProgress(Math.round((part / parts) * 100));
    }

    const finished = await fetch(`${base}/multipart/${fileId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parts: uploaded }),
    });
    if (!finished.ok) throw await failure(finished);
  } catch (error) {
    await fetch(`${base}/multipart/${fileId}`, { method: 'DELETE' }).catch(() => null);
    throw error;
  }
}

export function useUploader(onDone: (uploaded: number) => void) {
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const upload = useCallback(
    async (base: string, chosen: File[], extras: UploadExtras = {}) => {
      if (!chosen.length) return;
      const stamp = Date.now();
      const items = chosen.map((file, index) => ({
        key: `${stamp}-${index}`,
        name: file.name,
        size: file.size,
        progress: 0,
        error: null,
      }));
      setPending((was) => [...was, ...items]);

      let uploaded = 0;
      for (const [index, file] of chosen.entries()) {
        const key = items[index].key;
        const patch = (change: Partial<PendingUpload>) =>
          setPending((was) => was.map((item) => (item.key === key ? { ...item, ...change } : item)));

        try {
          if (file.size > MAX_UPLOAD_BYTES) throw new Error('Too large');
          if (file.size > UPLOAD_PART_SIZE) {
            await uploadInParts(base, file, extras, (percent) => patch({ progress: percent }));
          } else {
            await uploadWhole(base, file, extras);
          }
          uploaded += 1;
          setPending((was) => was.filter((item) => item.key !== key));
        } catch (error) {
          patch({ error: error instanceof Error ? error.message : 'Upload failed' });
        }
      }

      onDone(uploaded);
    },
    [onDone],
  );

  const dismiss = useCallback(() => setPending((was) => was.filter((item) => !item.error)), []);

  return { pending, upload, dismiss };
}
