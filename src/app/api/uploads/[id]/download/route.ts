import { NextResponse } from 'next/server';
import { getBatch, isId, isUploadOwner, listFiles, objectKey, uploadsEnv } from '@/lib/uploads';
import { safeAttachmentDisposition, safeAttachmentFilename } from '@/lib/attachment';
import { planDownload, previewableImageType } from '@/lib/uploads-shared';
import { streamZip, type ZipSource } from '@/lib/zip';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function zipName(title: string, part?: { index: number; total: number }): string {
  const base = title.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'uploads';
  if (!part) return `${base}.zip`;
  return `${base}-part-${part.index + 1}-of-${part.total}.zip`;
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
  const selected = wanted ? files.filter((file) => wanted.has(file.id)) : files;

  if (!selected.length) return NextResponse.json({ error: 'Nothing to download' }, { status: 400 });

  const plan = planDownload(selected);

  if (url.searchParams.get('plan') === '1') {
    return NextResponse.json({
      total: selected.reduce((sum, file) => sum + file.size, 0),
      parts: plan.map((part, index) => ({
        index,
        kind: part.kind,
        bytes: part.bytes,
        count: part.ids.length,
        fileId: part.kind === 'file' ? part.ids[0] : null,
      })),
    });
  }

  const rawPart = url.searchParams.get('part');
  const partIndex = rawPart === null ? null : Number(rawPart);
  if (partIndex !== null && (!Number.isInteger(partIndex) || !plan[partIndex])) {
    return NextResponse.json({ error: 'Unknown part' }, { status: 400 });
  }

  const inPart = partIndex === null ? null : new Set(plan[partIndex].ids);
  const chosen = inPart ? selected.filter((file) => inPart.has(file.id)) : selected;

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

  const label =
    partIndex === null || plan.length < 2
      ? undefined
      : { index: partIndex, total: plan.length };

  return streamZip(sources, zipName(batch.title, label));
}
