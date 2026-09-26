import { NextResponse } from 'next/server';
import { getBatch, isId, isUploadOwner, listFiles, objectKey, uploadsEnv } from '@/lib/uploads';
import { safeAttachmentDisposition, safeAttachmentFilename } from '@/lib/attachment';
import { previewableImageType } from '@/lib/uploads-shared';
import { streamZip, type ZipSource } from '@/lib/zip';

export const dynamic = 'force-dynamic';

const MAX_ZIP_ENTRIES = 500;

type RouteContext = { params: Promise<{ id: string }> };

function zipName(title: string): string {
  const base = title.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'uploads'}.zip`;
}

function uniqueName(taken: Set<string>, raw: string): string {
  const name = safeAttachmentFilename(raw);
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  taken.add(candidate);
  return candidate;
}

export async function GET(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const batch = await getBatch(env, id);
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(request.url);
  const single = url.searchParams.get('file');
  const files = await listFiles(env, id);

  if (single) {
    const entry = files.find((file) => file.id === single);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const object = await env.UPLOADS.get(objectKey(id, entry.id));
    if (!object) return NextResponse.json({ error: 'File unavailable' }, { status: 502 });

    const imageType = previewableImageType(entry.contentType);
    const inline = url.searchParams.get('inline') === '1' && imageType !== null;

    return new Response(object.body, {
      headers: {
        'content-type': inline && imageType ? imageType : entry.contentType,
        'content-length': String(entry.size),
        'content-disposition': inline ? 'inline' : safeAttachmentDisposition(entry.title),
        'last-modified': new Date(entry.modifiedAt ?? entry.createdAt).toUTCString(),
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'referrer-policy': 'no-referrer',
      },
    });
  }

  const requested = url.searchParams.get('ids');
  const wanted = requested ? new Set(requested.split(',').filter(isId)) : null;
  const chosen = (wanted ? files.filter((file) => wanted.has(file.id)) : files).slice(
    0,
    MAX_ZIP_ENTRIES,
  );

  if (!chosen.length) return NextResponse.json({ error: 'Nothing to download' }, { status: 400 });

  const taken = new Set<string>();
  const sources = (async function* (): AsyncGenerator<ZipSource> {
    for (const file of chosen) {
      const object = await env.UPLOADS.get(objectKey(id, file.id));
      if (!object) continue;
      yield {
        name: uniqueName(taken, file.title),
        body: object.body,
        modified: file.modifiedAt ?? file.createdAt,
      };
    }
  })();

  return streamZip(sources, zipName(batch.title));
}
